// lib/worldstate.js
// Warframe Worldstate — v5 parser (robuste), cache 60s, Node runtime

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
  const r = await fetch(url, {
    cache: 'no-store',
    headers: { 'user-agent': 'Cephalon-Wodan/1.0 (+worldstate)' },
  });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text) throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

function jsonify(x) { return JSON.parse(JSON.stringify(x)); }

async function parseWorldstate(text) {
  const mod = await import('warframe-worldstate-parser');

  // 1) Chemin recommandé v5 : export par défaut callable
  if (typeof mod.default === 'function') {
    try {
      const ws = await mod.default(text);
      return jsonify(ws);
    } catch (e) {
      console.error('[worldstate] default(text) threw:', e);
    }
  }

  // 2) Classe WorldState : nécessite un objet, pas une string
  let obj = null;
  try { obj = JSON.parse(text); } catch {}
  if (obj && typeof mod.WorldState === 'function') {
    try {
      const inst = new mod.WorldState(obj);
      return jsonify(inst);
    } catch (e) {
      console.error('[worldstate] new WorldState(JSON) threw:', e);
    }
  }

  // 3) Helpers en dernier recours
  if (typeof mod.parseAsyncArray === 'function') {
    try {
      const arr = await mod.parseAsyncArray([text]);
      if (Array.isArray(arr) && arr[0]) return jsonify(arr[0]);
      console.error('[worldstate] parseAsyncArray returned empty array');
    } catch (e) {
      console.error('[worldstate] parseAsyncArray threw:', e);
    }
  }
  if (typeof mod.parseArray === 'function') {
    try {
      const arr = mod.parseArray([text]);
      if (Array.isArray(arr) && arr[0]) return jsonify(arr[0]);
      console.error('[worldstate] parseArray returned empty array');
    } catch (e) {
      console.error('[worldstate] parseArray threw:', e);
    }
  }

  console.error('[worldstate] parser exports:', Object.keys(mod || {}));
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
