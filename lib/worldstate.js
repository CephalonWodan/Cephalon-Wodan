// lib/worldstate.js
// Option C : Récupération du worldstate officiel + parse v5 (tolérant fonction/classe)
// Cache mémoire 60s, alias "bounties" -> "syndicateMissions", formes stables.

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions",
  "bounties", // alias accepté côté handler/lib
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

// ---- Endpoints officiels par plateforme
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

// ---- Cache mémoire (clé = `${platform}:${lang}`), TTL configurable
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const cache = new Map(); // key -> { at:number, parsed:object }
const keyPL = (p, l) => `${p}:${l}`;

// ---- Helpers de forme
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

// ---- Chargement tolérant du parseur (fonction OU classe)
function looksLikeClass(x) {
  return typeof x === "function" && /^class\s/.test(Function.prototype.toString.call(x));
}
async function loadParser() {
  const mod = await import("warframe-worldstate-parser");
  return mod.default ?? mod.WorldState ?? mod; // couvre default/named/export direct
}

// Tente l'appel “fonction”, sinon instancie la classe
async function parseWorldstate(raw, locale) {
  const Parser = await loadParser();

  // Cas 1 : export fonction (cas README)
  if (typeof Parser === "function" && !looksLikeClass(Parser)) {
    return await Parser(raw, { locale });
  }

  // Cas 2 : export classe
  if (looksLikeClass(Parser)) {
    const instance = new Parser(raw, { locale });
    return typeof instance.toJSON === "function" ? instance.toJSON() : instance;
  }

  // Cas 3 : export ambigu -> on tente appel puis fallback "new"
  try {
    return await Parser(raw, { locale });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("cannot be invoked without 'new'") || msg.includes("Class constructor")) {
      const instance = new Parser(raw, { locale });
      return typeof instance.toJSON === "function" ? instance.toJSON() : instance;
    }
    throw e;
  }
}

// ---- Fetch + parse avec garde-fous
const FETCH_TIMEOUT_MS = Number(process.env.WS_FETCH_TIMEOUT_MS || 10_000);

async function fetchAndParse(platform, lang) {
  const controller = AbortSignal?.timeout ? { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) } : {};
  const res = await fetch(worldstateUrl(platform), { cache: "no-store", ...controller });
  if (!res.ok) throw new Error(`worldstate ${platform} ${res.status}`);

  const raw = await res.text();
  // Garde-fou : éviter de passer undefined/"" au parseur (Hash.update)
  if (typeof raw !== "string" || raw.trim().length < 20) {
    throw new Error(`empty worldstate body (${platform})`);
  }
  return parseWorldstate(raw, lang);
}

// ---- Accès au worldstate parsé avec cache
async function getParsed(platform, lang) {
  const plat = String(platform || "").toLowerCase();
  const locale = normalizeLang(lang);
  if (!ALLOWED_PLATFORMS.has(plat)) throw new Error("bad platform");

  const k = keyPL(plat, locale);
  const hit = cache.get(k);
  const now = Date.now();
  if (hit?.parsed && (now - hit.at) < TTL_MS) return hit.parsed;

  const parsed = await fetchAndParse(plat, locale);
  cache.set(k, { at: now, parsed });
  return parsed;
}

// ---- API lib consommée par les handlers
export async function getSection(platform, section, lang = "en") {
  const sec = section === "bounties" ? "syndicateMissions" : section; // alias
  const ws = await getParsed(platform, lang);
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform, lang = "en") {
  const ws = await getParsed(platform, lang);
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions",
  ];
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
