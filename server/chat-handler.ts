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

function normalizeMessages(value: unknown): Array<{ role: "user" | "assistant"; content: string }> {
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

    let rawApiUrl = process.env.BUILT_IN_FORGE_API_URL || process.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.manus.ai";
    rawApiUrl = rawApiUrl.replace(/\/v1\/?$/, "");
    const endpoint = `${rawApiUrl}/v1/chat/completions`;

    const apiKey = process.env.BUILT_IN_FORGE_API_KEY || process.env.VITE_FRONTEND_FORGE_API_KEY;

    if (!apiKey) {
      console.log("[CHAT] API key missing");
      return sendJson(res, 200, {
        reply: "⚠️ Le service LLM n'est pas configuré (clé API manquante)."
      });
    }

    const lang = (typeof body?.lang === "string" ? body.lang : "fr") as "fr" | "en";

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

    console.log("[CHAT] Fetching LLM endpoint:", endpoint);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.55,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LLM Proxy error:", response.status, errText);
      return sendJson(res, 200, {
        reply: lang === "fr" 
          ? `⚠️ Erreur de communication avec le Cephalon IA (Code ${response.status}).` 
          : `⚠️ Cephalon communication error (Code ${response.status}).`
      });
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || (lang === "fr" ? "Aucune réponse générée." : "No response generated.");
    console.log("[CHAT] Success, reply length:", content.length);
    return sendJson(res, 200, { reply: content });
  } catch (error: any) {
    console.error("Chat API exception:", error);
    return sendJson(res, 200, {
      reply: "⚠️ Erreur interne du serveur de chat : " + (error?.message || "Inconnue")
    });
  }
}
