// lib/worldstate.js
// Parser worldstate côté serveur (Vercel), cache mémoire 60s, compat v5 & legacy

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);
const PLATFORM_HOST = {
  pc:  "content.warframe.com",
  ps4: "content.ps4.warframe.com",
  xb1: "content.xb1.warframe.com",
  swi: "content.swi.warframe.com",
};

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

function worldstateUrl(platform = "pc") {
  const host = PLATFORM_HOST[platform] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

// ------------------------------------------------------------------
// Compat : certains utilisent "bounties" alors que le parser expose
// "syndicateMissions". On mappe proprement :
const SECTION_ALIASES = {
  bounties: "syndicateMissions",
};

export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions", "bounties", // alias accepté en entrée
]);

function resolveSection(input) {
  const s = String(input || "");
  return SECTION_ALIASES[s] || s;
}

// ------------------------------------------------------------------
// Cache (60s par défaut, override possible via env WS_TTL_MS)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
};

// Détection "classe" vs "fonction"
function isClass(fn) {
  return typeof fn === "function" && /^class\s/.test(Function.prototype.toString.call(fn));
}

// Normalisation objet “plain” (au cas où instance de classe)
function toPlain(x) {
  try {
    if (x && typeof x.toJSON === "function") return x.toJSON();
    return JSON.parse(JSON.stringify(x));
  } catch {
    return x;
  }
}

// Charge le module v5 (fonction) ou legacy (classe)
async function parseWorldstate(raw) {
  const mod = await import("warframe-worldstate-parser"); // v5 conseillé :contentReference[oaicite:2]{index=2}
  const candidate = mod.default ?? mod;

  // v5 : export par défaut callable (fonction async)
  if (typeof candidate === "function" && !isClass(candidate)) {
    const ws = await candidate(raw);
    return toPlain(ws);
  }

  // legacy : classe à instancier
  const Cls = isClass(candidate) ? candidate : (typeof mod.WorldState === "function" ? mod.WorldState : null);
  if (Cls) {
    const ws = new Cls(raw); // exemple legacy: new WorldState(raw) :contentReference[oaicite:3]{index=3}
    return toPlain(ws);
  }

  // Dernier recours : tenter l’appel direct
  const ws = await candidate(raw);
  return toPlain(ws);
}

async function fetchAndParse(platform) {
  const res = await fetch(worldstateUrl(platform));
  if (!res.ok) throw new Error(`worldstate ${platform} ${res.status}`);
  const raw = await res.text();
  return parseWorldstate(raw);
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

// Formes attendues
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

export async function getSection(platform, section /*, lang */) {
  const key = resolveSection(section);
  const ws = await getParsed(platform);
  return ensureShape(key, ws?.[key]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader",
    // ajoute "syndicateMissions" si tu veux l’inclure dans l’agrégat
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
