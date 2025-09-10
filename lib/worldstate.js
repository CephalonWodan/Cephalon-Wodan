// lib/worldstate.js
// Option C – Récupération du worldstate officiel + parse v5 avec garde-fous

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions", "bounties" // alias accepté côté API
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

// ---------- Cache mémoire (TTL 60s par défaut)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = Object.create(null); // clé = `${platform}:${lang}`

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

// Détecte si ce qu'on a est une classe (pour `new`)
function looksLikeClass(x) {
  return typeof x === "function" && /^class\s/.test(Function.prototype.toString.call(x));
}
async function loadParserExport() {
  const mod = await import("warframe-worldstate-parser");
  return mod.default ?? mod.WorldState ?? mod;
}

async function fetchAndParse(platform, lang) {
  // 1) fetch
  const res = await fetch(worldstateUrl(platform), { cache: "no-store" });
  if (!res.ok) throw new Error(`worldstate ${platform} ${res.status}`);
  const raw = await res.text();

  // Garde-fou : certaines pannes retournent un corps vide → ne pas passer undefined/"" au parseur
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error(`empty worldstate body (${platform})`);
  }

  // 2) parse (classe v5 par défaut ; fallback fonction si jamais)
  const Parser = await loadParserExport();
  let parsed;

  if (looksLikeClass(Parser)) {
    const instance = new Parser(raw, { locale: lang });
    parsed = typeof instance.toJSON === "function" ? instance.toJSON() : instance;
  } else if (typeof Parser === "function") {
    // fallback pour anciens bundles éventuels
    parsed = await Parser(raw, { locale: lang });
  } else {
    throw new Error("unsupported parser export");
  }

  return parsed;
}

async function getParsed(platform, lang) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const key = `${platform}:${lang}`;
  const now = Date.now();
  const hit = _cache[key];
  if (hit?.parsed && (now - hit.at) < TTL_MS) return hit.parsed;

  const parsed = await fetchAndParse(platform, lang);
  _cache[key] = { at: now, parsed };
  return parsed;
}

// ---------- API lib
export async function getSection(platform, section, lang = "en") {
  const plat = platform.toLowerCase();
  const sec  = section === "bounties" ? "syndicateMissions" : section; // alias
  const ws = await getParsed(plat, normalizeLang(lang));
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform, lang = "en") {
  const plat = platform.toLowerCase();
  const ws = await getParsed(plat, normalizeLang(lang));

  const keys = [
    "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
    "fissures","alerts","invasions","nightwave","sortie","archonHunt",
    "voidTrader","syndicateMissions"
  ];
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
