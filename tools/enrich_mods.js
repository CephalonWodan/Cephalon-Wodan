// tools/enrich_mods.js
// Compacte & fusionne: ExportUpgrades_en.json + modwarframestat.json + overframe-mods.json + overframe-modsets.json + Mods.json
// Sorties: data/enriched_mods.json (compact), data/enriched_mods_report.json (diagnostics), data/enriched_mods.csv

import fs from "fs";
import path from "path";

/* ----------------------------- Fichiers d'entrée ----------------------------- */
const DATA_DIR = path.resolve("data");
const OF_DIR   = path.join(DATA_DIR, "overframe");

const P_EXPORT = path.join(DATA_DIR, "ExportUpgrades_en.json");
const P_WSTAT  = path.join(DATA_DIR, "modwarframestat.json");
const P_OFMODS = path.join(OF_DIR,   "overframe-mods.json");
const P_OFSETS = path.join(OF_DIR,   "overframe-modsets.json");
const P_MODS   = path.join(DATA_DIR, "Mods.json");

/* ----------------------------- Fichiers de sortie ---------------------------- */
const OUT_JSON = path.join(DATA_DIR, "enriched_mods.json");
const OUT_REP  = path.join(DATA_DIR, "enriched_mods_report.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_mods.csv");

/* --------------------------------- Utils ------------------------------------ */
const readIf = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : null;
const asArray = (v) => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);

const clean = (s) => String(s ?? "")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\u00A0/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const lc = (s) => String(s ?? "").toLowerCase();

function keyifyName(name) {
  return clean(name).toLowerCase()
    .replace(/[\s\-–_'"`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return clean(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const POLARITY_MAP = {
  vazarin: "vazarin", madurai: "madurai", naramon: "naramon",
  zenurik: "zenurik", unairu: "unairu",
  "d": "vazarin", "v": "madurai", "=": "naramon", "dash": "zenurik", "u": "unairu",
  "vaz": "vazarin", "mad": "madurai", "nar": "naramon", "zen": "zenurik", "una": "unairu"
};
function normalizePolarity(p) {
  if (!p) return undefined;
  const k = lc(p);
  return POLARITY_MAP[k] || k;
}

function isArcaneByHints(o) {
  const name = lc(o?.name);
  const type = lc(o?.type || o?.tag);
  const cats = (o?.categories || []).map(lc);
  if (/^arcane\b/.test(name) || / arcane\b/.test(name)) return true;
  if (type.includes("arcane")) return true;
  if (cats.includes("arcane")) return true;
  return false;
}

function isAugmentHeuristic({ name, description, compat }) {
  const n = lc(name);
  const d = lc(description || "");
  const c = lc(compat || "");
  if (/\baugment\b/.test(n) || /\baugment\b/.test(d)) return true;
  // Heuristique simple pour mods d'augment de warframes
  if (c && /warframe|trinity|ember|excalibur|volt|mag|mesa|wukong|rhino|saryn|nova|loki|frost|gara|ash|inaros|nezha|nidus|nyx|oberon|harrow|ivara|khora|limbo|vauban|zephyr|equinox|atlas|valkyr|chroma|titania|hydroid|garuda|baruuk|gauss|protea|xaku|yareli|gyre|styanax|voruna|qorvex|dagath|kullervo|sevagoth|revenant|grendel|hildryn|wisp|citrine|qorvex/.test(c)) {
    if (/augment|ability|power|skill|strength|duration|range|efficiency/.test(d)) return true;
  }
  return false;
}

/* ------------------------------- Charger sources ---------------------------- */
const S_export = readIf(P_EXPORT);
const S_wstat  = readIf(P_WSTAT);
const S_ofmods = readIf(P_OFMODS);
const S_ofsets = readIf(P_OFSETS);
const S_mods   = readIf(P_MODS);

const A_export = asArray(S_export);
const A_wstat  = asArray(S_wstat);
const A_ofmods = asArray(S_ofmods);
const A_ofsets = asArray(S_ofsets);
const A_mods   = asArray(S_mods);

/* --------------------------- Indexation par nom clé ------------------------- */
function nameOfExport(u) { return u?.name || u?.upgradeName || u?.displayName || null; }
function nameOfOf(m)     { return m?.name || m?.title || m?.displayName || null; }
function nameOfWstat(m)  { return m?.name || m?.displayName || null; }
function nameOfMods(m)   { return m?.name || m?.title || null; }

const mapExport = new Map();
for (const u of A_export) {
  const n = nameOfExport(u); if (!n) continue;
  mapExport.set(keyifyName(n), u);
}
const mapOfmods = new Map();
for (const m of A_ofmods) {
  const n = nameOfOf(m); if (!n) continue;
  mapOfmods.set(keyifyName(n), m);
}
const mapWstat = new Map();
for (const m of A_wstat) {
  const n = nameOfWstat(m); if (!n) continue;
  mapWstat.set(keyifyName(n), m);
}
const mapMods = new Map();
for (const m of A_mods) {
  const n = nameOfMods(m); if (!n) continue;
  mapMods.set(keyifyName(n), m);
}

/* ------------------------------- Sets (Overframe) --------------------------- */
const setByMod = new Map();
const setMeta  = new Map();
for (const s of A_ofsets) {
  const setName = s?.name || s?.title || s?.setName;
  if (!setName) continue;
  const members = asArray(s.mods || s.members || s.items).map(String);
  for (const m of members) setByMod.set(keyifyName(m), setName);
  setMeta.set(setName, {
    name: setName,
    size: members.length || null,
    bonus: s?.bonus || s?.description || s?.effect || null
  });
}

/* ------------------------------- Union des clés ----------------------------- */
const allKeys = new Set([
  ...mapExport.keys(),
  ...mapOfmods.keys(),
  ...mapWstat.keys(),
  ...mapMods.keys()
]);

/* -------------------------- Extraction des stats ---------------------------- */
function extractStatsFromExport(u) {
  const out = [];
  if (!u) return out;
  const maxRank = u?.maxRank ?? u?.max_level ?? u?.maxLevel ?? undefined;
  const entries = asArray(u.upgradeEntries || u.stats || u.effects || u.values || u.levelStats);
  for (const e of entries) {
    const stat = e?.stat || e?.name || e?.attribute || e?.type || e?.effect;
    if (!stat) continue;
    const type = e?.operation || e?.op || e?.type || "set";
    let values = null;
    if (Array.isArray(e?.values)) values = e.values;
    else if (Array.isArray(e?.levels)) values = e.levels;
    else if (typeof e?.value === "number") values = [e.value];
    else if (typeof e?.value === "string") values = [e.value];

    const row = {
      stat: String(stat),
      type: String(type)
    };
    if (Array.isArray(values)) row.values = values;
    if (typeof e?.rank === "number") row.atRank = e.rank;
    if (typeof maxRank === "number") row.maxRank = maxRank;
    if (e?.unit || e?.suffix) row.unit = e.unit || e.suffix;
    out.push(row);
  }
  return out;
}
function extractLevelStats(src) {
  const levels = asArray(src?.levelStats || src?.levels || src?.rankStats);
  const out = [];
  for (const l of levels) {
    const stats = asArray(l?.stats || l?.description || l?.descriptions || l?.text).map(String);
    if (stats.length) out.push({ stats });
  }
  return out;
}
function extractStatsFromOverframe(m) {
  const out = [];
  if (!m) return out;
  const blocks = asArray(m.stats || m.effects || m.values);
  for (const b of blocks) {
    const stat = b?.stat || b?.name || b?.attribute || b?.type || b?.effect;
    if (!stat) continue;
    const type = b?.operation || b?.op || b?.type || "set";
    let values = null;

    if (Array.isArray(b?.values)) values = b.values;
    else if (Array.isArray(b?.levels)) values = b.levels;
    else if (typeof b?.value === "number") values = [b.value];
    else if (typeof b?.value === "string") values = [b.value];

    const row = { stat: String(stat), type: String(type) };
    if (Array.isArray(values)) row.values = values;
    if (b?.unit || b?.suffix) row.unit = b.unit || b.suffix;
    out.push(row);
  }
  return out;
}

/* -------------------------------- Fusion ----------------------------------- */
const result = [];
const report = [];

for (const k of Array.from(allKeys).sort()) {
  const srcOf   = mapOfmods.get(k);
  const srcExp  = mapExport.get(k);
  const srcStat = mapWstat.get(k);
  const srcMods = mapMods.get(k);

  // Filtrer les Arcanes
  if (isArcaneByHints(srcOf) || isArcaneByHints(srcMods) || /arcane/i.test(srcStat?.type||"")) {
    continue;
  }

  // Nom
  const name = clean(srcOf?.name || srcOf?.title || srcExp?.name || srcExp?.upgradeName || srcStat?.name || srcMods?.name);
  if (!name) continue;
  const id = slugify(name);

  // Compat, Rareté, Type (priorité OF -> Export -> WStat -> Mods)
  const compat = srcOf?.compatName ?? srcOf?.compat ?? srcExp?.Compat ?? srcStat?.compat ?? srcMods?.compat ?? srcMods?.compatName ?? undefined;
  const rarity = srcOf?.rarity ?? srcExp?.Rarity ?? srcStat?.rarity ?? srcMods?.rarity ?? undefined;
  const type   = srcOf?.type ?? srcOf?.tag ?? srcExp?.Type ?? srcStat?.type ?? srcMods?.type ?? undefined;

  // Polarité & Drain
  const polarity    = normalizePolarity(srcOf?.polarity ?? srcOf?.polaritySymbol ?? srcExp?.Polarity ?? srcStat?.polarity ?? srcMods?.polarity);
  const baseDrain   = (srcOf?.baseDrain ?? srcOf?.drain ?? srcExp?.baseDrain ?? srcExp?.drain ?? srcStat?.baseDrain ?? srcMods?.baseDrain);
  const fusionLimit = (srcStat?.fusionLimit ?? srcExp?.maxRank ?? srcExp?.maxLevel ?? srcMods?.fusionLimit);

  // isAugment (heuristique)
  const description = clean(srcOf?.description || srcExp?.description || srcStat?.description || srcMods?.description || "");
  const isAugment = isAugmentHeuristic({ name, description, compat });

  // Stats & levelStats
  const statsExp = extractStatsFromExport(srcExp);
  const statsOf  = extractStatsFromOverframe(srcOf);
  const levelExp = extractLevelStats(srcExp);
  const levelWst = extractLevelStats(srcStat);
  const levelMod = extractLevelStats(srcMods);

  const stats = [...statsExp, ...statsOf];
  const levelStats = [...levelExp, ...levelWst, ...levelMod];

  // Drops (WarframeStat prioritaire)
  let drops = [];
  if (Array.isArray(srcStat?.drops) && srcStat.drops.length) {
    drops = srcStat.drops.map(d => ({
      chance: d.chance ?? d.percent ?? d.probability ?? undefined,
      location: d.location || d.place || d.source || undefined,
      rarity: d.rarity || undefined,
      type: d.type || undefined
    })).filter(x => x.location);
  }

  // Set (Overframe modsets)
  let set = undefined;
  const setName = setByMod.get(k);
  if (setName) {
    const meta = setMeta.get(setName) || { name: setName };
    set = { name: meta.name, size: meta.size ?? undefined, bonus: meta.bonus ?? undefined };
  }

  // Tags / Categories
  const tags = (Array.isArray(srcOf?.tags) && srcOf.tags.length ? srcOf.tags
            : (Array.isArray(srcStat?.tags) && srcStat.tags.length ? srcStat.tags
            : (Array.isArray(srcMods?.tags) && srcMods.tags.length ? srcMods.tags : [])));

  const categories = (Array.isArray(srcOf?.categories) && srcOf.categories.length ? srcOf.categories
                   : (Array.isArray(srcStat?.categories) && srcStat.categories.length ? srcStat.categories
                   : (Array.isArray(srcMods?.categories) && srcMods.categories.length ? srcMods.categories : [])));

  // Objet compact final
  const out = {
    id,              // ident stable (slug)
    name,            // libellé
    type: type || undefined,                 // <-- gardé
    rarity: rarity || undefined,
    polarity: polarity || undefined,
    compat: compat || undefined,
    baseDrain: (typeof baseDrain === "number") ? baseDrain : undefined,
    fusionLimit: (typeof fusionLimit === "number") ? fusionLimit : undefined,
    isAugment: !!isAugment,
    // infos “contenu”
    stats: stats.length ? stats : undefined,
    levelStats: levelStats.length ? levelStats : undefined,
    drops: drops.length ? drops : undefined,
    set,                                     // {name,size,bonus} ou undefined
    tags: tags.length ? tags : undefined,
    categories: categories.length ? categories : undefined
  };

  result.push(out);

  // Report léger
  report.push({
    id, name,
    sources: {
      overframe: !!srcOf,
      export:    !!srcExp,
      warframestat: !!srcStat,
      mods_json: !!srcMods
    },
    has: {
      type: !!out.type,
      rarity: !!out.rarity,
      compat: !!out.compat,
      polarity: !!out.polarity,
      baseDrain: out.baseDrain !== undefined,
      fusionLimit: out.fusionLimit !== undefined,
      stats: !!out.stats,
      levelStats: !!out.levelStats,
      drops: !!out.drops,
      set: !!out.set,
      tags: !!out.tags,
      categories: !!out.categories
    }
  });
}

/* ------------------------------- Sorties ----------------------------------- */
result.sort((a,b)=>a.name.localeCompare(b.name));
fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), "utf-8");
fs.writeFileSync(OUT_REP,  JSON.stringify({
  total: result.length,
  byAugment: {
    true: result.filter(x=>x.isAugment).length,
    false: result.filter(x=>!x.isAugment).length
  },
  missing: {
    type: result.filter(x=>!x.type).length,
    rarity: result.filter(x=>!x.rarity).length,
    compat: result.filter(x=>!x.compat).length,
    polarity: result.filter(x=>!x.polarity).length,
    baseDrain: result.filter(x=>x.baseDrain===undefined).length,
    fusionLimit: result.filter(x=>x.fusionLimit===undefined).length
  }
}, null, 2), "utf-8");

// CSV de survol
const headers = ["id","name","type","rarity","polarity","compat","baseDrain","fusionLimit","isAugment","set","tags","categories"];
const lines = [headers.join(",")];
for (const m of result) {
  const line = [
    m.id, m.name, m.type||"", m.rarity||"", m.polarity||"", m.compat||"",
    (m.baseDrain ?? ""), (m.fusionLimit ?? ""), m.isAugment ? "1":"0",
    (m.set?.name || ""),
    (Array.isArray(m.tags)? m.tags.join("|") : ""),
    (Array.isArray(m.categories)? m.categories.join("|") : "")
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
  lines.push(line);
}
fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

console.log(`OK → ${OUT_JSON} (${result.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);
