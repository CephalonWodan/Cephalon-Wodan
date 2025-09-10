// lib/worldstate.js
// Option C: on FETCH le worldstate officiel et on PARSE côté Vercel
// ESM + Node 18 (fetch global)

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);

export const ALLOWED_SECTIONS = new Set([
  // Cycles
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  // Activités / rotations
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  // Marchands
  "voidTrader",
  // Primes
  "syndicateMissions",
  // (ajoute ici si tu veux plus tard: "zarimanCycle", "steelPath", "dailyDeals", "news", etc.)
]);

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

// ---- Cache mémoire (par instance serverless)
const TTL_MS = 60_000; // 60s
const _cache = {
  pc:  { at: 0, raw: null, parsed: null },
  ps4: { at: 0, raw: null, parsed: null },
  xb1: { at: 0, raw: null, parsed: null },
  swi: { at: 0, raw: null, parsed: null },
};

async function loadParser() {
  // v5 est une fonction async par défaut (ESM)
  const mod = await import("warframe-worldstate-parser");
  // Certains bundlers exposent .default, on gère les 2 cas
  return mod.default || mod;
}

async function fetchAndParse(platform) {
  const url = worldstateUrl(platform);
  const raw = await fetch(url, { method: "GET" }).then(r => {
    if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
    return r.text();
  });

  const Parser = await loadParser();
  const parsed = await Parser(raw); // objet worldstate parsé

  return { raw, parsed };
}

async function getParsed(platform) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");

  const now = Date.now();
  const c = _cache[platform];
  if (c && c.parsed && (now - c.at) < TTL_MS) {
    return c.parsed;
  }
  const { raw, parsed } = await fetchAndParse(platform);
  _cache[platform] = { at: now, raw, parsed };
  return parsed;
}

// sections qui sont des LISTES (=> [] si vide)
const LIST_SECTIONS = new Set(["fissures", "alerts", "invasions", "syndicateMissions"]);

// sections qui sont des OBJETS (=> {} si manquant)
const OBJ_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "nightwave", "sortie", "archonHunt", "voidTrader"
]);

function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) {
    return Array.isArray(value) ? value : [];
  }
  if (OBJ_SECTIONS.has(section)) {
    return value ?? {};
  }
  // fallback générique
  return value ?? null;
}

export async function getSection(platform, section /*, lang */) {
  const ws = await getParsed(platform);
  // Le parser v5 expose déjà des noms proches/identiques à WarframeStatus
  // (ex: ws.fissures, ws.alerts, ws.invasions, ws.nightwave, ws.sortie, ws.archonHunt, ws.voidTrader)
  // Cycles:
  //  - ws.cetusCycle, ws.vallisCycle, ws.cambionCycle, ws.duviriCycle, ws.earthCycle
  // Bounties:
  //  - ws.syndicateMissions (liste par syndicat)
  const val = ws?.[section];
  return ensureShape(section, val);
}

export async function getAggregated(platform /*, lang */) {
  const sections = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader",
    // ajoute "syndicateMissions" ici si tu veux l'inclure dans /api/{platform}
  ];

  const ws = await getParsed(platform);
  const out = {};
  for (const s of sections) {
    out[s] = ensureShape(s, ws?.[s]);
  }
  return out;
}
