// lib/worldstate.js
// Bridge v5 : init i18n agressive, ESM/CJS, helpers+classe+default, cache 60s, meta debug

export const ALLOWED_PLATFORMS = new Set(['pc', 'ps4', 'xb1', 'swi', 'mob']);
export const ALLOWED_SECTIONS = new Set([
  'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
  'fissures','alerts','invasions','nightwave','sortie','archonHunt',
  'voidTrader','syndicateMissions',
]);

export function normalizeLang(raw='en') {
  const s = String(raw||'').toLowerCase();
  return s.startsWith('fr') ? 'fr' : 'en';
}

const PLATFORM_HOST = {
  pc:  'content.warframe.com',
  ps4: 'content-ps4.warframe.com',
  xb1: 'content-xb1.warframe.com',
  swi: 'content-swi.warframe.com',
  mob: 'content-mob.warframe.com',
};
const urlFor = (p='pc') => `https://${PLATFORM_HOST[p]||PLATFORM_HOST.pc}/dynamic/worldState.php`;

const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = new Map(); // key platform:locale -> { at, parsed }
let _meta = null;
const setMeta = (m)=>{ _meta = { ...m, at: Date.now() }; };
export const getParserMeta = ()=>_meta;

// --- utils ---
const toJSON = (t)=>{ try { return JSON.parse(t); } catch { return null; } };
const deepClone = (x)=>JSON.parse(JSON.stringify(x));

// --- fetch ---
async function fetchWS(platform) {
  const r = await fetch(urlFor(platform), {
    cache: 'no-store',
    headers: { 'user-agent': 'Cephalon-Wodan/1.0 (+worldstate)' },
  });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== 'string') throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

// ---------- i18n : essaie *tous* les chemins connus ----------
async function initLanguage(locale, steps) {
  let language, setterFound = false;
  const note = (ok, where, extra='') => steps.push({ ok, where, extra });

  // 1) ESM subpath utilities
  try {
    const u = await import('warframe-worldstate-data/utilities');
    const utils = u?.default ?? u;
    const gl = utils?.getLanguage ?? utils?.default?.getLanguage;
    if (typeof gl === 'function') {
      language = gl(locale); note(true, 'esm utilities.getLanguage');
    } else note(false, 'esm utilities.getLanguage', 'not a function');
  } catch (e) { note(false, 'esm import utilities', String(e?.message||e)); }

  // 2) ESM main (getLanguage direct)
  if (!language) {
    try {
      const m = await import('warframe-worldstate-data');
      const gl = m?.getLanguage ?? m?.default?.getLanguage;
      if (typeof gl === 'function') { language = gl(locale); note(true, 'esm main.getLanguage'); }
      else note(false, 'esm main.getLanguage', 'not a function');
      // ✨ NEW: util via main.utilities
      if (!language) {
        const utils = m?.utilities ?? m?.default?.utilities;
        const gl2 = utils?.getLanguage;
        if (typeof gl2 === 'function') { language = gl2(locale); note(true, 'esm main.utilities.getLanguage'); }
        else note(false, 'esm main.utilities.getLanguage', 'not a function');
      }
    } catch (e) { note(false, 'esm import main', String(e?.message||e)); }
  }

  // 3) CJS requires (si dispo)
  if (!language) {
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);

      try {
        const u = require('warframe-worldstate-data/utilities');
        const utils = u?.default ?? u;
        const gl = utils?.getLanguage ?? utils?.default?.getLanguage;
        if (typeof gl === 'function') { language = gl(locale); note(true, 'cjs utilities.getLanguage'); }
        else note(false, 'cjs utilities.getLanguage', 'not a function');
      } catch (e) { note(false, 'cjs require utilities', String(e?.message||e)); }

      if (!language) {
        try {
          const m = require('warframe-worldstate-data');
          const gl = m?.getLanguage ?? m?.default?.getLanguage;
          if (typeof gl === 'function') { language = gl(locale); note(true, 'cjs main.getLanguage'); }
          else note(false, 'cjs main.getLanguage', 'not a function');

          if (!language) {
            const utils = m?.utilities ?? m?.default?.utilities;
            const gl2 = utils?.getLanguage;
            if (typeof gl2 === 'function') { language = gl2(locale); note(true, 'cjs main.utilities.getLanguage'); }
            else note(false, 'cjs main.utilities.getLanguage', 'not a function');
          }
        } catch (e) { note(false, 'cjs require main', String(e?.message||e)); }
      }
    } catch {
      // pas de createRequire en environnement particulier
    }
  }

  // 4) setter global (optionnel) — si présent on l’utilise
  try {
    let tr = await import('warframe-worldstate-data/translation').catch(()=>null)
           || await import('warframe-worldstate-data/dist/translation.js').catch(()=>null);
    const setLanguage = tr?.setLanguage ?? tr?.default?.setLanguage;
    if (language && typeof setLanguage === 'function') {
      setLanguage(language); setterFound = true; note(true, 'setLanguage(language)');
    } else if (language) {
      note(false, 'setLanguage(language)', 'setter not found');
    }
  } catch (e) { if (language) note(false, 'import translation', String(e?.message||e)); }

  return { language, setterFound };
}

// ---------- parse v5 ----------
async function parseWorldstate(text, locale='en') {
  const i18nSteps = [];
  const { language, setterFound } = await initLanguage(locale, i18nSteps);
  const opts = language ? { locale, language } : { locale };
  const len = (text||'').length;
  const obj = toJSON(text);
  const attempts = [];
  let firstError = null;

  const tryStep = async (label, fn) => {
    try {
      const v = await fn();
      if (v) {
        setMeta({ path: label, locale, hasLanguage: !!language, setterFound, len, i18nSteps, attempts, firstError });
        return deepClone(v);
      }
      attempts.push({ label, ok:false, err:'empty result' });
    } catch (e) {
      const msg = String(e?.message||e);
      attempts.push({ label, ok:false, err: msg });
      if (!firstError) firstError = msg;
    }
    return null;
  };

  if (!obj) {
    setMeta({ path: 'invalid_json', locale, hasLanguage: !!language, setterFound, len, i18nSteps, attempts });
    throw new Error('worldstate: invalid JSON');
  }

  // 1) ESM
  let esm = null;
  try { esm = await import('warframe-worldstate-parser'); } catch {}
  if (esm) {
    const { default: def, WorldState, parseArray, parseAsyncArray } = esm;

    // helpers
    if (typeof parseArray === 'function') {
      const arr = await tryStep('esm.parseArray([obj])+opts', async()=> parseArray([obj], opts));
      if (arr && Array.isArray(arr) && arr[0]) return arr[0];
    }
    if (typeof parseAsyncArray === 'function') {
      const gen = async function*(){ yield obj; };
      const arr = await tryStep('esm.parseAsyncArray(gen)+opts', async()=> parseAsyncArray(gen(), opts));
      if (arr && Array.isArray(arr) && arr[0]) return arr[0];
    }

    // classe
    if (typeof WorldState === 'function') {
      const v1 = await tryStep('esm.WorldState(obj)+opts', async()=> new WorldState(obj, opts));
      if (v1) return v1;
      const v2 = await tryStep('esm.WorldState(text)+opts', async()=> new WorldState(text, opts));
      if (v2) return v2;
    }

    // default (fn -> classe)
    if (typeof def === 'function') {
      const v1 = await tryStep('esm.default.fn(text)+opts', async()=> def(text, opts));
      if (v1) return v1;
      const v2 = await tryStep('esm.default.fn(obj)+opts', async()=> def(obj, opts));
      if (v2) return v2;
      const v3 = await tryStep('esm.default.ctor(obj)+opts', async()=> new def(obj, opts));
      if (v3) return v3;
      const v4 = await tryStep('esm.default.ctor(text)+opts', async()=> new def(text, opts));
      if (v4) return v4;
    }
  }

  // 2) CJS
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const cjs = require('warframe-worldstate-parser');
    const def  = cjs?.default ?? null;
    const Ctor = cjs?.WorldState || (typeof cjs === 'function' ? cjs : null);
    const parseArray = cjs?.parseArray;
    const parseAsyncArray = cjs?.parseAsyncArray;

    if (typeof parseArray === 'function') {
      const arr = await tryStep('cjs.parseArray([obj])+opts', async()=> parseArray([obj], opts));
      if (arr && Array.isArray(arr) && arr[0]) return arr[0];
    }
    if (typeof parseAsyncArray === 'function') {
      const gen = async function*(){ yield obj; };
      const arr = await tryStep('cjs.parseAsyncArray(gen)+opts', async()=> parseAsyncArray(gen(), opts));
      if (arr && Array.isArray(arr) && arr[0]) return arr[0];
    }

    if (typeof Ctor === 'function') {
      const v1 = await tryStep('cjs.WorldState(obj)+opts', async()=> new Ctor(obj, opts));
      if (v1) return v1;
      const v2 = await tryStep('cjs.WorldState(text)+opts', async()=> new Ctor(text, opts));
      if (v2) return v2;
    }
    if (typeof def === 'function') {
      const v1 = await tryStep('cjs.default.fn(text)+opts', async()=> def(text, opts));
      if (v1) return v1;
      const v2 = await tryStep('cjs.default.fn(obj)+opts', async()=> def(obj, opts));
      if (v2) return v2;
      const v3 = await tryStep('cjs.default.ctor(obj)+opts', async()=> new def(obj, opts));
      if (v3) return v3;
      const v4 = await tryStep('cjs.default.ctor(text)+opts', async()=> new def(text, opts));
      if (v4) return v4;
    }
  } catch { /* ignore */ }

  // 3) fallback brut
  setMeta({ path: 'fallback_raw', locale, hasLanguage: !!language, setterFound, len, i18nSteps, attempts, firstError });
  return obj;
}

// ---------- public API ----------
async function getParsed(platform, locale='en') {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error('bad platform');
  const key = `${platform}:${locale}`;
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit?.parsed && (now - hit.at) < TTL_MS) return hit.parsed;

  const raw = await fetchWS(platform);
  const parsed = await parseWorldstate(raw, locale);

  _cache.set(key, { at: now, parsed });
  return parsed;
}

const LIST = new Set(['fissures','alerts','invasions','syndicateMissions']);
const OBJ  = new Set([
  'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
  'nightwave','sortie','archonHunt','voidTrader',
]);
function shape(section, v) {
  if (LIST.has(section)) return Array.isArray(v) ? v : [];
  if (OBJ.has(section))  return v ?? {};
  return v ?? null;
}

export async function getSection(platform, section, lang='en') {
  const sec = section === 'bounties' ? 'syndicateMissions' : section;
  const ws = await getParsed(platform, normalizeLang(lang));
  return shape(sec, ws?.[sec]);
}

export async function getAggregated(platform, lang='en') {
  const keys = [
    'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
    'fissures','alerts','invasions','nightwave','sortie','archonHunt',
    'voidTrader','syndicateMissions'
  ];
  const ws = await getParsed(platform, normalizeLang(lang));
  const out = {};
  for (const k of keys) out[k] = shape(k, ws?.[k]);
  const meta = getParserMeta();
  if (meta) out._meta = meta;
  return out;
}
