import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Worldstate = require("warframe-worldstate-parser"); // CJS

const URLS = {
  pc:  "http://content.warframe.com/dynamic/worldState.php",
  ps4: "http://content.ps4.warframe.com/dynamic/worldState.php",
  xb1: "http://content.xb1.warframe.com/dynamic/worldState.php",
  swi: "http://content.swi.warframe.com/dynamic/worldState.php",
};

function pick(p) {
  return {
    timestamp: p.timestamp,
    cetusCycle: p.cetusCycle,
    vallisCycle: p.vallisCycle,
    cambionCycle: p.cambionCycle,
    duviriCycle: p.duviriCycle,
    earthCycle: p.earthCycle,
    alerts: p.alerts,
    invasions: p.invasions,
    fissures: p.fissures,
    sortie: p.sortie,
    archonHunt: p.archonHunt,
    nightwave: p.nightwave,
    voidTrader: p.voidTrader,
  };
}

export async function getWorldstate(platform) {
  const url = URLS[platform];
  if (!url) throw new Error("invalid platform: " + platform);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("fetch failed " + res.status);
  const raw = await res.text();              // WorldState officiel = texte JSON
  const parsed = new Worldstate(raw);        // parsing par la lib WFCD
  return pick(parsed);
}

// ---- utils réponse HTTP (Vercel Serverless)
export function withCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function sendJSON(res, body, status = 200) {
  withCORS(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Cache CDN Vercel 60s + SWR 120s (bon équilibre fraicheur/charges)
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  res.status(status).send(JSON.stringify(body));
}

export function handleOPTIONS(req, res) {
  if (req.method === "OPTIONS") {
    withCORS(res);
    res.status(204).end();
    return true;
  }
  return false;
}
