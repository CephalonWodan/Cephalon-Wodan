// lib/worldstate.js
// Worldstate officiel -> parse v5 + cache 60s + fallback + garde-fous

export const ALLOWED_PLATFORMS = new Set(["pc","ps4","xb1","swi","ios"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
  "fissures","alerts","invasions","nightwave","sortie","archonHunt",
  "voidTrader","syndicateMissions",
]);

export function normalizeLang(raw="en"){
  const s = String(raw||"").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

export function canonicalPlatform(p){
  const x = String(p||"").toLowerCase();
  if (x==="ps5") return "ps4";
  if (["xbox","xsx","xbsx","series","xboxseries"].includes(x)) return "xb1";
  if (["switch","ns","nintendo"].includes(x)) return "swi";
  if (["mobile","mob","iphone","ipad","ios"].includes(x)) return "ios";
  return ALLOWED_PLATFORMS.has(x) ? x : "pc";
}

// Hôtes officiels (post-2024) + fallback legacy à points en dernier recours
const HOSTS = {
  pc:  ["content.warframe.com"],
  ps4: ["content-ps4.warframe.com", "content.ps4.warframe.com"],
  xb1: ["content-xb1.warframe.com", "content.xb1.warframe.com"],
  swi: ["content-swi.warframe.com"],
  ios: ["content-mob.warframe.com"],
};

function candidateUrls(platform){
  const plat = canonicalPlatform(platform);
  const hosts = HOSTS[plat] || HOSTS.pc;
  return hosts.map(h => `https://${h}/dynamic/worldState.php`);
}

// Cache 60s
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = Object.fromEntries(Array.from(ALLOWED_PLATFORMS, p => [p, { at:0, parsed:null }]));

async function loadParser(){
  const mod = await import("warframe-worldstate-parser");
  return mod.default ?? mod;
}

function looksLikeWorldstate(text){
  if (typeof text !== "string") return false;
  const t = text.trim();
  return t.length > 50 && t.startsWith("{"); // le worldstate est un gros JSON
}

async function fetchText(url){
  const r = await fetch(url, {
    headers: { "User-Agent": "Cephalon-Wodan/1.0 (+worldstate)" },
    cache: "no-store",
  });
  const status = r.status;
  let body;
  try { body = await r.text(); }
  catch { body = ""; }
  return { ok:r.ok, status, body, len: (body||"").length };
}

async function fetchTextFromCandidates(urls){
  let last;
  for (const url of urls){
    const { ok, status, body, len } = await fetchText(url);
    if (ok && looksLikeWorldstate(body)) return body;
    last = { url, status, len, sample: (body||"").slice(0,80) };
    console.warn("WS_FETCH_FAIL", last);
  }
  throw new Error(`worldstate fetch failed: ${last?.url} -> ${last?.status} len=${last?.len}`);
}

async function parseWorldstate(raw){
  if (!looksLikeWorldstate(raw)) throw new Error("empty/invalid worldstate body");
  const Parser = await loadParser();
  const ws = await Parser(raw);   // v5: fonction async
  return ws;
}

async function fetchAndParse(platform){
  const raw = await fetchTextFromCandidates(candidateUrls(platform));
  return parseWorldstate(raw);
}

async function getParsed(platform){
  const plat = canonicalPlatform(platform);
  if (!ALLOWED_PLATFORMS.has(plat)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache[plat];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;
  const parsed = await fetchAndParse(plat);
  _cache[plat] = { at: now, parsed };
  return parsed;
}

const LIST = new Set(["fissures","alerts","invasions","syndicateMissions"]);
const OBJ  = new Set([
  "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
  "nightwave","sortie","archonHunt","voidTrader",
]);

function shape(section, value){
  if (LIST.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ.has(section))  return value ?? {};
  return value ?? null;
}

export async function getSection(platform, section /*, lang */){
  const ws = await getParsed(platform);
  return shape(section, ws?.[section]);
}

export async function getAggregated(platform /*, lang */){
  const ws = await getParsed(platform);
  const keys = [
    "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
    "fissures","alerts","invasions","nightwave","sortie","archonHunt","voidTrader",
    // "syndicateMissions",
  ];
  const out = {};
  for (const k of keys) out[k] = shape(k, ws?.[k]);
  return out;
}
