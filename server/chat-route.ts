import type { Request, Response } from "express";
import { handleChatRequest } from "./chat-handler.js";
import { tryAnswerSimpleFact } from "./simple-fact-router.js";

function extractLastUserMessage(body: any): string {
  if (Array.isArray(body?.messages)) {
    for (let index = body.messages.length - 1; index >= 0; index -= 1) {
      const message = body.messages[index];
      if (message?.role === "user" && typeof message.content === "string") {
        return message.content.trim();
      }
    }
  }
  return typeof body?.message === "string" ? body.message.trim() : "";
}

function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(data);
  }

  if (!res.headersSent) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
  }

  return res.end(JSON.stringify(data));
}

export async function handleChatRoute(req: Request, res: Response) {
  const body = (req as any).body;
  const query = extractLastUserMessage(body);
  const language = (typeof body?.lang === "string"
    ? body.lang
    : typeof body?.language === "string"
      ? body.language
      : "fr") === "en" ? "en" : "fr";

  try {
    const directReply = tryAnswerSimpleFact(query, language);
    if (directReply) {
      console.log("[CHAT] Direct Codex answer — Gemini/Manus bypassed:", query.slice(0, 120));
      return sendJson(res, 200, { reply: directReply, source: "codex" });
    }
  } catch (error) {
    console.error("[CHAT] Direct Codex router error, continuing to LLM:", error);
  }

  return handleChatRequest(req, res);
}
