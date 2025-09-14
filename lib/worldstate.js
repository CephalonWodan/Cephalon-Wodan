// lib/worldstate.js
// Worldstate bridge v5 (Node/Express): i18n + fallbacks + cache 60s

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
const wsUrl = (p='pc') => `https://${PLATFORM_HOST[p] || PLATFORM_HOST.pc}/dynamic/worldState.php`;

// ——— cache mémoire ———
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = new Map(); // key: platform:locale -> { at, parsed }

// ——— util ———
const clone = (x) => JSON.parse(JSON.stringify(x));
const toObj = (t) => { try { return JSON.parse(t); } catch { return null; } };

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

// ——— i18n: charge data + pack + applique setLanguage si dispo ———
async function loadDataAndSetLanguage(locale) {
  const info = { hasLanguage: false, setCalled: false, steps: [] };
  try {
    const dataMod = await import('warframe-worldstate-data');
    const data = dataMod?.default ?? dataMod;
    const langs = data?.languages;
    if (langs && typeof langs === 'object') {
      const pack = langs[locale] ?? langs.en;
      info.hasLanguage = !!pack;

      // utilities.setLanguage(pack) si disponible
      try {
        const u = await import('warframe-worldstate-data/utilities');
        const utilities = u?.default ?? u;
        if (pack && typeof utilities?.setLanguage === 'function') {
          utilities.setLanguage(pack);
          info.setCalled = true;
        }
        info.steps.push({ ok: !!pack, where: 'data.languages', extra: pack ? 'ok' : 'no pack' });
        info.steps.push({ ok: typeof utilities?.setLanguage === 'function', where: 'utilities.setLanguage' });
      } catch (e2) {
        info.steps.push({ ok: false, where: 'import utilities', extra: String(e2?.message || e2) });
      }

      return { data, info };
    } else {
      info.steps.push({ ok: false, where: 'data.languages', extra: 'not found' });
      return { data, info };
    }
  } catch (e) {
    info.steps.push({ ok: false, where: 'import data', extra: String(e?.message || e) });
    return { data: null, info };
  }
}

// ——— parser bridge v5 ———
async function parseWorldstate(text, locale='en') {
  const meta = { locale, hasLanguage: false, setCalled: false, attempts: [], i18nSteps: [], path: '' };
  const len = (text || '').length;

  // 1) i18n
  const { data, info } = await loadDataAndSetLanguage(locale);
  meta.hasLanguage = info.hasLanguage;
  meta.setCalled = info.setCalled;
  meta.i18nSteps = info.steps;

  // deps attendus par v5 (cf. code source du parser)
  const deps = {
    locale,
    logger: console,
    sortieData: data?.sortie, // crucial pour Sortie/Archon
  };

  const obj = toObj(text);
  if (!obj) {
    meta.path = 'json_parse_fail';
    return { ws: null, _meta: { ...meta, len } };
  }

  // 2) charger le parser (ESM)
  let esm;
  try { esm = await import('warframe-worldstate-parser'); }
  catch (e) {
    meta.attempts.push({ label:'esm.import', ok:false, err:String(e?.message || e) });
  }
  const def = esm?.default;
  const Ctor = esm?.WorldState;

  const trySteps = [];

  // helper d’essai
  const tryRun = async (label, fn) => {
    try {
      const val = await fn();
      if (val) {
        meta.path = label;
        return val;
      }
      trySteps.push({ label, ok:false, err:'empty' });
    } catch (e) {
      trySteps.push({ label, ok:false, err:String(e?.message || e) });
    }
    return null;
  };

  // 3) ordre d’essai :
  // a) default export fonction (cas recommandé v5)
  if (typeof def === 'function') {
    const v = await tryRun('esm.default(json,deps)', async () => def(text, deps));
    if (v) return { ws: v, _meta: { ...meta, len, attempts: trySteps } };
  }

  // b) classe nommée WorldState
  if (typeof Ctor === 'function') {
    const v = await tryRun('esm.new WorldState(obj,deps)', async () => new Ctor(obj, deps));
    if (v) return { ws: v, _meta: { ...meta, len, attempts: trySteps } };
  }

  // c) si on a échoué et qu’on suspecte la langue (erreurs SORTIE_BOSS_*), on retente sans Sorties
  const looksLikeLang = trySteps.some(t => /SORTIE_BOSS_|translation|language/i.test(t.err || ''));
  if (looksLikeLang) {
    const slim = { ...obj };
    delete slim.Sorties;
    delete slim.LiteSorties;
    // retente via classe si dispo
    if (typeof Ctor === 'function') {
      const v2 = await tryRun('esm.new WorldState(obj-no-sorties,deps)', async () => new Ctor(slim, deps));
      if (v2) return { ws: v2, _meta: { ...meta, len, attempts: trySteps, path: 'esm.new WorldState(obj-no-sorties,deps)' } };
    }
    // retente via default
    if (typeof def === 'function') {
      const v3 = await tryRun('esm.default(obj-no-sorties,deps)', async () => def(JSON.stringify(slim), deps));
      if (v3) return { ws: v3, _meta: { ...meta, len, attempts: trySteps, path: 'esm.default(obj-no-sorties,deps)' } };
    }
  }

  // 4) rien n’a marché
  meta.path = 'fallback_raw';
  return { ws: null, _meta: { ...meta, len, attempts: trySteps } };
}

// ——— normalisation de forme pour ton API ———
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
async function getParsed(platform, locale='en') {
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
  // conserve le _meta pour debug côté client
  if (ws?._meta) out._meta = ws._meta;
  return out;
}
