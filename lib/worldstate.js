// lib/worldstate.js
// Warframe Worldstate — v5 bridge robuste + cache 60s + locale (Node runtime)

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
  let language = undefined;

  // 1) utilities.getLanguage(locale)
  try {
    const u = await import('warframe-worldstate-data/utilities');
    const utils = u.default ?? u;
    if (utils && typeof utils.getLanguage === 'function') {
      language = utils.getLanguage(locale);
    }
  } catch { /* ignore */ }

  // 2) Tenter un setter global (selon build)
  //    Certains chemins du parser lisent une table globale interne.
  try {
    const tr = await import('warframe-worldstate-data/translation');
    const setter = tr?.setLanguage ?? tr?.default?.setLanguage;
    if (typeof setter === 'function' && language) {
      setter(language);
    }
  } catch { /* ignore */ }

  return language;
}

// --- Bridge parseur v5 (ESM + CJS, fonction/classe, string/objet) ---
async function parseWorldstate(text, locale = 'en') {
  const language = await initLanguage(locale);
  const base = { locale };
  const withLang = language ? { locale, language } : base;

  // 1) ESM
  let esm;
  try { esm = await import('warframe-worldstate-parser'); } catch {}
  const attempts = [];

  if (esm) {
    const def  = esm.default;
    const Ctor = esm.WorldState;

    // default export comme fonction
    if (typeof def === 'function') {
      attempts.push(async () => await def(text, withLang));                     // fn(text)
      attempts.push(async () => await def(text, base));                         // fn(text) sans lang
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return await def(o, withLang); }); // fn(obj)
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return await def(o, base); });     // fn(obj) sans lang
      // si en réalité c'est une classe :
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return new def(o, withLang); });   // new def(obj)
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return new def(o, base); });       // new def(obj) sans lang
    }

    // export nommé classe
    if (typeof Ctor === 'function') {
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return new Ctor(o, withLang); });  // new Ctor(obj)
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return new Ctor(o, base); });      // new Ctor(obj) sans lang
      attempts.push(async () => new Ctor(text, withLang));                                                   // (rare) new Ctor(text)
      attempts.push(async () => new Ctor(text, base));                                                       // (rare) new Ctor(text)
    }
  }

  // 2) CJS fallback
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const cjs = require('warframe-worldstate-parser');

    const def  = (cjs && cjs.default) || null;
    const Ctor = (cjs && cjs.WorldState) || (typeof cjs === 'function' ? cjs : null);

    if (typeof def === 'function') {
      attempts.push(async () => await def(text, withLang));
      attempts.push(async () => await def(text, base));
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return await def(o, withLang); });
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return await def(o, base); });
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return new def(o, withLang); });
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return new def(o, base); });
    }
    if (typeof Ctor === 'function') {
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return new Ctor(o, withLang); });
      attempts.push(async () => { const o = toObj(text); if (!o) throw 0; return new Ctor(o, base); });
      attempts.push(async () => new Ctor(text, withLang));
      attempts.push(async () => new Ctor(text, base));
    }
  } catch { /* ignore */ }

  // 3) Exécution séquentielle jusqu’à succès
  const errs = [];
  for (const run of attempts) {
    try {
      const ws = await run();
      if (ws) return jsonify(ws);
    } catch (e) {
      errs.push(String(e && e.stack ? e.stack : e));
    }
  }

  // 4) Ultime secours : renvoyer JSON brut (évite un 502)
  const raw = toObj(text);
  if (raw) return raw;

  // 5) Logs minimaux (si besoin de debug)
  try { console.error('[worldstate] parser ESM exports:', esm ? Object.keys(esm) : 'esm import failed'); } catch {}
  try { console.error('[worldstate] attempts errors (first 3):', errs.slice(0, 3)); } catch {}
  throw new Error('warframe-worldstate-parser: aucun parseur compatible trouvé');
}

// --- API publique (avec cache) ---
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
