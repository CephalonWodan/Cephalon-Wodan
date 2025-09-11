// lib/worldstate.js
// Parser v5 + cache 60s, endpoints officiels — robuste CJS/ESM, pas d'instanciation de classe

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

// Cache mémoire (warm start)
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
  mob: { at: 0, parsed: null },
};

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== 'string') throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

/* --------------------------- Parser robuste --------------------------- */

import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);

const isFn = (x) => typeof x === 'function';
const isObj = (x) => !!x && typeof x === 'object';

// On NE VEUT PAS instancier la classe WorldState → on ne sélectionne que des fonctions
function collectFunctionCandidates(modLike) {
  if (!isObj(modLike) && !isFn(modLike)) return [];

  const cands = [];

  // helpers nommés en priorité
  if (isFn(modLike.parseAsyncArray)) cands.push(['parseAsyncArray', modLike.parseAsyncArray]);
  if (isFn(modLike.parseArray))      cands.push(['parseArray',      modLike.parseArray]);
  if (isFn(modLike.parse))           cands.push(['parse',           modLike.parse]);

  // default peut être un objet qui contient les helpers
  if (isObj(modLike.default)) {
    const d = modLike.default;
    if (isFn(d.parseAsyncArray)) cands.push(['default.parseAsyncArray', d.parseAsyncArray]);
    if (isFn(d.parseArray))      cands.push(['default.parseArray',      d.parseArray]);
    if (isFn(d.parse))           cands.push(['default.parse',           d.parse]);
  }

  // en DERNIER recours seulement: si default est une fonction (wrapper)
  if (isFn(modLike.default)) cands.push(['default(fn)', modLike.default]);

  // et vraiment tout à la fin: si le module est lui-même une fonction
  if (isFn(modLike)) cands.push(['module(fn)', modLike]);

  return cands;
}

async function invokeCandidate([label, fn], text) {
  try {
    // Les helpers *Array* attendent un tableau de strings
    if (label.includes('parseAsyncArray')) {
      const arr = await fn([text]);
      if (Array.isArray(arr) && arr[0]) return arr[0];
      return null;
    }
    if (label.includes('parseArray')) {
      const arr = fn([text]);
      if (Array.isArray(arr) && arr[0]) return arr[0];
      return null;
    }
    // parse(text) ou wrapper fonction
    const res = await fn(text);
    return res ?? null;
  } catch (e) {
    // On ignore et on tente le candidat suivant
    return null;
  }
}

async function parseWorldstate(text) {
  // 1) CommonJS d'abord
  try {
    const cjs = nodeRequire('warframe-worldstate-parser');
    const cands = collectFunctionCandidates(cjs);
    for (const cand of cands) {
      const v = await invokeCandidate(cand, text);
      if (v) return v;
    }
  } catch {
    // pas de CJS → on tente ESM
  }

  // 2) ESM
  const mod = await import('warframe-worldstate-parser');
  const cands = [
    ...collectFunctionCandidates(mod),
    ...collectFunctionCandidates(mod?.default),
  ];
  for (const cand of cands) {
    const v = await invokeCandidate(cand, text);
    if (v) return v;
  }

  // Logs utiles si ça échoue encore
  try {
    console.error('[worldstate] CJS/ESM exports (top):',
      (() => { try { const m = nodeRequire('warframe-worldstate-parser'); return Object.keys(m || {}); } catch { return 'CJS load failed'; } })()
    );
  } catch {}
  try {
    console.error('[worldstate] ESM exports keys:', Object.keys(mod || {}));
    if (isObj(mod?.default)) {
      console.error('[worldstate] ESM default keys:', Object.keys(mod.default));
    } else {
      console.error('[worldstate] ESM default type:', typeof mod?.default);
    }
  } catch {}

  throw new Error('warframe-worldstate-parser: aucun export de fonction compatible trouvé');
}

/* ----------------------- Accès & façonnage JSON ----------------------- */

async function getParsed(platform) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error('bad platform');
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchWorldstateText(platform);
  const ws = await parseWorldstate(text);

  // JSON “pur” (objets du parser ont toJSON)
  const parsed = JSON.parse(JSON.stringify(ws));
  _cache[platform] = { at: now, parsed };
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
