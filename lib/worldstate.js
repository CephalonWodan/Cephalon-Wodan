// lib/worldstate.js
// Warframe Worldstate — v5 parser robuste + cache 60s + locale + fallback i18n

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

// Endpoints officiels
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

// Bridge parser v5: gère export default (fn/classe) + export nommé WorldState.
// IMPORTANT: on passe toujours { locale, language:{} } pour neutraliser les accès
// aux chaînes de traduction manquantes (ex: SORTIE_BOSS_HYENA), tout en laissant
// la structure des données intacte.
async function parseWorldstate(text, locale = 'en') {
  const mod = await import('warframe-worldstate-parser');
  const def = mod?.default;
  const Ctor = mod?.WorldState;

  // options primaires : locale uniquement
  const baseOpts = { locale };
  // options fallback : force un objet language vide pour éviter "undefined.SORTIE_BOSS_*"
  const safeOpts = { locale, language: {} };

  // essaie une combinaison et renvoie si OK
  const tryPaths = [
    // default export: fonction (string)
    () => typeof def === 'function' ? def(text, baseOpts) : Promise.reject(),
    // default export: fonction (objet)
    () => typeof def === 'function' ? def(JSON.parse(text), baseOpts) : Promise.reject(),
    // default export: classe (objet)
    () => typeof def === 'function' ? new def(JSON.parse(text), baseOpts) : Promise.reject(),
    // named WorldState: classe (objet)
    () => typeof Ctor === 'function' ? new Ctor(JSON.parse(text), baseOpts) : Promise.reject(),

    // Fallbacks avec language:{}
    () => typeof def === 'function' ? def(text, safeOpts) : Promise.reject(),
    () => typeof def === 'function' ? def(JSON.parse(text), safeOpts) : Promise.reject(),
    () => typeof def === 'function' ? new def(JSON.parse(text), safeOpts) : Promise.reject(),
    () => typeof Ctor === 'function' ? new Ctor(JSON.parse(text), safeOpts) : Promise.reject(),
  ];

  for (const fn of tryPaths) {
    try {
      const ws = await fn();
      if (ws) return jsonify(ws);
    } catch {
      // on enchaîne les stratégies sans bruit
    }
  }

  try { console.error('[worldstate] parser exports:', Object.keys(mod || {})); } catch {}
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