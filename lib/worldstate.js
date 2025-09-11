// lib/worldstate.js
// v5 parser robuste: utilise parseAsyncArray/parseArray, évite la classe par défaut

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
const _cache = { pc:{at:0,parsed:null}, ps4:{at:0,parsed:null}, xb1:{at:0,parsed:null}, swi:{at:0,parsed:null}, mob:{at:0,parsed:null} };

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== 'string') throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

const isFn = (x) => typeof x === 'function';
const isClass = (fn) => {
  if (!isFn(fn)) return false;
  try { return /^class\s/.test(Function.prototype.toString.call(fn)); } catch { return false; }
};

function jsonify(x) { return JSON.parse(JSON.stringify(x)); }

async function parseWorldstate(text) {
  const mod = await import('warframe-worldstate-parser');

  // 1) Helpers en priorité (module namespace)
  if (isFn(mod.parseAsyncArray)) {
    const arr = await mod.parseAsyncArray([text]);
    if (arr?.[0]) return jsonify(arr[0]);
  }
  if (isFn(mod.parseArray)) {
    const arr = mod.parseArray([text]);
    if (arr?.[0]) return jsonify(arr[0]);
  }

  // 2) Helpers éventuellement accrochés sur default (certains bundles)
  if (mod?.default && typeof mod.default === 'object') {
    const d = mod.default;
    if (isFn(d.parseAsyncArray)) {
      const arr = await d.parseAsyncArray([text]);
      if (arr?.[0]) return jsonify(arr[0]);
    }
    if (isFn(d.parseArray)) {
      const arr = d.parseArray([text]);
      if (arr?.[0]) return jsonify(arr[0]);
    }
  }

  // 3) Dernier recours: default callable UNIQUEMENT si ce n'est PAS une classe
  if (isFn(mod?.default) && !isClass(mod.default)) {
    const ws = await mod.default(text);
    return jsonify(ws);
  }

  // Debug utile si jamais ça échoue encore
  try {
    console.error('[worldstate] ESM exports keys:', Object.keys(mod || {}));
    console.error('[worldstate] default typeof:', typeof mod?.default,
      'isClass?', isClass(mod?.default));
  } catch {}
  throw new Error('parser v5: aucun export utilisable (helpers absents, default est une classe)');
}

async function getParsed(platform) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error('bad platform');
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchWorldstateText(platform);
  const parsed = await parseWorldstate(text);
  _cache[platform] = { at: now, parsed };
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

export async function getSection(platform, section /*, lang */) {
  const sec = section === 'bounties' ? 'syndicateMissions' : section;
  const ws = await getParsed(platform);
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    'earthCycle', 'cetusCycle', 'vallisCycle', 'cambionCycle', 'duviriCycle',
    'fissures', 'alerts', 'invasions', 'nightwave', 'sortie', 'archonHunt',
    'voidTrader', 'syndicateMissions',
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
