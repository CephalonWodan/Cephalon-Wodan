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
  "overframe-mods.json"
];

const P_WFSTAT = [
  path.join(DATA_DIR, "modwarframestat.json")
];

const P_EXPORT = [
  path.join(DATA_DIR, "ExportUpgrades_en.json")
];

const P_OFSETS = [
  path.join(OF_DIR, "overframe-modsets.json"),
  path.join(DATA_DIR, "overframe-modsets.json"),
  "overframe-modsets.json"
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
  return clean(name)
    .toLowerCase()
    .replace(/<[^>]+>/g, "")      // enlève balises genre <ARCHWING>
    .replace(/\([^)]*\)/g, "")    // enlève () fréquents
    .replace(/[\-–_'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return clean(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* -------------------------- Charger les 4 sources ------------------------ */
const S_ofmods = readFirstExisting(P_OFMODS);    // dict
const S_wfstat = readFirstExisting(P_WFSTAT);    // { data: [...] }
const S_export = readFirstExisting(P_EXPORT);    // { ExportUpgrades: [...] } (optionnel)
const S_ofsets = readFirstExisting(P_OFSETS);    // dict (bonus de set)

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

// Index WFStat par nom
const mapWF = new Map();
for (const it of WF_ITEMS) {
  const n = it?.name;
  if (!n) continue;
  mapWF.set(keyify(n), it);
}

// Index ExportUpgrades par nom (si on veut l’utiliser plus tard)
const mapEXP = new Map();
for (const u of EXP_UP) {
  const n = u?.name || u?.upgradeName || u?.displayName;
  if (!n) continue;
  mapEXP.set(keyify(n), u);
}

/* ----------------------- Extracteurs par source -------------------------- */
function fromOverframe(of) {
  // of = { name/title/id/slug/categories, data: {...} }
  const name = of?.name || of?.title || null;
  const slug = of?.slug || (name ? slugify(name) : null);

  const d = of?.data || {};
  // Les clés vues dans tes JSON :
  // Rarity, RarityName, ArtifactPolarity (ou Polarity), BaseDrain, FusionLimit, ItemCompatibility
  const rarity     = d.RarityName || d.Rarity || null;
  const polarity   = d.ArtifactPolarity || d.Polarity || null;
  const baseDrain  = d.BaseDrain ?? d.baseDrain ?? null;
  const fusionLimit= d.FusionLimit ?? d.fusionLimit ?? null;
  const compatName = d.ItemCompatibility || d.Compat || null;

  // Type côté OF : pas toujours présent proprement => on tombe back sur "Mod" si rien
  const type = of?.type || of?.tag || d.WCategoryName || "Mod";

  // Catégories
  const categories = Array.isArray(of?.categories) ? of.categories : (of?.category ? [of.category] : []);

  // Heuristique augment
  const isAug = /augment/i.test(name || "") || /augment/i.test(String(of?.description || ""));

  return {
    id: of?.id ?? slug ?? (name ? slugify(name) : undefined),
    name, slug, type, categories,
    rarity, polarity, baseDrain, fusionLimit, compatName,
    isAugment: isAug
  };
}

function fromWFStat(w) {
  return {
    type: w?.type || null,
    rarity: w?.rarity || null,
    polarity: w?.polarity || null,
    baseDrain: w?.baseDrain ?? null,
    fusionLimit: w?.fusionLimit ?? null,
    compatName: w?.compatName || null,
    isAugment: !!w?.isAugment,
    drops: Array.isArray(w?.drops) ? w.drops : [],
    levelStats: Array.isArray(w?.levelStats) ? w.levelStats : []
  };
}

function fromExport(u) {
  if (!u) return {};
  // On pourrait extraire des stats alternatives ici si besoin
  return {};
}

/* ------------------------- Merge champ par champ ------------------------- */
function take(...vals) {
  // renvoie la 1ère valeur non vide/undefined/null/""
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v) !== "") return v;
  }
  return undefined;
}

/* ------------------------------ Fusion globale --------------------------- */
const result = [];
const report = [];

for (const [ofKey, ofObj] of OF_ENTRIES) {
  const baseOF = fromOverframe(ofObj);
  const k = baseOF.name ? keyify(baseOF.name) : null;

  let WF = null;
  if (k && mapWF.has(k)) WF = fromWFStat(mapWF.get(k));
  // sinon: pas de match WFStat → on restera avec Overframe seul

  // ExportUpgrades en option (pas utilisé ici si WFStat existe déjà pour levelStats)
  const EXP = (k && mapEXP.has(k)) ? fromExport(mapEXP.get(k)) : {};

  // Merge
  const out = {
    id: take(baseOF.id),                 // tu voulais l'id Overframe en priorité
    slug: take(baseOF.slug),
    name: take(baseOF.name),
    categories: baseOF.categories || [],
    type: take(WF?.type, baseOF.type),   // WFStat > OF
    rarity: take(WF?.rarity, baseOF.rarity),
    polarity: take(WF?.polarity, baseOF.polarity),
    compatName: take(WF?.compatName, baseOF.compatName),
    baseDrain: take(WF?.baseDrain, baseOF.baseDrain),
    fusionLimit: take(WF?.fusionLimit, baseOF.fusionLimit),
    isAugment: take(WF?.isAugment, baseOF.isAugment, false),
    drops: WF?.drops || [],
    levelStats: WF?.levelStats || []
  };

  // nettoyage minimal
  if (!out.slug && out.name) out.slug = slugify(out.name);

  result.push(out);
  report.push({
    key: ofKey,
    name: out.name,
    matchedWFStat: !!WF,
    hasLevelStats: (out.levelStats || []).length > 0,
    hasDrops: (out.drops || []).length > 0
  });
}

/* -------------------------- Écriture des sorties ------------------------- */
result.sort((a,b) => String(a.name).localeCompare(String(b.name)));

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), "utf-8");
fs.writeFileSync(OUT_REP,  JSON.stringify({
  total: result.length,
  wfMatches: report.filter(r => r.matchedWFStat).length,
  samples: report.slice(0, 20)
}, null, 2), "utf-8");

// CSV
const headers = [
  "id","slug","name","type","categories","rarity","polarity",
  "compatName","baseDrain","fusionLimit","isAugment","dropsCount","levelsCount"
];
const lines = [headers.join(",")];
for (const m of result) {
  const row = [
    m.id, m.slug, m.name, m.type,
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

console.log(`OK → ${OUT_JSON} (${result.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);