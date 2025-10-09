// tools/enrich_mods.fixed.js
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
  path.join(DATA_DIR, "modwarframestat.json"),
  path.join(DATA_DIR, "modwarframestat(1).json"),
  path.join(DATA_DIR, "wfstat_mods.json"),
  "modwarframestat.json",
  "modwarframestat(1).json"
];

const P_EXPORT = [
  path.join(DATA_DIR, "ExportUpgrades_en.json"),
  path.join(DATA_DIR, "ExportUpgrades_en(1).json"),
  "ExportUpgrades_en.json",
  "ExportUpgrades_en(1).json"
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

/* ---------------------------- Indexation (WF/EXP) ------------------------ */
const mapWFByName = new Map();
const mapWFByUnique = new Map();
for (const it of WF_ITEMS) {
  const n = it?.name; if (n) mapWFByName.set(keyify(n), it);
  const u = it?.uniqueName; if (u) mapWFByUnique.set(String(u).toLowerCase(), it);
}

const mapEXPByName = new Map();
const mapEXPByUnique = new Map();
for (const u of EXP_UP) {
  const n = u?.name || u?.upgradeName || u?.displayName; if (n) mapEXPByName.set(keyify(n), u);
  const un = u?.uniqueName; if (un) mapEXPByUnique.set(String(un).toLowerCase(), u);
}

/* ----------------------- Détection (Arcane / Aura / Stance) -------------- */
function isArcaneLike(entry) {
  if (!entry) return false;
  const name = (entry.name || entry.title || "").toLowerCase();
  const type = (entry.type || entry.tag || "").toLowerCase();
  const cats = Array.isArray(entry.categories) ? entry.categories.map((c) => String(c).toLowerCase()) : [];
  const slug = (entry.slug || "").toLowerCase();
  // Types / catégories
  if (type.includes("arcane")) return true;
  if (type.includes("relicsandarcanes")) return true; // Overframe
  if (cats.includes("arcane")) return true;
  // Noms / slugs
  if (/^arcane/.test(name)) return true;    // "Arcane" seul ou "Arcane XYZ"
  if (slug === "arcane") return true;        // slug strict
  if (slug.startsWith("arcane")) return true; // "arcane-*"
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
  if (/^aura/.test(n)) return true;
  if (typeof baseDrain === "number" && baseDrain < 0) return true;
  return false;
}

/* ----------------------- Détection type intelligente ---------------------- */
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

/* ----------------------- Extracteurs par source -------------------------- */
function fromOverframe(of) {
  // of = { name/title/id/slug/categories, data: {...} }
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

  // Heuristique augment (soft) → seulement si le nom contient "Augment" (évite les faux positifs)
  const isAug = /\baugment\b/i.test(name || "");

  return {
    id: of?.id ?? slug ?? (name ? slugify(name) : undefined),
    name, slug, type, categories,
    rarity, polarity, baseDrain, fusionLimit, compatName,
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
    // description: u?.description || null, // dispo si tu veux
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

  // 1) WFStat match par name, puis par uniqueName si on en détecte un plus tard
  let wfRaw = null;
  if (kName && mapWFByName.has(kName)) wfRaw = mapWFByName.get(kName);

  // 2) ExportUpgrades (fallback)
  let expRaw = null;
  if (kName && mapEXPByName.has(kName)) expRaw = mapEXPByName.get(kName);

  const WF  = wfRaw ? fromWFStat(wfRaw) : {};
  const EXP = expRaw ? fromExport(expRaw) : {};

  // 3) Merge
  const merged = {
    id: take(baseOF.id),
    slug: take(baseOF.slug),
    name: take(WF?.name, EXP?.name, baseOF.name),
    categories: baseOF.categories || [],

    // Expose uniqueName s'il existe (utile côté API)
    uniqueName: take(WF?.uniqueName, EXP?.uniqueName),

    // Champs ⚖️  WF > EXP > OF
    type: take(WF?.type, EXP?.type, baseOF.type),
    rarity: take(WF?.rarity, EXP?.rarity, baseOF.rarity),
    polarity: take(WF?.polarity, EXP?.polarity, baseOF.polarity),
    compatName: take(WF?.compatName, EXP?.compatName, baseOF.compatName),
    baseDrain: take(WF?.baseDrain, EXP?.baseDrain, baseOF.baseDrain),
    fusionLimit: take(WF?.fusionLimit, EXP?.fusionLimit, baseOF.fusionLimit),

    // isAugment plus strict : (WF || nom contient "Augment") ET non Aura/Stance
    isAugment: false,

    drops: Array.isArray(WF?.drops) ? WF.drops : [],
    levelStats: Array.isArray(WF?.levelStats) ? WF.levelStats : [],
  };

  // 4) Calcule isAugment en évitant faux-positifs
  const prelimWF = !!WF?.isAugment;
  const byName   = /\baugment\b/i.test(String(merged.name || ""));
  const aura     = isAuraLike({ type: merged.type, name: merged.name, baseDrain: merged.baseDrain });
  const stance   = isStanceLike({ type: merged.type, categories: merged.categories });
  // Compat générique ? (un augment pointe une frame précise, pas "WARFRAME")
const compat = String(merged.compatName || '');
const compatIsGeneric = !compat || /warframe/i.test(compat) || /powersuit|player/i.test(compat);
// Archon mods ne sont pas des augments
const isArchon = /^archon/i.test(String(merged.name||''));
merged.isAugment = (prelimWF || byName) && !aura && !stance && !compatIsGeneric && !isArchon;

  // 5) Nettoyages
  if (!merged.slug && merged.name) merged.slug = slugify(merged.name);
  // ❌ Règle: pas de slug ⇒ on exclut
  if (!merged.slug) { skippedNoSlug++; continue; }
  // ❌ Règle: slug OK mais categories vide ⇒ on exclut
  if (!Array.isArray(merged.categories) || merged.categories.length === 0) { skippedEmptyCats++; continue; }

  // 5bis) Affine le type si OF a laissé "Mod"
merged.type = inferTypeSmart(merged.type, merged.compatName, merged.uniqueName);

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

// 6) Filet final : retire toute entrée arcane qui aurait survécu (sécurité)
const final = result.filter((m) => !isArcaneLike(m) && m.slug && Array.isArray(m.categories) && m.categories.length > 0);

/* -------------------------- Écriture des sorties ------------------------- */
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
