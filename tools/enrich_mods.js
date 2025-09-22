// tools/enrich_mods.js
// Fusionne ExportUpgrades_en.json + modwarframestat.json + overframe-mods.json + overframe-modsets.json + Mods.json
// Produit: data/enriched_mods.json, data/enriched_mods_report.json, data/enriched_mods.csv

import fs from "fs";
import path from "path";

// ---------- Utils ----------
const DATA_DIR = path.resolve("data");
const OF_DIR = path.join(DATA_DIR, "overframe");

const P_EXPORT = path.join(DATA_DIR, "ExportUpgrades_en.json");
const P_WSTAT  = path.join(DATA_DIR, "modwarframestat.json");
const P_OFMODS = path.join(OF_DIR,   "overframe-mods.json");
const P_OFSETS = path.join(OF_DIR,   "overframe-modsets.json");
const P_MODS   = path.join(DATA_DIR, "Mods.json");

const OUT_JSON = path.join(DATA_DIR, "enriched_mods.json");
const OUT_REP  = path.join(DATA_DIR, "enriched_mods_report.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_mods.csv");

const asArray = (v) => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);
const readIf = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : null;

const normStr = (s) => String(s ?? "").trim();
const clean = (s) =>
  normStr(s)
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/–/g, "-")
    .replace(/\u00A0/g, " ")
    .trim();

function slugify(s) {
  return clean(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function keyifyName(name) {
  return clean(name).toLowerCase()
    .replace(/[\s\-–_'"`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Merge helper: take first non-empty by priority, record provenance
function takeFirst(dst, srcs, field, srcNames, provenance) {
  for (let i = 0; i < srcs.length; i++) {
    const v = srcs[i]?.[field];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      dst[field] = v;
      provenance[field] = srcNames[i];
      return;
    }
  }
}

// ---------- Charger sources ----------
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

// ---------- Index par nom (clé normalisée) ----------
function nameOfExport(u) {
  return u?.name || u?.upgradeName || u?.displayName || null;
}
function nameOfOf(m) {
  return m?.name || m?.title || m?.displayName || null;
}
function nameOfWstat(m) {
  return m?.name || m?.displayName || null;
}
function nameOfMods(m) {
  return m?.name || m?.title || null;
}

const mapExport = new Map();
for (const u of A_export) {
  const n = nameOfExport(u);
  if (!n) continue;
  mapExport.set(keyifyName(n), u);
}

const mapOfmods = new Map();
for (const m of A_ofmods) {
  const n = nameOfOf(m);
  if (!n) continue;
  mapOfmods.set(keyifyName(n), m);
}

const mapWstat = new Map();
for (const m of A_wstat) {
  const n = nameOfWstat(m);
  if (!n) continue;
  mapWstat.set(keyifyName(n), m);
}

const mapMods = new Map();
for (const m of A_mods) {
  const n = nameOfMods(m);
  if (!n) continue;
  mapMods.set(keyifyName(n), m);
}

// ---------- Sets: mod -> set meta ----------
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

// ---------- Union des noms ----------
const allKeys = new Set([
  ...mapExport.keys(),
  ...mapOfmods.keys(),
  ...mapWstat.keys(),
  ...mapMods.keys()
]);

// ---------- Extraction des stats ----------
function extractStatsFromExport(u) {
  // ExportUpgrades a souvent une structure: { name, rank, stats/effects/upgradeEntries... }
  // On normalise en [{stat, type, values, atRank, maxRank, unit?}]
  const out = [];
  if (!u) return out;

  const maxRank = u?.maxRank ?? u?.max_level ?? u?.maxLevel ?? null;
  const entries = asArray(u.upgradeEntries || u.stats || u.effects || u.values || u.levelStats);
  for (const e of entries) {
    // différents schémas possibles
    const stat = e?.stat || e?.name || e?.attribute || e?.type || e?.effect;
    if (!stat) continue;
    const type = e?.operation || e?.op || e?.type || "set";
    let values = null;

    if (Array.isArray(e?.values)) values = e.values;
    else if (Array.isArray(e?.levels)) values = e.levels;
    else if (typeof e?.value === "number") values = [e.value];
    else if (typeof e?.value === "string") values = [e.value];

    out.push({
      stat: String(stat),
      type: String(type),
      values: Array.isArray(values) ? values : undefined,
      atRank: (typeof e?.rank === "number") ? e.rank : undefined,
      maxRank: (typeof maxRank === "number") ? maxRank : undefined,
      unit: e?.unit || e?.suffix || undefined
    });
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

    out.push({
      stat: String(stat),
      type: String(type),
      values: Array.isArray(values) ? values : undefined,
      unit: b?.unit || b?.suffix || undefined
    });
  }
  return out;
}

// ---------- Fusion principale ----------
const result = [];
const report = [];

for (const k of Array.from(allKeys).sort()) {
  const srcOf   = mapOfmods.get(k);
  const srcExp  = mapExport.get(k);
  const srcStat = mapWstat.get(k);
  const srcMods = mapMods.get(k);

  // Nom (priorité Overframe -> Export -> WStat -> Mods)
  const name = clean(srcOf?.name || srcOf?.title || srcExp?.name || srcExp?.upgradeName || srcStat?.name || srcMods?.name);
  if (!name) continue; // Skip si impossible
  const slug = slugify(name);
  const provenance = {};

  const out = { id: slug, name, slug };

  // Description
  takeFirst(out,
    [srcOf, srcExp, srcStat, srcMods],
    "description",
    ["overframe", "export", "warframestat", "mods.json"],
    provenance
  );
  // Rareté
  takeFirst(out,
    [srcOf, srcExp, srcStat, srcMods],
    "rarity",
    ["overframe", "export", "warframestat", "mods.json"],
    provenance
  );
  // Polarité (polarity/polaritySymbol)
  takeFirst(out,
    [{polarity: srcOf?.polarity ?? srcOf?.polaritySymbol}, srcExp, srcStat, srcMods],
    "polarity",
    ["overframe", "export", "warframestat", "mods.json"],
    provenance
  );
  // Drain (drain/baseDrain)
  takeFirst(out,
    [{drain: srcOf?.baseDrain ?? srcOf?.drain}, srcExp, srcStat, srcMods],
    "drain",
    ["overframe", "export", "warframestat", "mods.json"],
    provenance
  );
  // Type / Tag
  const typeCandidate = srcOf?.type ?? srcOf?.tag ?? srcExp?.Type ?? srcStat?.type ?? srcMods?.type;
  if (typeCandidate) { out.type = typeCandidate; provenance.type = (srcOf?.type || srcOf?.tag) ? "overframe" : (srcExp?.Type ? "export" : (srcStat?.type ? "warframestat" : "mods.json")); }

  // Compat (compatName/compat)
  const compatCandidate = srcOf?.compatName ?? srcOf?.compat ?? srcExp?.Compat ?? srcStat?.compat ?? srcMods?.compat;
  if (compatCandidate) { out.compat = compatCandidate; provenance.compat = (srcOf?.compatName || srcOf?.compat) ? "overframe" : (srcExp?.Compat ? "export" : (srcStat?.compat ? "warframestat" : "mods.json")); }

  // Tags / Categories
  const tags = Array.isArray(srcOf?.tags) ? srcOf.tags : (Array.isArray(srcStat?.tags) ? srcStat.tags : (Array.isArray(srcMods?.tags) ? srcMods.tags : null));
  if (tags) { out.tags = tags; provenance.tags = (Array.isArray(srcOf?.tags) ? "overframe" : (Array.isArray(srcStat?.tags) ? "warframestat" : "mods.json")); }
  const cat = Array.isArray(srcOf?.categories) ? srcOf.categories : (Array.isArray(srcStat?.categories) ? srcStat.categories : (Array.isArray(srcMods?.categories) ? srcMods.categories : null));
  if (cat) { out.categories = cat; provenance.categories = (Array.isArray(srcOf?.categories) ? "overframe" : (Array.isArray(srcStat?.categories) ? "warframestat" : "mods.json")); }

  // Augment ?
  const isAug = /augment/i.test(out.name) || /augment/i.test(String(out.description||""));
  out.isAugment = !!isAug;
  provenance.isAugment = "derived";

  // Set membership
  const setName = setByMod.get(k);
  if (setName) {
    out.set = setMeta.get(setName) || { name: setName };
    provenance.set = "overframe-modsets";
  }

  // Stats (merge export + overframe)
  const statsExp = extractStatsFromExport(srcExp);
  const statsOf  = extractStatsFromOverframe(srcOf);
  let stats = [];
  if (statsExp.length && statsOf.length) {
    // simple concat; on pourrait dédupliquer par (stat,type)
    stats = [...statsExp, ...statsOf];
    provenance.stats = "export|overframe";
  } else if (statsExp.length) {
    stats = statsExp; provenance.stats = "export";
  } else if (statsOf.length) {
    stats = statsOf; provenance.stats = "overframe";
  }
  if (stats.length) out.stats = stats;

  // Source globale la plus contributive (pour info)
  const score = {
    overframe: 0, export: 0, warframestat: 0, "mods.json": 0, "overframe-modsets": 0
  };
  for (const [f, src] of Object.entries(provenance)) {
    if (score[src] !== undefined) score[src] += 1;
    if (src.includes("|")) src.split("|").forEach(s => { if (score[s]!==undefined) score[s]+=1; });
  }
  let topSrc = Object.entries(score).sort((a,b)=>b[1]-a[1])[0][0];
  out.source = { ...provenance, name: topSrc };

  result.push(out);
  report.push({ slug, name: out.name, provenance, mergedFrom: {
    overframe: !!srcOf, export: !!srcExp, warframestat: !!srcStat, mods_json: !!srcMods
  }});
}

// ---------- Tri stable + sorties ----------
result.sort((a,b)=>a.name.localeCompare(b.name));
fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), "utf-8");
fs.writeFileSync(OUT_REP,  JSON.stringify(report,  null, 2), "utf-8");

// CSV rapide
const headers = ["id","name","rarity","polarity","drain","type","compat","isAugment","set.name","set.size"];
const lines = [headers.join(",")];
for (const m of result) {
  const line = [
    m.id, m.name, m.rarity||"", m.polarity||"", m.drain??"", m.type||"", m.compat||"",
    m.isAugment ? "1":"0", m.set?.name||"", m.set?.size??""
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
  lines.push(line);
}
fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

console.log(`OK → ${OUT_JSON} (${result.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);
