// lib/worldstate.js
// Worldstate — v5 bridge ++ : i18n multi-chemins, parseArray/parseAsyncArray,
// classe/fonction, ESM/CJS, cache 60s, meta debug (pour headers & ?debug=1)

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

// --- meta debug (pour headers / ?debug=1) ---
let _meta = null;
function setMeta(meta) { _meta = { ...meta, at: Date.now() }; }
export function getParserMeta() { return _meta; }

// utils
const jsonify = (x) => JSON.parse(JSON.stringify(x));
const toObj = (t) => { try { return JSON.parse(t); } catch { return null; } };

// ---------- fetch ----------
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

// ---------- i18n init (essaie plusieurs chemins ESM/CJS) ----------
async function initLanguage(locale, steps) {
  let language;
  const record = (ok, where, note='') => steps.push({ ok, where, note });

  // ESM utilities
  try {
    const u = await import('warframe-worldstate-data/utilities');
    const utils = u?.default ?? u;
    const fn = utils?.getLanguage ?? utils?.default?.getLanguage;
    if (typeof fn === 'function') { language = fn(locale); record(true, 'esm utilities.getLanguage'); }
    else record(false, 'esm utilities.getLanguage', 'not a function');
  } catch (e) { record(false, 'esm import utilities', String(e?.message || e)); }

  // ESM main
  if (!language) {
    try {
      const m = await import('warframe-worldstate-data');
      const fn = m?.getLanguage ?? m?.default?.getLanguage;
      if (typeof fn === 'function') { language = fn(locale); record(true, 'esm main.getLanguage'); }
      else record(false, 'esm main.getLanguage', 'not a function');
    } catch (e) { record(false, 'esm import main', String(e?.message || e)); }
  }

  // CJS fallbacks
  if (!language) {
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);

      try {
        const u = require('warframe-worldstate-data/utilities');
        const utils = u?.default ?? u;
        const fn = utils?.getLanguage ?? utils?.default?.getLanguage;
        if (typeof fn === 'function') { language = fn(locale); record(true, 'cjs utilities.getLanguage'); }
        else record(false, 'cjs utilities.getLanguage', 'not a function');
      } catch (e) { record(false, 'cjs require utilities', String(e?.message || e)); }

      if (!language) {
        try {
          const m = require('warframe-worldstate-data');
          const fn = m?.getLanguage ?? m?.default?.getLanguage;
          if (typeof fn === 'function') { language = fn(locale); record(true, 'cjs main.getLanguage'); }
          else record(false, 'cjs main.getLanguage', 'not a function');
        } catch (e) { record(false, 'cjs require main', String(e?.message || e)); }
      }
    } catch {/* no createRequire in some envs */}
  }

  // setter global éventuel
  if (language) {
    try {
      let tr = await import('warframe-worldstate-data/translation').catch(() => null)
             || await import('warframe-worldstate-data/dist/translation.js').catch(() => null);
      const setLang = tr?.setLanguage ?? tr?.default?.setLanguage;
      if (typeof setLang === 'function') { setLang(language); record(true, 'setLanguage(language)'); }
      else record(false, 'setLanguage(language)', 'setter not found');
    } catch (e) { record(false, 'import translation', String(e?.message || e)); }
  }

  return language;
}

// ---------- parse v5 : helpers -> classe -> default fn (ESM puis CJS) ----------
async function parseWorldstate(text, locale = 'en') {
  const i18nSteps = [];
  const language = await initLanguage(locale, i18nSteps);
  const opts = language ? { locale, language } : { locale };
  const len = (text || '').length;
  const obj = toObj(text);
  const attempts = [];
  let firstError = null;

  const pushAttempt = async (label, fn) => {
    try {
      const v = await fn();
      if (v) {
        setMeta({ path: label, locale, hasLanguage: !!language, len, i18nSteps, parseAttempts: attempts, firstError });
        return jsonify(v);
      }
    } catch (e) {
      const msg = String(e?.message || e);
      attempts.push({ label, ok: false, err: msg });
      if (!firstError) firstError = msg;
      return null;
    }
    attempts.push({ label, ok: false, err: 'empty result' });
    return null;
  };

  if (!obj) {
    setMeta({ path: 'invalid_json', locale, hasLanguage: !!language, len, i18nSteps, parseAttempts: attempts });
    throw new Error('worldstate: invalid JSON');
  }

  // 1) ESM
  let esm = null;
  try { esm = await import('warframe-worldstate-parser'); } catch {}
  if (esm) {
    const { default: def, WorldState, parseArray, parseAsyncArray } = esm;

    // a) helpers (si exposés)
    if (typeof parseArray === 'function') {
      const arr = await pushAttempt('esm.parseArray([obj])+opts', async () => parseArray([obj], opts));
      if (arr && Array.isArray(arr) && arr[0]) return arr[0];
    }
    if (typeof parseAsyncArray === 'function') {
      const gen = async function*(){ yield obj; };
      const arr = await pushAttempt('esm.parseAsyncArray(gen)+opts', async () => parseAsyncArray(gen(), opts));
      if (arr && Array.isArray(arr) && arr[0]) return arr[0];
    }

    // b) classe nommée
    if (typeof WorldState === 'function') {
      const v = await pushAttempt('esm.WorldState(obj)+opts', async () => new WorldState(obj, opts));
      if (v) return v;
      const v2 = await pushAttempt('esm.WorldState(text)+opts', async () => new WorldState(text, opts));
      if (v2) return v2;
    }

    // c) default (fonction -> classe)
    if (typeof def === 'function') {
      const v1 = await pushAttempt('esm.default.fn(text)+opts', async () => def(text, opts));
      if (v1) return v1;
      const v2 = await pushAttempt('esm.default.fn(obj)+opts', async () => def(obj, opts));
      if (v2) return v2;
      const v3 = await pushAttempt('esm.default.ctor(obj)+opts', async () => new def(obj, opts));
      if (v3) return v3;
      const v4 = await pushAttempt('esm.default.ctor(text)+opts', async () => new def(text, opts));
      if (v4) return v4;
    }
  }

  // 2) CJS fallback
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const cjs = require('warframe-worldstate-parser');
    const def  = cjs?.default ?? null;
    const Ctor = cjs?.WorldState || (typeof cjs === 'function' ? cjs : null);
    const parseArray = cjs?.parseArray;
    const parseAsyncArray = cjs?.parseAsyncArray;

    if (typeof parseArray === 'function') {
      const arr = await pushAttempt('cjs.parseArray([obj])+opts', async () => parseArray([obj], opts));
      if (arr && Array.isArray(arr) && arr[0]) return arr[0];
    }
    if (typeof parseAsyncArray === 'function') {
      const gen = async function*(){ yield obj; };
      const arr = await pushAttempt('cjs.parseAsyncArray(gen)+opts', async () => parseAsyncArray(gen(), opts));
      if (arr && Array.isArray(arr) && arr[0]) return arr[0];
    }

    if (typeof Ctor === 'function') {
      const v = await pushAttempt('cjs.WorldState(obj)+opts', async () => new Ctor(obj, opts));
      if (v) return v;
      const v2 = await pushAttempt('cjs.WorldState(text)+opts', async () => new Ctor(text, opts));
      if (v2) return v2;
    }
    if (typeof def === 'function') {
      const v1 = await pushAttempt('cjs.default.fn(text)+opts', async () => def(text, opts));
      if (v1) return v1;
      const v2 = await pushAttempt('cjs.default.fn(obj)+opts', async () => def(obj, opts));
      if (v2) return v2;
      const v3 = await pushAttempt('cjs.default.ctor(obj)+opts', async () => new def(obj, opts));
      if (v3) return v3;
      const v4 = await pushAttempt('cjs.default.ctor(text)+opts', async () => new def(text, opts));
      if (v4) return v4;
    }
  } catch {/* ignore */}

  // 3) fallback brut (évite 502) + méta riche
  setMeta({ path: 'fallback_raw', locale, hasLanguage: !!language, len, i18nSteps, parseAttempts: attempts, firstError });
  return obj;
}

// ---------- public API ----------
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

  // ajoute méta pour debug via JSON si ?debug=1
  const meta = getParserMeta();
  if (meta) out._meta = meta;

  return out;
}
