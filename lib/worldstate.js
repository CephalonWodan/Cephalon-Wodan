// lib/worldstate.js
// Worldstate bridge v5 (Node/Express): parse via default(json,deps) or WorldState.build(json,deps)
// IMPORTANT: Do NOT use `new WorldState(obj,deps)` with v5, otherwise `syndicateMissions` stays empty.

// ——— plateformes/sections autorisées ———
export const ALLOWED_PLATFORMS = new Set(['pc', 'ps4', 'xb1', 'swi', 'mob']);
export const ALLOWED_SECTIONS = new Set([
  'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
  'fissures','alerts','invasions','nightwave','sortie','archonHunt',
  'voidTrader','syndicateMissions',
]);

export function normalizeLang(raw = 'en') {
  const s = String(raw || '').toLowerCase();
  return s.startsWith('fr') ? 'fr' : 'en';
}

// ——— endpoints officiels ———
const PLATFORM_HOST = {
  pc:  'content.warframe.com',
  ps4: 'content-ps4.warframe.com',
  xb1: 'content-xb1.warframe.com',
  swi: 'content-swi.warframe.com',
  mob: 'content-mob.warframe.com',
};
function wsUrl(p = 'pc') {
  const host = PLATFORM_HOST[p] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

// ——— cache mémoire ———
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = new Map(); // key: `${platform}:${locale}` -> { at, parsed }

// ——— util ———
function safeJsonParse(t) {
  try { return JSON.parse(t); } catch { return null; }
}

// ——— fetch worldstate (UA propre) ———
async function fetchWorldstateText(platform) {
  const r = await fetch(wsUrl(platform), {
    cache: 'no-store',
    headers: {
      'user-agent': 'Cephalon-Wodan/1.0 (+worldstate)',
      'accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
    },
  });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== 'string') throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

// ——— parser bridge v5 ———
// On privilégie `default(json, deps)` puis `WorldState.build(json, deps)`.
// Surtout ne pas instancier `new WorldState(obj,deps)` car syndicateMissions reste vide via le ctor.
async function parseWorldstate(jsonText, locale = 'en') {
  const meta = {
    locale,
    attempts: [],
    path: '',
    len: (jsonText || '').length,
  };

  // deps minimal conformes v5 (le parser a des defaults internes pour sortieData, logger, etc.)
  const deps = { locale, logger: console };

  let mod;
  try {
    mod = await import('warframe-worldstate-parser');
  } catch (e) {
    meta.attempts.push({ label: 'esm.import', ok: false, err: String(e?.message || e) });
    throw new Error('warframe-worldstate-parser import failed');
  }

  const def = mod?.default;
  const WS  = mod?.WorldState;

  // helper essai
  const tryRun = async (label, fn) => {
    try {
      const v = await fn();
      if (v) { meta.path = label; return v; }
      meta.attempts.push({ label, ok: false, err: 'empty' });
    } catch (e) {
      meta.attempts.push({ label, ok: false, err: String(e?.message || e) });
    }
    return null;
  };

  // 1) recommandé : export default (async) => parse via build
  if (typeof def === 'function') {
    const ws = await tryRun('esm.default(json,deps)', async () => def(jsonText, deps));
    if (ws) return { ws, _meta: meta };
  }

  // 2) fallback : WorldState.build(json,deps)
  if (WS && typeof WS.build === 'function') {
    const ws2 = await tryRun('esm.WorldState.build(json,deps)', async () => WS.build(jsonText, deps));
    if (ws2) return { ws: ws2, _meta: meta };
  }

  // Rien n’a marché : on jette (on ne fera pas de fallback raw ici pour éviter de renvoyer vide silencieusement)
  throw new Error(`warframe-worldstate-parser: parse failed (${meta.attempts.map(a => a.label).join(' -> ')})`);
}

// ——— normalisation de forme pour l’API ———
function shapeWs(ws) {
  if (!ws) {
    return {
      earthCycle:{}, cetusCycle:{}, vallisCycle:{}, cambionCycle:{}, duviriCycle:{},
      fissures:[], alerts:[], invasions:[], nightwave:{}, sortie:{}, archonHunt:{},
      voidTrader:{}, syndicateMissions:[]
    };
  }
  return {
    earthCycle: ws.earthCycle ?? {},
    cetusCycle: ws.cetusCycle ?? {},
    vallisCycle: ws.vallisCycle ?? {},
    cambionCycle: ws.cambionCycle ?? {},
    duviriCycle: ws.duviriCycle ?? {},
    fissures: Array.isArray(ws.fissures) ? ws.fissures : [],
    alerts: Array.isArray(ws.alerts) ? ws.alerts : [],
    invasions: Array.isArray(ws.invasions) ? ws.invasions : [],
    nightwave: ws.nightwave ?? {},
    sortie: ws.sortie ?? {},
    archonHunt: ws.archonHunt ?? {},
    voidTrader: ws.voidTrader ?? {},
    syndicateMissions: Array.isArray(ws.syndicateMissions) ? ws.syndicateMissions : [],
  };
}

// ——— accès parsé/caché ———
async function getParsed(platform, locale = 'en') {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error('bad platform');
  const key = `${platform}:${locale}`;
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit?.parsed && (now - hit.at) < TTL_MS) return hit.parsed;

  const text = await fetchWorldstateText(platform);
  const { ws, _meta } = await parseWorldstate(text, locale);
  const shaped = shapeWs(ws);
  const parsed = { ...shaped, _meta };
  _cache.set(key, { at: now, parsed });
  return parsed;
}

// ——— helpers forme ———
const LIST = new Set(['fissures','alerts','invasions','syndicateMissions']);
const OBJ  = new Set([
  'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
  'nightwave','sortie','archonHunt','voidTrader',
]);
function ensureShape(section, v) {
  if (LIST.has(section)) return Array.isArray(v) ? v : [];
  if (OBJ.has(section))  return v ?? {};
  return v ?? null;
}

// ——— API publique ———
export async function getSection(platform, section, lang='en') {
  const sec = section === 'bounties' ? 'syndicateMissions' : section;
  const ws = await getParsed(platform, normalizeLang(lang));
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform, lang='en') {
  const keys = [
    'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
    'fissures','alerts','invasions','nightwave','sortie','archonHunt',
    'voidTrader','syndicateMissions'
  ];
  const ws = await getParsed(platform, normalizeLang(lang));
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  // garde le _meta pour debug côté client si besoin
  if (ws?._meta) out._meta = ws._meta;
  return out;
}
