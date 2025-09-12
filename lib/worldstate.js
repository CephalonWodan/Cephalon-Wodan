// lib/worldstate.js
// Worldstate v5 — parser robuste avec fallbacks + logs détaillés

export const ALLOWED_PLATFORMS = new Set(['pc','ps4','xb1','swi','mob']);
export const ALLOWED_SECTIONS = new Set([
  'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
  'fissures','alerts','invasions','nightwave','sortie','archonHunt',
  'voidTrader','syndicateMissions',
]);

export function normalizeLang(raw = 'en') {
  const s = String(raw || '').toLowerCase();
  return s.startsWith('fr') ? 'fr' : 'en';
}

const PLATFORM_HOST = {
  pc:'content.warframe.com',
  ps4:'content-ps4.warframe.com',
  xb1:'content-xb1.warframe.com',
  swi:'content-swi.warframe.com',
  mob:'content-mob.warframe.com',
};
function worldstateUrl(platform = 'pc') {
  const host = PLATFORM_HOST[platform] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = { pc:{at:0,parsed:null}, ps4:{at:0,parsed:null}, xb1:{at:0,parsed:null}, swi:{at:0,parsed:null}, mob:{at:0,parsed:null} };

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url,{ cache:'no-store' });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text) throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

function jsonify(x) {
  try { return JSON.parse(JSON.stringify(x)); } catch { return x; }
}

async function parseWorldstate(text) {
  const mod = await import('warframe-worldstate-parser');

  const t = (v) => typeof v;
  const types = {
    parseAsyncArray: t(mod.parseAsyncArray),
    parseArray: t(mod.parseArray),
    default: t(mod.default),
    namedWorldState: t(mod.WorldState),
    default_parseAsyncArray: t(mod?.default?.parseAsyncArray),
    default_parseArray: t(mod?.default?.parseArray),
  };
  console.error('[worldstate] types:', types);

  // 1) Helpers asynchrones (module → default)
  if (typeof mod.parseAsyncArray === 'function') {
    try {
      const arr = await mod.parseAsyncArray([text]);
      if (Array.isArray(arr) && arr[0]) return jsonify(arr[0]);
      console.error('[worldstate] parseAsyncArray returned empty array');
    } catch (e) {
      console.error('[worldstate] parseAsyncArray threw:', e);
    }
  }
  if (typeof mod?.default?.parseAsyncArray === 'function') {
    try {
      const arr = await mod.default.parseAsyncArray([text]);
      if (Array.isArray(arr) && arr[0]) return jsonify(arr[0]);
      console.error('[worldstate] default.parseAsyncArray returned empty array');
    } catch (e) {
      console.error('[worldstate] default.parseAsyncArray threw:', e);
    }
  }

  // 2) Helper synchrone (module → default)
  if (typeof mod.parseArray === 'function') {
    try {
      const arr = mod.parseArray([text]);
      if (Array.isArray(arr) && arr[0]) return jsonify(arr[0]);
      console.error('[worldstate] parseArray returned empty array');
    } catch (e) {
      console.error('[worldstate] parseArray threw:', e);
    }
  }
  if (typeof mod?.default?.parseArray === 'function') {
    try {
      const arr = mod.default.parseArray([text]);
      if (Array.isArray(arr) && arr[0]) return jsonify(arr[0]);
      console.error('[worldstate] default.parseArray returned empty array');
    } catch (e) {
      console.error('[worldstate] default.parseArray threw:', e);
    }
  }

  // 3) Export nommé WorldState (classe)
  if (typeof mod.WorldState === 'function') {
    try {
      const inst = new mod.WorldState(text);
      return jsonify(inst);
    } catch (e) {
      console.error('[worldstate] new WorldState(text) threw:', e);
    }
  }

  // 4) Export par défaut : classe ou fonction
  if (typeof mod.default === 'function') {
    // d’abord tenter en classe
    try {
      const inst = new mod.default(text);
      return jsonify(inst);
    } catch (e1) {
      console.error('[worldstate] new default(text) threw, trying call:', e1);
      // puis en fonction
      try {
        const ws = await mod.default(text);
        return jsonify(ws);
      } catch (e2) {
        console.error('[worldstate] default(text) threw:', e2);
      }
    }
  }

  // Logs de secours
  try {
    console.error('[worldstate] parser exports:', Object.keys(mod || {}));
    if (mod?.default && typeof mod.default === 'object') {
      console.error('[worldstate] parser default exports:', Object.keys(mod.default));
    }
  } catch {}
  throw new Error('warframe-worldstate-parser: aucun parseur compatible trouvé');
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

const LIST_SECTIONS = new Set(['fissures','alerts','invasions','syndicateMissions']);
const OBJ_SECTIONS  = new Set([
  'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
  'nightwave','sortie','archonHunt','voidTrader',
]);

function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

export async function getSection(platform, section) {
  const sec = section === 'bounties' ? 'syndicateMissions' : section;
  const ws = await getParsed(platform);
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform) {
  const keys = [
    'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
    'fissures','alerts','invasions','nightwave','sortie','archonHunt',
    'voidTrader','syndicateMissions',
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
