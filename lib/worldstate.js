// lib/worldstate.js  — Parser v5 sur Vercel (Node), i18n + fallbacks robustes

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi", "mob"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions"
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

// Endpoints exacts (PC/PS4/XB1/Switch/iOS)
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

// Cache mémoire (TTL 60s par défaut)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
  mob: { at: 0, parsed: null },
};

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== "string") throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

// ———————————————————————————————————————————————————————————————
// i18n loader: tente de charger languages + setLanguage(utilities)
// ———————————————————————————————————————————————————————————————
async function trySetLanguage(locale = "en") {
  const steps = [];
  let pack = undefined;
  try {
    const dataMod = await import("warframe-worldstate-data");
    const data = dataMod?.default ?? dataMod;
    const langs = data?.languages;
    if (langs && typeof langs === "object") {
      pack = langs[locale] || langs.en || undefined;
      steps.push({ ok: !!pack, where: "esm data.languages", extra: pack ? "ok" : "no pack" });
    } else {
      steps.push({ ok: false, where: "esm data.languages", extra: "not found" });
    }
  } catch (e) {
    steps.push({ ok: false, where: "esm data import", extra: String(e?.message || e) });
  }

  let setLanguageFn;
  try {
    const u = await import("warframe-worldstate-data/utilities");
    const utilities = u?.default ?? u;
    setLanguageFn = utilities?.setLanguage;
    steps.push({ ok: typeof setLanguageFn === "function", where: "esm utilities.setLanguage",
                 extra: typeof setLanguageFn });
  } catch (e) {
    steps.push({ ok: false, where: "esm utilities import", extra: String(e?.message || e) });
  }

  let setCalled = false;
  if (typeof setLanguageFn === "function" && pack) {
    try {
      setLanguageFn(pack);
      setCalled = true;
    } catch (e) {
      steps.push({ ok: false, where: "utilities.setLanguage call", extra: String(e?.message || e) });
    }
  }

  return { hasLanguage: !!pack, setCalled, steps };
}

// ———————————————————————————————————————————————————————————————
// Parser bridge v5 : privilégie la classe nommée WorldState,
// retente sans sorties si la trad n’est pas prête, puis fallback brut.
// ———————————————————————————————————————————————————————————————
async function parseWorldstate(text, locale = "en") {
  const meta = { locale, hasLanguage: false, setCalled: false, where: [], attempts: [], firstError: null };
  const sourceLen = text?.length || 0;

  // 1) i18n
  const i18n = await trySetLanguage(locale);
  meta.hasLanguage = i18n.hasLanguage;
  meta.setCalled = i18n.setCalled;
  meta.i18nSteps = i18n.steps;

  // 2) charger le parser
  let Parser, def;
  try {
    const mod = await import("warframe-worldstate-parser");
    Parser = mod?.WorldState;
    def = mod?.default;
    meta.where.push(`esm exports: ${Object.keys(mod || {}).join(", ")}`);
  } catch (e) {
    meta.where.push(`cjs require failed: ${String(e?.message || e)}`);
  }

  // 3) JSON -> objet
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    meta.firstError = meta.firstError || `JSON.parse: ${String(e?.message || e)}`;
    throw Object.assign(new Error("invalid worldstate json"), { _meta: { ...meta, path: "json_parse", len: sourceLen } });
  }

  // petite factory d’essais
  const attempts = [];
  async function tryWorldState(o, label) {
    try {
      // a) export nommé class WorldState
      if (typeof Parser === "function") {
        const ws = new Parser(o, { locale }); // deps default internes feront le reste
        meta.path = `esm.new WorldState(${label})`;
        return ws;
      }
      // b) certains builds exportent une fn par défaut (WorldState.build)
      if (typeof def === "function") {
        const ws = await def(o, { locale });
        meta.path = `esm.default(${label})`;
        return ws;
      }
      attempts.push({ label: "no parser", ok: false, err: "no usable export" });
    } catch (e) {
      const err = String(e?.message || e);
      attempts.push({ label, ok: false, err });
      throw e;
    }
    throw new Error("no usable export");
  }

  // 4) essai normal
  try {
    const ws = await tryWorldState(obj, "obj,deps");
    meta.attempts = attempts;
    return { ws, _meta: { ...meta, len: sourceLen } };
  } catch (e1) {
    // 5) si échec lié aux traductions de Sortie, retenter sans sorties
    const errMsg = String(e1?.message || e1);
    const looksLikeLang = /SORTIE_BOSS_|translation|setLanguage|language/i.test(errMsg);
    if (looksLikeLang) {
      try {
        const slim = { ...obj };
        delete slim.Sorties;
        delete slim.LiteSorties;
        const ws = await tryWorldState(slim, "obj-no-sorties,deps");
        meta.attempts = attempts;
        meta.path = (meta.path || "") + "+noSorties";
        return { ws, _meta: { ...meta, len: sourceLen } };
      } catch (e2) {
        // continue to fallback
        meta.firstError = meta.firstError || errMsg;
      }
    } else {
      meta.firstError = meta.firstError || errMsg;
    }
  }

  // 6) dernier recours : fallback brut (tout vide côté client)
  const empty = {
    earthCycle: {}, cetusCycle: {}, vallisCycle: {}, cambionCycle: {}, duviriCycle: {},
    fissures: [], alerts: [], invasions: [], nightwave: {}, sortie: {}, archonHunt: {},
    voidTrader: {}, syndicateMissions: []
  };
  meta.path = "fallback_raw";
  return { ws: empty, _meta: { ...meta, len: sourceLen } };
}

// ———————————————————————————————————————————————————————————————
// Cache + agrégation sections
// ———————————————————————————————————————————————————————————————
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

async function getParsed(platform) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchWorldstateText(platform);
  const { ws, _meta } = await parseWorldstate(text, "en"); // laisse en EN côté serveur
  const parsed = { ...ws, _meta };

  _cache[platform] = { at: now, parsed };
  return parsed;
}

export async function getSection(platform, section /*, lang */) {
  const sec = section === "bounties" ? "syndicateMissions" : section;
  const ws = await getParsed(platform);
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions"
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  // propage le méta pour debug client
  out._meta = ws?._meta || {};
  return out;
}
