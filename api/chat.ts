// Vercel Function: expose the Cephalon Codex chat endpoint without shipping secrets to the browser.
// Tenno Codex design note: this file is transport-only; prompt rules remain in server/chat-handler.ts.

import type { IncomingMessage, ServerResponse } from "node:http";
import { handleChatRequest } from "../server/chat-handler.js";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  rawBody?: string;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  json?: (payload: unknown) => void;
};

async function readRequestBody(req: VercelRequest): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) return req.body;
  if (req.rawBody) {
    try {
      return JSON.parse(req.rawBody);
    } catch {
      return null;
    }
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return null;

  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readRequestBody(req);
    const compatibleRequest = Object.assign(req, {
      body,
      rawBody: typeof body === "string" ? body : undefined,
    });

    return await handleChatRequest(compatibleRequest as never, res as never);
  } catch (error) {
    console.error("[VERCEL /api/chat] Unhandled request error:", error);
    return sendJson(res, 500, { error: "Chat service unavailable" });
  }
}

