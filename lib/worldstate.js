// lib/worldstate.js
// Option C : on récupère le worldstate officiel (content.warframe.com) et on le parse côté Vercel
// ESM + Node 20 (fetch global)

import WorldstateParser from "warframe-worldstate-parser";

// Plates-formes autorisées
export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);

// Sections exposées (noms harmonisés avec le parser v5)
export const ALLOWED_SECTIONS = new Set([
  // Cycles
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  // Activités
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  // Marchands
  "voidTrader",
  // Primes
  "syndicateMissions",
  // (ajoute ici si tu veux plus tard: "zarimanCycle", "dailyDeals", "steelPath", ...)
]);

// Langue (FR/EN) — pour l’instant informatif ; la source officielle est en anglais
export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

// Hôtes worldstate par plateforme
const PLATFORM_HOST = {
  pc:  "content.warframe.com",
  ps4: "content.ps4.warframe.com",
  xb1: "content.xb1.warframe.com",
  swi: "content.swi.warframe.com",
};

function worldstateUrl(platform = "pc") {
  const host = PLATFORM_HOST[platform] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

// ---- Cache mémoire (valable tant que l’instance serverless vit)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000); // 60s par défaut
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
};

async function fetchAndParse(platform) {
  const url = worldstateUrl(platform);
  const raw = await fetch(url, { method: "GET" }).then(r => {
    if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
    return r.text();
  });
  // v5 : la lib exporte une fonction (async) qui retourne l’objet parsé
  const parsed = await WorldstateParser(raw);
  return parsed;
}

async function getParsed(platform) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;
  const parsed = await fetchAndParse(platform);
  _cache[platform] = { at: now, parsed };
  return parsed;
}

// Forme des retours : listes vs objets
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

// ---- API lib
export async function getSection(platform, section /*, lang */) {
  const ws = await getParsed(platform);
  return ensureShape(section, ws?.[section]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader",
    // ajoute "syndicateMissions" si tu veux l’inclure dans l’agrégat racine
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
