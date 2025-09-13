// lib/worldstate.js
// Warframe Worldstate — parser v5 béton + cache 60s + locale + chargeur de langue

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
const _cache = new Map(); // key = `${platform}:${locale}`

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

const jsonify = (x) => JSON.parse(JSON.stringify(x));
const toObj   = (t) => { try { return JSON.parse(t); } catch { return null; } };

// ---------- chargeur de langue robuste ----------
async function loadLanguage(locale) {
  // essaie util.getLanguage(locale)
  try {
    const m = await import('warframe-worldstate-data/utilities');
    const fn = (m && m.getLanguage) || (m && m.default && m.default.getLanguage);
    if (typeof fn === 'function') return fn(locale);
  } catch {}
  // essaie le main export
  try {
    const m = await import('warframe-worldstate-data');
    if (typeof m.getLanguage === 'function') return m.getLanguage(locale);
    if (m && m.default && typeof m.default.getLanguage === 'function') {
      return m.default.getLanguage(locale);
    }
  } catch {}
  // dernier recours: objet neutre pour éviter undefined.SORTIE_BOSS_*
  return {};
}

// ---------- bridge parser v5 (gère classe/fn + ESM/CJS) ----------
async function parseWorldstate(text, locale = 'en') {
  const optsBase = { locale };
  const lang = await loadLanguage(locale);
  const optsWithLang = { locale, language: lang };

  // 1) ESM
  let esm;
  try { esm = await import('warframe-worldstate-parser'); } catch {}

  const attempts = [];

  if (esm) {
    const def  = esm.default;
    const Ctor = esm.WorldState;

    // a) chemin "classe par défaut" (ton cas) — utiliser l'OBJET + language
    if (typeof def === 'function') {
      attempts.push(() => { const o = toObj(text); if (!o) throw 0; return new def(o, optsWithLang); });
      // variante sans language (au cas où)
      attempts.push(() => { const o = toObj(text); if (!o) throw 0; return new def(o, optsBase); });
      // si jamais c’est callable (rare sur ton build)
      attempts.push(() => def(text, optsBase));
      attempts.push(() => { const o = toObj(text); if (!o) throw 0; return def(o, optsBase); });
    }

    // b) export nommé classe
    if (typeof Ctor === 'function') {
      attempts.push(() => { const o = toObj(text); if (!o) throw 0; return new Ctor(o, optsWithLang); });
      attempts.push(() => { const o = toObj(text); if (!o) throw 0; return new Ctor(o, optsBase); });
      // string (très rare mais on tente)
      attempts.push(() => new Ctor(text, optsWithLang));
      attempts.push(() => new Ctor(text, optsBase));
    }
  }

  // 2) CJS (fallback)
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const cjs = require('warframe-worldstate-parser');

    if (cjs) {
      if (typeof cjs === 'function') {
        attempts.push(() => cjs(text, optsBase));
        attempts.push(() => { const o = toObj(text); if (!o) throw 0; return cjs(o, optsBase); });
      }
      if (typeof cjs.default === 'function') {
        attempts.push(() => { const o = toObj(text); if (!o) throw 0; return new cjs.default(o, optsWithLang); });
        attempts.push(() => { const o = toObj(text); if (!o) throw 0; return new cjs.default(o, optsBase); });
        attempts.push(() => cjs.default(text, optsBase));
        attempts.push(() => { const o = toObj(text); if (!o) throw 0; return cjs.default(o, optsBase); });
      }
      if (typeof cjs.WorldState === 'function') {
        attempts.push(() => { const o = toObj(text); if (!o) throw 0; return new cjs.WorldState(o, optsWithLang); });
        attempts.push(() => { const o = toObj(text); if (!o) throw 0; return new cjs.WorldState(o, optsBase); });
      }
    }
  } catch {}

  // 3) exécution séquentielle jusqu’à succès
  const errs = [];
  for (const run of attempts) {
    try {
      const ws = await run();
      if (ws) return jsonify(ws);
    } catch (e) {
      errs.push(String(e && e.stack ? e.stack : e));
    }
  }

  try { console.error('[worldstate] parser ESM exports:', esm ? Object.keys(esm) : 'esm import failed'); } catch {}
  try { console.error('[worldstate] attempts errors (first 3):', errs.slice(0, 3)); } catch {}
  throw new Error('warframe-worldstate-parser: aucun parseur compatible trouvé');
}

// ---------- API publique (avec cache) ----------
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

// formes attendues
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
