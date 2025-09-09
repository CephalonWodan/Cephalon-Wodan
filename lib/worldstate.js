// lib/worldstate.js
// Robust fetch: try parser -> fallback to WarframeStatus on error

const URLS = {
  pc:  "http://content.warframe.com/dynamic/worldState.php",
  ps4: "http://content.ps4.warframe.com/dynamic/worldState.php",
  xb1: "http://content.xb1.warframe.com/dynamic/worldState.php",
  swi: "http://content.swi.warframe.com/dynamic/worldState.php",
};

function pickFromParser(p) {
  return {
    timestamp:   p.timestamp,
    cetusCycle:  p.cetusCycle,
    vallisCycle: p.vallisCycle,
    cambionCycle:p.cambionCycle,
    duviriCycle: p.duviriCycle,
    earthCycle:  p.earthCycle,
    alerts:      p.alerts,
    invasions:   p.invasions,
    fissures:    p.fissures,
    sortie:      p.sortie,
    archonHunt:  p.archonHunt,
    nightwave:   p.nightwave,
    voidTrader:  p.voidTrader,
  };
}

function pickFromWFStatus(all) {
  return {
    timestamp: Date.now(),
    cetusCycle:  all.cetusCycle,
    vallisCycle: all.vallisCycle,
    cambionCycle:all.cambionCycle,
    duviriCycle: all.duviriCycle,
    earthCycle:  all.earthCycle,
    alerts:      all.alerts,
    invasions:   all.invasions,
    fissures:    all.fissures,
    sortie:      all.sortie,
    archonHunt:  all.archonHunt,
    nightwave:   all.nightwave,
    voidTrader:  all.voidTrader,
  };
}

// cache du module parser (interop ESM/CJS)
let _Parser;
async function parseWithWWSP(raw) {
  if (!_Parser) {
    const mod = await import("warframe-worldstate-parser");
    _Parser = mod.default || mod;
  }
  // IMPORTANT: forcer locale 'en' pour éviter les clés manquantes
  const parsed = new _Parser(raw, { locale: "en" });
  return pickFromParser(parsed);
}

async function fetchWFStatus(platform) {
  const r = await fetch(`https://api.warframestat.us/${platform}/?language=en`, { cache: "no-store" });
  if (!r.ok) throw new Error("wfstatus " + r.status);
  const all = await r.json();
  return pickFromWFStatus(all);
}

export async function getWorldstate(platform) {
  const url = URLS[platform];
  if (!url) throw new Error("invalid platform: " + platform);

  // 1) tente le parser officiel
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed " + res.status);
    const raw = await res.text();
    return await parseWithWWSP(raw);
  } catch (e) {
    // 2) fallback transparent sur WarframeStatus
    console.error("Parser failed, falling back to WarframeStatus:", e);
    return await fetchWFStatus(platform);
  }
}

export function withCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
export function sendJSON(res, body, status = 200) {
  withCORS(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  res.status(status).send(JSON.stringify(body));
}
export function handleOPTIONS(req, res) {
  if (req.method === "OPTIONS") { withCORS(res); res.status(204).end(); return true; }
  return false;
}
