// tools/enrich_relics.js
// Construit des reliques enrichies depuis ExportRelicArcane_en.json (DE) + option WFCD drops
// Sorties : data/enriched_relics.json, data/enriched_relics.csv, data/enriched_relics_report.json

import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("data");
const P_EXPORT = path.join(DATA_DIR, "ExportRelicArcane_en.json");

// WFCD (optionnel) pour marquer isVaulted
const WFCD_DIR = path.join(DATA_DIR, "wfcd_drops");
const WFCD_SLIM = path.join(WFCD_DIR, "all.slim.json");

const OUT_JSON = path.join(DATA_DIR, "enriched_relics.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_relics.csv");
const OUT_REP  = path.join(DATA_DIR, "enriched_relics_report.json");

// Utils
const asArray = (v) => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);
const exists = (p) => fs.existsSync(p);
const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf-8"));

function clean(s) {
  return String(s ?? "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}
function slugify(s) {
  return clean(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Quelques helpers typiques rencontrés dans ExportRelicArcane
const ERA_RE = /Lith|Meso|Neo|Axi|Requiem/i;
const ERA_ORDER = { lith: 0, meso: 1, neo: 2, axi: 3, requiem: 4 };

function parseEraAndCode(rawName) {
  // exemples: "Lith A1 Relic", "Neo N8 Relic", "Axi A5 Relic", "Requiem I Relic"
  const s = String(rawName || "");
  const eraMatch = s.match(ERA_RE);
  if (!eraMatch) return null;
  const era = eraMatch[0];

  // code: tokens après l’ère, ex "A1", "N8", "B4", "I" pour Requiem (I, II, III, IV)
  const tail = s.slice(eraMatch.index + era.length).replace(/Relic/i, "").trim();
  // Cherche d’abord I/II/III/IV pour requiem
  const requiemRoman = tail.match(/\b([IVX]+)\b/i);
  if (/requiem/i.test(era) && requiemRoman) {
    return { era: capitalize(era), code: requiemRoman[1].toUpperCase() };
  }
  // sinon un code comme A1, N8, B4…
  const codeMatch = tail.match(/\b([A-Z]\d+)\b/);
  if (codeMatch) return { era: capitalize(era), code: codeMatch[1] };

  // fallback: conserve le reste brut
  const codeToken = tail.replace(/\s+/g, " ").trim();
  return { era: capitalize(era), code: codeToken || null };
}

function capitalize(s) { s = String(s||""); return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

function normalizeRarity(s) {
  const t = String(s||"").toLowerCase();
  if (t.includes("common")) return "Common";
  if (t.includes("uncommon")) return "Uncommon";
  if (t.includes("rare")) return "Rare";
  // parfois "Intact/Common", "Radiant/Rare" en descriptions brutes
  if (t.includes("rare")) return "Rare";
  return s || null;
}

function normalizeRefinementKey(k) {
  const t = String(k||"").toLowerCase();
  if (t.includes("intact")) return "Intact";
  if (t.includes("exceptional")) return "Exceptional";
  if (t.includes("flawless")) return "Flawless";
  if (t.includes("radiant")) return "Radiant";
  return null;
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Extraction générique depuis ExportRelicArcane_en.json (structure varie selon versions)
function extractRelicsFromExport(data) {
  const out = [];
  const skipped = [];

  // On va essayer plusieurs schémas connus
  const arr = asArray(data);

  for (const entry of arr) {
    // Cas 1 : entrée ressemble déjà à une relique { name / relicName, rewards / rewardTables ... }
    const rawName = entry?.name || entry?.relicName || entry?.RelicName || entry?.mName || entry?.mRelicName;
    const rawTier = entry?.tier || entry?.relicTier || entry?.RelicTier || entry?.mTier;
    const rewards = entry?.rewards || entry?.rewardTables || entry?.mRewards || entry?.RelicRewards;

    // Alternative : certains dumps ont tout dans data.Relics / data.RelicRewards
    const items = rewards ? [entry] : asArray(entry?.Relics || entry?.RelicRewards || entry?.data || []);
    if (!rewards && items.length) {
      for (const it of items) {
        const rn = it?.name || it?.relicName || it?.RelicName;
        const rt = it?.tier || it?.relicTier || it?.RelicTier;
        const rw = it?.rewards || it?.rewardTables || it?.mRewards || it?.RelicRewards;
        const ok = addOne(out, rn, rt, rw, it);
        if (!ok) skipped.push(it);
      }
      continue;
    }

    // Entrée directe
    const ok = addOne(out, rawName, rawTier, rewards, entry);
    if (!ok) skipped.push(entry);
  }

  // Tri (par ère puis code alpha-num)
  out.sort((a, b) => {
    const ea = ERA_ORDER[a.era.toLowerCase()] ?? 9;
    const eb = ERA_ORDER[b.era.toLowerCase()] ?? 9;
    if (ea !== eb) return ea - eb;
    return String(a.code||"").localeCompare(String(b.code||""), undefined, { numeric: true, sensitivity: "base" });
  });

  return { relics: out, skipped };
}

function addOne(out, rawName, rawTier, rewards, fullEntry) {
  const nameField = rawName || (rawTier ? `${rawTier} Relic` : null);
  if (!nameField) return false;

  const eraCode = parseEraAndCode(nameField);
  const era = eraCode?.era || capitalize(String(rawTier||"").trim() || inferEraFromName(nameField) || "");
  if (!era || !ERA_RE.test(era)) return false;

  const code = eraCode?.code || inferCodeFromName(nameField) || null;
  const id = slugify(`${era} ${code ? code + " " : ""}Relic`);

  const relic = {
    id,
    era,
    code,
    name: `${era} ${code ? code + " " : ""}Relic`,
    isRequiem: /requiem/i.test(era),
    rewards: {}   // sera rempli par raffinement
  };

  // rewards peut être déjà structuré par raffinement, ou plat avec rareté/poids
  if (rewards) {
    ingestRewards(relic.rewards, rewards);
  } else {
    // Essaye autres clés dans l’entrée complète
    const r2 = fullEntry?.rewardTables || fullEntry?.mRewards || fullEntry?.RelicRewards;
    if (r2) ingestRewards(relic.rewards, r2);
  }

  // Nettoyage: retire raffinement vide
  for (const k of Object.keys(relic.rewards)) {
    if (!Array.isArray(relic.rewards[k]) || relic.rewards[k].length === 0) {
      delete relic.rewards[k];
    } else {
      // tri par rareté: Rare, Uncommon, Common
      relic.rewards[k].sort((a,b) => rarityRank(a.rarity) - rarityRank(b.rarity));
    }
  }

  out.push(relic);
  return true;
}

function rarityRank(r) {
  const t = String(r||"").toLowerCase();
  if (t === "rare") return 0;
  if (t === "uncommon") return 1;
  if (t === "common") return 2;
  return 3;
}

function inferEraFromName(s) {
  const m = String(s||"").match(ERA_RE);
  return m ? capitalize(m[0]) : null;
}
function inferCodeFromName(s) {
  // Requiem I/II/III/IV
  if (/requiem/i.test(s)) {
    const m = String(s).match(/\b([IVX]+)\b/i);
    if (m) return m[1].toUpperCase();
  }
  const m = String(s).match(/\b([A-Z]\d+)\b/);
  return m ? m[1] : null;
}

function ingestRewards(dst, rewardsAny) {
  // Plusieurs formes possibles :
  // - { Intact: [...], Exceptional: [...], Flawless: [...], Radiant: [...] }
  // - { refinements: [{ name: 'Intact', drops: [...] }, ...] }
  // - [{ refinement: 'Intact', rewards: [...] }, ...]
  // - liste simple avec des clés indiquant le raffinement ou la rareté
  const obj = rewardsAny;

  // Forme 1 : clés directes Intact/Exceptional/Flawless/Radiant
  let found = false;
  for (const k of Object.keys(obj || {})) {
    const rr = normalizeRefinementKey(k);
    if (!rr) continue;
    const drops = asArray(obj[k]).map(normalizeDrop);
    if (drops.length) {
      dst[rr] = drops;
      found = true;
    }
  }
  if (found) return;

  // Forme 2 : champs dans array
  const arr = asArray(obj);
  if (arr.length) {
    // cas a) { refinement:'Intact', rewards:[...] }
    let used = false;
    for (const node of arr) {
      const rkey = normalizeRefinementKey(node?.refinement || node?.name);
      if (!rkey) continue;
      const drops = asArray(node?.rewards || node?.drops).map(normalizeDrop);
      if (drops.length) {
        dst[rkey] = drops;
        used = true;
      }
    }
    if (used) return;

    // cas b) peut-être tableau de drops uniques sans raffinement → alors on duplique sur Intact seulement
    const drops = arr.map(normalizeDrop).filter(Boolean);
    if (drops.length) {
      dst["Intact"] = drops;
      return;
    }
  }

  // Forme 3 : { refinements: [{ name, drops }...] }
  if (obj?.refinements) {
    for (const ref of asArray(obj.refinements)) {
      const rkey = normalizeRefinementKey(ref?.name);
      if (!rkey) continue;
      const drops = asArray(ref?.drops || ref?.rewards).map(normalizeDrop);
      if (drops.length) dst[rkey] = drops;
    }
  }
}

function normalizeDrop(d) {
  if (!d) return null;
  // On essaye plusieurs champs: item, reward, name
  const item = d.item || d.reward || d.name || d.product || d.type || null;
  if (!item) return null;
  const rarity = normalizeRarity(d.rarity || d.rarityTier || d.quality || d.tier);
  // chance peut être directement %, ou via 'chance' / 'probability' / 'weight'
  let chance = null;
  if (d.chance != null) chance = toNumberOrNull(d.chance);
  else if (d.probability != null) chance = toNumberOrNull(d.probability);
  else if (d.percent != null) chance = toNumberOrNull(d.percent);
  else if (d.weight != null && d.totalWeight != null) {
    // poids relatifs → pourcentage
    const w = Number(d.weight), tw = Number(d.totalWeight);
    if (Number.isFinite(w) && Number.isFinite(tw) && tw > 0) {
      chance = (w / tw) * 100;
    }
  } else if (typeof d.roll === "number") {
    // certains formats donnent roll/totalRolls
    const tr = Number(d.totalRolls) || 0;
    if (tr > 0) chance = (Number(d.roll) / tr) * 100;
  }
  if (chance != null) {
    // arrondi raisonnable
    chance = Math.round(chance * 1000) / 1000; // 0.001
  }

  return {
    item: String(item),
    rarity: rarity || null,
    chance: chance != null ? chance : undefined
  };
}

// WFCD: déduit si une relique est "active" dans les tables actuelles (sinon considérée "vaulted")
function buildActiveRelicsIndexFromWfcd() {
  if (!exists(WFCD_SLIM)) return null;
  try {
    const slim = readJSON(WFCD_SLIM);
    const active = new Set();
    // Le format slim agrège tout ; on cherche des sections évoquant les reliques
    // Heuristique: parcourir récursivement et collecter les noms contenant " Relic"
    function walk(x) {
      if (!x) return;
      if (Array.isArray(x)) { x.forEach(walk); return; }
      if (typeof x === "object") {
        for (const [k, v] of Object.entries(x)) {
          if (k.toLowerCase().includes("relic") && typeof v === "string" && /Relic$/.test(v)) {
            active.add(v);
          }
          walk(v);
        }
      }
    }
    walk(slim);
    return active;
  } catch (e) {
    console.warn("WFCD slim parse error:", e.message);
    return null;
  }
}

// MAIN
(function main() {
  if (!exists(P_EXPORT)) {
    console.error(`Missing ${P_EXPORT} (run update-exports.yml first).`);
    process.exit(1);
  }

  const exp = readJSON(P_EXPORT);
  const { relics, skipped } = extractRelicsFromExport(exp);

  // Annoter isVaulted via WFCD si possible
  const activeIndex = buildActiveRelicsIndexFromWfcd();
  if (activeIndex) {
    for (const r of relics) {
      r.isVaulted = !activeIndex.has(r.name);
    }
  }

  // Rapport
  const report = {
    total: relics.length,
    skipped: skipped.length
  };

  // Ecrit JSON
  fs.writeFileSync(OUT_JSON, JSON.stringify(relics, null, 2), "utf-8");
  fs.writeFileSync(OUT_REP, JSON.stringify(report, null, 2), "utf-8");

  // CSV
  const headers = ["id","era","code","name","isRequiem","isVaulted","refinements","itemsPerRefinement"];
  const lines = [headers.join(",")];
  for (const r of relics) {
    const refinements = Object.keys(r.rewards||{}).sort((a,b)=>{
      const order = { Intact:0, Exceptional:1, Flawless:2, Radiant:3 };
      return (order[a]??9) - (order[b]??9);
    });
    const counts = refinements.map(k => `${k}:${(r.rewards[k]||[]).length}`).join("|");
    const row = [
      r.id, r.era, r.code || "", r.name,
      r.isRequiem ? "1":"0",
      r.isVaulted ? "1":"0",
      refinements.join("|"),
      counts
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
    lines.push(row);
  }
  fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

  console.log(`OK → ${OUT_JSON} (${relics.length} relics)`);
  console.log(`OK → ${OUT_REP}  skipped=${skipped.length}`);
  console.log(`OK → ${OUT_CSV}`);
})();
