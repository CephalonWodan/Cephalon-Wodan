// lib/worldstate.js
// Option C : fetch du worldState officiel + parse via warframe-worldstate-parser v5
// Cache mémoire simple (60 s)

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi", "mob"]); // iOS = "mob"

// Endpoints officiels par plateforme (complets)
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

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

// TTL cache (par défaut 60 s)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);

// { platform -> { at:number, parsed:object } }
const _cache = new Map();

// charge la fonction de parse une seule fois
let _parseFn = null;
async function parseWorldstate(text) {
  if (typeof text !== "string" || !text.length) {
    throw new Error("worldstate empty");
  }
  if (!_parseFn) {
    const mod = await import("warframe-worldstate-parser");
    // v5 exporte une fonction par défaut
    _parseFn = mod?.default ?? mod;
    if (typeof _parseFn !== "function") {
      throw new Error("parser export is not a function");
    }
  }
  return await _parseFn(text);
}

async function fetchText(url) {
  const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
  if (!res.ok) throw new Error(`fetch ${url} ${res.status}`);
  return await res.text();
}

export async function getParsed(platform = "pc") {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache.get(platform);
  if (c && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchText(worldstateUrl(platform));
  const parsed = await parseWorldstate(text);
  _cache.set(platform, { at: now, parsed });
  return parsed;
}

// ---------- Sections & mapping ----------

export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions",
  "nightwave", "sortie", "archonHunt", "voidTrader",
  "syndicateMissions", "bounties" // alias public
]);

// mapping URL publique -> propriété du parser
const SECTION_MAP = {
  earthCycle: "earthCycle",
  cetusCycle: "cetusCycle",
  vallisCycle: "vallisCycle",
  cambionCycle: "cambionCycle",
  duviriCycle: "duviriCycle",

  fissures: "fissures",
  alerts: "alerts",
  invasions: "invasions",

  nightwave: "nightwave",
  sortie: "sortie",
  archonHunt: "archonHunt",
  voidTrader: "voidTrader",

  syndicateMissions: "syndicateMissions",
  bounties: "syndicateMissions", // alias
};

const LIST_SECTIONS = new Set(["fissures", "alerts", "invasions", "syndicateMissions", "bounties"]);
const OBJ_SECTIONS  = new Set([
  "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
  "nightwave","sortie","archonHunt","voidTrader"
]);

function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

function resolveProp(publicName) {
  return SECTION_MAP[publicName] || publicName;
}

export async function getSection(platform, section /*, lang */) {
  const ws = await getParsed(platform);
  const prop = resolveProp(section);
  return ensureShape(section, ws?.[prop]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
    "fissures","alerts","invasions","nightwave","sortie","archonHunt",
    "voidTrader","syndicateMissions"
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) {
    const prop = resolveProp(k);
    out[k] = ensureShape(k, ws?.[prop]);
  }
  return out;
}
