// lib/worldstate.js
// Option C (Vercel): fetch worldState.php, parse avec warframe-worldstate-parser v5
// Corrections : instanciation avec `new WorldState(...)` + toJSON() + cache (plateforme, langue)

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

// ---- Cache mémoire (clé: `${platform}:${lang}`) 60s par défaut
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const cache = new Map(); // key -> { at, parsed }
const ck = (p, l) => `${p}:${l}`;

async function loadParserClass() {
  const mod = await import("warframe-worldstate-parser");
  // La lib peut exposer la classe en default OU nommée
  const Cls = mod?.default ?? mod?.WorldState ?? mod;
  if (typeof Cls !== "function") {
    throw new Error("Invalid parser export (expected class WorldState)");
  }
  return Cls;
}

async function fetchAndParse(platform, lang) {
  const resp = await fetch(worldstateUrl(platform), { cache: "no-store" });
  if (!resp.ok) throw new Error(`worldstate ${platform} ${resp.status}`);

  const rawText = await resp.text();
  if (typeof rawText !== "string" || rawText.length === 0) {
    throw new Error(`worldstate ${platform} empty payload`);
  }

  const WorldState = await loadParserClass();
  // v5 attend un string / Buffer ou un objet, et supporte { locale }
  const instance = new WorldState(rawText, { locale: lang });
  // On préfère produire un POJO (plain object) pour res.json()
  const parsed = typeof instance.toJSON === "function" ? instance.toJSON() : instance;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("parser returned invalid result");
  }
  return parsed;
}

async function getParsed(platform, lang) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const key = ck(platform, lang);
  const item = cache.get(key);
  const now = Date.now();
  if (item?.parsed && (now - item.at) < TTL_MS) return item.parsed;

  const parsed = await fetchAndParse(platform, lang);
  cache.set(key, { at: now, parsed });
  return parsed;
}

const LIST_SECTIONS = new Set(["fissures", "alerts", "invasions", "syndicateMissions"]);
const OBJ_SECTIONS  = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "nightwave", "sortie", "archonHunt", "voidTrader",
]);
function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

export async function getSection(platform, section, lang = "en") {
  const ws = await getParsed(platform, lang);
  return ensureShape(section, ws?.[section]);
}

export async function getAggregated(platform, lang = "en") {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions",
  ];
  const ws = await getParsed(platform, lang);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
