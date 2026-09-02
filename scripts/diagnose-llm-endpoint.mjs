#!/usr/bin/env node
/**
 * Diagnostic sécurisé du proxy LLM utilisé par Cephalon Codex.
 *
 * Usage:
 *   BUILT_IN_FORGE_API_URL=https://... \
 *   BUILT_IN_FORGE_API_KEY=... \
 *   node scripts/diagnose-llm-endpoint.mjs
 *
 * La clé n’est jamais affichée. Le test de chat peut être désactivé avec
 * DIAGNOSE_CHAT=0. Le modèle peut être forcé avec LLM_MODEL.
 */

const rawUrl = process.env.BUILT_IN_FORGE_API_URL || process.env.VITE_FRONTEND_FORGE_API_URL || "";
const apiKey = process.env.BUILT_IN_FORGE_API_KEY || process.env.VITE_FRONTEND_FORGE_API_KEY || "";
const model = process.env.LLM_MODEL || "gpt-5-mini";
const runChat = process.env.DIAGNOSE_CHAT !== "0";
const timeoutMs = Number(process.env.DIAGNOSE_TIMEOUT_MS || 20000);

function normalizeBase(value) {
  return String(value || "").trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
}

function redact(value) {
  if (!value) return "(absent)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function classify(status) {
  if (status === 200) return "OK";
  if (status === 401 || status === 403) return "AUTHENTICATION_OR_PERMISSION";
  if (status === 404) return "URL_OR_PATH_NOT_FOUND";
  if (status === 405) return "METHOD_NOT_ALLOWED_BUT_ROUTE_EXISTS";
  if (status >= 500) return "UPSTREAM_SERVER_ERROR";
  return "HTTP_ERROR";
}

async function request(label, url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    const preview = text.replace(/\s+/g, " ").slice(0, 240);
    console.log(`\n[${label}]`);
    console.log(`url=${url}`);
    console.log(`status=${response.status} classification=${classify(response.status)} durationMs=${Date.now() - started}`);
    console.log(`contentType=${response.headers.get("content-type") || "(absent)"}`);
    console.log(`bodyPreview=${preview || "(empty)"}`);
    return { ok: response.ok, status: response.status, text };
  } catch (error) {
    console.log(`\n[${label}]`);
    console.log(`url=${url}`);
    console.log(`networkError=${error?.name === "AbortError" ? "TIMEOUT" : error?.message || String(error)}`);
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timer);
  }
}

console.log("Cephalon Codex — diagnostic du proxy LLM");
console.log(`rawBaseUrl=${rawUrl || "(absent)"}`);
console.log(`normalizedBaseUrl=${normalizeBase(rawUrl) || "(absent)"}`);
console.log(`apiKey=${redact(apiKey)}`);
console.log(`model=${model}`);
console.log(`chatTest=${runChat ? "enabled" : "disabled"}`);

if (!rawUrl || !apiKey) {
  console.log("\nRESULT=CONFIGURATION_INCOMPLETE");
  console.log("Vérifiez BUILT_IN_FORGE_API_URL et BUILT_IN_FORGE_API_KEY dans l’environnement testé.");
  process.exitCode = 2;
} else {
  const base = normalizeBase(rawUrl);
  const headers = { Authorization: `Bearer ${apiKey}` };
  const models = await request("models", `${base}/v1/models`, { headers });

  if (!models.ok && rawUrl !== base) {
    await request("models-with-original-base", `${rawUrl.replace(/\/+$/, "")}/models`, { headers });
  }

  if (runChat) {
    const payload = {
      model,
      messages: [
        { role: "system", content: "Reply with exactly DIAGNOSTIC_OK." },
        { role: "user", content: "Diagnostic de connectivité. Réponds exactement DIAGNOSTIC_OK." },
      ],
    };
    const chat = await request("chat-completions", `${base}/v1/chat/completions`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (chat.status === 404) {
      console.log("\nDIAGNOSIS=BASE_URL_OR_ROUTE_IS_WRONG");
      console.log("Le serveur répond, mais le chemin /v1/chat/completions est introuvable.");
    } else if (chat.status === 401 || chat.status === 403) {
      console.log("\nDIAGNOSIS=KEY_INVALID_OR_UNAUTHORIZED");
      console.log("L’URL existe, mais la clé n’est pas acceptée ou n’a pas les droits requis.");
    } else if (chat.ok) {
      console.log("\nDIAGNOSIS=UPSTREAM_CHAT_OK");
    } else {
      console.log(`\nDIAGNOSIS=UPSTREAM_RETURNED_${chat.status}`);
    }
  }
}

console.log("\nNo secret was printed by this script.");
