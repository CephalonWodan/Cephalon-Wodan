// lib/worldstate.js
// WorldState parser v5 + cache 60s + compat CJS/ESM + endpoints officiels + logs debug

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi", "mob"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions"
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

// Endpoints exacts (PC/PS4/XB1/Switch/iOS)
const PLATFORM_HOST = {
  pc:  "content.warframe.com",
  ps4: "content-ps4.warframe.com",
  xb1: "content-xb1.warframe.com",
  swi: "content-swi.warframe.com",
  mob: "content-mob.warframe.com",
};
function worldstateUrl(platform = "pc") {
  const host = PLATFORM_HOST[platform] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

// Cache mémoire
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
  mob: { at: 0, parsed: null },
};

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": "Cephalon-Wodan/1.0 (+worldstate)" },
  });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== "string") throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

/* --------------------------- Parser robuste --------------------------- */

import { createRequire } from "node:module";
const nodeRequire = createRequire(import.meta.url);

function isClass(fn) {
  if (typeof fn !== "function") return false;
  const src = Function.prototype.toString.call(fn);
  return /^class\s/.test(src) || /classCallCheck\(/.test(src);
}

function pickFunctionExport(modLike) {
  // essaie plusieurs endroits potentiels
  const candidates = [
    modLike,
    modLike?.default,
    modLike?.default?.default,
    modLike?.parse,
    modLike?.default?.parse,
    modLike?.WorldState,          // classe (fallback)
    modLike?.default?.WorldState, // classe (fallback)
  ];
  for (const c of candidates) {
    if (typeof c === "function") return c;
  }
  return null;
}

async function callAsFunctionOrClass(candidate, text) {
  if (typeof candidate !== "function") return null;

  // 1) tenter comme fonction (v5)
  try {
    return await candidate(text);
  } catch (e) {
    const msg = String(e && e.message || e);
    // si c'est une classe appelée sans new, on tente avec new
    if (/constructor/i.test(msg) && /without 'new'|must be called with 'new'/.test(msg)) {
      try {
        return new candidate(text);
      } catch {
        return null;
      }
    }
  }

  // 2) si on reconnaît une classe, essayer `new`
  if (isClass(candidate)) {
    try {
      return new candidate(text);
    } catch {
      return null;
    }
  }
  return null;
}

async function parseWorldstate(text) {
  // 1) CommonJS
  try {
    const cjs = nodeRequire("warframe-worldstate-parser");
    let picked = pickFunctionExport(cjs);
    let ws = await callAsFunctionOrClass(picked, text);
    if (ws) return ws;

    // parfois CJS expose { default: ... }
    picked = pickFunctionExport(cjs?.default);
    ws = await callAsFunctionOrClass(picked, text);
    if (ws) return ws;
  } catch {
    // ignore → tentative ESM
  }

  // 2) ESM
  const mod = await import("warframe-worldstate-parser");

  // default, nested default, exports nommés
  let picked = pickFunctionExport(mod);
  let ws = await callAsFunctionOrClass(picked, text);
  if (ws) return ws;

  picked = pickFunctionExport(mod?.default);
  ws = await callAsFunctionOrClass(picked, text);
  if (ws) return ws;

  // logs debug : quelles clés sont réellement dispo ?
  try {
    // Ces logs sont utiles si ça plante encore ; tu peux les laisser.
    console.error("[worldstate] parser exports keys:", Object.keys(mod || {}));
    if (mod?.default && typeof mod.default === "object") {
      console.error("[worldstate] parser default keys:", Object.keys(mod.default));
    }
  } catch {}

  throw new Error("warframe-worldstate-parser: aucun export compatible (fn/classe) n'a fonctionné");
}

/* ----------------------- Accès & façonnage JSON ----------------------- */

async function getParsed(platform) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchWorldstateText(platform);
  const ws = await parseWorldstate(text);

  // Normalise en JSON “pur” (les modèles ont toJSON)
  const parsed = JSON.parse(JSON.stringify(ws));

  _cache[platform] = { at: now, parsed };
  return parsed;
}

// Formes attendues
const LIST_SECTIONS = new Set(["fissures", "alerts", "invasions", "syndicateMissions"]);
const OBJ_SECTIONS  = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "nightwave", "sortie", "archonHunt", "voidTrader"
]);

function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

export async function getSection(platform, section /*, lang */) {
  const sec = section === "bounties" ? "syndicateMissions" : section;
  const ws = await getParsed(platform);
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions"
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}