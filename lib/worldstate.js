// lib/worldstate.js
// Fetch du worldstate officiel + parse v5, cache 60s, endpoints corrects (avec tirets)

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi", "mob", "ios"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions",
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

// === Endpoints officiels complets (hôtes avec tiret) ===
const PLATFORM_HOST = {
  pc:  "content.warframe.com",
  ps4: "content-ps4.warframe.com",
  xb1: "content-xb1.warframe.com",
  swi: "content-swi.warframe.com",
  mob: "content-mob.warframe.com", // iOS
  ios: "content-mob.warframe.com", // alias
};

function worldstateUrl(platform = "pc") {
  const key = platform === "ios" ? "mob" : platform;
  const host = PLATFORM_HOST[key] || PLATFORM_HOST.pc;
  // <— ICI on pointe explicitement sur le FICHIER :
  return `https://${host}/dynamic/worldState.php`;
}

// ---- Cache mémoire (60s par défaut)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = Object.fromEntries(
  ["pc","ps4","xb1","swi","mob"].map(k => [k, { at: 0, parsed: null }])
);

async function fetchWorldstate(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, { cache: "no-store", headers: { accept: "text/plain" } });
  if (!r.ok) {
    console.error("WS_FETCH_FAIL", { url, status: r.status });
    throw new Error(`worldstate ${platform} ${r.status}`);
  }
  const txt = await r.text();
  // Protéger le parseur : corps vide, trop court ou HTML
  if (!txt || txt.length < 200 || /^</.test(txt)) {
    console.error("WS_FETCH_BAD_BODY", {
      url, len: txt?.length ?? 0, sample: String(txt).slice(0, 120)
    });
    throw new Error("worldstate body invalid");
  }
  return txt;
}

// Import/parse robuste pour v5 : fonction OU classe (fallback)
async function parseWorldstate(raw) {
  const mod = await import("warframe-worldstate-parser");
  const maybe = mod?.default ?? mod;

  // 1) Essayer comme fonction (forme documentée)
  if (typeof maybe === "function") {
    try {
      return await maybe(raw);
    } catch (e) {
      if (String(e).includes("cannot be invoked without 'new'")) {
        // 2) Alors c'est une classe dans ce bundling : tenter avec new
        try {
          return new maybe(raw);
        } catch {
          if (typeof mod.WorldState === "function") {
            return new mod.WorldState(raw);
          }
          throw e;
        }
      }
      throw e;
    }
  }

  // 3) Sinon, tenter le named export classe
  if (typeof mod.WorldState === "function") {
    return new mod.WorldState(raw);
  }

  console.error("WS_PARSE_SHAPE_UNSUPPORTED", Object.keys(mod || {}));
  throw new Error("parser export shape unsupported");
}

async function getParsed(platform) {
  const key = platform === "ios" ? "mob" : platform;
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");

  const now = Date.now();
  const c = _cache[key];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const raw = await fetchWorldstate(key);
  const parsed = await parseWorldstate(raw);
  _cache[key] = { at: now, parsed };
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
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
