// lib/worldstate.js
// Warframe Worldstate — parser v5 robuste + cache 60s + locale

// Plateformes/sections autorisées
export const ALLOWED_PLATFORMS = new Set(['pc', 'ps4', 'xb1', 'swi', 'mob']);
export const ALLOWED_SECTIONS = new Set([
  'earthCycle', 'cetusCycle', 'vallisCycle', 'cambionCycle', 'duviriCycle',
  'fissures', 'alerts', 'invasions', 'nightwave', 'sortie', 'archonHunt',
  'voidTrader', 'syndicateMissions',
]);

// Normalisation langue
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

function isCtorWithoutNew(err) {
  return err && err.name === 'TypeError' &&
         typeof err.message === 'string' &&
         err.message.includes('Class constructor') &&
         err.message.includes("without 'new'");
}

// Bridge parser v5 : supporte export default (fn OU classe) et export nommé WorldState.
// Essaie (dans l’ordre) : default(text) -> new default(text) -> default(obj) -> new default(obj)
// puis WorldState(text) -> WorldState(obj). Passe toujours { locale }.
async function parseWorldstate(text, locale = 'en') {
  const mod = await import('warframe-worldstate-parser');
  const def = mod?.default;
  const Ctor = mod?.WorldState;
  const opts = { locale };
  let obj = null;
  const getObj = () => (obj ??= JSON.parse(text));

  // 1) export par défaut en tant que fonction
  if (typeof def === 'function') {
    // a) tenter comme fonction avec string
    try {
      const ws = await def(text, opts);
      if (ws) return jsonify(ws);
    } catch (e) {
      if (!isCtorWithoutNew(e)) {
        // autre erreur -> on essaie les variantes objet/classe quand même
      } else {
        // le default est une classe -> on passera en "new"
      }
    }

    // b) tenter "new default(text, opts)" (si c'est une classe)
    try {
      // @ts-ignore
      const inst = new def(text, opts);
      if (inst) return jsonify(inst);
    } catch {}

    // c) tenter fonction avec OBJET
    try {
      const ws = await def(getObj(), opts);
      if (ws) return jsonify(ws);
    } catch {}

    // d) tenter "new default(OBJET, opts)"
    try {
      // @ts-ignore
      const inst = new def(getObj(), opts);
      if (inst) return jsonify(inst);
    } catch {}
  }

  // 2) export nommé WorldState (classe) — string puis objet
  if (typeof Ctor === 'function') {
    try {
      const inst = new Ctor(text, opts);
      if (inst) return jsonify(inst);
    } catch {}
    try {
      const inst = new Ctor(getObj(), opts);
      if (inst) return jsonify(inst);
    } catch {}
  }

  // 3) logs minimal de debug
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