// lib/worldstate.js
// Option C : récupération du worldstate DE + parsing via warframe-worldstate-parser v5
// Node 20.x – ESM

/** Plateformes et sections autorisées */
export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);
export const ALLOWED_SECTIONS  = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions",
]);

/** Langage (affiche plutôt utile côté client ; le parser v5 ne localise pas) */
export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

/** Hôtes officiels par plateforme */
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

/** Cache mémoire (TTL par défaut 60 s) */
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
};

/** Import paresseux (v5 exporte une fonction async par défaut) */
async function loadParser() {
  const mod = await import("warframe-worldstate-parser");
  return mod.default ?? mod;
}

/** Fetch + parse, avec timeout robuste */
async function fetchAndParse(platform) {
  const url = worldstateUrl(platform);
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), Number(process.env.WS_FETCH_TIMEOUT_MS || 8000));

  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`worldstate ${platform} ${resp.status}`);
    const raw = await resp.text();
    const Parser = await loadParser();
    // v5 renvoie une Promise ; "await" est safe même si ça devenait sync
    const parsed = await Parser(raw);
    return parsed;
  } finally {
    clearTimeout(tm);
  }
}

/** Accès au cache + rafraîchissement TTL */
async function getParsed(platform) {
  const p = ALLOWED_PLATFORMS.has(platform) ? platform : "pc";
  const now = Date.now();
  const c = _cache[p];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const parsed = await fetchAndParse(p);
  _cache[p] = { at: now, parsed };
  return parsed;
}

/** Sections de type liste vs objet (pour garantir une forme stable) */
const LIST_SECTIONS = new Set(["fissures", "alerts", "invasions", "syndicateMissions"]);
const OBJ_SECTIONS  = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "nightwave", "sortie", "archonHunt", "voidTrader",
]);

/** Sélecteur tolérant (compat compat : fissures ⇄ voidFissures) */
function pickSectionValue(ws, section) {
  switch (section) {
    case "fissures":
      // Certains consumers historiques appelaient "voidFissures"
      return ws?.fissures ?? ws?.voidFissures;
    default:
      return ws?.[section];
  }
}

/** Forme garantie ([], {}, null) selon la section attendue */
function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

/** Lecture d’une section unitaire */
export async function getSection(platform, section /*, lang */) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  if (!ALLOWED_SECTIONS.has(section))   throw new Error("bad section");
  const ws = await getParsed(platform);
  return ensureShape(section, pickSectionValue(ws, section));
}

/** Agrégat par défaut pour /api/{platform} */
export async function getAggregated(platform /*, lang */) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions",
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, pickSectionValue(ws, k));
  return out;
}
