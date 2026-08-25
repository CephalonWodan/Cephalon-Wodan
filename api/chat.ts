// =============================================================================
// Vercel Serverless Function — Cephalon Codex chat endpoint
// =============================================================================
// The API key is read only from server-side environment variables. This file is
// intentionally outside client/ so it is never bundled into the browser.

import { handleChatRequest } from "../server/chat-handler.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  [key: string]: unknown;
};

type VercelResponse = {
  statusCode?: number;
  headersSent?: boolean;
  status: (code: number) => VercelResponse;
  json: (payload: unknown) => VercelResponse;
  setHeader: (name: string, value: string | string[]) => void;
  end: (body?: string) => void;
};

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    res.status(status).json(payload);
    return;
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    await handleChatRequest(req as never, res as never);
  } catch (error) {
    console.error("[VERCEL_CHAT] Unhandled handler error", error);
    if (!res.headersSent) {
      sendJson(res, 500, { error: "Cephalon chat unavailable" });
    }
  }
}

export const config = {
  maxDuration: 60,
};

