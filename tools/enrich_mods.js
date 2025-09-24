// tools/enrich_mods.js (V6)
// Fusionne: ExportUpgrades_en.json + modwarframestat.json + overframe-mods.json + overframe-modsets.json + Mods.json
// Sorties: data/enriched_mods.json, data/enriched_mods.csv, data/enriched_mods_report.json

import fs from "fs";
import path from "path";

/* ---------------------------------- IO ---------------------------------- */
const DATA_DIR = path.resolve("data");
const OF_DIR   = path.join(DATA_DIR, "overframe");

const P_EXPORT = path.join(DATA_DIR, "ExportUpgrades_en.json");  // DE
const P_WSTAT  = path.join(DATA_DIR, "modwarframestat.json");    // WarframeStat (EN)
const P_OFMODS = path.join(OF_DIR,   "overframe-mods.json");     // Overframe mods
const P_OFSETS = path.join(OF_DIR,   "overframe-modsets.json");  // Overframe mod sets
const P_MODS   = path.join(DATA_DIR, "Mods.json");               // éventuel fallback

const OUT_JSON = path.join(DATA_DIR, "enriched_mods.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_mods.csv");
const OUT_REP  = path.join(DATA_DIR, "enriched_mods_report.json");

/* -------------------------------- Utils --------------------------------- */
const readIf = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : null);
const asArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];

const normStr = (s) => String(s ?? "").trim();
const clean = (s) =>
  normStr(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/–/g, "-")
    .trim();

const keyify = (name) =>
  clean(name)
    .toLowerCase()
    .replace(/[\s\-–_'"`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (s) =>
  clean(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

const POLARITY_MAP = new Map([
  ["madurai", "madurai"],
  ["v", "madurai"],
  ["naramon", "naramon"],
  ["dash", "naramon"],
  ["zenurik", "zenurik"],
  ["d", "zenurik"],
  ["vazarin", "vazarin"],
  ["bar", "vazarin"],
  ["unairu", "unairu"],
  ["umbra", "umbra"], // au cas où
]);

const normPolarity = (p) => {
  const s = String(p ?? "").toLowerCase().trim();
  if (!s) return undefined;
  if (POLARITY_MAP.has(s)) return POLARITY_MAP.get(s);
  // quelques symboles/aliases fréquents
  if (["v", "mad"].includes(s)) return "madurai";
  if (["-", "dash"].includes(s)) return "naramon";
  if (["d"].includes(s)) return "zenurik";
  if (["bar", "|"].includes(s)) return "vazarin";
  return s;
};

const looksArcane = (name, type, tags = []) => {
  const n = String(name || "");
  const t = String(type || "");
  const hasTag = (tags || []).some((x) => /arcane/i.test(String(x || "")));
  return /^arcane\s/i.test(n) || /arcane/i.test(t) || hasTag;
};

/* ------------------------------ Read sources ----------------------------- */
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

/* --------------------------- Index by normalized name -------------------- */
const nameExport = (u) => u?.name || u?.upgradeName || u?.displayName || null;
const nameWstat  = (m) => m?.name || m?.displayName || null;
const nameOf     = (m) => m?.name || m?.title || m?.displayName || null;
const nameMods   = (m) => m?.name || m?.title || null;

const mapExport = new Map();
for (const u of A_export) {
  const n = nameExport(u);
  if (!n) continue;
  mapExport.set(keyify(n), u);
}

const mapWstat = new Map();
for (const m of A_wstat) {
  const n = nameWstat(m);
  if (!n) continue;
  mapWstat.set(keyify(n), m);
}

const mapOfmods = new Map();
for (const m of A_ofmods) {
  const n = nameOf(m);
  if (!n) continue;
  mapOfmods.set(keyify(n), m);
}

const mapMods = new Map();
for (const m of A_mods) {
  const n = nameMods(m);
  if (!n) continue;
  mapMods.set(keyify(n), m);
}

/* ------------------------------- Sets (Overframe) ------------------------ */
const setByMod = new Map();
const setMeta  = new Map();
for (const s of A_ofsets) {
  const setName = s?.name || s?.title || s?.setName;
  if (!setName) continue;
  const members = asArray(s.mods || s.members || s.items).map(String);
  for (const m of members) setByMod.set(keyify(m), setName);
  setMeta.set(setName, {
    name: setName,
    size: members.length || undefined,
    bonus: s?.bonus || s?.description || s?.effect || undefined,
  });
}

/* ------------------------------- Union keys ------------------------------ */
const allKeys = uniq([
  ...mapExport.keys(),
  ...mapWstat.keys(),
  ...mapOfmods.keys(),
  ...mapMods.keys(),
]);

/* ---------------------------- Level stats extraction --------------------- */
// WFStat lvl stats: prefer textual per rank if present
const extractLevelStatsWFStat = (m) => {
  const ls = asArray(m?.levelStats);
  // format attendu: [{ stats: ["text rank 0"]}, { stats: ["text rank 1"]}, ...]
  const out = [];
  for (const e of ls) {
    const stats = asArray(e?.stats).map((s) => clean(s));
    if (stats.length) out.push(stats);
  }
  return out.length ? out : null;
};

// fallback using DE/OF structures (best-effort)
const extractLevelStatsGeneric = (src) => {
  if (!src) return null;
  const blocks = asArray(
    src.levelStats || src.upgradeEntries || src.stats || src.values || src.effects
  );
  if (!blocks.length) return null;
  // on construit des lignes humaines si possible
  const out = [];
  for (const e of blocks) {
    const stats = [];
    const s = e?.stat || e?.name || e?.attribute || e?.type || e?.effect;
    const unit = e?.unit || e?.suffix;
    let values = null;
    if (Array.isArray(e?.values)) values = e.values;
    else if (Array.isArray(e?.levels)) values = e.levels;
    else if (typeof e?.value === "number" || typeof e?.value === "string")
      values = [e.value];
    // si pas de valeur, on essaie la description directe
    if (!values && e?.description) {
      stats.push(clean(e.description));
    } else if (s && values) {
      stats.push(
        clean(
          `${s}: ${values
            .map((v) => (typeof v === "number" ? String(v) : v))
            .join(" / ")}${unit ? " " + unit : ""}`
        )
      );
    }
    if (stats.length) out.push(stats);
  }
  return out.length ? out : null;
};

/* ------------------------------ Merge logic ------------------------------ */
const out = [];
const report = {
  total: 0,
  excluded_arcanes: 0,
  merged_from: { export: 0, warframestat: 0, overframe: 0, modsjson: 0 },
  with_set: 0,
  with_levelStats: 0,
  with_drops: 0,
  samples: [],
};

for (const k of allKeys) {
  const e = mapExport.get(k);
  const w = mapWstat.get(k);
  const o = mapOfmods.get(k);
  const m = mapMods.get(k);

  const name =
    clean(o?.name || o?.title || w?.name || e?.name || e?.upgradeName || m?.name);
  if (!name) continue;

  // Détection Arcane (exclusion)
  const typeHint = w?.type || o?.type || e?.Type || m?.type;
  const tagsHint = (w?.tags || o?.tags || m?.tags || []).map(String);
  if (looksArcane(name, typeHint, tagsHint)) {
    report.excluded_arcanes += 1;
    continue;
  }

  // Polarity
  const pol =
    normPolarity(o?.polarity ?? o?.polaritySymbol) ||
    normPolarity(w?.polarity) ||
    normPolarity(e?.polarity) ||
    undefined;

  // Rarity
  const rarity =
    o?.rarity || w?.rarity || e?.rarity || m?.rarity || undefined;

  // Type (IMPORTANT : conservé)
  const type =
    (w?.type && clean(w.type)) ||
    (o?.type && clean(o.type)) ||
    (e?.Type && clean(e.Type)) ||
    (m?.type && clean(m.type)) ||
    undefined;

  // Compat (pour filtrer: "Warframe", "Rifle", etc. + compatName spécifique)
  const compatName =
    o?.compatName || w?.compat || e?.Compat || m?.compat || undefined;

  // Base drain & fusion limit (WFStat prioritaire)
  const baseDrain =
    (typeof w?.baseDrain === "number" ? w.baseDrain : o?.baseDrain ?? e?.baseDrain ?? m?.baseDrain);
  const fusionLimit =
    (typeof w?.fusionLimit === "number"
      ? w.fusionLimit
      : o?.fusionLimit ?? e?.fusionLimit ?? m?.fusionLimit);

  // Tags/Categories
  const tags = uniq([...(o?.tags || []), ...(w?.tags || []), ...(m?.tags || [])].map(clean));
  const categories = uniq([...(o?.categories || []), ...(w?.categories || []), ...(m?.categories || [])].map(clean));

  // Sets
  let set;
  const setName = setByMod.get(k);
  if (setName) {
    set = setMeta.get(setName) || { name: setName };
    report.with_set += 1;
  }

  // Level stats
  let levelStats =
    extractLevelStatsWFStat(w) ||
    extractLevelStatsGeneric(e) ||
    extractLevelStatsGeneric(o) ||
    null;
  if (levelStats) report.with_levelStats += 1;

  // Drops (WFStat)
  let drops = null;
  if (Array.isArray(w?.drops) && w.drops.length) {
    drops = w.drops.map((d) => ({
      chance: typeof d?.chance === "number" ? d.chance : undefined,
      location: d?.location || d?.place || undefined,
      rarity: d?.rarity || undefined,
      type: d?.type || undefined,
    }));
    report.with_drops += 1;
  }

  // isAugment infer (minimal, pas de champ si incertain)
  const isAugment =
    /augment/i.test(name) || /augment/i.test(String(o?.description || "")) || undefined;

  // Build objet final (sans redondances inutiles)
  const obj = {
    id: slugify(name),          // stable id
    name,
    slug: slugify(name),        // pratique côté front
    rarity: rarity || undefined,
    polarity: pol || undefined,
    type: type || undefined,        // << garder absolument
    compatName: compatName || undefined,
    categories: categories.length ? categories : undefined,
    tags: tags.length ? tags : undefined,
    baseDrain: typeof baseDrain === "number" ? baseDrain : undefined,
    fusionLimit: typeof fusionLimit === "number" ? fusionLimit : undefined,
    set: set || undefined,
    levelStats: levelStats || undefined,
    drops: drops || undefined,
  };

  // Nettoyage des undefined
  for (const k of Object.keys(obj)) if (obj[k] === undefined) delete obj[k];

  out.push(obj);

  // Stats rapport
  report.merged_from.export   += e ? 1 : 0;
  report.merged_from.warframestat += w ? 1 : 0;
  report.merged_from.overframe += o ? 1 : 0;
  report.merged_from.modsjson += m ? 1 : 0;
  if (report.samples.length < 5) report.samples.push(obj.name);
}

out.sort((a, b) => a.name.localeCompare(b.name));
report.total = out.length;

/* --------------------------------- Write --------------------------------- */
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf-8");

// CSV condensé
{
  const headers = [
    "id",
    "name",
    "rarity",
    "polarity",
    "type",
    "compatName",
    "baseDrain",
    "fusionLimit",
    "set.name",
    "set.size",
  ];
  const lines = [headers.join(",")];
  for (const m of out) {
    const row = [
      m.id,
      m.name,
      m.rarity || "",
      m.polarity || "",
      m.type || "",
      m.compatName || "",
      m.baseDrain ?? "",
      m.fusionLimit ?? "",
      m.set?.name || "",
      m.set?.size ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(row.join(","));
  }
  fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");
}

fs.writeFileSync(OUT_REP, JSON.stringify(report, null, 2), "utf-8");

console.log(`OK → ${OUT_JSON} (${out.length} mods)`);
console.log(`OK → ${OUT_CSV}`);
console.log(`OK → ${OUT_REP}`);