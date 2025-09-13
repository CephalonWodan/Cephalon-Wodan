// lib/worldstate.js — Parser v5 + i18n robuste + cache 60s

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi", "mob"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions"
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  // Le dépôt “data” a bien une langue fr ; on mappe fr-xx => "fr"
  return s.startsWith("fr") ? "fr" : "en";
}

// Endpoints officiels (PC/PS4/XB1/Switch/iOS)
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

// Cache mémoire
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null, meta: null },
  ps4: { at: 0, parsed: null, meta: null },
  xb1: { at: 0, parsed: null, meta: null },
  swi: { at: 0, parsed: null, meta: null },
  mob: { at: 0, parsed: null, meta: null },
};

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== "string") throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

// ---------- i18n : charge la langue avant d'utiliser le parser ----------
async function initWorldstateLanguage(locale = "en") {
  // Essaie utilitaires officiels
  try {
    const utilsMod = await import("warframe-worldstate-data/utilities");
    const utils = utilsMod?.default || utilsMod;
    const getLanguage = utils?.getLanguage;
    const setLanguage = utils?.setLanguage; // présent sur certains builds
    if (typeof getLanguage === "function") {
      const pack = getLanguage(locale);
      if (pack) {
        if (typeof setLanguage === "function") {
          setLanguage(pack);
          return true;
        }
        // Plan B: module translation exporte setLanguage
        try {
          const trModA = await import("warframe-worldstate-data/translation");
          const trA = trModA?.default || trModA;
          if (typeof trA?.setLanguage === "function") {
            trA.setLanguage(pack);
            return true;
          }
        } catch {}
        try {
          const trModB = await import("warframe-worldstate-data/dist/translation.js");
          const trB = trModB?.default || trModB;
          if (typeof trB?.setLanguage === "function") {
            trB.setLanguage(pack);
            return true;
          }
        } catch {}
      }
    }
  } catch {}
  return false;
}

// ---------- parser bridge v5 : supporte default fn/classe + JSON ----------
async function parseWorldstate(text, locale = "en") {
  // i18n d'abord (sinon erreurs SORTIE_BOSS_*)
  const langLoaded = await initWorldstateLanguage(locale);

  const mod = await import("warframe-worldstate-parser");
  const def = mod?.default;
  const Ctor = mod?.WorldState;

  // On prépare aussi l'objet JSON pour les chemins qui le nécessitent
  let json = null;
  try { json = JSON.parse(text); } catch {}

  const attempts = [];

  // 1) export default “fonction” (cas documenté npm)
  if (typeof def === "function") {
    // a) string brut
    try { return { ws: await def(text, { locale }), langLoaded, via: "default(text)" }; }
    catch (e) { attempts.push(e); }
    // b) objet JSON
    if (json) {
      try { return { ws: await def(json, { locale }), langLoaded, via: "default(json)" }; }
      catch (e) { attempts.push(e); }
    }
    // c) si c'est en réalité une classe
    try { /* @ts-ignore */ return { ws: new def(text, { locale }), langLoaded, via: "new default(text)" }; }
    catch (e) { attempts.push(e); }
    if (json) {
      try { /* @ts-ignore */ return { ws: new def(json, { locale }), langLoaded, via: "new default(json)" }; }
      catch (e) { attempts.push(e); }
    }
  }

  // 2) export nommé “WorldState” (classe)
  if (typeof Ctor === "function") {
    try { return { ws: new Ctor(text, { locale }), langLoaded, via: "new WorldState(text)" }; }
    catch (e) { attempts.push(e); }
    if (json) {
      try { return { ws: new Ctor(json, { locale }), langLoaded, via: "new WorldState(json)" }; }
      catch (e) { attempts.push(e); }
    }
  }

  // 3) Échec : on logge pour debug et on renvoie null
  console.error("[worldstate] parser ESM exports:", Object.keys(mod || {}));
  console.error("[worldstate] attempts errors (first 3):", attempts.slice(0, 3).map(String));
  return { ws: null, langLoaded, via: "fallback_raw" };
}

function emptyAgg(meta) {
  return {
    earthCycle: {}, cetusCycle: {}, vallisCycle: {}, cambionCycle: {}, duviriCycle: {},
    fissures: [], alerts: [], invasions: [], nightwave: {}, sortie: {},
    archonHunt: {}, voidTrader: {}, syndicateMissions: [],
    _meta: meta,
  };
}

async function getParsed(platform, locale = "en") {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return { parsed: c.parsed, meta: c.meta };

  const text = await fetchWorldstateText(platform);
  const { ws, langLoaded, via } = await parseWorldstate(text, locale);

  // Meta pour debug/headers côté handler
  const meta = {
    path: via,
    locale,
    hasLanguage: !!langLoaded,
    len: text?.length || 0,
    at: now,
  };

  if (!ws || typeof ws !== "object") {
    const out = emptyAgg(meta);
    _cache[platform] = { at: now, parsed: out, meta };
    return { parsed: out, meta };
  }

  // Le parser renvoie un gros objet avec beaucoup de props — on le garde entier
  // et on agrège ensuite proprement dans getAggregated / getSection.
  _cache[platform] = { at: now, parsed: ws, meta };
  return { parsed: ws, meta };
}

// Formes attendues pour éviter les “undefined”
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

export async function getSection(platform, section, lang = "en") {
  const sec = section === "bounties" ? "syndicateMissions" : section;
  const { parsed: ws } = await getParsed(platform, normalizeLang(lang));
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform, lang = "en") {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions"
  ];
  const { parsed: ws, meta } = await getParsed(platform, normalizeLang(lang));
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  out._meta = meta;
  return out;
}
