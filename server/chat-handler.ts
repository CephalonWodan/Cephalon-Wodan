// ============================================================
// Cephalon Codex AI Assistant — Backend Handler with Sync Integration & Shard Optimizer
// ============================================================

import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { generateArchonShardRecommendations } from "./archon-shard-optimizer.js";
import { buildRagContext, getRagDiagnostics } from "./rag-retriever.js";

function sendJson(res: any, status: number, data: any) {
  try {
    console.log(`[CHAT] Sending JSON status ${status}`, JSON.stringify(data).slice(0, 100));
    if (typeof res.status === "function" && typeof res.json === "function") {
      return res.status(status).json(data);
    }
    if (!res.headersSent) {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
    }
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error("[CHAT] sendJson error:", err);
  }
}

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatRequestBody = {
  messages?: unknown;
  message?: string;
  lang?: string;
  language?: string;
  missionType?: string;
  context?: {
    warframe?: { name?: string };
    [key: string]: unknown;
  } | null;
  advancedOptions?: {
    optimizationFocus?: string;
    [key: string]: unknown;
  } | null;
  manusTaskId?: string;
};

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  return typeof value === "object" && value !== null;
}

type ManusMessageEvent = {
  type?: string;
  assistant_message?: { content?: string };
  error_message?: { content?: string; error_type?: string };
  status_update?: { agent_status?: string; brief?: string; description?: string };
};

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is { role: "user" | "assistant"; content: unknown } => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as { role?: unknown; content?: unknown };
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    })
    .map(message => ({ role: message.role, content: typeof message.content === "string" ? message.content.trim().slice(0, 6000) : "" }))
    .filter(message => message.content.length > 0)
    .slice(-20);
}

function getManusBaseUrl() {
  return (process.env.MANUS_API_URL || "https://api.manus.ai").replace(/\/$/, "");
}

function getManusPrompt(systemPrompt: string, messages: ChatMessage[]) {
  const transcript = messages
    .map(message => `${message.role === "assistant" ? "Cephalon" : "Joueur"}: ${message.content}`)
    .join("\n");
  // Manus limits user text to approximately 5,000 tokens. Keep a conservative
  // character budget because the prompt is multilingual and token density varies.
  return `${systemPrompt}\n\n[Conversation à poursuivre]\n${transcript}`.slice(0, 16000);
}

async function manusJson(url: string, apiKey: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-manus-api-key": apiKey,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(50000),
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 1000) }; }
  if (!response.ok || data?.ok === false) {
    const message = data?.error?.message || data?.raw || `HTTP ${response.status}`;
    const code = data?.error?.code ? ` [${data.error.code}]` : "";
    throw new Error(`Manus API ${response.status}${code}: ${message}`);
  }
  return data;
}

async function callManusProvider(prompt: string, lang: "fr" | "en", existingTaskId?: string) {
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiKey) throw new Error("MANUS_API_KEY is missing");

  let taskId = existingTaskId;
  if (taskId) {
    await manusJson(`${getManusBaseUrl()}/v2/task.sendMessage`, apiKey, {
      method: "POST",
      body: JSON.stringify({
        task_id: taskId,
        message: { content: prompt },
        locale: lang,
        agent_profile: process.env.MANUS_AGENT_PROFILE || "manus-1.6-lite",
      }),
    });
  } else {
    const payload: Record<string, unknown> = {
      message: { content: prompt },
      locale: lang,
      title: "Cephalon Codex — Warframe Set Builder",
      hide_in_task_list: true,
      share_visibility: "private",
      agent_profile: process.env.MANUS_AGENT_PROFILE || "manus-1.6-lite",
    };
    if (process.env.MANUS_PROJECT_ID) payload.project_id = process.env.MANUS_PROJECT_ID;
    const created = await manusJson(`${getManusBaseUrl()}/v2/task.create`, apiKey, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    taskId = created.task_id;
  }

  if (!taskId) throw new Error("Manus API did not return a task_id");
  const deadline = Date.now() + 46000;
  while (Date.now() < deadline) {
    const events = await manusJson(`${getManusBaseUrl()}/v2/task.listMessages?task_id=${encodeURIComponent(taskId)}&order=desc&limit=50`, apiKey, { method: "GET" });
    const list = Array.isArray(events.messages) ? events.messages as ManusMessageEvent[] : [];
    const errorEvent = list.find(event => event.type === "error_message" || event.error_message?.content);
    if (errorEvent?.error_message?.content) {
      throw new Error(`Manus task error: ${errorEvent.error_message.content}`);
    }
    const answer = list.find(event => typeof event.assistant_message?.content === "string" && event.assistant_message.content.trim());
    if (answer?.assistant_message?.content) return { content: answer.assistant_message.content.trim(), taskId };
    const status = list.find(event => event.type === "status_update")?.status_update?.agent_status;
    if (status === "error") throw new Error("Manus task error");
    if (status === "waiting") throw new Error("Manus task is waiting for an unsupported confirmation");
    if (status === "stopped") break;
    await new Promise(resolve => setTimeout(resolve, 900));
  }
  throw new Error("Manus API task timed out");
}

async function callGeminiProvider(systemPrompt: string, messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/interactions";
  const input = messages.map(message => ({
  type: message.role === "assistant" ? "model_output" : "user_input",
  content: [{ type: "text", text: message.content }],
}));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      system_instruction: systemPrompt,
      input,
      store: false,
    }),
    signal: AbortSignal.timeout(50000),
  });

  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 1000) }; }

  if (!response.ok) {
    const message = data?.error?.message || data?.raw || `HTTP ${response.status}`;
    throw new Error(`Gemini API ${response.status}: ${message}`);
  }

  const content = Array.isArray(data?.steps)
    ? data.steps
        .filter((step: any) => step?.type === "model_output")
        .flatMap((step: any) => Array.isArray(step?.content) ? step.content : [])
        .map((part: any) => typeof part?.text === "string" ? part.text : "")
        .join("")
        .trim()
    : typeof data?.output_text === "string"
      ? data.output_text.trim()
      : "";

  if (!content) {
    const status = data?.status;
    const errorMessage = Array.isArray(data?.errors) ? data.errors[0]?.message : undefined;
    throw new Error(errorMessage || (status ? `Gemini returned no text (status: ${status})` : "Gemini returned no text"));
  }

  return { content };
}

export async function handleChatRequest(req: Request, res: Response) {
  console.log("[CHAT] handleChatRequest invoked");
  try {
    const request = req as Request & { body?: unknown; rawBody?: string | Buffer };
    const requestBody: unknown = request.body;
    let body: ChatRequestBody = isChatRequestBody(requestBody) ? requestBody : {};

    if (Object.keys(body).length === 0 && request.rawBody) {
      try {
        const parsed: unknown = JSON.parse(request.rawBody.toString());
        if (isChatRequestBody(parsed)) body = parsed;
      } catch {}
    }

    let messages = normalizeMessages(body.messages);
    if (messages.length === 0 && typeof body.message === "string") {
      const content = body.message.trim().slice(0, 6000);
      if (content.length > 0) messages = [{ role: "user" as const, content }];
    }

    if (messages.length === 0) {
      console.log("[CHAT] Invalid messages format, body was:", body);
      return sendJson(res, 400, { error: "Invalid messages format." });
    }

    const provider = String(process.env.LLM_PROVIDER || "manus").toLowerCase();
    const lang = (typeof body.lang === "string" ? body.lang : (typeof body.language === "string" ? body.language : "fr")) as "fr" | "en";

    const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY || process.env.VITE_FRONTEND_FORGE_API_KEY;
    const manusApiKey = process.env.MANUS_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (provider === "manus" && !manusApiKey) {
      console.log("[CHAT] Manus provider selected but MANUS_API_KEY is missing");
      return sendJson(res, 200, { reply: lang === "en" ? "⚠️ Manus API is not configured." : "⚠️ L'API Manus n'est pas configurée (clé API manquante)." });
    }
    if (provider === "gemini" && !geminiApiKey) {
      console.log("[CHAT] Gemini provider selected but GEMINI_API_KEY is missing");
      return sendJson(res, 200, { reply: lang === "en" ? "⚠️ Gemini API is not configured." : "⚠️ L'API Gemini n'est pas configurée (clé API manquante)." });
    }
    if (provider === "forge" && !forgeApiKey) {
      console.log("[CHAT] Forge provider selected but API key is missing");
      return sendJson(res, 200, { reply: lang === "en" ? "⚠️ Forge API is not configured." : "⚠️ L'API Forge n'est pas configurée (clé API manquante)." });
    }
    if (provider !== "manus" && provider !== "gemini" && provider !== "forge") {
      console.log("[CHAT] Unsupported LLM provider:", provider);
      return sendJson(res, 200, { reply: lang === "en" ? `⚠️ Unsupported LLM provider: ${provider}` : `⚠️ Fournisseur LLM non pris en charge : ${provider}` });
    }

    let syncInfo = "";
    try {
      const reportPath = path.resolve(process.cwd(), "data-sync-report.json");
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
        if (report && Array.isArray(report.processedItems)) {
          const recentItems = report.processedItems
            .filter((item: any) => item?.validationStatus === "validated" || item?.validationStatus === "review_required")
            .slice(-40)
            .map((item: any) => `${item.name} (${item.validationStatus})`)
            .join(", ");
          syncInfo = lang === "en"
            ? `\n\n[Wiki synchronization report] ${report.processedCount || report.processedItems.length} records processed, ${report.itemsWithStats || 0} with structured statistics. Recent items: ${recentItems || "none"}.`
            : `\n\n[Rapport de synchronisation Wiki] ${report.processedCount || report.processedItems.length} fiches traitées, ${report.itemsWithStats || 0} avec statistiques structurées. Items récents : ${recentItems || "aucun"}.`;
        }
      }
    } catch (e) {
      // Ignore report error
    }

    const missionType = typeof body.missionType === "string" ? body.missionType : "auto";
    const buildContext = body.context || null;
    const frameName = buildContext?.warframe?.name || "Warframe";
    const optimizationFocus = body.advancedOptions?.optimizationFocus || "balanced";

    const shardOpt = generateArchonShardRecommendations(frameName, missionType, optimizationFocus, lang);
    const rag = buildRagContext({
      query: messages[messages.length - 1]?.content || "",
      language: lang,
      missionType,
      buildContext,
      advancedOptions: body.advancedOptions || null,
    });
    console.log("[CHAT] RAG evidence:", rag.evidence.length, getRagDiagnostics());
    const shardsText = shardOpt.shards.map(s => `• Slot ${s.slot} : [${s.variant}] ${s.color} — ${s.effect} (${s.reason[lang]})`).join("\n");
    
    const shardContext = lang === "fr"
      ? `\n\n[Optimiseur d'Éclats d'Archonte recommandés pour ${frameName} en ${missionType}] :\n${shardOpt.summary.fr}\n${shardsText}`
      : `\n\n[Recommended Archon Shard Optimizer for ${frameName} in ${missionType}] :\n${shardOpt.summary.en}\n${shardsText}`;

    const buildSnapshot = JSON.stringify({ missionType, frameName, optimizationFocus, buildContext }, null, 2).slice(0, 12000);
    const systemPrompt = lang === "fr"
      ? `Tu es Cephalon Codex, l'assistant tactique expert de l'application WARFRAME Set Builder. Tu aides les joueurs à optimiser leurs builds pour le Steel Path et les missions de haut niveau.\n\n${syncInfo}${shardContext}\n\n[Snapshot du Builder]\n${buildSnapshot}\n\n[Contexte RAG récupéré]\n${rag.instructions}\n\nRéponds en français avec un ton professionnel de Cephalon. Sépare clairement les faits, les calculs du Builder et les recommandations. Si les preuves sont insuffisantes, demande une précision ou indique l'incertitude.`
      : `You are Cephalon Codex, the expert tactical assistant of WARFRAME Set Builder. You help players optimize builds for Steel Path and high-level missions.\n\n${syncInfo}${shardContext}\n\n[Builder snapshot]\n${buildSnapshot}\n\n[Retrieved RAG context]\n${rag.instructions}\n\nReply in English with a professional Cephalon tone. Clearly separate facts, Builder calculations, and recommendations. If evidence is insufficient, ask for clarification or state the uncertainty.`;

    if (provider === "manus") {
      try {
        const manusResult = await callManusProvider(getManusPrompt(systemPrompt, messages), lang, typeof body.manusTaskId === "string" ? body.manusTaskId : undefined);
        console.log("[CHAT] Manus API success, reply length:", manusResult.content.length);
        return sendJson(res, 200, { reply: manusResult.content, manusTaskId: manusResult.taskId });
      } catch (error: any) {
        const message = error?.message || "unknown";
        console.error("[CHAT] Manus API error:", message);
        return sendJson(res, 200, { reply: lang === "en" ? `⚠️ Manus API error: ${message}` : `⚠️ Erreur Manus : ${message}` });
      }
    }

    if (provider === "gemini") {
      try {
        const geminiResult = await callGeminiProvider(systemPrompt, messages);
        console.log("[CHAT] Gemini API success, reply length:", geminiResult.content.length);
        return sendJson(res, 200, { reply: geminiResult.content });
      } catch (geminiError: any) {
        const geminiMessage = geminiError?.message || "unknown";
        console.error("[CHAT] Gemini API error, falling back to Manus:", geminiMessage);

        if (!manusApiKey) {
          return sendJson(res, 200, { reply: lang === "en" ? `⚠️ Gemini API error: ${geminiMessage}` : `⚠️ Erreur Gemini : ${geminiMessage}` });
        }

        try {
          const manusResult = await callManusProvider(getManusPrompt(systemPrompt, messages), lang, typeof body.manusTaskId === "string" ? body.manusTaskId : undefined);
          console.log("[CHAT] Manus fallback success, reply length:", manusResult.content.length);
          return sendJson(res, 200, { reply: manusResult.content, manusTaskId: manusResult.taskId });
        } catch (manusError: any) {
          const manusMessage = manusError?.message || "unknown";
          console.error("[CHAT] Manus fallback error:", manusMessage);
          return sendJson(res, 200, { reply: lang === "en" ? `⚠️ Gemini failed and Manus fallback also failed. Gemini: ${geminiMessage} | Manus: ${manusMessage}` : `⚠️ Gemini a échoué et le fallback Manus a également échoué. Gemini : ${geminiMessage} | Manus : ${manusMessage}` });
        }
      }
    }

    const rawApiUrl = process.env.BUILT_IN_FORGE_API_URL || process.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.manus.ai";
    const endpoint = `${rawApiUrl.replace(/\/v1\/?$/, "")}/v1/chat/completions`;
    console.log("[CHAT] Fetching Forge endpoint:", endpoint);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${forgeApiKey}` },
      body: JSON.stringify({ model: "gpt-5-mini", messages: [{ role: "system", content: systemPrompt }, ...messages], temperature: 0.55 }),
      signal: AbortSignal.timeout(50000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LLM Proxy error:", response.status, errText.slice(0, 1000));
      return sendJson(res, 200, { reply: lang === "fr" ? `⚠️ Erreur de communication avec le Cephalon IA (Code ${response.status}).` : `⚠️ Cephalon communication error (Code ${response.status}).` });
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || (lang === "fr" ? "Aucune réponse générée." : "No response generated.");
    console.log("[CHAT] Forge success, reply length:", content.length);
    return sendJson(res, 200, { reply: content });
  } catch (error: any) {
    console.error("Chat API exception:", error);
    return sendJson(res, 200, {
      reply: "⚠️ Erreur interne du serveur de chat : " + (error?.message || "Inconnue")
    });
  }
}
