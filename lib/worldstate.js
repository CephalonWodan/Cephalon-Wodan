// lib/worldstate.js
// Option C : récupération du worldstate DE + parsing via warframe-worldstate-parser v5
// Node 20.x – ESM

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);
export const ALLOWED_SECTIONS  = new Set([
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

// ---- Cache mémoire (TTL configurable)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
};

// ---- Import parser robuste (gère ESM/CJS/namespace)
async function loadParserFn() {
  const mod = await import("warframe-worldstate-parser");
  // cas 1: export default (fonction)
  if (typeof mod?.default === "function") return mod.default;
  // cas 2: module CJS (interop) directement callable
  if (typeof mod === "function") return mod;
  // cas 3: export nommé (peu probable), tente quelques clés usuelles
  for (const k of ["parse", "WorldStateParser", "WorldstateParser", "WorldState"]) {
    if (typeof mod?.[k] === "function") return mod[k];
  }
  console.error("[worldstate] parser module shape =", Object.keys(mod || {}));
  throw new Error("parser load failed: no callable export");
}

// ---- Fetch + parse, avec timeout
async function fetchAndParse(platform) {
  const url = worldstateUrl(platform);
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), Number(process.env.WS_FETCH_TIMEOUT_MS || 8000));

  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`worldstate ${platform} ${resp.status}`);
    const raw = await resp.text();
    const parse = await loadParserFn();
    const parsed = await parse(raw); // v5: fonction async
    return parsed;
  } finally {
    clearTimeout(tm);
  }
}

async function getParsed(platform) {
  const p = ALLOWED_PLATFORMS.has(platform) ? platform : "pc";
  const now = Date.now();
  const c = _cache[p];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const parsed = await fetchAndParse(p);
  _cache[p] = { at: now, parsed };
  return parsed;
}

const LIST_SECTIONS = new Set(["fissures", "alerts", "invasions", "syndicateMissions"]);
const OBJ_SECTIONS  = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "nightwave", "sortie", "archonHunt", "voidTrader",
]);

// compat: certains exports historiques utilisaient voidFissures
function pickSectionValue(ws, section) {
  switch (section) {
    case "fissures": return ws?.fissures ?? ws?.voidFissures;
    default:         return ws?.[section];
  }
}

function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

export async function getSection(platform, section /*, lang */) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  if (!ALLOWED_SECTIONS.has(section))   throw new Error("bad section");
  const ws = await getParsed(platform);
  return ensureShape(section, pickSectionValue(ws, section));
}

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
