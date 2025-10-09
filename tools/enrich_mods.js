// tools/enrich_mods.js
// Merge des mods depuis :
// - Overframe:  overframe-mods.json  (dict, infos dans "data.*")
// - WFStat:     modwarframestat.json (objet avec .data = array)
// - (optionnel) ExportUpgrades_en.json (objet avec .ExportUpgrades = array)
// Sorties:
//   data/enriched_mods.json
//   data/enriched_mods_report.json
//   data/enriched_mods.csv

import fs from "fs";
import path from "path";

/* ------------------------------ Helpers FS ------------------------------- */
const DATA_DIR = path.resolve("data");
const OF_DIR   = path.join(DATA_DIR, "overframe");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}
function readFirstExisting(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return readJson(p);
  }
  return null;
}

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

const P_OFSETS = [
  path.join(OF_DIR, "overframe-modsets.json"),
  path.join(DATA_DIR, "overframe-modsets.json"),
  "overframe-modsets.json",
];

const OUT_JSON = path.join(DATA_DIR, "enriched_mods.json");
const OUT_REP  = path.join(DATA_DIR, "enriched_mods_report.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_mods.csv");

/* ------------------------------ Normalisation ---------------------------- */
const normStr = (s) => String(s ?? "").trim();
const clean = (s) =>
  normStr(s)
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/–/g, "-")
    .replace(/\u00A0/g, " ")
    .trim();

function keyify(name) {
  // ⚠️ on garde le CONTENU entre parenthèses (Primed/Umbral/Archon…),
  // on retire uniquement les caractères ()
  return clean(name)
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[()]/g, " ")
    .replace(/[\-–_'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function keyifySorted(name) {
  const k = keyify(name);
  return k.split(" ").filter(Boolean).sort().join(" ");
}

function slugify(s) {
  return clean(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* -------------------------- Charger les sources -------------------------- */
const S_ofmods = readFirstExisting(P_OFMODS);    // dict
const S_wfstat = readFirstExisting(P_WFSTAT);    // { data: [...] }
const S_export = readFirstExisting(P_EXPORT);    // { ExportUpgrades: [...] } (optionnel)
const S_ofsets = readFirstExisting(P_OFSETS);    // dict (bonus de set) — non utilisé ici

if (!S_ofmods) {
  console.error("❌ overframe-mods.json introuvable dans:", P_OFMODS.join(", "));
  process.exit(1);
}
if (!S_wfstat || !Array.isArray(S_wfstat.data)) {
  console.error("❌ modwarframestat.json introuvable ou mal formé (attendu: { data: [...] })");
  process.exit(1);
}

// Structures utilisables
const OF_ENTRIES = Object.entries(S_ofmods); // [ [pathKey, ofObj], ... ]
const WF_ITEMS   = S_wfstat.data;
const EXP_UP     = Array.isArray(S_export?.ExportUpgrades) ? S_export.ExportUpgrades : [];

/* ---------------------------- Indexation (WF/EXP) ------------------------ */
const mapWFByName = new Map();
const mapWFByUnique = new Map();
for (const it of WF_ITEMS) {
  const n = it?.name;
  if (n) {
    const k1 = keyify(n);
    const k2 = keyifySorted(n);
    mapWFByName.set(k1, it);
    mapWFByName.set(k2, it);
  }
  const u = it?.uniqueName; if (u) mapWFByUnique.set(String(u).toLowerCase(), it);
}

const mapEXPByName = new Map();
const mapEXPByUnique = new Map();
for (const u of EXP_UP) {
  const n = u?.name || u?.upgradeName || u?.displayName;
  if (n) {
    const k1 = keyify(n);
    const k2 = keyifySorted(n);
    mapEXPByName.set(k1, u);
    mapEXPByName.set(k2, u);
  }
  const un = u?.uniqueName; if (un) mapEXPByUnique.set(String(un).toLowerCase(), u);
}

/* ------------------------ Heuristiques / détecteurs ---------------------- */
function isArcaneLike(entry) {
  if (!entry) return false;
  const name = (entry.name || entry.title || "").toLowerCase();
  const type = (entry.type || entry.tag || "").toLowerCase();
  const cats = Array.isArray(entry.categories) ? entry.categories.map((c) => String(c).toLowerCase()) : [];
  const slug = (entry.slug || "").toLowerCase();
  if (type.includes("arcane")) return true;
  if (type.includes("relicsandarcanes")) return true; // Overframe
  if (cats.includes("arcane")) return true;
  if (/^arcane\b/.test(name)) return true;    // "Arcane" ou "Arcane XYZ"
  if (slug === "arcane") return true;         // slug strict
  if (slug.startsWith("arcane")) return true; // "arcane" ou "arcane-*"
  return false;
}
function isStanceLike({ type, categories }) {
  const t = String(type||"").toLowerCase();
  const cats = Array.isArray(categories) ? categories.map((c)=>String(c).toLowerCase()) : [];
  return t.includes("stance") || cats.includes("stance");
}
function isAuraLike({ type, name, baseDrain }) {
  const t = String(type||"").toLowerCase();
  const n = String(name||"").toLowerCase();
  if (t.includes("aura")) return true;
  if (/^aura\b/.test(n)) return true;
  if (typeof baseDrain === "number" && baseDrain < 0) return true; // drain négatif typique
  return false;
}

// Type plus précis quand OF a laissé "Mod"
function inferTypeSmart(currentType, compatName, uniqueName) {
  const cur = String(currentType || '').toLowerCase();
  if (cur && cur !== 'mod') return currentType; // déjà spécifique
  const s = (String(compatName || '') + ' ' + String(uniqueName || '')).toLowerCase();
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

// Helpers numériques
const toNum = (v) => (typeof v === 'number' ? v : (v!==undefined && v!==null && !isNaN(Number(v)) ? Number(v) : undefined));
const chooseFusionLimit = (...vals) => {
  const nums = vals.map(toNum).filter((x)=>Number.isFinite(x));
  return nums.length ? Math.min(...nums) : undefined;
};
const normalizeLevelStats = (levelStats, fusionLimit) => {
  const list = Array.isArray(levelStats) ? levelStats : [];
  const max = Number.isFinite(fusionLimit) ? (fusionLimit + 1) : list.length;
  return list.slice(0, max);
};

/* ----------------------- Extracteurs par source -------------------------- */
function fromOverframe(of) {
  const name = of?.name || of?.title || null;
  const slug = of?.slug || (name ? slugify(name) : null);

  const d = of?.data || {};
  const rarity      = d.RarityName || d.Rarity || null;
  const polarity    = d.ArtifactPolarity || d.Polarity || null;
  const baseDrain   = d.BaseDrain ?? d.baseDrain ?? null;
  const fusionLimit = d.FusionLimit ?? d.fusionLimit ?? null;
  const compatName  = d.ItemCompatibility || d.Compat || null;

  const type = of?.type || of?.tag || d.WCategoryName || "Mod";
  const categories = Array.isArray(of?.categories) ? of.categories : (of?.category ? [of.category] : []);

  const description = of?.description || d?.Description || null;

  // Heuristique augment (soft) → uniquement si le nom contient "Augment"
  const isAug = /\baugment\b/i.test(name || "");

  return {
    id: of?.id ?? slug ?? (name ? slugify(name) : undefined),
    name, slug, type, categories,
    rarity, polarity, baseDrain, fusionLimit, compatName,
    description,
    isAugment: isAug,
  };
}

function fromWFStat(w) {
  return {
    name: w?.name || null,
    uniqueName: w?.uniqueName || null,
    type: w?.type || null,
    rarity: w?.rarity || null,
    polarity: w?.polarity || null,
    baseDrain: w?.baseDrain ?? null,
    fusionLimit: w?.fusionLimit ?? null,
    compatName: w?.compatName || null,
    description: w?.description || null,
    isAugment: !!w?.isAugment,
    drops: Array.isArray(w?.drops) ? w.drops : [],
    levelStats: Array.isArray(w?.levelStats) ? w.levelStats : [],
  };
}

function fromExport(u) {
  if (!u) return {};
  return {
    name: u?.name || u?.upgradeName || u?.displayName || null,
    uniqueName: u?.uniqueName || null,
    type: u?.type || null,
    rarity: u?.rarity || null,
    polarity: u?.polarity || null,
    baseDrain: u?.baseDrain ?? null,
    fusionLimit: u?.fusionLimit ?? null,
    compatName: u?.compatName || null,
    description: u?.description || null,
  };
}

/* --------------------------- Fusion champ par champ ---------------------- */
function take(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v) !== "") return v;
  }
  return undefined;
}

/* ------------------------------ Fusion globale --------------------------- */
const result = [];
const report = [];
let skippedArcanes = 0, skippedNoSlug = 0, skippedEmptyCats = 0;

for (const [ofKey, ofObj] of OF_ENTRIES) {
  // 0) Skip Arcanes très tôt
  if (isArcaneLike(ofObj)) { skippedArcanes++; continue; }

  const baseOF = fromOverframe(ofObj);
  const kName = baseOF.name ? keyify(baseOF.name) : null;
  const kNameSorted = baseOF.name ? keyifySorted(baseOF.name) : null;

  // 1) WFStat match par name (k et k trié)
  let wfRaw = null;
  if (kName && mapWFByName.has(kName)) wfRaw = mapWFByName.get(kName);
  if (!wfRaw && kNameSorted && mapWFByName.has(kNameSorted)) wfRaw = mapWFByName.get(kNameSorted);

  // 2) ExportUpgrades (fallback)
  let expRaw = null;
  if (kName && mapEXPByName.has(kName)) expRaw = mapEXPByName.get(kName);
  if (!expRaw && kNameSorted && mapEXPByName.has(kNameSorted)) expRaw = mapEXPByName.get(kNameSorted);

  // 2-bis) Ré-alignement WF via uniqueName si Export l’apporte
  if (expRaw?.uniqueName) {
    const wfByU = mapWFByUnique.get(String(expRaw.uniqueName).toLowerCase());
    if (wfByU) wfRaw = wfByU;
  }

  // 2-ter) Dé-prime si OF n’indique pas Prime(d) mais WF pointe un Expert
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

  // 3) Merge
  const merged = {
    id: take(baseOF.id),
    slug: take(baseOF.slug),

    // ⚠️ garder le nom Overframe en priorité (préserve “Primed/Umbral/Archon …”)
    name: take(baseOF.name, WF?.name, EXP?.name),

    categories: baseOF.categories || [],

    // expose uniqueName (utile côté API)
    uniqueName: take(WF?.uniqueName, EXP?.uniqueName),

    // WF > EXP > OF
    type: take(WF?.type, EXP?.type, baseOF.type),
    rarity: take(WF?.rarity, EXP?.rarity, baseOF.rarity),
    polarity: take(WF?.polarity, EXP?.polarity, baseOF.polarity),
    compatName: take(WF?.compatName, EXP?.compatName, baseOF.compatName),
    baseDrain: take(WF?.baseDrain, EXP?.baseDrain, baseOF.baseDrain),
    fusionLimit: chooseFusionLimit(WF?.fusionLimit, EXP?.fusionLimit, baseOF.fusionLimit),

    description: take(WF?.description, EXP?.description, baseOF.description),

    isAugment: false,
    drops: Array.isArray(WF?.drops) ? WF.drops : [],
    levelStats: Array.isArray(WF?.levelStats) ? WF.levelStats : [],
  };

  // 4) isAugment robuste
  const prelimWF = !!WF?.isAugment;
  const byName   = /\baugment\b/i.test(String(merged.name || ""));
  const aura     = isAuraLike({ type: merged.type, name: merged.name, baseDrain: merged.baseDrain });
  const stance   = isStanceLike({ type: merged.type, categories: merged.categories });
  const compat   = String(merged.compatName || "");
  const compatIsGeneric = !compat || /\bwarframe\b/i.test(compat) || /powersuit|player/i.test(compat);
  const isArchon = /^archon\b/i.test(String(merged.name || ""));
  merged.isAugment = (prelimWF || byName) && !aura && !stance && !compatIsGeneric && !isArchon;

  // 5) Nettoyages
  if (!merged.slug && merged.name) merged.slug = slugify(merged.name);

  // clamp des levelStats au fusionLimit (évite 11 rangs fantômes)
  merged.levelStats = normalizeLevelStats(merged.levelStats, merged.fusionLimit);

  // type plus précis si OF a mis "Mod"
  merged.type = inferTypeSmart(merged.type, merged.compatName, merged.uniqueName);

  // ❌ règles d’exclusion demandées
  if (!merged.slug) { skippedNoSlug++; continue; }
  if (!Array.isArray(merged.categories) || merged.categories.length === 0) { skippedEmptyCats++; continue; }

  result.push(merged);

  report.push({
    key: ofKey,
    name: merged.name,
    matchedWFStat: !!wfRaw,
    matchedExport: !!expRaw,
    hasLevelStats: (merged.levelStats || []).length > 0,
    hasDrops: (merged.drops || []).length > 0,
  });
}

/* ----------------- Backfill : WFStat non présents dans Overframe --------- */
// (utile pour faire apparaître des Primed/Umbral si absents d'OF)
const seenUnique = new Set(result.map(m => String(m.uniqueName||'').toLowerCase()).filter(Boolean));
for (const w of WF_ITEMS) {
  const u = String(w?.uniqueName||'').toLowerCase();
  if (!u || seenUnique.has(u)) continue;

  // Évite les Arcanes
  if (isArcaneLike({ name: w?.name, type: w?.type, slug: slugify(w?.name||''), categories: [] })) continue;

  const expByU = mapEXPByUnique.get(u);
  const WF = fromWFStat(w);
  const EXP = fromExport(expByU);

  const merged = {
    id: slugify(EXP?.name || WF?.name || u.split('/').pop()),
    slug: slugify(EXP?.name || WF?.name || u.split('/').pop()),
    name: take(EXP?.name, WF?.name),
    categories: [], // pas d’info OF
    uniqueName: u,
    type: take(WF?.type, EXP?.type, 'Mod'),
    rarity: take(WF?.rarity, EXP?.rarity),
    polarity: take(WF?.polarity, EXP?.polarity),
    compatName: take(WF?.compatName, EXP?.compatName),
    baseDrain: take(WF?.baseDrain, EXP?.baseDrain),
    fusionLimit: chooseFusionLimit(WF?.fusionLimit, EXP?.fusionLimit),
    description: take(WF?.description, EXP?.description),
    isAugment: !!WF?.isAugment,
    drops: WF?.drops || [],
    levelStats: normalizeLevelStats(WF?.levelStats || [], chooseFusionLimit(WF?.fusionLimit, EXP?.fusionLimit)),
  };

  merged.type = inferTypeSmart(merged.type, merged.compatName, merged.uniqueName);

  // respect des règles d’exclusion
  if (!merged.slug) continue;
  if (!Array.isArray(merged.categories) || merged.categories.length === 0) continue;

  result.push(merged);
  seenUnique.add(u);
}

/* -------------------------- Filet final / sorties ------------------------ */
const final = result.filter((m) =>
  !isArcaneLike(m) &&
  m.slug &&
  Array.isArray(m.categories) && m.categories.length > 0
);

final.sort((a,b) => String(a.name).localeCompare(String(b.name)));

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(final, null, 2), "utf-8");
fs.writeFileSync(OUT_REP,  JSON.stringify({
  total_input: OF_ENTRIES.length,
  skippedArcanes,
  skippedNoSlug,
  skippedEmptyCats,
  total_output: final.length,
  wfMatches: report.filter(r => r.matchedWFStat).length,
  expMatches: report.filter(r => r.matchedExport).length,
  samples: report.slice(0, 20)
}, null, 2), "utf-8");

// CSV
const headers = [
  "id","slug","name","uniqueName","type","categories","rarity","polarity",
  "compatName","baseDrain","fusionLimit","isAugment","dropsCount","levelsCount"
];
const lines = [headers.join(",")];
for (const m of final) {
  const row = [
    m.id, m.slug, m.name, m.uniqueName, m.type,
    (m.categories||[]).join("|"),
    m.rarity, m.polarity, m.compatName,
    m.baseDrain ?? "", m.fusionLimit ?? "",
    m.isAugment ? "1" : "0",
    Array.isArray(m.drops) ? m.drops.length : 0,
    Array.isArray(m.levelStats) ? m.levelStats.length : 0
  ].map(v => `"${String(v??"").replace(/"/g,'""')}"`).join(",");
  lines.push(row);
}
fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

console.log(`OK → ${OUT_JSON} (${final.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);
