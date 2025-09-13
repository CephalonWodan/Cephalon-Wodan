// lib/worldstate.js
// Warframe Worldstate — parser v5 ultra-robuste + cache 60s + locale

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

function tryJSON(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function isCtorWithoutNew(err) {
  return err && err.name === 'TypeError' && String(err.message).includes("cannot be invoked without 'new'");
}

// ====== PARSE BRIDGE (ESM + CJS fallbacks) ======
async function parseWorldstate(text, locale = 'en') {
  const opts = { locale };

  // 1) ESM import
  let esm;
  try { esm = await import('warframe-worldstate-parser'); } catch {}

  const candidates = [];

  if (esm) {
    const def  = esm.default;
    const Ctor = esm.WorldState;

    // default as function (string), then (object), then as class with object
    if (typeof def === 'function') {
      candidates.push(async () => await def(text, opts));             // fn(text)
      candidates.push(async () => { const o = tryJSON(text); if (!o) throw 0; return await def(o, opts); }); // fn(obj)
      candidates.push(async () => { const o = tryJSON(text); if (!o) throw 0; return new def(o, opts); });    // new def(obj)
    }
    // named class
    if (typeof Ctor === 'function') {
      candidates.push(async () => { const o = tryJSON(text); if (!o) throw 0; return new Ctor(o, opts); });   // new WorldState(obj)
      // certains builds acceptent encore la string (rare)
      candidates.push(async () => new Ctor(text, opts));
    }
  }

  // 2) CJS require fallback (évite des surprises d’exports ESM)
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const cjs = require('warframe-worldstate-parser');

    if (typeof cjs === 'function') {
      candidates.push(async () => await cjs(text, opts));             // fn(text)
      candidates.push(async () => { const o = tryJSON(text); if (!o) throw 0; return await cjs(o, opts); });  // fn(obj)
    }
    if (cjs && typeof cjs.default === 'function') {
      candidates.push(async () => await cjs.default(text, opts));
      candidates.push(async () => { const o = tryJSON(text); if (!o) throw 0; return await cjs.default(o, opts); });
      candidates.push(async () => { const o = tryJSON(text); if (!o) throw 0; return new cjs.default(o, opts); });
    }
    if (cjs && typeof cjs.WorldState === 'function') {
      candidates.push(async () => { const o = tryJSON(text); if (!o) throw 0; return new cjs.WorldState(o, opts); });
      candidates.push(async () => new cjs.WorldState(text, opts));
    }
  } catch { /* ignore require errors */ }

  // 3) exécution séquentielle des candidats jusqu’à succès
  const errors = [];
  for (const run of candidates) {
    try {
      const ws = await run();
      if (ws) return jsonify(ws);
    } catch (e) {
      errors.push(String(e && e.stack ? e.stack : e));
      // si c'était l'appel fonctionnel sur une classe, on laisse tenter les variantes
      if (!isCtorWithoutNew(e)) {
        // pas un cas "class sans new" -> rien de spécial à faire
      }
    }
  }

  // 4) logs minimaux si tout échoue
  try { console.error('[worldstate] parser ESM exports:', esm ? Object.keys(esm) : 'esm import failed'); } catch {}
  try { console.error('[worldstate] attempts errors (first 3):', errors.slice(0, 3)); } catch {}
  throw new Error('warframe-worldstate-parser: aucun parseur compatible trouvé');
}

// ====== Public API (avec cache) ======
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