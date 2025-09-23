// tools/enrich_relics.js (v7 — adapté à ton ExportRelicArcane_en.json)
// Entrées:
//   data/ExportRelicArcane_en.json    (obligatoire)
//   data/wfcd_drops/all.slim.json     (optionnel: tag isVaulted)
// Sorties:
//   data/enriched_relics.json
//   data/enriched_relics.csv
//   data/enriched_relics_report.json

import fs from "fs";
import path from "path";

// ---------- Paths ----------
const DATA_DIR = path.resolve("data");
const P_EXPORT = path.join(DATA_DIR, "ExportRelicArcane_en.json");
const P_DROPS  = path.join(DATA_DIR, "wfcd_drops", "all.slim.json");

const OUT_JSON = path.join(DATA_DIR, "enriched_relics.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_relics.csv");
const OUT_REP  = path.join(DATA_DIR, "enriched_relics_report.json");

// ---------- Utils ----------
const exists   = (p) => fs.existsSync(p);
const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf-8"));
const ERA_RE   = /Lith|Meso|Neo|Axi|Requiem/i;
const ERA_ORDER = { lith:0, meso:1, neo:2, axi:3, requiem:4 };

function clean(s){ return String(s ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").replace(/\u00A0/g," ").trim(); }
function slugify(s){ return clean(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
function cap(s){ s=String(s||""); return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); }
function normalizeRarity(r){
  const t = String(r||"").toUpperCase();
  if (t.includes("RARE")) return "Rare";
  if (t.includes("UNCOMMON")) return "Uncommon";
  if (t.includes("COMMON")) return "Common";
  return null;
}
function rarityRank(r){
  const t = String(r||"").toLowerCase();
  if (t==="rare") return 0;
  if (t==="uncommon") return 1;
  if (t==="common") return 2;
  return 3;
}
function parseEraAndCode(name){
  if (!name) return null;
  const m = String(name).match(ERA_RE);
  if (!m) return null;
  const era = cap(m[0]);
  if (/requiem/i.test(era)) {
    const rn = name.match(/\b([IVX]+)\b/i);
    return { era, code: rn ? rn[1].toUpperCase() : null };
  }
  const alnum = name.match(/\b([A-Z]\d+)\b/);
  return { era, code: alnum ? alnum[1] : null };
}
function pushSortedRewards(rewards){
  for (const k of Object.keys(rewards||{})) {
    if (!Array.isArray(rewards[k]) || rewards[k].length===0) { delete rewards[k]; continue; }
    rewards[k].sort((a,b)=>rarityRank(a.rarity)-rarityRank(b.rarity));
  }
}
function buildActiveRelicSetFromDrops(){
  if (!exists(P_DROPS)) return null;
  try {
    const slim = readJSON(P_DROPS);
    const active = new Set();
    (function walk(x){
      if (!x) return;
      if (Array.isArray(x)) { x.forEach(walk); return; }
      if (typeof x === "object") {
        for (const v of Object.values(x)) {
          if (typeof v === "string" && /Relic$/.test(v)) active.add(v);
          walk(v);
        }
      }
    })(slim);
    return active;
  } catch (e) {
    console.warn("WFCD drops slim parse error:", e.message);
    return null;
  }
}

// Chances par raffinage (par rareté) — cf. Wiki Void Relic/Math
const REFINE_TABLE = {
  Intact:      { Common: 76.0, Uncommon: 22.0, Rare: 2.0 },
  Exceptional: { Common: 70.0, Uncommon: 26.0, Rare: 4.0 },
  Flawless:    { Common: 60.0, Uncommon: 34.0, Rare: 6.0 },
  Radiant:     { Common: 50.0, Uncommon: 40.0, Rare: 10.0 },
};

// ---------- MAIN ----------
(function main(){
  if (!exists(P_EXPORT)) {
    console.error(`❌ Missing ${P_EXPORT}`);
    process.exit(1);
  }

  const expRoot = readJSON(P_EXPORT);
  const arr = Array.isArray(expRoot) ? expRoot : (Array.isArray(expRoot?.ExportRelicArcane) ? expRoot.ExportRelicArcane : []);

  const activeSet = buildActiveRelicSetFromDrops();

  const seen = new Set();
  const relics = [];
  let skipped_noRewards = 0;

  for (const e of arr) {
    const name = e?.name;
    if (!name || !/Relic\b/i.test(name)) continue;

    // buckets par rareté depuis DE
    const buckets = { Common: [], Uncommon: [], Rare: [] };
    for (const rr of (e?.relicRewards || [])) {
      const r = normalizeRarity(rr?.rarity);
      const item = rr?.rewardName || rr?.name;
      if (!r || !item) continue;
      buckets[r].push(String(item));
    }
    const totalItems = buckets.Common.length + buckets.Uncommon.length + buckets.Rare.length;
    if (!totalItems) { skipped_noRewards++; continue; }

    // id/era/code
    const ec = parseEraAndCode(name) || { era: null, code: null };
    if (!ec.era) continue;
    const id = slugify(`${ec.era} ${ec.code ? ec.code+" " : ""}Relic`);
    if (seen.has(id)) continue;
    seen.add(id);

    // Construire les 4 raffinements à partir des pourcentages + distribution uniforme par rareté
    const rewards = {};
    for (const [refine, totals] of Object.entries(REFINE_TABLE)) {
      const out = [];
      for (const rarity of ["Common","Uncommon","Rare"]) {
        const items = buckets[rarity];
        if (!items || items.length===0) continue;
        const per = Math.round((totals[rarity] / items.length) * 1000) / 1000;
        for (const it of items) out.push({ item: it, rarity, chance: per });
      }
      if (out.length) rewards[refine] = out;
    }
    pushSortedRewards(rewards);

    relics.push({
      id,
      era: ec.era,
      code: ec.code || null,
      name,
      isRequiem: /requiem/i.test(ec.era),
      isVaulted: activeSet ? !activeSet.has(name) : undefined,
      rewards
    });
  }

  // Tri par ère puis code
  relics.sort((a,b)=>{
    const ea = ERA_ORDER[a.era.toLowerCase()] ?? 9;
    const eb = ERA_ORDER[b.era.toLowerCase()] ?? 9;
    if (ea !== eb) return ea - eb;
    return String(a.code||"").localeCompare(String(b.code||""), undefined, { numeric:true, sensitivity:"base" });
  });

  // Sorties
  fs.writeFileSync(OUT_JSON, JSON.stringify(relics, null, 2), "utf-8");

  const headers = ["id","era","code","name","isRequiem","isVaulted","refinements","itemsPerRefinement"];
  const lines = [headers.join(",")];
  const order = { Intact:0, Exceptional:1, Flawless:2, Radiant:3 };
  for (const r of relics) {
    const refs = Object.keys(r.rewards||{}).sort((a,b)=>(order[a]??9)-(order[b]??9));
    const counts = refs.map(k => `${k}:${(r.rewards[k]||[]).length}`).join("|");
    lines.push([
      r.id, r.era, r.code||"", r.name,
      r.isRequiem ? "1":"0",
      r.isVaulted === undefined ? "" : (r.isVaulted ? "1":"0"),
      refs.join("|"),
      counts
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
  }
  fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

  const report = {
    total: relics.length,
    skipped_noRewards,
    activeIndexUsed: !!activeSet
  };
  fs.writeFileSync(OUT_REP, JSON.stringify(report, null, 2), "utf-8");

  console.log(`✅ OK → ${OUT_JSON} (${relics.length} relics)`);
  if (activeSet) console.log("🏷️  isVaulted tagged from WFCD drops");
  console.log(`ℹ️  Skipped (no relicRewards): ${skipped_noRewards}`);
  console.log(`📄 CSV → ${OUT_CSV}`);
  console.log(`📝 Report → ${OUT_REP}`);
})();
