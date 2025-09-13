// lib/worldstate.js
// Warframe Worldstate — v5 (classe) + init langue + cache 60s + logs de debug

// --- Plateformes & sections autorisées ---
export const ALLOWED_PLATFORMS = new Set(['pc', 'ps4', 'xb1', 'swi', 'mob']);
export const ALLOWED_SECTIONS = new Set([
  'earthCycle', 'cetusCycle', 'vallisCycle', 'cambionCycle', 'duviriCycle',
  'fissures', 'alerts', 'invasions', 'nightwave', 'sortie', 'archonHunt',
  'voidTrader', 'syndicateMissions',
]);

export function normalizeLang(raw = 'en') {
  const s = String(raw || '').toLowerCase();
  return s.startsWith('fr') ? 'fr' : 'en';
}

// --- Endpoints officiels ---
const PLATFORM_HOST = {
  pc:  'content.warframe.com',
  ps4: 'content-ps4.warframe.com',
  xb1: 'content-xb1.warframe.com',
  swi: 'content-swi.warframe.com',
  mob: 'content-mob.warframe.com',
};
function worldstateUrl(platform = 'pc') {
  const host = PLATFORM_HOST[platform] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

// --- Cache mémoire (clé: `${platform}:${locale}`) ---
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = new Map(); // key -> { at:number, parsed:any }

// --- Utils ---
const jsonify = (x) => JSON.parse(JSON.stringify(x));
const toObj = (t) => { try { return JSON.parse(t); } catch { return null; } };

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, {
    cache: 'no-store',
    headers: { 'user-agent': 'Cephalon-Wodan/1.0 (+worldstate)' },
  });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== 'string') throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

// --- Initialisation robuste des traductions ---
async function initLanguage(locale) {
  let language;
  // 1) utilities.getLanguage(locale)
  try {
    const u = await import('warframe-worldstate-data/utilities');
    const utils = u?.default ?? u;
    const getLanguage = utils?.getLanguage ?? utils?.default?.getLanguage;
    if (typeof getLanguage === 'function') {
      language = getLanguage(locale);
      console.error('[worldstate] i18n: utilities.getLanguage ok');
    }
  } catch (e) {
    console.error('[worldstate] i18n: utilities import failed');
  }
  // 2) setter global (certaines builds l’utilisent)
  try {
    // tenter 2 chemins possibles
    let tr = await import('warframe-worldstate-data/translation').catch(() => null);
    if (!tr) tr = await import('warframe-worldstate-data/dist/translation.js').catch(() => null);
    const setLang = tr?.setLanguage ?? tr?.default?.setLanguage;
    if (typeof setLang === 'function' && language) {
      setLang(language);
      console.error('[worldstate] i18n: setLanguage called');
    } else {
      console.error('[worldstate] i18n: setLanguage not found or no language');
    }
  } catch (e) {
    console.error('[worldstate] i18n: translation import failed');
  }
  return language;
}

// --- Parse (v5): forcer la CLASSE + passer { locale, language } ---
async function parseWorldstate(text, locale = 'en') {
  const language = await initLanguage(locale);
  const opts = language ? { locale, language } : { locale };

  // Import parser
  let esm;
  try { esm = await import('warframe-worldstate-parser'); } catch {}
  if (!esm) {
    // fallback CJS
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    esm = require('warframe-worldstate-parser');
  }

  const def  = esm?.default;
  const Ctor = esm?.WorldState ?? (typeof def === 'function' ? def : null);
  const obj  = toObj(text);

  console.error('[worldstate] parser: exports =', esm ? Object.keys(esm) : 'cjs');
  if (!obj) throw new Error('worldstate: invalid JSON');

  // 1) Chemin classe prioritaire (ton build)
  if (typeof Ctor === 'function') {
    try {
      const ws = new Ctor(obj, opts);
      return jsonify(ws);
    } catch (e) {
      console.error('[worldstate] parser: new Ctor(obj, opts) failed:', String(e?.message || e));
    }
  }

  // 2) Chemin fonction (si export default est callable)
  if (typeof def === 'function') {
    try {
      const ws = await def(text, opts);
      return jsonify(ws);
    } catch (e) {
      console.error('[worldstate] parser: def(text, opts) failed:', String(e?.message || e));
    }
    try {
      const ws = await def(obj, opts);
      return jsonify(ws);
    } catch (e) {
      console.error('[worldstate] parser: def(obj, opts) failed:', String(e?.message || e));
    }
  }

  // 3) Dernier secours : raw JSON (on log pour le voir)
  console.error('[worldstate] FALLBACK_RAW: parser incompatible, renvoi du JSON brut');
  return obj;
}

// --- API (avec cache) ---
async function getParsed(platform, locale = 'en') {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error('bad platform');
  const key = `${platform}:${locale}`;
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit?.parsed && (now - hit.at) < TTL_MS) return hit.parsed;

  const text = await fetchWorldstateText(platform);
  const parsed = await parseWorldstate(text, locale);

  _cache.set(key, { at: now, parsed });
  return parsed;
}

// --- Normalisation de forme par section ---
const LIST_SECTIONS = new Set(['fissures', 'alerts', 'invasions', 'syndicateMissions']);
const OBJ_SECTIONS  = new Set([
  'earthCycle', 'cetusCycle', 'vallisCycle', 'cambionCycle', 'duviriCycle',
  'nightwave', 'sortie', 'archonHunt', 'voidTrader',
]);
function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

// --- Helpers exportés ---
export async function getSection(platform, section, lang = 'en') {
  const sec = section === 'bounties' ? 'syndicateMissions' : section;
  const ws = await getParsed(platform, normalizeLang(lang));
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform, lang = 'en') {
  const keys = [
    'earthCycle', 'cetusCycle', 'vallisCycle', 'cambionCycle', 'duviriCycle',
    'fissures', 'alerts', 'invasions', 'nightwave', 'sortie', 'archonHunt',
    'voidTrader', 'syndicateMissions',
  ];
  const ws = await getParsed(platform, normalizeLang(lang));
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
