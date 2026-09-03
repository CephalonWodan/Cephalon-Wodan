import type { Request, Response } from "express";
import { handleChatRequest } from "./chat-handler.js";
import { tryAnswerSimpleFact } from "./simple-fact-router.js";

function extractLastUserMessage(body: any): string {
  if (Array.isArray(body?.messages)) {
    for (let index = body.messages.length - 1; index >= 0; index -= 1) {
      const message = body.messages[index];
      if (message?.role === "user" && typeof message.content === "string") return message.content.trim();
    }
  }
  return typeof body?.message === "string" ? body.message.trim() : "";
}

function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === "function" && typeof res.json === "function") return res.status(status).json(data);
  if (!res.headersSent) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
  }
  return res.end(JSON.stringify(data));
}

type BuildMod = { name: string; rank: number };

function extractValidatedRecommendation(reply: string, query: string): any | null {
  const match = reply.match(/```json:recommendation\s*([\s\S]*?)\s*```/i) || reply.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) return null;
  let raw: any;
  try { raw = JSON.parse(match[1]); } catch { return null; }
  if (!raw || !Array.isArray(raw.mods)) return null;

  const highLevel = /steel\s*path|niveau\s*(?:1[5-9]\d|[2-9]\d\d)|level\s*(?:1[5-9]\d|[2-9]\d\d)|endurance|endgame/i.test(query);
  const genericDefense = new Set(["vitality", "primed vitality", "umbral vitality", "adaptation"]);
  const justifications = raw.justifications && typeof raw.justifications === "object" ? raw.justifications : {};

  const mods: BuildMod[] = [];
  for (const item of raw.mods.slice(0, 8)) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    if (!name) continue;
    const normalized = name.toLowerCase();
    if (highLevel && genericDefense.has(normalized) && typeof justifications[name] !== "string") continue;
    const rankNumber = Number(item.rank);
    const rank = Number.isFinite(rankNumber) ? Math.max(0, Math.min(10, Math.round(rankNumber))) : 0;
    if (!mods.some(mod => mod.name.toLowerCase() === normalized)) mods.push({ name, rank });
  }
  if (!mods.length) return null;

  return {
    ...raw,
    mods,
    validationStatus: "structurally_validated",
    highLevelDefensePolicy: highLevel ? "generic_defense_requires_justification" : "normal",
  };
}

function wrapResponseForBuildValidation(res: any, query: string) {
  const proxy = Object.create(res);
  const originalJson = typeof res.json === "function" ? res.json.bind(res) : null;
  const originalEnd = typeof res.end === "function" ? res.end.bind(res) : null;
  proxy.status = (code: number) => { if (typeof res.status === "function") res.status(code); else res.statusCode = code; return proxy; };
  proxy.setHeader = (...args: any[]) => res.setHeader(...args);
  proxy.json = (payload: any) => {
    if (payload && typeof payload.reply === "string") {
      const recommendation = extractValidatedRecommendation(payload.reply, query);
      if (recommendation) payload = { ...payload, buildRecommendation: recommendation };
    }
    if (originalJson) return originalJson(payload);
    if (!res.headersSent) res.statusCode = 200;
    return originalEnd ? originalEnd(JSON.stringify(payload)) : undefined;
  };
  proxy.end = (body?: any) => {
    if (typeof body === "string") {
      try {
        const payload = JSON.parse(body);
        if (payload && typeof payload.reply === "string") {
          const recommendation = extractValidatedRecommendation(payload.reply, query);
          if (recommendation) return proxy.json({ ...payload, buildRecommendation: recommendation });
        }
      } catch {}
    }
    return originalEnd ? originalEnd(body) : undefined;
  };
  return proxy;
}

export async function handleChatRoute(req: Request, res: Response) {
  const body = (req as any).body;
  const query = extractLastUserMessage(body);
  const language = (typeof body?.lang === "string" ? body.lang : typeof body?.language === "string" ? body.language : "fr") === "en" ? "en" : "fr";

  try {
    const directReply = tryAnswerSimpleFact(query, language);
    if (directReply) {
      console.log("[CHAT] Direct Codex answer — Gemini/Manus bypassed:", query.slice(0, 120));
      return sendJson(res, 200, { reply: directReply, source: "codex" });
    }
  } catch (error) {
    console.error("[CHAT] Direct Codex router error, continuing to LLM:", error);
  }

  return handleChatRequest(req, wrapResponseForBuildValidation(res, query));
}
