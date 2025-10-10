// tools/enrich_mods.js
// Merge Overframe + WarframeStat + (optionnel) ExportUpgrades => mods propres pour l'API
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
const clean = (s) =>
  normStr(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").replace(/–/g, "-").replace(/\u00A0/g, " ").trim();

function keyify(name){
  return clean(name).toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[()]/g, " ")
    .replace(/[\-–_'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function keyifySorted(name){ return keyify(name).split(" ").filter(Boolean).sort().join(" "); }
function slugify(s){ return clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

/* ----------------------- Nettoyage NOM (affichage API) ------------------- */
function cleanDisplayName(name) {
  if (!name) return name;
  let s = String(name);
  s = s.replace(/&apos;/gi, "’");  // HTML
  s = s.replace(/\\'s/gi, "’s");   // Amar\'s → Amar’s
  s = s.replace(/\\s\b/gi, "’s");  // Amar\s  → Amar’s
  s = s.replace(/\\'/g, "’");      // quotes échappées
  s = s.replace(/'/g, "’");        // droite → apostrophe
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/* -------------------------- Charger les sources -------------------------- */
const S_ofmods = readFirstExisting(P_OFMODS);
const S_wfstat = readFirstExisting(P_WFSTAT);
const S_export = readFirstExisting(P_EXPORT);

if (!S_ofmods) { console.error("❌ overframe-mods.json introuvable"); process.exit(1); }
if (!S_wfstat || !Array.isArray(S_wfstat.data)) { console.error("❌ modwarframestat.json mal formé (attendu: { data: [...] })"); process.exit(1); }

const OF_ENTRIES = Object.entries(S_ofmods);
const WF_ITEMS   = S_wfstat.data;
const EXP_UP     = Array.isArray(S_export?.ExportUpgrades) ? S_export.ExportUpgrades : [];

/* ------------------------ Détecteurs / filtres métier ------------------- */
const isArchonName = (n) => /^archon\b/i.test(String(n||""));

function isArcaneLike(entry){
  if(!entry) return false;
  const name=(entry.name||entry.title||"").toLowerCase();
  const type=(entry.type||entry.tag||"").toLowerCase();
  const cats=Array.isArray(entry.categories)?entry.categories.map(c=>String(c).toLowerCase()):[];
  const slug=(entry.slug||"").toLowerCase();
  return type.includes("arcane") || type.includes("relicsandarcanes") ||
         cats.includes("arcane") || /^arcane\b/.test(name) || slug==="arcane" || slug.startsWith("arcane");
}
function isStanceLike({type,categories}){ const t=String(type||"").toLowerCase(); const cats=Array.isArray(categories)?categories.map(c=>String(c).toLowerCase()):[]; return t.includes("stance") || cats.includes("stance"); }
function isAuraLike({type,name,baseDrain}){ const t=String(type||"").toLowerCase(); const n=String(name||"").toLowerCase(); return t.includes("aura") || /^aura\b/.test(n) || (typeof baseDrain==="number" && baseDrain<0); }
function inferTypeSmart(currentType, compatName, uniqueName){
  const cur=String(currentType||'').toLowerCase(); if(cur && cur!=='mod') return currentType;
  const s=(String(compatName||'')+' '+String(uniqueName||'')).toLowerCase();
  if (/(powersuit|\/mods\/warframe|warframe)/.test(s)) return 'Warframe Mod';
  if (/(archwing|arch-gun|archgun)/.test(s)) return 'Archwing';
  if (/(necramech|mech)/.test(s)) return 'Necramech';
  if (/sentinel/.test(s)) return 'Sentinel';
  if (/parazon/.test(s)) return 'Parazon';
  if (/(\/rifle\/|sniperrifle)/.test(s)) return 'Primary';
  if (/\/shotgun\//.test(s)) return 'Shotgun';
  if (/(\/pistol\/|secondary)/.test(s)) return 'Secondary';
  if (/\/melee\//.test(s)) return 'Melee';
  return currentType || 'Mod';
}

// Exclusions explicites (abilities)
const ABILITY_NAMES_BLACKLIST = new Set([
  "blade storm", "razorwing", "shattered lash", "landslide",
  "cryo grenades", "exalted blade", "serene storm", "whipclaw"
]);
function isAbilityByName(n){ return n && ABILITY_NAMES_BLACKLIST.has(String(n).toLowerCase()); }

// Exclure “Defiled Requiem”, “nan”, “Unfused …”
function isDefiledRequiem(n){ return /\bdefiled\s+requiem\b/i.test(String(n||"")); }
function isNanName(n){ return String(n||"").trim().toLowerCase() === "nan"; }
function isUnfusedLike(n){ return /^\s*unfused\b/i.test(String(n||"")); }

// Exclure écoles de Focus
function isFocusSchoolLike({ name, type, uniqueName }) {
  const n = String(name||"").toLowerCase();
  const t = String(type||"").toLowerCase();
  const u = String(uniqueName||"").toLowerCase();
  if (t.includes("focus")) return true;
  if (u.includes("/focus/") || u.includes("focusability") || u.includes("focustree")) return true;
  if (/\b(amp|affinity|energy|health|shield|armor)\s+spike\b/.test(n)) return true;
  if (/\b(naramon|zenurik|madurai|unairu|vazarin)\b/.test(n) && n.includes("focus")) return true;
  return false;
}

// Exclure Riven mods
function isRivenLike({ name, uniqueName }) {
  const n = String(name||"").toLowerCase();
  const u = String(uniqueName||"").toLowerCase();
  if (n.includes("riven") || n.includes("veiled")) return true;
  if (u.includes("/riven/") || u.includes("rivenmod")) return true;
  return false;
}

// Exclure Beginner
function isBeginnerByUnique(uniqueName) {
  return String(uniqueName||"").toLowerCase().includes("beginner");
}

// Règle "vrai Mod" (assouplie pour éviter d'exclure Abating Link & co)
function isRealMod({ uniqueName, type, name, compatName }) {
  const u = String(uniqueName||"");
  const t = String(type||"");
  const n = String(name||"");
  if (u.includes("/Mods/")) return true;                      // cas nominal
  if (/\bmod\b/i.test(t)) return true;                        // type explicite (Warframe Mod, Melee Mod…)
  if (/\baugment\b/i.test(n) && String(compatName||"")) return true;  // augment ciblé (Trinity, etc.)
  return false; // sinon on considère que ce n’est pas un vrai mod publiable
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
  if (lower.startsWith("ap_")) {
    const code=lower.slice(3);
    if (AP_MAP[code]) return AP_MAP[code];
    UNMAPPED_POLARITIES.add(raw);
    return lower;
  }
  if (ALIAS_MAP[lower]) return ALIAS_MAP[lower];
  UNMAPPED_POLARITIES.add(raw);
  return lower;
}

/* ----------------------- Helpers num./normalisation ---------------------- */
const toNum = (v) => (typeof v==='number'? v : (v!=null && !isNaN(Number(v)) ? Number(v) : undefined));
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
// Autres Archon → impose baseDrain:6 / fusionLimit:10 (on garde leurs levelStats source, tronqués)
["archon-flow","archon-stretch","archon-vitality","archon-continuity"].forEach(s=>OVERRIDES.set(s,{baseDrain:6,fusionLimit:10}));
// Primed Intensify (si besoin)
OVERRIDES.set("primed-intensify",{ fusionLimit:10, polarity:"madurai" });

// Override par uniqueName : Primed Intensify (non disponible en jeu → drops Not available)
const UNIQUE_OVERRIDES = [
  {
    match: (u) => String(u||"") === "/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityStrengthModExpert",
    apply: (m) => {
      m.name = "Primed Intensify";
      m.slug = "primed-intensify";
      m.rarity = "Legendary";
      if (m.fusionLimit == null || m.fusionLimit < 10) m.fusionLimit = 10;
      if (!m.polarity) m.polarity = "madurai";
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

/* --------- Indexation WF : toutes les variantes par nom ------------------ */
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

/* ---- Best-of WF quand doublons (spécial Archon) ------------------------- */
function wfPickBestByHeuristics(candidates, ofName) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const isArchon = isArchonName(ofName || candidates[0]?.name);
  const score = (it) => {
    const fusion = toNum(it?.fusionLimit) ?? -1;
    const base = toNum(it?.baseDrain);
    const lvlLen = Array.isArray(it?.levelStats) ? it.levelStats.length : 0;
    let s = 0;
    s += lvlLen * 100;                          // 1) +levelStats
    s += (fusion >= 0 ? fusion : 0) * 10;       // 2) +fusionLimit
    if (base === 6) s += 5;                     // 3) baseDrain=6 bonus
    if (String(it?.uniqueName||"").toLowerCase().includes("archon")) s += 3;
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
let skippedArcanes=0, skippedNoSlug=0, skippedEmptyCats=0, skippedFocusWay=0, skippedAbility=0, skippedDefiled=0, skippedNan=0, skippedUnfused=0, skippedFocusSchool=0, skippedRiven=0, skippedBeginner=0, skippedNotRealMod=0;

// --- 1) Passe principale : Overframe comme base, enrichi WF/Export
for (const [ofKey, ofObj] of OF_ENTRIES) {
  if (isArcaneLike(ofObj)) { skippedArcanes++; continue; }

  const baseOF = fromOverframe(ofObj);

  const nm = String(baseOF.name || "");
  if (isAbilityByName(nm)) { skippedAbility++; continue; }
  if (isDefiledRequiem(nm)) { skippedDefiled++; continue; }
  if (isNanName(nm)) { skippedNan++; continue; }
  if (isUnfusedLike(nm)) { skippedUnfused++; continue; }

  const kName = baseOF.name ? keyify(baseOF.name) : null;
  const kNameSorted = baseOF.name ? keyifySorted(baseOF.name) : null;

  // WFStat candidats
  let wfRaw = null;
  const wfList =
    (kName && mapWFByName.get(kName)) ? mapWFByName.get(kName) :
    (kNameSorted && mapWFByName.get(kNameSorted)) ? mapWFByName.get(kNameSorted) :
    null;
  if (wfList && wfList.length) wfRaw = wfPickBestByHeuristics(wfList, baseOF.name);

  // Export (fallback)
  let expRaw = null;
  const expByName =
    (kName && mapEXPByName.get(kName)) ? mapEXPByName.get(kName) :
    (kNameSorted && mapEXPByName.get(kNameSorted)) ? mapEXPByName.get(kNameSorted) :
    null;
  if (expByName) expRaw = expByName;

  // réalignement via uniqueName si Export l’apporte
  if (!wfRaw && expRaw?.uniqueName) {
    const wfByU = mapWFByUnique.get(String(expRaw.uniqueName).toLowerCase());
    if (wfByU) wfRaw = wfByU;
  }

  // dé-prime : si OF ne dit pas Primed mais WF pointe un Expert, bascule vers non-Expert
  if (wfRaw?.uniqueName && !/\bprime(d)?\b/i.test(String(baseOF.name||""))) {
    const u = String(wfRaw.uniqueName);
    if (/\/Expert\//.test(u) || /ModExpert/.test(u)) {
      const alt = u.replace(/\/Expert\//, "/").replace(/ModExpert/, "Mod");
      const wfAlt = mapWFByUnique.get(alt.toLowerCase());
      if (wfAlt) wfRaw = wfAlt;
    }
  }

  const WF  = wfRaw ? fromWFStat(wfRaw) : {};
  const EXP = expRaw ? fromExport(expRaw) : {};

  // Merge
  let mergedName = cleanDisplayName(take(baseOF.name, WF?.name, EXP?.name));
  const merged = {
    id: take(baseOF.id),
    slug: take(baseOF.slug),
    name: mergedName,
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

  // OVERRIDES par slug (Archon etc.)
  const tmpSlug = merged.slug || (merged.name ? slugify(merged.name) : null);
  if (tmpSlug && OVERRIDES.has(tmpSlug)) {
    const o = OVERRIDES.get(tmpSlug);
    if (o.baseDrain !== undefined) merged.baseDrain = o.baseDrain;
    if (o.fusionLimit !== undefined) merged.fusionLimit = o.fusionLimit;
    if (o.polarity !== undefined) merged.polarity = normalizePolarity(o.polarity);
    if (o.buildLevelStats) merged.levelStats = o.buildLevelStats();
  }
  // OVERRIDES par uniqueName (Primed Intensify)
  for (const rule of UNIQUE_OVERRIDES) {
    if (rule.match(merged.uniqueName)) rule.apply(merged);
  }

  // isAugment robuste
  const prelimWF = !!WF?.isAugment;
  const byName   = /\baugment\b/i.test(String(merged.name || ""));
  const aura     = isAuraLike({ type: merged.type, name: merged.name, baseDrain: merged.baseDrain });
  const stance   = isStanceLike({ type: merged.type, categories: merged.categories });
  const compat   = String(merged.compatName || "");
  const compatIsGeneric = !compat || /\bwarframe\b/i.test(compat) || /powersuit|player/i.test(compat);
  const isArchon = isArchonName(merged.name);
  merged.isAugment = (prelimWF || byName) && !aura && !stance && !compatIsGeneric && !isArchon;

  // Exclusions supplémentaires: Focus, Riven, Beginner, "vrai Mod"
  if (isFocusSchoolLike({ name: merged.name, type: merged.type, uniqueName: merged.uniqueName })) { skippedFocusSchool++; continue; }
  if (isRivenLike({ name: merged.name, uniqueName: merged.uniqueName })) { skippedRiven++; continue; }
  if (isBeginnerByUnique(merged.uniqueName)) { skippedBeginner++; continue; }
  if (!isRealMod({ uniqueName: merged.uniqueName, type: merged.type, name: merged.name, compatName: merged.compatName })) { skippedNotRealMod++; continue; }

  // Nettoyages + clamp + type
  if (!merged.slug && merged.name) merged.slug = slugify(merged.name);
  merged.levelStats = normalizeLevelStats(merged.levelStats, merged.fusionLimit);
  merged.type = inferTypeSmart(merged.type, merged.compatName, merged.uniqueName);

  // ❌ exclusions fermes
  if (!merged.slug) { skippedNoSlug++; continue; }
  if (!Array.isArray(merged.categories) || merged.categories.length === 0) { skippedEmptyCats++; continue; }
  if (isAbilityByName(merged.name) || isDefiledRequiem(merged.name) || isNanName(merged.name) || isUnfusedLike(merged.name)) continue;

  result.push(merged);
}

// --- 2) Passe “WF-only” : ajouter les mods présents dans WFStat mais pas captés via Overframe
const seenByNameNorm = new Set(result.map(m => keyify(m.name)));
for (const raw of WF_ITEMS) {
  const base = fromWFStat(raw);
  const n = cleanDisplayName(base.name);
  const k = keyify(n);
  if (!n || seenByNameNorm.has(k)) continue; // déjà présent via OF/merge

  // Exclusions globales (avant construction)
  if (isArcaneLike(base)) continue;
  if (isAbilityByName(n)) { skippedAbility++; continue; }
  if (isDefiledRequiem(n)) { skippedDefiled++; continue; }
  if (isNanName(n)) { skippedNan++; continue; }
  if (isUnfusedLike(n)) { skippedUnfused++; continue; }
  if (isFocusSchoolLike({ name: n, type: base.type, uniqueName: base.uniqueName })) { skippedFocusSchool++; continue; }
  if (isRivenLike({ name: n, uniqueName: base.uniqueName })) { skippedRiven++; continue; }
  if (isBeginnerByUnique(base.uniqueName)) { skippedBeginner++; continue; }
  if (!isRealMod({ uniqueName: base.uniqueName, type: base.type, name: n, compatName: base.compatName })) { skippedNotRealMod++; continue; }

  // Construire une entrée cohérente malgré l’absence d’OF
  const merged = {
    id: slugify(n),
    slug: slugify(n),
    name: n,
    categories: ["mod"], // défaut pour passer le filtre "catégories non vide"
    uniqueName: base.uniqueName,

    type: inferTypeSmart(base.type, base.compatName, base.uniqueName),
    rarity: base.rarity,
    polarity: base.polarity,
    compatName: base.compatName,
    baseDrain: base.baseDrain,
    fusionLimit: base.fusionLimit,

    description: base.description,
    wikiaThumbnail: base.wikiaThumbnail,

    isAugment: !!base.isAugment,
    drops: Array.isArray(base.drops) ? base.drops : [],
    levelStats: normalizeLevelStats(base.levelStats, base.fusionLimit),
  };

  // OVERRIDES par slug/uniqueName (Archon/Primed)
  const tmpSlug = merged.slug;
  if (tmpSlug && OVERRIDES.has(tmpSlug)) {
    const o = OVERRIDES.get(tmpSlug);
    if (o.baseDrain !== undefined) merged.baseDrain = o.baseDrain;
    if (o.fusionLimit !== undefined) merged.fusionLimit = o.fusionLimit;
    if (o.polarity !== undefined) merged.polarity = normalizePolarity(o.polarity);
    if (o.buildLevelStats) merged.levelStats = o.buildLevelStats();
  }
  for (const rule of UNIQUE_OVERRIDES) {
    if (rule.match(merged.uniqueName)) rule.apply(merged);
  }

  result.push(merged);
  seenByNameNorm.add(k);
}

/* ---------------------- DÉDOUBLONNAGE FINAL (par nom normalisé) ---------- */
const groups = new Map(); // name_norm -> array
const nameNorm = (n)=> keyify(n||"");
for (const m of result) {
  const k = nameNorm(m.name);
  if (!k) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(m);
}
function scoreMerged(it){
  const lvlLen = Array.isArray(it.levelStats) ? it.levelStats.length : 0;
  const fusion = toNum(it.fusionLimit) ?? -1;
  const base   = toNum(it.baseDrain);
  let s = 0;
  s += lvlLen * 100;
  s += (fusion >= 0 ? fusion : 0) * 10;
  if (base === 6) s += 5;
  if (it.wikiaThumbnail) s += 2;
  return s;
}
const deduped = [];
const duplicates_report = [];
for (const [k, arr] of groups) {
  if (arr.length === 1) { deduped.push(arr[0]); continue; }
  const filtered = arr.filter(m =>
    !isUnfusedLike(m.name) &&
    !isAbilityByName(m.name) &&
    !isDefiledRequiem(m.name) &&
    !isNanName(m.name) &&
    !isFocusSchoolLike({ name: m.name, type: m.type, uniqueName: m.uniqueName }) &&
    !isRivenLike({ name: m.name, uniqueName: m.uniqueName }) &&
    !isBeginnerByUnique(m.uniqueName) &&
    isRealMod({ uniqueName: m.uniqueName, type: m.type, name: m.name, compatName: m.compatName })
  );
  const pool = filtered.length ? filtered : arr;
  pool.sort((a,b)=> scoreMerged(b) - scoreMerged(a));
  deduped.push(pool[0]);
  duplicates_report.push({ key_norm:k, kept: pool[0].name, dropped: pool.slice(1).map(x=>x.name) });
}

/* -------------------------- Filet final / sorties ------------------------ */
const final = deduped.filter((m) =>
  !isArcaneLike(m) &&
  m.slug &&
  Array.isArray(m.categories) && m.categories.length > 0 &&
  !(String(m.type||"").toLowerCase().includes("focus way")) &&
  !isAbilityByName(m.name) &&
  !isDefiledRequiem(m.name) &&
  !isNanName(m.name) &&
  !isUnfusedLike(m.name) &&
  !isFocusSchoolLike({ name: m.name, type: m.type, uniqueName: m.uniqueName }) &&
  !isRivenLike({ name: m.name, uniqueName: m.uniqueName }) &&
  !isBeginnerByUnique(m.uniqueName) &&
  isRealMod({ uniqueName: m.uniqueName, type: m.type, name: m.name, compatName: m.compatName })
);

final.sort((a,b)=> String(a.name).localeCompare(String(b.name)));

fs.mkdirSync(DATA_DIR,{recursive:true});
fs.writeFileSync(OUT_JSON, JSON.stringify(final,null,2), "utf-8");
fs.writeFileSync(OUT_REP,  JSON.stringify({
  total_input_OF: OF_ENTRIES.length,
  total_WF_items: WF_ITEMS.length,
  total_merged_before_dedup: result.length,
  total_output: final.length,
  skipped: {
    arcanes:skippedArcanes, focusWay:skippedFocusWay, focusSchool:skippedFocusSchool,
    riven:skippedRiven, beginner:skippedBeginner, notRealMod:skippedNotRealMod,
    noSlug:skippedNoSlug, emptyCats:skippedEmptyCats,
    ability:skippedAbility, defiledRequiem:skippedDefiled, nan:skippedNan, unfused:skippedUnfused
  },
  deduplicated_groups: duplicates_report.length,
  duplicates_samples: duplicates_report.slice(0, 25),
  unmappedPolarities: Array.from(UNMAPPED_POLARITIES).sort().slice(0, 100)
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