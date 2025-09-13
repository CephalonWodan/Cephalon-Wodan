// lib/worldstate.js
// Bridge robuste v5 : charge le pack de langue depuis data.languages,
// setLanguage(pack), passe deps { locale, sortieData }, ESM/CJS, cache 60s.

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
const wsUrl = (p='pc') => `https://${PLATFORM_HOST[p]||PLATFORM_HOST.pc}/dynamic/worldState.php`;

const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = new Map(); // key: platform:locale -> { at, parsed }
let _meta = null;
const setMeta = (m)=>{ _meta = { ...m, at: Date.now() }; };
export const getParserMeta = ()=>_meta;

const clone = (x)=>JSON.parse(JSON.stringify(x));
const toObj = (t)=>{ try { return JSON.parse(t); } catch { return null; } };

async function fetchWS(platform) {
  const r = await fetch(wsUrl(platform), {
    cache: 'no-store',
    headers: { 'user-agent': 'Cephalon-Wodan/1.0 (+worldstate)' },
  });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== 'string') throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

/** Charge warframe-worldstate-data, renvoie { data, pack, setLanguage } */
async function loadDataAndLang(locale, steps) {
  let data, pack, setLanguage, where = [];

  const note = (ok, place, extra='')=>{
    steps.push({ ok, where: place, extra });
    if (ok) where.push(place);
  };

  // ESM main
  try {
    const m = await import('warframe-worldstate-data');
    const mod = m?.default ?? m;
    data = mod;
    const langs = mod?.languages ?? mod?.default?.languages;
    if (langs && typeof langs === 'object') {
      pack = langs[locale] ?? langs.en;
      note(!!pack, 'esm data.languages', pack ? '' : 'no pack');
    } else note(false, 'esm data.languages', 'not found');
  } catch (e) { note(false, 'esm import data', String(e?.message||e)); }

  // setLanguage
  try {
    let tr = await import('warframe-worldstate-data/translation').catch(()=>null)
           || await import('warframe-worldstate-data/dist/translation.js').catch(()=>null);
    const setter = tr?.setLanguage ?? tr?.default?.setLanguage;
    if (typeof setter === 'function') { setLanguage = setter; note(true, 'esm translation.setLanguage'); }
    else note(false, 'esm translation.setLanguage', 'not a function');
  } catch (e) { note(false, 'esm import translation', String(e?.message||e)); }

  // CJS fallback si besoin
  if (!data || !pack || !setLanguage) {
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);

      if (!data || !pack) {
        try {
          const m = require('warframe-worldstate-data');
          const langs = m?.languages ?? m?.default?.languages;
          data = m?.default ?? m;
          if (langs && typeof langs === 'object') {
            pack = langs[locale] ?? langs.en;
            note(!!pack, 'cjs data.languages', pack ? '' : 'no pack');
          } else note(false, 'cjs data.languages', 'not found');
        } catch (e) { note(false, 'cjs require data', String(e?.message||e)); }
      }

      if (!setLanguage) {
        try {
          const tr = require('warframe-worldstate-data/translation');
          const setter = tr?.setLanguage ?? tr?.default?.setLanguage;
          if (typeof setter === 'function') { setLanguage = setter; note(true, 'cjs translation.setLanguage'); }
          else note(false, 'cjs translation.setLanguage', 'not a function');
        } catch (e) { note(false, 'cjs require translation', String(e?.message||e)); }
      }
    } catch { /* ignore */ }
  }

  return { data, pack, setLanguage, where };
}

async function parseWorldstate(text, locale='en') {
  const i18nSteps = [];
  const len = (text||'').length;

  // 1) charge data + pack + setter, puis setLanguage
  const { data, pack, setLanguage, where } = await loadDataAndLang(locale, i18nSteps);
  if (pack && typeof setLanguage === 'function') {
    try { setLanguage(pack); } catch {}
  }

  // deps attendus par v5
  const deps = {
    locale,
    logger: console,
    // très important pour Sortie: bosses & mapping
    sortieData: data?.sortie,
  };

  const obj = toObj(text);
  const attempts = [];
  let firstError = null;

  const tryStep = async (label, fn) => {
    try {
      const v = await fn();
      if (v) {
        setMeta({
          path: label, locale,
          hasLanguage: !!pack, setCalled: !!setLanguage,
          len, i18nSteps, where, attempts, firstError
        });
        return clone(v);
      }
      attempts.push({ label, ok:false, err:'empty result' });
    } catch (e) {
      const msg = String(e?.message||e);
      attempts.push({ label, ok:false, err: msg });
      if (!firstError) firstError = msg;
    }
    return null;
  };

  // 2) ESM parser
  try {
    const esm = await import('warframe-worldstate-parser');
    const def = esm?.default;
    const Ctor = esm?.WorldState;

    // a) default(json, deps)
    if (typeof def === 'function') {
      const v = await tryStep('esm.default(json,deps)', async()=> def(text, deps));
      if (v) return v;
    }

    // b) new WorldState(obj, deps)
    if (typeof Ctor === 'function' && obj) {
      const v = await tryStep('esm.new WorldState(obj,deps)', async()=> new Ctor(obj, deps));
      if (v) return v;
    }
  } catch (e) {
    attempts.push({ label:'esm.import', ok:false, err:String(e?.message||e) });
  }

  // 3) CJS parser fallback
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const cjs = require('warframe-worldstate-parser');
    const def = cjs?.default ?? null;
    const Ctor = cjs?.WorldState || (typeof cjs === 'function' ? cjs : null);

    if (typeof def === 'function') {
      const v = await tryStep('cjs.default(json,deps)', async()=> def(text, deps));
      if (v) return v;
    }
    if (typeof Ctor === 'function' && obj) {
      const v = await tryStep('cjs.new WorldState(obj,deps)', async()=> new Ctor(obj, deps));
      if (v) return v;
    }
  } catch (e) {
    attempts.push({ label:'cjs.require', ok:false, err:String(e?.message||e) });
  }

  // 4) fallback brut (évite 502)
  setMeta({
    path: 'fallback_raw', locale,
    hasLanguage: !!pack, setCalled: !!setLanguage,
    len, i18nSteps, where, attempts, firstError
  });
  return obj ?? {};
}

// -------------- Public ---------------
async function getParsed(platform, locale='en') {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error('bad platform');
  const key = `${platform}:${locale}`;
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit?.parsed && (now - hit.at) < TTL_MS) return hit.parsed;

  const text = await fetchWS(platform);
  const parsed = await parseWorldstate(text, locale);

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
