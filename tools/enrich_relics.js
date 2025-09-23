// tools/enrich_relics.js (v5 — DE parser + WFCD merge + vaulted)
// Sources :
//   - data/ExportRelicArcane_en.json           (obligatoire)
//   - data/wfcd_items/Relics.json              (optionnel, merge précision chances/raretés)
//   - data/wfcd_drops/all.slim.json            (optionnel, marquage isVaulted)
// Sorties :
//   - data/enriched_relics.json
//   - data/enriched_relics.csv
//   - data/enriched_relics_report.json

import fs from "fs";
import path from "path";

// ---------- Paths ----------
const DATA_DIR   = path.resolve("data");
const P_EXPORT   = path.join(DATA_DIR, "ExportRelicArcane_en.json");
const P_WFCD_REL = path.join(DATA_DIR, "wfcd_items", "Relics.json");
const P_WFCD_DRP = path.join(DATA_DIR, "wfcd_drops", "all.slim.json");

const OUT_JSON = path.join(DATA_DIR, "enriched_relics.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_relics.csv");
const OUT_REP  = path.join(DATA_DIR, "enriched_relics_report.json");

// ---------- Utils ----------
const exists   = (p) => fs.existsSync(p);
const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf-8"));
const asArray  = (v) => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);
const ERA_RE   = /Lith|Meso|Neo|Axi|Requiem/i;
const ERA_ORDER = { lith:0, meso:1, neo:2, axi:3, requiem:4 };

function clean(s) {
  return String(s ?? "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
}
function slugify(s) {
  return clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function cap(s){ s=String(s||""); return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); }
function toNum(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }
function rarityRank(r){
  const t = String(r||"").toLowerCase();
  if (t==="rare") return 0;
  if (t==="uncommon") return 1;
  if (t==="common") return 2;
  return 3;
}
function normalizeRarity(s){
  const t = String(s||"").toLowerCase();
  if (t.includes("rare")) return "Rare";
  if (t.includes("uncommon")) return "Uncommon";
  if (t.includes("common")) return "Common";
  return s || null;
}
function normalizeRefine(k){
  const t = String(k||"").toLowerCase();
  if (t.includes("intact")) return "Intact";
  if (t.includes("exceptional")) return "Exceptional";
  if (t.includes("flawless")) return "Flawless";
  if (t.includes("radiant")) return "Radiant";
  return null;
}
function stdItemName(x){
  // Normalise légèrement pour matcher DE ↔ WFCD (pas agressif)
  return clean(String(x||""))
    .replace(/\s*\(.*?\)\s*$/,"")     // retire les parenthèses finales
    .replace(/\s+Blueprint$/i,"")     // retire suffix "Blueprint" si besoin (WFCD peut le garder)
    .replace(/\s{2,}/g," ")
    .trim();
}
function eqItem(a,b){ return stdItemName(a).toLowerCase() === stdItemName(b).toLowerCase(); }

function parseEraAndCode(rawName) {
  if (!rawName) return null;
  const s = String(rawName);
  const m = s.match(ERA_RE);
  if (!m) return null;
  const era = m[0];
  const tail = s.slice(m.index + era.length).replace(/Relic/i, "").trim();
  // Requiem I/II/III/IV
  if (/requiem/i.test(era)) {
    const rn = tail.match(/\b([IVX]+)\b/i);
    return { era: cap(era), code: rn ? rn[1].toUpperCase() : null };
  }
  const alnum = tail.match(/\b([A-Z]\d+)\b/);
  return { era: cap(era), code: alnum ? alnum[1] : null };
}
function inferEraFromName(s) {
  const m = String(s||"").match(ERA_RE);
  return m ? cap(m[0]) : null;
}
function inferCodeFromName(s) {
  if (/requiem/i.test(s)) {
    const m = String(s).match(/\b([IVX]+)\b/i);
    if (m) return m[1].toUpperCase();
  }
  const m = String(s).match(/\b([A-Z]\d+)\b/);
  return m ? m[1] : null;
}

// ---------- Normalisation drops ----------
function normDrop(d){
  if (!d) return null;
  const item = d.item || d.reward || d.name || d.product || d.type || null;
  if (!item) return null;
  let chance = null;
  if (d.chance != null) chance = toNum(d.chance);
  else if (d.probability != null) chance = toNum(d.probability);
  else if (d.percent != null) chance = toNum(d.percent);
  else if (d.weight != null && d.totalWeight != null) {
    const w = Number(d.weight), tw = Number(d.totalWeight);
    if (Number.isFinite(w) && Number.isFinite(tw) && tw>0) chance = (w/tw)*100;
  } else if (typeof d.roll === "number" && typeof d.totalRolls === "number" && d.totalRolls>0) {
    chance = (Number(d.roll)/Number(d.totalRolls))*100;
  }
  if (chance != null) chance = Math.round(chance*1000)/1000;
  return { item: String(item), rarity: normalizeRarity(d.rarity||d.rarityTier||d.quality||d.tier), chance: chance ?? undefined };
}

function isEmptyRewards(r){ return !r || Object.keys(r).length===0; }
function pushSortedRewards(rewards){
  for (const k of Object.keys(rewards)) {
    if (!Array.isArray(rewards[k]) || rewards[k].length===0) delete rewards[k];
    else rewards[k].sort((a,b)=>rarityRank(a.rarity)-rarityRank(b.rarity));
  }
}

// ---------- Extraction DE (récursif & tolérant) ----------
function extractRewardsForNode(node){
  const out = {};

  // A) clés directes Intact/Exceptional/Flawless/Radiant
  for (const k of Object.keys(node||{})) {
    const rr = normalizeRefine(k);
    if (!rr) continue;
    const drops = asArray(node[k]).map(normDrop).filter(Boolean);
    if (drops.length) (out[rr] ||= []).push(...drops);
  }
  if (!isEmptyRewards(out)) return out;

  // B) property “refinements”: [{ name/refinement, drops/rewards }]
  if (node?.refinements) {
    for (const ref of asArray(node.refinements)) {
      const rr = normalizeRefine(ref?.name || ref?.refinement);
      if (!rr) continue;
      const drops = asArray(ref?.drops || ref?.rewards).map(normDrop).filter(Boolean);
      if (drops.length) (out[rr] ||= []).push(...drops);
    }
  }
  if (!isEmptyRewards(out)) return out;

  // C) rewards/rewardTables/RelicRewards/mRewards: objet avec clés de raffinage
  const rwd = node?.rewards || node?.rewardTables || node?.RelicRewards || node?.mRewards;
  if (rwd && typeof rwd === "object") {
    for (const k of Object.keys(rwd)) {
      const rr = normalizeRefine(k);
      if (!rr) continue;
      const drops = asArray(rwd[k]).map(normDrop).filter(Boolean);
      if (drops.length) (out[rr] ||= []).push(...drops);
    }
  }
  return out;
}

function extractRelicsDE(expRoot){
  const relics = [];
  const seen = new Set();
  const skipped = [];

  (function walk(x){
    if (!x) return;
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (typeof x !== "object") return;

    // Node candidate ?
    const rawName = x?.name || x?.relicName || x?.RelicName || x?.mName || x?.mRelicName;
    const rawTier = x?.tier || x?.relicTier || x?.RelicTier || x?.mTier;

    const looksRelicName = rawName && /Relic/i.test(String(rawName)) && ERA_RE.test(String(rawName));
    const looksRelicTier = rawTier && ERA_RE.test(String(rawTier));
    if (looksRelicName || looksRelicTier) {
      const eraCode = parseEraAndCode(rawName || `${rawTier} Relic`);
      const era  = eraCode?.era || cap(String(rawTier||"").trim() || inferEraFromName(rawName) || "");
      if (era && ERA_RE.test(era)) {
        const code = eraCode?.code || inferCodeFromName(rawName||"") || null;
        const id   = slugify(`${era} ${code ? code+" " : ""}Relic`);
        const name = `${era} ${code ? code+" " : ""}Relic`;
        if (!seen.has(id)) {
          seen.add(id);
          const rewards = extractRewardsForNode(x);
          pushSortedRewards(rewards);
          if (Object.keys(rewards).length) {
            relics.push({ id, era, code, name, isRequiem: /requiem/i.test(era), rewards });
          } else {
            skipped.push({ id, name, reason: "no-rewards-detected" });
          }
        }
      }
    }

    // Descendre
    for (const v of Object.values(x)) walk(v);
  })(expRoot);

  relics.sort((a,b)=>{
    const ea = ERA_ORDER[a.era.toLowerCase()] ?? 9;
    const eb = ERA_ORDER[b.era.toLowerCase()] ?? 9;
    if (ea!==eb) return ea-eb;
    return String(a.code||"").localeCompare(String(b.code||""), undefined, { numeric:true, sensitivity:"base" });
  });

  return { relics, skipped };
}

// ---------- WFCD: index ‘Relics.json’ ----------
function loadWfcdRelics(){
  if (!exists(P_WFCD_REL)) return null;
  try {
    const raw = readJSON(P_WFCD_REL);
    // WFCD/Relics.json est une liste d’objets { name, rewards: { Intact:[...], ... }, vaulted? }
    const arr = asArray(raw);
    const mapByName = new Map();
    for (const r of arr) {
      const name = r?.name || r?.relicName || null;
      if (!name || !ERA_RE.test(name)) continue;
      const rewards = {};
      for (const k of Object.keys(r?.rewards || {})) {
        const rr = normalizeRefine(k);
        if (!rr) continue;
        const drops = asArray(r.rewards[k]).map(normDrop).filter(Boolean);
        if (drops.length) (rewards[rr] ||= []).push(...drops);
      }
      pushSortedRewards(rewards);
      mapByName.set(name, {
        name,
        rewards,
        vaulted: !!r?.vaulted
      });
    }
    return mapByName;
  } catch(e) {
    console.warn("WFCD Relics.json parse error:", e.message);
    return null;
  }
}

// ---------- WFCD: index ‘all.slim.json’ pour isVaulted ----------
function buildActiveIndexFromDrops(){
  if (!exists(P_WFCD_DRP)) return null;
  try {
    const slim = readJSON(P_WFCD_DRP);
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
  } catch(e){
    console.warn("WFCD drops slim parse error:", e.message);
    return null;
  }
}

// ---------- Merge DE ↔ WFCD ----------
function mergeDEwithWFCD(relicsDE, wfcdRelicsMap){
  const diffs = { addedRefinements: 0, addedItems: 0, patchedRarity: 0, patchedChance: 0, samples: [] };

  for (const R of relicsDE) {
    const w = wfcdRelicsMap?.get(R.name);
    if (!w) continue;

    // a) si raffinement manquant côté DE → ajouter depuis WFCD
    for (const rr of ["Intact","Exceptional","Flawless","Radiant"]) {
      const deDrops = R.rewards[rr] || [];
      const wfDrops = w.rewards[rr] || [];
      if (!deDrops.length && wfDrops.length) {
        R.rewards[rr] = wfDrops.map(d=>({ ...d })); // clone simple
        diffs.addedRefinements++;
        diffs.samples.push({ type:"addRefine", relic:R.name, refine:rr, count:wfDrops.length });
        continue;
      }

      // b) compléter item par item + patch rarity/chance
      const patchedHere = { a:0, r:0, c:0 };
      const merged = [...deDrops];
      for (const wd of wfDrops) {
        const i = merged.findIndex(dd => eqItem(dd.item, wd.item));
        if (i === -1) {
          merged.push({ ...wd });
          patchedHere.a++;
        } else {
          // patch rarity/chance si manquants côté DE
          if (!merged[i].rarity && wd.rarity) { merged[i].rarity = wd.rarity; patchedHere.r++; }
          if (merged[i].chance == null && wd.chance != null) { merged[i].chance = wd.chance; patchedHere.c++; }
        }
      }
      if (patchedHere.a||patchedHere.r||patchedHere.c) {
        diffs.addedItems += patchedHere.a;
        diffs.patchedRarity += patchedHere.r;
        diffs.patchedChance += patchedHere.c;
        diffs.samples.push({ type:"patch", relic:R.name, refine:rr, ...patchedHere });
      }
      // tri final
      merged.sort((a,b)=>rarityRank(a.rarity)-rarityRank(b.rarity));
      R.rewards[rr] = merged;
    }

    // c) vaulted depuis WFCD/Relics.json si dispo (priorité moindre que drops actifs)
    if (typeof w.vaulted === "boolean" && R.isVaulted == null) {
      R.isVaulted = !!w.vaulted;
    }
  }

  return diffs;
}

// ---------- MAIN ----------
(function main(){
  if (!exists(P_EXPORT)) {
    console.error(`❌ Missing ${P_EXPORT} — lance d’abord update-exports.yml`);
    process.exit(1);
  }

  // 1) Parse DE
  const exp = readJSON(P_EXPORT);
  const { relics, skipped } = extractRelicsDE(exp);

  // 2) Merge WFCD/Relics.json (si dispo)
  const wfcdRelics = loadWfcdRelics();
  const diffs = mergeDEwithWFCD(relics, wfcdRelics);

  // 3) isVaulted via drops actifs (si dispo)
  const active = buildActiveIndexFromDrops();
  if (active) {
    for (const r of relics) r.isVaulted = !active.has(r.name);
  }

  // 4) Sorties
  fs.writeFileSync(OUT_JSON, JSON.stringify(relics, null, 2), "utf-8");

  // CSV compact
  const headers = ["id","era","code","name","isRequiem","isVaulted","refinements","itemsPerRefinement"];
  const lines = [headers.join(",")];
  for (const r of relics) {
    const refs = Object.keys(r.rewards||{}).sort((a,b)=>{
      const order = { Intact:0, Exceptional:1, Flawless:2, Radiant:3 };
      return (order[a]??9)-(order[b]??9);
    });
    const counts = refs.map(k => `${k}:${(r.rewards[k]||[]).length}`).join("|");
    lines.push([
      r.id, r.era, r.code||"", r.name,
      r.isRequiem ? "1":"0",
      r.isVaulted ? "1":"0",
      refs.join("|"),
      counts
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
  }
  fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

  // Report
  const report = {
    total: relics.length,
    skipped: skipped.length,
    wfcdRelicsSeen: wfcdRelics ? wfcdRelics.size : 0,
    merge: {
      addedRefinements: diffs.addedRefinements,
      addedItems: diffs.addedItems,
      patchedRarity: diffs.patchedRarity,
      patchedChance: diffs.patchedChance,
      samples: diffs.samples.slice(0, 25)
    }
  };
  fs.writeFileSync(OUT_REP, JSON.stringify(report, null, 2), "utf-8");

  console.log(`✅ OK → ${OUT_JSON} (${relics.length} relics)`);
  console.log(`ℹ️  Skipped (no-rewards): ${skipped.length}`);
  console.log(`🔧 Merge: +refines=${diffs.addedRefinements}, +items=${diffs.addedItems}, patchedRarity=${diffs.patchedRarity}, patchedChance=${diffs.patchedChance}`);
  if (active) console.log("🏷️  isVaulted tagged from WFCD drops");
  console.log(`📄 CSV → ${OUT_CSV}`);
  console.log(`📝 Report → ${OUT_REP}`);
})();
