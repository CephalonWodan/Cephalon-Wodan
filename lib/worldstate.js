// lib/worldstate.js
// Warframe Worldstate — v5 bridge + init langue + cache 60s (Node runtime)

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

// --- Fetch worldstate brut ---
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

// --- Initialisation robuste des traductions (v5 externalise i18n) ---
async function initLanguage(locale) {
  let language;

  // 1) utilities.getLanguage(locale)
  try {
    const u = await import('warframe-worldstate-data/utilities');
    const utils = u.default ?? u;
    if (utils && typeof utils.getLanguage === 'function') {
      language = utils.getLanguage(locale);
    }
  } catch { /* ignore */ }

  // 2) setter global éventuel (certains builds l'utilisent)
  try {
    const tr = await import('warframe-worldstate-data/translation');
    const setLang = tr?.setLanguage ?? tr?.default?.setLanguage;
    if (typeof setLang === 'function' && language) {
      setLang(language);
    }
  } catch { /* ignore */ }

  return language;
}

// --- Bridge parseur v5 (classe OU fonction, ESM + CJS) ---
async function parseWorldstate(text, locale = 'en') {
  // Amorcer la langue (évite SORTIE_BOSS_* undefined)
  const language = await initLanguage(locale);
  const optsBase = { locale };
  const optsLang = language ? { locale, language } : optsBase;

  // 1) ESM import
  let esm;
  try { esm = await import('warframe-worldstate-parser'); } catch {}
  if (esm) {
    const def  = esm.default;
    const Ctor = esm.WorldState ?? (typeof def === 'function' ? def : null);
    const obj  = toObj(text);

    // a) Chemin classe (prioritaire sur ta build)
    if (typeof esm.WorldState === 'function') {
      try { return jsonify(new esm.WorldState(obj ?? text, optsLang)); } catch {}
      try { return jsonify(new esm.WorldState(obj ?? text, optsBase)); } catch {}
    }
    // b) Export default *possiblement* fonction ou classe
    if (typeof def === 'function') {
      // essayer en fonction d'abord
      try { return jsonify(await def(text, optsLang)); } catch {}
      try { if (obj) return jsonify(await def(obj, optsLang)); } catch {}
      // si c'est une classe "déguisée", tenter "new" avec OBJET
      if (obj) {
        try { return jsonify(new def(obj, optsLang)); } catch {}
        try { return jsonify(new def(obj, optsBase)); } catch {}
      }
      // en dernier recours, tenter new avec string (rare)
      try { return jsonify(new def(text, optsLang)); } catch {}
    }
  }

  // 2) CJS fallback
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const cjs = require('warframe-worldstate-parser');
    const def  = (cjs && cjs.default) || null;
    const Ctor = (cjs && cjs.WorldState) || (typeof cjs === 'function' ? cjs : null);
    const obj  = toObj(text);

    if (typeof Ctor === 'function') {
      try { return jsonify(new Ctor(obj ?? text, optsLang)); } catch {}
      try { return jsonify(new Ctor(obj ?? text, optsBase)); } catch {}
    }
    if (typeof def === 'function') {
      try { return jsonify(await def(text, optsLang)); } catch {}
      try { if (obj) return jsonify(await def(obj, optsLang)); } catch {}
      if (obj) {
        try { return jsonify(new def(obj, optsLang)); } catch {}
        try { return jsonify(new def(obj, optsBase)); } catch {}
      }
      try { return jsonify(new def(text, optsLang)); } catch {}
    }
  } catch { /* ignore */ }

  // 3) Sans parseur : dernier secours = JSON brut (évite 502)
  const raw = toObj(text);
  if (raw) return raw;

  // 4) Logs minimaux
  try { console.error('[worldstate] parser ESM exports:', esm ? Object.keys(esm) : 'esm import failed'); } catch {}
  throw new Error('warframe-worldstate-parser: aucun parseur compatible trouvé');
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
