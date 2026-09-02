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
  return `${systemPrompt}\n\n[Conversation à poursuivre]\n${transcript}`.slice(0, 28000);
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
    throw new Error(`Manus API ${response.status}: ${message}`);
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
    const answer = list.find(event => typeof event.assistant_message?.content === "string" && event.assistant_message.content.trim());
    if (answer?.assistant_message?.content) return { content: answer.assistant_message.content.trim(), taskId };
    const status = list.find(event => event.type === "status_update")?.status_update?.agent_status;
    if (status === "error") throw new Error(list.find(event => event.error_message)?.error_message?.content || "Manus task error");
    if (status === "waiting") throw new Error("Manus task is waiting for an unsupported confirmation");
    if (status === "stopped") break;
    await new Promise(resolve => setTimeout(resolve, 900));
  }
  throw new Error("Manus API task timed out");
}

export async function handleChatRequest(req: Request, res: Response) {
  console.log("[CHAT] handleChatRequest invoked");
  try {
    let body = req.body;
    if (!body && (req as any).rawBody) {
      try {
        body = JSON.parse((req as any).rawBody);
      } catch {}
    }

    let messages = normalizeMessages(body?.messages);
    if (messages.length === 0 && typeof body?.message === "string") {
      const content = body.message.trim().slice(0, 6000);
      if (content.length > 0) messages = [{ role: "user" as const, content }];
    }

    if (messages.length === 0) {
      console.log("[CHAT] Invalid messages format, body was:", body);
      return sendJson(res, 400, { error: "Invalid messages format." });
    }

    const provider = String(process.env.LLM_PROVIDER || "manus").toLowerCase();
    const lang = (typeof body?.lang === "string" ? body.lang : (typeof body?.language === "string" ? body.language : "fr")) as "fr" | "en";

    const rawApiUrl = process.env.BUILT_IN_FORGE_API_URL || process.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.manus.ai";
    const endpoint = `${rawApiUrl.replace(/\/v1\/?$/, "")}/v1/chat/completions`;
    const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY || process.env.VITE_FRONTEND_FORGE_API_KEY;
    const manusApiKey = process.env.MANUS_API_KEY;

    if (provider === "manus" && !manusApiKey) {
      console.log("[CHAT] Manus provider selected but MANUS_API_KEY is missing");
      return sendJson(res, 200, { reply: lang === "en" ? "⚠️ Manus API is not configured." : "⚠️ L'API Manus n'est pas configurée (clé API manquante)." });
    }
    if (provider !== "manus" && !forgeApiKey) {
      console.log("[CHAT] Forge provider selected but API key is missing");
      return sendJson(res, 200, { reply: lang === "en" ? "⚠️ The LLM service is not configured (missing API key)." : "⚠️ Le service LLM n'est pas configuré (clé API manquante)." });
    }

    // Load sync report to inject newly synchronized items into the assistant's awareness
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

    const missionType = typeof body?.missionType === "string" ? body.missionType : "auto";
    const buildContext = body?.context || null;
    const frameName = buildContext?.warframe?.name || "Warframe";
    const optimizationFocus = body?.advancedOptions?.optimizationFocus || "balanced";

    // Generate Archon Shard optimizer payload
    const shardOpt = generateArchonShardRecommendations(frameName, missionType, optimizationFocus, lang);
    const rag = buildRagContext({
      query: messages[messages.length - 1]?.content || "",
      language: lang,
      missionType,
      buildContext,
      advancedOptions: body?.advancedOptions || null,
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
        const manusResult = await callManusProvider(getManusPrompt(systemPrompt, messages), lang, typeof body?.manusTaskId === "string" ? body.manusTaskId : undefined);
        console.log("[CHAT] Manus API success, reply length:", manusResult.content.length);
        return sendJson(res, 200, { reply: manusResult.content, manusTaskId: manusResult.taskId });
      } catch (error: any) {
        console.error("[CHAT] Manus API error:", error?.message || "unknown");
        return sendJson(res, 200, { reply: lang === "en" ? "⚠️ Unable to contact Manus API right now." : "⚠️ Impossible de contacter l'API Manus pour le moment." });
      }
    }

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
