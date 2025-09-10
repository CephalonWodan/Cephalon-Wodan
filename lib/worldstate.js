// lib/worldstate.js
// Option C : récupère le worldstate officiel et le parse côté Vercel (v5)
// + cache mémoire 60 s + entrée forcée en Buffer pour éviter ERR_INVALID_ARG_TYPE

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions",
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

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

// ---- Cache mémoire (60s par défaut)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
};

async function loadParser() {
  // Certains bundlers exposent un default, d’autres non — on couvre les 2 cas
  const mod = await import("warframe-worldstate-parser");
  const fn = mod?.default ?? mod;
  if (typeof fn !== "function") {
    throw new Error("Invalid parser export: expected function");
  }
  return fn;
}

async function fetchAndParse(platform) {
  const resp = await fetch(worldstateUrl(platform), { cache: "no-store" });
  if (!resp.ok) throw new Error(`worldstate ${platform} ${resp.status}`);

  // On force l’entrée du parseur en Buffer UTF-8, pour éviter l’ERR_INVALID_ARG_TYPE
  const rawText = await resp.text();
  if (typeof rawText !== "string" || rawText.length === 0) {
    throw new Error(`worldstate ${platform} empty payload`);
  }
  const input = Buffer.from(rawText, "utf8");

  const parse = await loadParser();
  const parsed = await parse(input);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("parser returned invalid result");
  }
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
  const ws = await getParsed(platform);
  return ensureShape(section, ws?.[section]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions", // ← inclus dans l’agrégat
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
