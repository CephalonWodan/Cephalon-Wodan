// lib/worldstate.js
// Option C – fetch du worldstate officiel + parse v5 + cache 60s

// Plates supportées (ajout "ios" optionnel ; garde tes routes sur pc/ps4/xb1/swi si tu préfères)
export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi", "ios"]);

export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions",
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

// --- Hôtes officiels (tirets) + variantes legacy (points) en secours
// Réf. wiki (post-2024): content.warframe.com, content-ps4, content-xb1, content-swi
const HOSTS = {
  pc:  ["content.warframe.com"],
  ps4: ["content-ps4.warframe.com", "content.ps4.warframe.com"],   // fallback "."
  xb1: ["content-xb1.warframe.com", "content.xb1.warframe.com"],   // fallback "."
  swi: ["content-swi.warframe.com"],
  ios: ["content-mob.warframe.com"], // iOS (optionnel)
};

// Canonicalise quelques alias éventuels (si jamais tu veux accepter /ps5, /xbox, etc.)
export function canonicalPlatform(p) {
  const x = String(p || "").toLowerCase();
  if (x === "ps5") return "ps4";
  if (x === "xbox" || x === "xsx" || x === "xbsx" || x === "series" || x === "xboxseries") return "xb1";
  if (x === "switch" || x === "ns" || x === "nintendo") return "swi";
  if (x === "mobile" || x === "mob" || x === "iphone" || x === "ipad") return "ios";
  return ALLOWED_PLATFORMS.has(x) ? x : "pc";
}

function worldstateCandidates(platform = "pc") {
  const plat = canonicalPlatform(platform);
  const hosts = HOSTS[plat] || HOSTS.pc;
  return hosts.map(h => `https://${h}/dynamic/worldState.php`);
}

// ---- Cache mémoire (TTL 60s par défaut)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = Object.fromEntries(
  Array.from(ALLOWED_PLATFORMS, p => [p, { at: 0, parsed: null }])
);

async function loadParser() {
  const mod = await import("warframe-worldstate-parser");
  // v5 exporte une fonction async par défaut
  return mod.default ?? mod;
}

async function fetchTextFromCandidates(urls) {
  let lastErr;
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        // un UA explicite peut aider certains edge-cases de CDN
        headers: { "User-Agent": "Cephalon-Wodan/1.0 (+worldstate)" },
      });
      if (!r.ok) { lastErr = new Error(`${url} -> ${r.status}`); continue; }
      const txt = await r.text();
      if (!txt || txt.length < 10) { lastErr = new Error(`${url} -> empty body`); continue; }
      return txt;
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("no worldstate candidate succeeded");
}

async function fetchAndParse(platform) {
  const raw = await fetchTextFromCandidates(worldstateCandidates(platform));
  const Parser = await loadParser();
  // v5: fonction retourne une promesse d'objets parsés
  return await Parser(raw);
}

async function getParsed(platform) {
  const plat = canonicalPlatform(platform);
  if (!ALLOWED_PLATFORMS.has(plat)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache[plat];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;
  const parsed = await fetchAndParse(plat);
  _cache[plat] = { at: now, parsed };
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
    "voidTrader",
    // Décommente si tu veux l’exposer dans l’agrégé :
    // "syndicateMissions",
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
