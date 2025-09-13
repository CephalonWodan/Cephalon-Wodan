// lib/worldstate.js
// Warframe Worldstate — v5 parser robuste + cache 60s + locale

// Plateformes/sections autorisées
export const ALLOWED_PLATFORMS = new Set(['pc', 'ps4', 'xb1', 'swi', 'mob']);
export const ALLOWED_SECTIONS = new Set([
  'earthCycle', 'cetusCycle', 'vallisCycle', 'cambionCycle', 'duviriCycle',
  'fissures', 'alerts', 'invasions', 'nightwave', 'sortie', 'archonHunt',
  'voidTrader', 'syndicateMissions',
]);

// Normalisation de la langue (en/fr)
export function normalizeLang(raw = 'en') {
  const s = String(raw || '').toLowerCase();
  return s.startsWith('fr') ? 'fr' : 'en';
}

// Endpoints officiels (PC/PS4/XB1/Switch/iOS)
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

// Cache mémoire (clé: `${platform}:${locale}`)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = new Map(); // key -> { at:number, parsed:any }

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, {
    cache: 'no-store',
    headers: { 'user-agent': 'Cephalon-Wodan/1.0 (+worldstate)' },
  });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== 'string') {
    throw new Error(`worldstate ${platform} empty-response`);
  }
  return text;
}

const jsonify = (x) => JSON.parse(JSON.stringify(x));

// Bridge parser v5: supporte export par défaut (fn/classe) + export nommé WorldState
async function parseWorldstate(text, locale = 'en') {
  const mod = await import('warframe-worldstate-parser');
  const def = mod?.default;
  const Ctor = mod?.WorldState;
  const opts = { locale }; // laisser le parser gérer la data et les traductions

  // 1) Export par défaut en tant que fonction (cas doc npm)
  if (typeof def === 'function') {
    // a) la plupart des builds acceptent la string + opts
    try {
      const ws = await def(text, opts);
      return jsonify(ws);
    } catch {}
    // b) certains builds acceptent l'objet JSON + opts
    try {
      const obj = JSON.parse(text);
      const ws = await def(obj, opts);
      return jsonify(ws);
    } catch {}
    // c) si c'est en fait une classe déguisée → tenter "new" (avec OBJET)
    try {
      const obj = JSON.parse(text);
      // @ts-ignore
      const inst = new def(obj, opts);
      return jsonify(inst);
    } catch {}
  }

  // 2) Export nommé WorldState (classe) — attend un OBJET
  if (typeof Ctor === 'function') {
    const obj = JSON.parse(text);
    const inst = new Ctor(obj, opts);
    return jsonify(inst);
  }

  // 3) Dernier recours: si tout a échoué, log minimal pour debug
  try {
    // eslint-disable-next-line no-console
    console.error('[worldstate] parser exports:', Object.keys(mod || {}));
  } catch {}
  throw new Error('warframe-worldstate-parser: aucun parseur compatible trouvé');
}

async function getParsed(platform, locale = 'en') {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error('bad platform');
  const key = `${platform}:${locale}`;
  const now = Date.now();
  const c = _cache.get(key);
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchWorldstateText(platform);
  const parsed = await parseWorldstate(text, locale);

  _cache.set(key, { at: now, parsed });
  return parsed;
}

// Formes attendues
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

// API helpers
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