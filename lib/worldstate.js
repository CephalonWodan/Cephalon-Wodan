// lib/worldstate.js
// Warframe Worldstate — parser v5 (robuste), avec cache 60 s

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
  const r = await fetch(url,{cache:'no-store'});
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text) throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

async function parseWorldstate(text) {
  // Import dynamique pour récupérer toutes les exportations possibles.
  const mod = await import('warframe-worldstate-parser');

  // Cherche parseAsyncArray (module ou default)
  const asyncHelper =
    typeof mod.parseAsyncArray === 'function' ? mod.parseAsyncArray :
    mod.default && typeof mod.default.parseAsyncArray === 'function' ? mod.default.parseAsyncArray :
    null;
  if (asyncHelper) {
    try {
      const arr = await asyncHelper([text]);
      if (Array.isArray(arr) && arr[0]) {
        return JSON.parse(JSON.stringify(arr[0]));
      }
    } catch {}
  }

  // Cherche parseArray (module ou default)
  const syncHelper =
    typeof mod.parseArray === 'function' ? mod.parseArray :
    mod.default && typeof mod.default.parseArray === 'function' ? mod.default.parseArray :
    null;
  if (syncHelper) {
    try {
      const arr = syncHelper([text]);
      if (Array.isArray(arr) && arr[0]) {
        return JSON.parse(JSON.stringify(arr[0]));
      }
    } catch {}
  }

  // Fallback : l’export par défaut peut être une fonction (wrapper) ou une classe.
  const def = mod.default;
  if (typeof def === 'function') {
    // Essayer en tant que classe puis en tant que fonction.
    try {
      const inst = new def(text);
      return JSON.parse(JSON.stringify(inst));
    } catch {
      try {
        const ws = await def(text);
        return JSON.parse(JSON.stringify(ws));
      } catch {}
    }
  }

  // En dernier recours, l’ensemble du module pourrait être callable.
  if (typeof mod === 'function') {
    try {
      const ws = await mod(text);
      return JSON.parse(JSON.stringify(ws));
    } catch {}
  }

  // Si rien n’a fonctionné, logs pour debug.
  console.error('[worldstate] parser exports:', Object.keys(mod || {}));
  if (mod?.default && typeof mod.default === 'object') {
    console.error('[worldstate] parser default exports:', Object.keys(mod.default));
  }
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
