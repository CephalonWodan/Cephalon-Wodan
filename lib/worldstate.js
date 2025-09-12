// lib/worldstate.js
// Worldstate v5 — parsing robuste + locale, cache 60s

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
const jsonify = (x) => JSON.parse(JSON.stringify(x));

async function parseWorldstate(text, locale = 'en') {
  const mod = await import('warframe-worldstate-parser');

  // Toujours parser la string → objet JSON
  let obj;
  try { obj = JSON.parse(text); }
  catch { throw new Error('worldstate: invalid JSON'); }

  const opts = { locale };

  // 1) Helpers (attendent un tableau d’objets)
  if (typeof mod.parseAsyncArray === 'function') {
    try {
      const arr = await mod.parseAsyncArray([obj], opts);
      if (Array.isArray(arr) && arr[0]) return jsonify(arr[0]);
      console.error('[worldstate] parseAsyncArray returned empty array');
    } catch (e) {
      console.error('[worldstate] parseAsyncArray threw:', e);
    }
  }
  if (typeof mod.parseArray === 'function') {
    try {
      const arr = mod.parseArray([obj], opts);
      if (Array.isArray(arr) && arr[0]) return jsonify(arr[0]);
      console.error('[worldstate] parseArray returned empty array');
    } catch (e) {
      console.error('[worldstate] parseArray threw:', e);
    }
  }

  // 2) Export par défaut — classe dans ton build
  if (typeof mod.default === 'function') {
    try {
      const inst = new mod.default(obj, opts);
      return jsonify(inst);
    } catch (e1) {
      console.error('[worldstate] new default(obj,opts) threw:', e1);
      try {
        // si jamais c’est un wrapper callable dans d’autres builds
        const ws = await mod.default(obj, opts);
        return jsonify(ws);
      } catch (e2) {
        console.error('[worldstate] default(obj,opts) threw:', e2);
      }
    }
  }

  // 3) Export nommé WorldState — classe
  if (typeof mod.WorldState === 'function') {
    try {
      const inst = new mod.WorldState(obj, opts);
      return jsonify(inst);
    } catch (e) {
      console.error('[worldstate] new WorldState(obj,opts) threw:', e);
    }
  }

  console.error('[worldstate] parser exports:', Object.keys(mod || {}));
  throw new Error('warframe-worldstate-parser: aucun parseur compatible trouvé');
}

async function getParsed(platform, locale = 'en') {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error('bad platform');
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchWorldstateText(platform);
  const parsed = await parseWorldstate(text, locale);

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

export async function getSection(platform, section, lang = 'en') {
  const sec = section === 'bounties' ? 'syndicateMissions' : section;
  const ws = await getParsed(platform, normalizeLang(lang));
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform, lang = 'en') {
  const keys = [
    'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
    'fissures','alerts','invasions','nightwave','sortie','archonHunt',
    'voidTrader','syndicateMissions',
  ];
  const ws = await getParsed(platform, normalizeLang(lang));
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}
