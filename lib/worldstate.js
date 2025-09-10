// ESM utilities for Warframe worldstate proxy

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi"]);

export const ALLOWED_SECTIONS = new Set([
  // Cycles
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  // "zarimanCycle", // décommente si tu veux l'exposer

  // Activités
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",

  // Marchands
  "voidTrader", "dailyDeals", "steelPath",

  // Primes
  "syndicateMissions",
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

export async function fetchSection(platform, section, lang = "en") {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  if (!ALLOWED_SECTIONS.has(section))    throw new Error("bad section");

  // WarframeStatus préfère un slash final → évite 301
  const u = new URL(`https://api.warframestat.us/${platform}/${section}/`);
  u.searchParams.set("language", normalizeLang(lang));

  const r = await fetch(u.toString(), { method: "GET" });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`upstream ${r.status} ${txt}`);
  }
  // pass-through (array ou object) — jamais {} forcé
  return r.json();
}

export async function fetchAggregated(platform, lang = "en") {
  const wanted = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader",
    // Ajoute ci-dessous si tu veux les inclure dans l'agrégat racine :
    // "syndicateMissions",
  ];

  const results = await Promise.allSettled(
    wanted.map(sec => fetchSection(platform, sec, lang))
  );

  const out = {};
  wanted.forEach((sec, i) => {
    out[sec] = results[i].status === "fulfilled" ? results[i].value : null;
  });
  return out;
}
