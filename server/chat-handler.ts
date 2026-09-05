import type { IncomingMessage, ServerResponse } from "node:http";
import { retrieveRagEvidence, buildRagContext } from "./rag-retriever.js";
import { tryAnswerSimpleFact } from "./simple-fact-router.js";

// Keep the request/response handling framework-agnostic so the same route works
// in Vercel serverless functions and the local Vite middleware.
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: unknown;
  language?: "fr" | "en";
  provider?: "manus" | "gemini" | "forge";
  buildSnapshot?: unknown;
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
    .filter((message): message is { role: "user" | "assistant"; content: string } => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as { role?: unknown; content?: unknown };
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    })
    .map(message => ({ role: message.role, content: message.content.trim().slice(0, 3500) }))
    .filter(message => message.content.length > 0)
    .slice(-12);
}

function getManusBaseUrl() {
  return (process.env.MANUS_API_URL || "https://api.manus.ai").replace(/\/$/, "");
}

function getManusPrompt(systemPrompt: string, messages: ChatMessage[]) {
  const transcript = messages.map(message => `${message.role === "assistant" ? "Cephalon" : "Joueur"}: ${message.content}`).join("\n");
  return `${systemPrompt}\n\n[Conversation à poursuivre]\n${transcript}`.slice(0, 14000);
}
