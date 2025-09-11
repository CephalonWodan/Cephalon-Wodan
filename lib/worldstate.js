// lib/worldstate.js
// WorldState parser v5 + cache 60s + compat CJS/ESM + endpoints officiels (robuste)

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

const isFn = (x) => typeof x === "function";

function isClass(fn) {
  if (typeof fn !== "function") return false;
  const src = Function.prototype.toString.call(fn);
  return /^class\s/.test(src) || /classCallCheck\(/.test(src);
}

// Appelle un candidat en essayant d'abord comme fonction, puis comme classe.
async function callCandidate(candidate, text) {
  if (!isFn(candidate)) return null;

  // Essayer en fonction (v5 wrapper)
  try {
    return await candidate(text);
  } catch (e) {
    const msg = String(e && e.message || e);
    // Si on a appelé une classe sans `new`, retenter avec `new`
    if (/constructor/i.test(msg) && /without 'new'|must be called with 'new'/.test(msg)) {
      try {
        return new candidate(text);
      } catch {
        return null;
      }
    }
    // Pour tout autre échec, on rend la main au parseur pour tenter un autre export
    return null;
  }
}

// Utilise en priorité les helpers nommés si présents
async function tryHelperParsers(modLike, text) {
  if (!modLike) return null;

  // parse(text)
  if (isFn(modLike.parse)) {
    try {
      const v = await modLike.parse(text);
      if (v) return v;
    } catch {}
  }

  // parseAsyncArray([text])
  if (isFn(modLike.parseAsyncArray)) {
    try {
      const arr = await modLike.parseAsyncArray([text]);
      if (arr && arr[0]) return arr[0];
    } catch {}
  }

  // parseArray([text]) (sync)
  if (isFn(modLike.parseArray)) {
    try {
      const arr = modLike.parseArray([text]);
      if (arr && arr[0]) return arr[0];
    } catch {}
  }

  return null;
}

async function parseWorldstate(text) {
  // 1) CommonJS d'abord (souvent la build la plus "stable")
  try {
    const cjs = nodeRequire("warframe-worldstate-parser");

    // a) Helpers nommés
    let ws = await tryHelperParsers(cjs, text);
    if (ws) return ws;

    ws = await tryHelperParsers(cjs?.default, text);
    if (ws) return ws;

    // b) Export direct (fonction ou classe) via wrapper
    ws = await callCandidate(cjs, text);
    if (ws) return ws;

    // c) Export default (fonction ou classe) via wrapper
    ws = await callCandidate(cjs?.default, text);
    if (ws) return ws;

  } catch {
    // CJS non dispo → ESM
  }

  // 2) ESM
  const mod = await import("warframe-worldstate-parser");

  // a) Helpers nommés sur le module
  let ws = await tryHelperParsers(mod, text);
  if (ws) return ws;

  // b) Helpers sur default
  ws = await tryHelperParsers(mod?.default, text);
  if (ws) return ws;

  // c) Export default via wrapper
  ws = await callCandidate(mod?.default, text);
  if (ws) return ws;

  // d) Export nommé "WorldState" (classe) via wrapper — dernier recours
  ws = await callCandidate(mod?.WorldState, text);
  if (ws) return ws;

  // Logs utiles si ça échoue encore
  try {
    console.error("[worldstate] parser exports keys:", Object.keys(mod || {}));
    if (mod?.default && typeof mod.default === "object") {
      console.error("[worldstate] parser default keys:", Object.keys(mod.default));
    }
  } catch {}

  throw new Error("warframe-worldstate-parser: aucun export compatible n'a fonctionné");
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