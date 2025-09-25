// tools/fetch_wfstat_weapons.js
// Récupère https://api.warframestat.us/weapons?language=en et l’enregistre en data/wfstat_weapons.json

import fs from "fs";
import path from "path";

const OUT = path.resolve("data/wfstat_weapons.json");
const URL = process.env.WFSTAT_WEAPONS_URL || "https://api.warframestat.us/weapons?language=en";

async function fetchJson(url, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Cephalon-Wodan/gh-actions (weapons sync)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

const ensureDir = p => fs.mkdirSync(path.dirname(p), { recursive: true });

(async () => {
  const data = await fetchJson(URL);
  ensureDir(OUT);
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2), "utf-8");
  console.log(`OK: ${Array.isArray(data) ? data.length : 0} weapons -> ${OUT}`);
})().catch(err => {
  console.error("fetch_wfstat_weapons failed:", err);
  process.exit(1);
});