// lib/worldstate.js
// WorldState parser v5 + cache 60s + compat CJS/ESM + endpoints officiels

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

async function tryCallOrConstruct(candidate, text) {
  if (typeof candidate !== "function") return null;

  // 1) Essayer comme fonction async (v5)
  try {
    return await candidate(text);
  } catch (e) {
    // Si c'est une classe appelée sans `new`, tente avec `new`
    const msg = String(e && e.message || e);
    if (/constructor/i.test(msg) && /without 'new'|must be called with 'new'/.test(msg)) {
      try {
        return new candidate(text);
      } catch {
        // échec → on laisse le caller tester un autre export
      }
    }
  }

  // 2) Si on détecte explicitement une classe, tente `new`
  if (isClass(candidate)) {
    try {
      return new candidate(text);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Parser : on essaie d'abord CJS (souvent exporté en FONCTION), puis ESM,
 * et on gère automatiquement "fonction vs classe" pour éviter l'erreur "without 'new'".
 */
async function parseWorldstate(text) {
  // 1) CommonJS
  try {
    const cjs = nodeRequire("warframe-worldstate-parser");
    // cas: export direct = fn | classe
    let ws = await tryCallOrConstruct(cjs, text);
    if (ws) return ws;

    // cas: export par défaut dans CJS: { default: fn | classe }
    if (cjs && typeof cjs.default !== "undefined") {
      ws = await tryCallOrConstruct(cjs.default, text);
      if (ws) return ws;
    }
  } catch {
    // pas de CJS -> on passe à ESM
  }

  // 2) ESM
  const mod = await import("warframe-worldstate-parser");

  // priorité à default
  let ws = await tryCallOrConstruct(mod?.default, text);
  if (ws) return ws;

  // certains bundles exposent aussi une classe nommée
  ws = await tryCallOrConstruct(mod?.WorldState, text);
  if (ws) return ws;

  // fallback: tenter l'objet module lui-même (peu probable)
  ws = await tryCallOrConstruct(mod, text);
  if (ws) return ws;

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