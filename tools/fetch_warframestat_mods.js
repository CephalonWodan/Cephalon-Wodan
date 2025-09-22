// tools/fetch_warframestat_mods.js
// Node >= 18 (fetch natif)
// Usage:
//   node tools/fetch_warframestat_mods.js
//   WS_LANG=en node tools/fetch_warframestat_mods.js data/modwarframestat.json
//   node tools/fetch_warframestat_mods.js ./custom/path.json

import fs from "fs";
import path from "path";

const OUT = process.argv[2] || "data/modwarframestat.json";
const LANG = process.env.WS_LANG || "en"; // "en" par défaut

const URL = `https://api.warframestat.us/mods?language=${encodeURIComponent(LANG)}`;

async function getWithRetry(url, { retries = 5, backoffMs = 800 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": "CephalonWodan/1.0 (GitHub Actions; fetch_warframestat_mods)",
          "Accept": "application/json",
          "Accept-Language": LANG,   // hint côté proxy
          "Cache-Control": "no-cache",
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
      const wait = backoffMs * Math.pow(1.5, i);
      console.warn(`Fetch failed (${e}). Retry ${i + 1}/${retries} in ${Math.round(wait)}ms…`);
      await new Promise(res => setTimeout(res, wait));
    }
  }
  throw lastErr;
}

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

(async () => {
  console.log(`→ Fetching WarframeStat mods [${LANG}] from:\n   ${URL}`);
  const data = await getWithRetry(URL, { retries: 5, backoffMs: 800 });

  // Optionnel : filtre sécurité si on veut *strictement* english
  const stamped = {
    _meta: {
      source: "api.warframestat.us/mods",
      language: LANG,
      fetchedAt: new Date().toISOString(),
      count: Array.isArray(data) ? data.length : (data?.length ?? 0),
    },
    data,
  };

  ensureDir(OUT);
  fs.writeFileSync(OUT, JSON.stringify(stamped, null, 2), "utf-8");
  console.log(`✓ Saved ${stamped._meta.count} mods → ${OUT}`);
})().catch(err => {
  console.error("✖ Failed:", err);
  process.exit(1);
});
