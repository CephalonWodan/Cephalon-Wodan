// lib/worldstate.js
// Option C — Worldstate officiel + parser v5 + normalisation défensive + cache mémoire 60s

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

// ---- Endpoints officiels par plateforme (complets)
const PLATFORM_HOST = {
  pc:  "content.warframe.com",
  ps4: "content-ps4.warframe.com",
  xb1: "content-xb1.warframe.com",
  swi: "content-swi.warframe.com",
  // bonus : iOS → non exposé via ALLOWED_PLATFORMS mais utile si besoin
  mob: "content-mob.warframe.com",
};

function worldstateUrl(platform = "pc") {
  const host = PLATFORM_HOST[platform] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

// ---- Cache mémoire (TTL 60s par défaut, override via env WS_TTL_MS)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
};

// util : détecter si une fonction est une classe
function isClass(fn) {
  try { return typeof fn === "function" && /^class\s/.test(Function.prototype.toString.call(fn)); }
  catch { return false; }
}

async function loadParserEntry() {
  const mod = await import("warframe-worldstate-parser");
  // v5 fournit normalement une fonction par défaut ; on garde des garde-fous
  return mod.default ?? mod.WorldState ?? mod;
}

// Normalisation défensive : on garantit l’existence de certains champs optionnels
function normalizeRawText(rawText) {
  try {
    const obj = JSON.parse(rawText);

    // Le bug que tu vois vient quand ConstructionProgress est absent → md5.update(undefined)
    if (obj.ConstructionProgress === undefined) obj.ConstructionProgress = {};

    // On s’assure que certaines listes existent (cela ne gêne pas si déjà présentes)
    const listKeys = ["Alerts", "Invasions", "Fissures", "SyndicateMissions"];
    for (const k of listKeys) if (!Array.isArray(obj[k])) obj[k] = [];

    return JSON.stringify(obj);
  } catch {
    // Si ce n’est pas du JSON valide (ça ne devrait pas arriver), on retourne tel quel
    return rawText;
  }
}

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, {
    // pas de cache entre appels (on gère nous-mêmes)
    cache: "no-store",
    headers: { "accept": "text/plain" },
  });

  if (!r.ok) throw new Error(`worldstate ${platform} HTTP ${r.status}`);

  const txt = await r.text();

  // sécurité : éviter un retour HTML (ex: page d’erreur ou quirk)
  const head = String(txt).slice(0, 64).trim();
  if (!txt || txt.length < 200 || head.startsWith("<")) {
    console.error("WS_FETCH_BAD_BODY", { platform, len: txt?.length ?? 0, head });
    throw new Error("worldstate body invalid");
  }
  return txt;
}

async function parseWorldstate(rawText) {
  const entry = await loadParserEntry();

  // 1) cas fonction asynchrone (v5 nominal)
  if (typeof entry === "function" && !isClass(entry)) {
    try {
      return await entry(rawText);
    } catch (e) {
      // fallback si le parseur crashe à cause d’un champ manquant
      if (String(e?.message || "").includes('The "data" argument must be of type string')
       || String(e?.message || "").includes("Hash.update")) {
        const patched = normalizeRawText(rawText);
        return await entry(patched);
      }
      // si on a importé une classe par erreur
      if (String(e?.message || "").includes("Class constructor")) {
        return new entry(rawText);
      }
      throw e;
    }
  }

  // 2) cas classe (par prudence selon bundling)
  if (isClass(entry)) {
    return new entry(rawText);
  }

  // 3) export inattendu
  throw new Error("worldstate parser entry is neither function nor class");
}

async function fetchAndParse(platform) {
  const raw = await fetchWorldstateText(platform);
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
  const ws = await getParsed(platform);
  return ensureShape(section, ws?.[section]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader",
    // ajoute "syndicateMissions" ici si tu veux l'exposer dans /api/{platform}
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
