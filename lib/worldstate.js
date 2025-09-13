// lib/worldstate.js
// Warframe Worldstate — v5 (classe/fonction) + init langue + cache 60s + meta debug

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

const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = new Map(); // key -> { at:number, parsed:any }

// -------- meta debug (dernière exécution) --------
let _meta = null;
function setMeta(path, { locale, hasLanguage, len }) {
  _meta = { path, locale, hasLanguage, len, at: Date.now() };
}
export function getParserMeta() {
  return _meta;
}

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

// --- Initialisation des traductions (v5 externalise i18n) ---
async function initLanguage(locale) {
  let language;
  try {
    const u = await import('warframe-worldstate-data/utilities');
    const utils = u.default ?? u;
    if (typeof utils?.getLanguage === 'function') language = utils.getLanguage(locale);
  } catch {}
  try {
    const tr = await import('warframe-worldstate-data/translation').catch(() => null)
           || await import('warframe-worldstate-data/dist/translation.js').catch(() => null);
    const setLang = tr?.setLanguage ?? tr?.default?.setLanguage;
    if (typeof setLang === 'function' && language) setLang(language);
  } catch {}
  return language;
}

// --- Parse v5 (simplifié mais robuste): essaie Classe(obj), puis Default-fn(text/obj), ESM puis CJS, sinon fallback raw ---
async function parseWorldstate(text, locale = 'en') {
  const language = await initLanguage(locale);
  const opts = language ? { locale, language } : { locale };
  const len = (text || '').length;
  const obj = toObj(text);
  if (!obj) throw new Error('worldstate: invalid JSON');

  // 1) ESM
  try {
    const esm = await import('warframe-worldstate-parser');
    // a) Classe nommée
    if (typeof esm?.WorldState === 'function') {
      try {
        const ws = new esm.WorldState(obj, opts);
        setMeta('esm.WorldState(obj)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
    }
    // b) Default export (fonction ou classe)
    if (typeof esm?.default === 'function') {
      // fonction(text)
      try {
        const ws = await esm.default(text, opts);
        setMeta('esm.default.fn(text)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
      // fonction(obj)
      try {
        const ws = await esm.default(obj, opts);
        setMeta('esm.default.fn(obj)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
      // new default(obj)
      try {
        const ws = new esm.default(obj, opts);
        setMeta('esm.default.ctor(obj)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
    }
  } catch {/* ignore */}

  // 2) CJS fallback
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const cjs = require('warframe-worldstate-parser');

    if (typeof cjs?.WorldState === 'function') {
      try {
        const ws = new cjs.WorldState(obj, opts);
        setMeta('cjs.WorldState(obj)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
    }
    if (typeof cjs?.default === 'function') {
      try {
        const ws = await cjs.default(text, opts);
        setMeta('cjs.default.fn(text)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
      try {
        const ws = await cjs.default(obj, opts);
        setMeta('cjs.default.fn(obj)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
      try {
        const ws = new cjs.default(obj, opts);
        setMeta('cjs.default.ctor(obj)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
    }
    // certains cjs exportent directement une fonction
    if (typeof cjs === 'function') {
      try {
        const ws = await cjs(text, opts);
        setMeta('cjs.fn(text)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
      try {
        const ws = await cjs(obj, opts);
        setMeta('cjs.fn(obj)+opts', { locale, hasLanguage: !!language, len });
        return jsonify(ws);
      } catch {}
    }
  } catch {/* ignore */}

  // 3) Fallback JSON brut (évite 502)
  setMeta('fallback_raw', { locale, hasLanguage: !!language, len });
  return obj;
}

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
