// tools/enrich_mods.js
// Merge des mods depuis : Overframe + WarframeStat + (optionnel) ExportUpgrades
// Sorties: data/enriched_mods.json | data/enriched_mods_report.json | data/enriched_mods.csv

import fs from "fs";
import path from "path";

/* ------------------------------ Helpers FS ------------------------------- */
const DATA_DIR = path.resolve("data");
const OF_DIR   = path.join(DATA_DIR, "overframe");

const OUT_JSON = path.join(DATA_DIR, "enriched_mods.json");
const OUT_REP  = path.join(DATA_DIR, "enriched_mods_report.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_mods.csv");

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf-8")); }
function readFirstExisting(candidates) { for (const p of candidates) if (fs.existsSync(p)) return readJson(p); return null; }

/* ---------------------------- Localisation des paths ---------------------- */
const P_OFMODS = [
  path.join(OF_DIR, "overframe-mods.json"),
  path.join(OF_DIR, "OF_mods.json"),
  path.join(OF_DIR, "OF_mods_filtered.json"),
  path.join(DATA_DIR, "overframe-mods.json"),
  "overframe-mods.json",
];
const P_WFSTAT = [
  path.join(DATA_DIR, "modwarframestat.json"),
  path.join(DATA_DIR, "modwarframestat(1).json"),
  path.join(DATA_DIR, "wfstat_mods.json"),
  "modwarframestat.json",
  "modwarframestat(1).json",
];
const P_EXPORT = [
  path.join(DATA_DIR, "ExportUpgrades_en.json"),
  path.join(DATA_DIR, "ExportUpgrades_en(1).json"),
  "ExportUpgrades_en.json",
  "ExportUpgrades_en(1).json",
];

/* ------------------------------ Normalisation ---------------------------- */
const normStr = (s) => String(s ?? "").trim();
const clean = (s) => normStr(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").replace(/–/g, "-").replace(/\u00A0/g, " ").trim();
function keyify(name){return clean(name).toLowerCase().replace(/<[^>]+>/g,"").replace(/[()]/g," ").replace(/[\-–_'"`]/g," ").replace(/\s+/g," ").trim();}
function keyifySorted(name){return keyify(name).split(" ").filter(Boolean).sort().join(" ");}
function slugify(s){return clean(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}

/* -------------------------- Charger les sources -------------------------- */
const S_ofmods = readFirstExisting(P_OFMODS);
const S_wfstat = readFirstExisting(P_WFSTAT);
const S_export = readFirstExisting(P_EXPORT);

if (!S_ofmods) { console.error("❌ overframe-mods.json introuvable"); process.exit(1); }
if (!S_wfstat || !Array.isArray(S_wfstat.data)) { console.error("❌ modwarframestat.json mal formé (attendu: { data: [...] })"); process.exit(1); }

const OF_ENTRIES = Object.entries(S_ofmods);
const WF_ITEMS   = S_wfstat.data;
const EXP_UP     = Array.isArray(S_export?.ExportUpgrades) ? S_export.ExportUpgrades : [];

/* ------------------------ Utils / détecteurs ----------------------------- */
const isArchonName = (n) => /^archon\b/i.test(String(n||""));
function isArcaneLike(entry){ if(!entry)return false; const name=(entry.name||entry.title||"").toLowerCase(); const type=(entry.type||entry.tag||"").toLowerCase(); const cats=Array.isArray(entry.categories)?entry.categories.map(c=>String(c).toLowerCase()):[]; const slug=(entry.slug||"").toLowerCase(); return type.includes("arcane")||type.includes("relicsandarcanes")||cats.includes("arcane")||/^arcane\b/.test(name)||slug==="arcane"||slug.startsWith("arcane"); }
function isStanceLike({type,categories}){const t=String(type||"").toLowerCase(); const cats=Array.isArray(categories)?categories.map(c=>String(c).toLowerCase()):[]; return t.includes("stance")||cats.includes("stance");}
function isAuraLike({type,name,baseDrain}){const t=String(type||"").toLowerCase(); const n=String(name||"").toLowerCase(); return t.includes("aura")||/^aura\b/.test(n)||(typeof baseDrain==="number"&&baseDrain<0);}
function inferTypeSmart(currentType, compatName, uniqueName){
  const cur=String(currentType||'').toLowerCase(); if(cur&&cur!=='mod')return currentType;
  const s=(String(compatName||'')+' '+String(uniqueName||'')).toLowerCase();
  if(/(powersuit|\/mods\/warframe|warframe)/.test(s))return'Warframe Mod';
  if(/(archwing|arch-gun|archgun)/.test(s))return'Archwing';
  if(/(necramech|mech)/.test(s))return'Necramech';
  if(/sentinel/.test(s))return'Sentinel';
  if(/parazon/.test(s))return'Parazon';
  if(/(\/rifle\/|sniperrifle)/.test(s))return'Primary';
  if(/\/shotgun\//.test(s))return'Shotgun';
  if(/(\/pistol\/|secondary)/.test(s))return'Secondary';
  if(/\/melee\//.test(s))return'Melee';
  return currentType||'Mod';
}

/* ------------------------- Polarity canonique (API) ---------------------- */
const UNMAPPED_POLARITIES = new Set();
const AP_MAP = {
  attack:"madurai", tactic:"naramon", defense:"vazarin", ward:"unairu",
  power:"zenurik", precept:"penjaga", umbra:"umbra", any:"any", universal:"universal",
};
const ALIAS_MAP = {
  madurai:"madurai", v:"madurai", attack:"madurai",
  naramon:"naramon", dash:"naramon", "-":"naramon", tactic:"naramon",
  vazarin:"vazarin", d:"vazarin", defense:"vazarin",
  zenurik:"zenurik", "=":"zenurik", ability:"zenurik", power:"zenurik",
  unairu:"unairu", ward:"unairu",
  umbra:"umbra", umbral:"umbra",
  penjaga:"penjaga", precept:"penjaga", sentinel:"penjaga", y:"penjaga",
  aura:"any", any:"any", universal:"universal"
};
function normalizePolarity(p){
  if(!p) return p;
  const raw=String(p).trim(); const lower=raw.toLowerCase();
  if(lower.startsWith("ap_")){const code=lower.slice(3); if(AP_MAP[code])return AP_MAP[code]; UNMAPPED_POLARITIES.add(raw); return lower;}
  if(ALIAS_MAP[lower])return ALIAS_MAP[lower];
  UNMAPPED_POLARITIES.add(raw);
  return lower;
}

/* ----------------------- Helpers num./normalisation ---------------------- */
const toNum = (v) => (typeof v==='number'? v : (v!=null && !isNaN(Number(v))? Number(v): undefined));
const chooseFusionLimit = (wf,exp,of) => (toNum(wf) ?? toNum(exp) ?? toNum(of));
const normalizeLevelStats = (levelStats,fusionLimit)=>{ const list=Array.isArray(levelStats)?levelStats:[]; const lim=toNum(fusionLimit); if(!Number.isFinite(lim)) return list; return list.slice(0, lim+1); };

/* ----------------------------- OVERRIDES --------------------------------- */
const OVERRIDES = new Map();
// Archon Intensify progression corrigée
OVERRIDES.set("archon-intensify",{ baseDrain:6, fusionLimit:10, polarity:"madurai",
  buildLevelStats(){ const nums=[2.7,5.5,8.2,10.9,13.6,16.4,19.1,21.8,24.5,27.3,30.0];
    const line="Restoring health with abilities grants +30% Ability Strength for 10s.";
    return nums.map(n=>({stats:[`+${n}% Ability Strength`, line]})); }
});
// Autres Archon → impose baseDrain:6 / fusionLimit:10 (garde levelStats source tronqués)
["archon-flow","archon-stretch","archon-vitality","archon-continuity"].forEach(s=>OVERRIDES.set(s,{baseDrain:6,fusionLimit:10}));
// Primed Intensify (si besoin de forcer)
OVERRIDES.set("primed-intensify",{ fusionLimit:10, polarity:"madurai" });

/* ---------- OVERRIDES par uniqueName (correction Primed Intensify) ------- */
const UNIQUE_OVERRIDES = [
  {
    match: (u) => String(u||"") === "/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityStrengthModExpert",
    apply: (m) => {
      m.name = "Primed Intensify";
      m.slug = "primed-intensify";
      m.rarity = "Legendary";
      if (m.fusionLimit == null || m.fusionLimit < 10) m.fusionLimit = 10;
      if (!m.polarity) m.polarity = "madurai";
      // Non disponible en jeu → drops "Not available"
      m.drops = ["Not available"];
    }
  }
];

/* ----------------------- Extracteurs par source -------------------------- */
function fromWFStat(w){ return {
  name:w?.name||null, uniqueName:w?.uniqueName||null, type:w?.type||null,
  rarity:w?.rarity||null, polarity:normalizePolarity(w?.polarity||null),
  baseDrain:w?.baseDrain??null, fusionLimit:w?.fusionLimit??null,
  compatName:w?.compatName||null, description:w?.description||null,
  wikiaThumbnail:w?.wikiaThumbnail||null, isAugment:!!w?.isAugment,
  drops:Array.isArray(w?.drops)?w.drops:[], levelStats:Array.isArray(w?.levelStats)?w.levelStats:[],
};}
function fromExport(u){ if(!u)return{}; return {
  name:u?.name||u?.upgradeName||u?.displayName||null, uniqueName:u?.uniqueName||null,
  type:u?.type||null, rarity:u?.rarity||null, polarity:normalizePolarity(u?.polarity||null),
  baseDrain:u?.baseDrain??null, fusionLimit:u?.fusionLimit??null,
  compatName:u?.compatName||null, description:u?.description||null,
};}
function fromOverframe(of){ const name=of?.name||of?.title||null; const slug=of?.slug||(name?slugify(name):null); const d=of?.data||{};
  const rarity=d.RarityName||d.Rarity||null; const polarity=normalizePolarity(d.ArtifactPolarity||d.Polarity||null);
  const baseDrain=d.BaseDrain??d.baseDrain??null; const fusionLimit=d.FusionLimit??d.fusionLimit??null;
  const compatName=d.ItemCompatibility||d.Compat||null; const type=of?.type||of?.tag||d.WCategoryName||"Mod";
  const categories=Array.isArray(of?.categories)?of.categories:(of?.category?[of.category]:[]);
  const description=of?.description||d?.Description||null; const isAug=/\baugment\b/i.test(name||"");
  return { id: of?.id ?? slug ?? (name?slugify(name):undefined), name, slug, type, categories,
    rarity, polarity, baseDrain, fusionLimit, compatName, description, isAugment:isAug };
}

/* --------- INDEXATION : on garde TOUTES les entrées WF par nom ----------- */
const mapWFByName = new Map();   // keyName -> Array<rawWF>
const mapWFByUnique = new Map(); // uniqueName -> rawWF
for (const it of WF_ITEMS) {
  const n = it?.name;
  if (n) {
    const k1 = keyify(n), k2 = keyifySorted(n);
    if (!mapWFByName.has(k1)) mapWFByName.set(k1, []);
    if (!mapWFByName.has(k2)) mapWFByName.set(k2, []);
    mapWFByName.get(k1).push(it);
    mapWFByName.get(k2).push(it);
  }
  const u = it?.uniqueName; if (u) mapWFByUnique.set(String(u).toLowerCase(), it);
}
const mapEXPByName = new Map(), mapEXPByUnique = new Map();
for (const u of EXP_UP) {
  const n = u?.name || u?.upgradeName || u?.displayName;
  if (n) { const k1 = keyify(n), k2 = keyifySorted(n); mapEXPByName.set(k1, u); mapEXPByName.set(k2, u); }
  const un = u?.uniqueName; if (un) mapEXPByUnique.set(String(un).toLowerCase(), u);
}

/* ---- Sélection “best-of” pour WFStat quand doublons (spécial Archon) ---- */
function wfPickBestByHeuristics(candidates, ofName) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const isArchon = isArchonName(ofName || candidates[0]?.name);
  const score = (it) => {
    const fusion = toNum(it?.fusionLimit) ?? -1;
    const base = toNum(it?.baseDrain);
    const lvlLen = Array.isArray(it?.levelStats) ? it.levelStats.length : 0;
    let s = 0;
    s += lvlLen * 100;                         // 1) +levelStats
    s += (fusion >= 0 ? fusion : 0) * 10;      // 2) +fusionLimit
    if (base === 6) s += 5;                    // 3) baseDrain=6 bonus
    if (String(it?.uniqueName||"").toLowerCase().includes("archon")) s += 3; // 4) tag archon
    return s;
  };

  let pool = candidates.slice();
  if (isArchon) {
    const full = pool.filter(it => (toNum(it?.fusionLimit) ?? 0) >= 10 &&
                                   (Array.isArray(it?.levelStats) ? it.levelStats.length : 0) >= 10);
    if (full.length) pool = full;
  }

  pool.sort((a,b) => score(b) - score(a));
  return pool[0] || candidates[0];
}

/* --------------------------- Fusion champ par champ ---------------------- */
function take(...vals){ for(const v of vals){ if(v!==undefined && v!==null && String(v)!=="") return v; } }

/* ------------------------------ Fusion globale --------------------------- */
const result = [];
let skippedArcanes=0, skippedNoSlug=0, skippedEmptyCats=0, skippedFocusWay=0;

for (const [ofKey, ofObj] of OF_ENTRIES) {
  if (isArcaneLike(ofObj)) { skippedArcanes++; continue; }

  const baseOF = fromOverframe(ofObj);
  const kName = baseOF.name ? keyify(baseOF.name) : null;
  const kNameSorted = baseOF.name ? keyifySorted(baseOF.name) : null;

  // 1) WFStat candidats
  let wfRaw = null, wfList =
    (kName && mapWFByName.get(kName)) ? mapWFByName.get(kName) :
    (kNameSorted && mapWFByName.get(kNameSorted)) ? mapWFByName.get(kNameSorted) :
    null;

  if (wfList && wfList.length) wfRaw = wfPickBestByHeuristics(wfList, baseOF.name);

  // 2) Export (fallback)
  let expRaw = null;
  const expByName =
    (kName && mapEXPByName.get(kName)) ? mapEXPByName.get(kName) :
    (kNameSorted && mapEXPByName.get(kNameSorted)) ? mapEXPByName.get(kNameSorted) :
    null;
  if (expByName) expRaw = expByName;

  // 2-bis) réalignement via uniqueName si Export l’apporte
  if (!wfRaw && expRaw?.uniqueName) {
    const wfByU = mapWFByUnique.get(String(expRaw.uniqueName).toLowerCase());
    if (wfByU) wfRaw = wfByU;
  }

  // 🔁 DÉ-PRIME : si OF ne dit pas Primed mais WF pointe un Expert, bascule vers la variante non-Expert
  if (wfRaw?.uniqueName && !/\bprime(d)?\b/i.test(String(baseOF.name||""))) {
    const u = String(wfRaw.uniqueName);
    if (/\/Expert\//.test(u) || /ModExpert/.test(u)) {
      const alt = u.replace(/\/Expert\//, "/").replace(/ModExpert/, "Mod");
      const wfAlt = mapWFByUnique.get(alt.toLowerCase());
      if (wfAlt) wfRaw = wfAlt; // on remplace par la version non-Expert
    }
  }

  const WF  = wfRaw ? fromWFStat(wfRaw) : {};
  const EXP = expRaw ? fromExport(expRaw) : {};

  // 3) Merge
  const merged = {
    id: take(baseOF.id),
    slug: take(baseOF.slug),
    name: take(baseOF.name, WF?.name, EXP?.name), // on préserve "Intensify" si l'OF dit Intensify
    categories: baseOF.categories || [],
    uniqueName: take(WF?.uniqueName, EXP?.uniqueName),

    type: take(WF?.type, EXP?.type, baseOF.type),
    rarity: take(WF?.rarity, EXP?.rarity, baseOF.rarity),
    polarity: normalizePolarity(take(WF?.polarity, EXP?.polarity, baseOF.polarity)),
    compatName: take(WF?.compatName, EXP?.compatName, baseOF.compatName),
    baseDrain: take(WF?.baseDrain, EXP?.baseDrain, baseOF.baseDrain),
    fusionLimit: chooseFusionLimit(WF?.fusionLimit, EXP?.fusionLimit, baseOF.fusionLimit),

    description: take(WF?.description, EXP?.description, baseOF.description),
    wikiaThumbnail: take(WF?.wikiaThumbnail, null),

    isAugment: false,
    drops: Array.isArray(WF?.drops) ? WF.drops : [],
    levelStats: Array.isArray(WF?.levelStats) ? WF.levelStats : [],
  };

  // 3-bis) OVERRIDES par slug (Archon etc.)
  const slug = merged.slug || (merged.name ? slugify(merged.name) : null);
  if (slug && OVERRIDES.has(slug)) {
    const o = OVERRIDES.get(slug);
    if (o.baseDrain !== undefined) merged.baseDrain = o.baseDrain;
    if (o.fusionLimit !== undefined) merged.fusionLimit = o.fusionLimit;
    if (o.polarity !== undefined) merged.polarity = normalizePolarity(o.polarity);
    if (o.buildLevelStats) merged.levelStats = o.buildLevelStats();
  }

  // 3-ter) OVERRIDES par uniqueName (Primed Intensify) — s'applique UNIQUEMENT si on est sur l'Expert
  for (const rule of UNIQUE_OVERRIDES) {
    if (rule.match(merged.uniqueName)) rule.apply(merged);
  }

  // 4) isAugment robuste
  const prelimWF = !!WF?.isAugment;
  const byName   = /\baugment\b/i.test(String(merged.name || ""));
  const aura     = isAuraLike({ type: merged.type, name: merged.name, baseDrain: merged.baseDrain });
  const stance   = isStanceLike({ type: merged.type, categories: merged.categories });
  const compat   = String(merged.compatName || "");
  const compatIsGeneric = !compat || /\bwarframe\b/i.test(compat) || /powersuit|player/i.test(compat);
  const isArchon = isArchonName(merged.name);
  merged.isAugment = (prelimWF || byName) && !aura && !stance && !compatIsGeneric && !isArchon;

  // 5) Exclure Focus Way
  const t = String(merged.type||"").toLowerCase();
  if (t.includes("focus way") || t === "focus way") { skippedFocusWay++; continue; }

  // 6) Nettoyages + clamp + type
  if (!merged.slug && merged.name) merged.slug = slugify(merged.name);
  merged.levelStats = normalizeLevelStats(merged.levelStats, merged.fusionLimit);
  merged.type = inferTypeSmart(merged.type, merged.compatName, merged.uniqueName);

  // ❌ exclusions (pas de slug / categories vides)
  if (!merged.slug) { skippedNoSlug++; continue; }
  if (!Array.isArray(merged.categories) || merged.categories.length === 0) { skippedEmptyCats++; continue; }

  result.push(merged);
}

/* -------------------------- Filet final / sorties ------------------------ */
const final = result.filter((m) =>
  !isArcaneLike(m) &&
  m.slug &&
  Array.isArray(m.categories) && m.categories.length > 0 &&
  !(String(m.type||"").toLowerCase().includes("focus way"))
);

final.sort((a,b)=>String(a.name).localeCompare(String(b.name)));

fs.mkdirSync(DATA_DIR,{recursive:true});
fs.writeFileSync(OUT_JSON, JSON.stringify(final,null,2), "utf-8");
fs.writeFileSync(OUT_REP,  JSON.stringify({
  total_input: OF_ENTRIES.length,
  total_output: final.length,
  skippedArcanes, skippedFocusWay, skippedNoSlug, skippedEmptyCats,
  unmappedPolarities: Array.from(UNMAPPED_POLARITIES).sort().slice(0,100)
}, null, 2), "utf-8");

// CSV
const headers=["id","slug","name","uniqueName","type","categories","rarity","polarity","compatName","baseDrain","fusionLimit","isAugment","wikiaThumbnail","dropsCount","levelsCount"];
const lines=[headers.join(",")];
for (const m of final) {
  const row=[ m.id, m.slug, m.name, m.uniqueName, m.type, (m.categories||[]).join("|"), m.rarity, m.polarity, m.compatName, m.baseDrain??"", m.fusionLimit??"", m.isAugment?"1":"0", m.wikiaThumbnail??"", Array.isArray(m.drops)?m.drops.length:0, Array.isArray(m.levelStats)?m.levelStats.length:0 ]
    .map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",");
  lines.push(row);
}
fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

console.log(`OK → ${OUT_JSON} (${final.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);
