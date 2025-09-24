// tools/enrich_mods.js (V8)
// Fusion robuste Overframe + WarframeStat + DE Export + Mods.json
// - id prioritaire Overframe
// - matching par variantes de nom (ex: "Abating Link (Trinity)" ↔ "Abating Link")
// - champs riches rétablis: rarity, polarity, type, compatName, baseDrain, fusionLimit,
//   tags, categories, set, levelStats (par rang), drops.

import fs from "fs";
import path from "path";

/* ------------------------------- IO paths -------------------------------- */
const DATA_DIR = path.resolve("data");
const OF_DIR   = path.join(DATA_DIR, "overframe");

const P_EXPORT = path.join(DATA_DIR, "ExportUpgrades_en.json");
const P_WSTAT  = path.join(DATA_DIR, "modwarframestat.json");
const P_OFMODS = path.join(OF_DIR,   "overframe-mods.json");
const P_OFSETS = path.join(OF_DIR,   "overframe-modsets.json");
const P_MODS   = path.join(DATA_DIR, "Mods.json");

const OUT_JSON = path.join(DATA_DIR, "enriched_mods.json");
const OUT_REP  = path.join(DATA_DIR, "enriched_mods_report.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_mods.csv");

/* -------------------------------- Utils ---------------------------------- */
const readIf = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : null);
const asArray = (v) => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []);

const norm = (s) => String(s ?? "").trim();
const clean = (s) =>
  norm(s)
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/–/g, "-")
    .replace(/\s+/g, " ")
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

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const POLARITY_MAP = new Map([
  ["madurai","madurai"],["v","madurai"],
  ["naramon","naramon"],["-","naramon"],["dash","naramon"],
  ["zenurik","zenurik"],["d","zenurik"],
  ["vazarin","vazarin"],["|","vazarin"],["bar","vazarin"],
  ["unairu","unairu"],["umbra","umbra"],
]);
const normPolarity = (p) => {
  const s = String(p ?? "").toLowerCase().trim();
  if (!s) return undefined;
  return POLARITY_MAP.get(s) || s;
};

const looksArcane = (name, type, tags=[]) => {
  const n = String(name||"");
  const t = String(type||"");
  const tagArc = (tags||[]).some(x=>/arcane/i.test(String(x||"")));
  return /^arcane\s/i.test(n) || /arcane/i.test(t) || tagArc;
};

/* ---------- key variants: remove parens, strip “augment”, extra spaces ---- */
function keyVariants(name) {
  const base = clean(name);
  const v = new Set();
  const add = (x) => v.add(keyify(x));
  add(base);
  // supprimer "(Trinity)", "(Rifle)", etc.
  add(base.replace(/\s*$begin:math:text$[^)]*$end:math:text$\s*/g, " ").replace(/\s+/g, " ").trim());
  // supprimer "augment" textuel
  add(base.replace(/\baugment\b/gi, "").replace(/\s+/g, " ").trim());
  return Array.from(v);
}

/* ------------------------------ Load sources ----------------------------- */
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

/* ------------------------------ Name getters ----------------------------- */
const nameExport = (u) => u?.name || u?.upgradeName || u?.displayName || null;
const nameWstat  = (m) => m?.name || m?.displayName || null;
const nameOf     = (m) => m?.name || m?.title || m?.displayName || null;
const nameMods   = (m) => m?.name || m?.title || null;

/* ----------------------------- Build indexes ----------------------------- */
function buildIndex(arr, getName) {
  const map = new Map();
  for (const x of arr) {
    const n = getName(x);
    if (!n) continue;
    for (const k of keyVariants(n)) {
      if (!map.has(k)) map.set(k, x);
    }
  }
  return map;
}
const idxExport = buildIndex(A_export, nameExport);
const idxWstat  = buildIndex(A_wstat,  nameWstat);
const idxMods   = buildIndex(A_mods,   nameMods);
const idxOf     = buildIndex(A_ofmods, nameOf);

/* ------------------------------- Sets info ------------------------------- */
const setByMod = new Map();
const setMeta  = new Map();
for (const s of A_ofsets) {
  const setName = s?.name || s?.title || s?.setName;
  if (!setName) continue;
  const members = asArray(s.mods || s.members || s.items).map(String);
  for (const m of members) for (const kv of keyVariants(m)) setByMod.set(kv, setName);
  setMeta.set(setName, {
    name: setName,
    size: members.length || undefined,
    bonus: s?.bonus || s?.description || s?.effect || undefined,
  });
}

/* -------------------------- Extraction helpers --------------------------- */
const extractLevelStatsWFStat = (m) => {
  const ls = asArray(m?.levelStats);
  const out = [];
  for (const e of ls) {
    const stats = asArray(e?.stats).map((s)=>clean(s));
    if (stats.length) out.push(stats);
  }
  return out.length ? out : null;
};

const extractLevelStatsGeneric = (src) => {
  if (!src) return null;
  const blocks = asArray(src.levelStats || src.upgradeEntries || src.stats || src.values || src.effects);
  if (!blocks.length) return null;
  const out = [];
  for (const e of blocks) {
    const stats = [];
    const s = e?.stat || e?.name || e?.attribute || e?.type || e?.effect;
    const unit = e?.unit || e?.suffix;
    let values = null;
    if (Array.isArray(e?.values)) values = e.values;
    else if (Array.isArray(e?.levels)) values = e.levels;
    else if (typeof e?.value === "number" || typeof e?.value === "string") values = [e.value];
    if (!values && e?.description) {
      stats.push(clean(e.description));
    } else if (s && values) {
      stats.push(
        clean(`${s}: ${values.map(v => (typeof v === "number" ? String(v) : v)).join(" / ")}${unit ? " " + unit : ""}`)
      );
    }
    if (stats.length) out.push(stats);
  }
  return out.length ? out : null;
};

function overframeIdCandidate(of) {
  if (!of) return null;
  if (of.id && String(of.id).trim()) return String(of.id).trim();
  if (of.slug && String(of.slug).trim()) return String(of.slug).trim();
  const urlish = of.url || of.href || of.path || of.route;
  if (typeof urlish === "string") {
    const m = urlish.trim().match(/\/items\/arsenal\/([^/]+)\/?$/i);
    if (m && m[1]) return m[1];
  }
  return null;
}

/* ------------------------------- Merge pass ------------------------------ */
const results = [];
const rep = {
  total: 0,
  excluded_arcanes: 0,
  matched_wstat: 0,
  matched_export: 0,
  matched_mods: 0,
  id_from_overframe: 0,
  id_fallback_slug: 0,
  with_levelStats: 0,
  with_drops: 0,
  with_type_heuristic: 0,
  samples: [],
};

// on part des mods Overframe (meilleure couverture + id)
for (const [k, ofm] of idxOf.entries()) {
  const name = clean(nameOf(ofm) || "");
  if (!name) continue;

  // variantes pour chercher dans WFStat/Export/Mods
  const variants = keyVariants(name);
  let ws = null, ex = null, md = null;
  for (const v of variants) { if (!ws) ws = idxWstat.get(v) || null; }
  for (const v of variants) { if (!ex) ex = idxExport.get(v) || null; }
  for (const v of variants) { if (!md) md = idxMods.get(v) || null; }

  const typeHint = ws?.type || ofm?.type || ex?.Type || md?.type;
  const tagsHint = uniq([...(ws?.tags || []), ...(ofm?.tags || []), ...(md?.tags || [])]);
  if (looksArcane(name, typeHint, tagsHint)) { rep.excluded_arcanes += 1; continue; }

  // id/slug
  const idOf = overframeIdCandidate(ofm);
  const id = idOf || slugify(name);
  if (idOf) rep.id_from_overframe += 1; else rep.id_fallback_slug += 1;
  const slug = (() => { const s = slugify(name); return s !== id ? s : undefined; })();

  // champs simples
  const polarity = normPolarity(ofm?.polarity ?? ofm?.polaritySymbol ?? ws?.polarity ?? ex?.polarity);
  const rarity   = ofm?.rarity || ws?.rarity || ex?.rarity || md?.rarity || undefined;

  // compat & drains
  const compatName = ofm?.compatName || ws?.compat || ex?.Compat || md?.compat || undefined;
  const baseDrain  = (typeof ws?.baseDrain === "number" ? ws.baseDrain : ofm?.baseDrain ?? ex?.baseDrain ?? md?.baseDrain);
  const fusionLimit= (typeof ws?.fusionLimit === "number" ? ws.fusionLimit : ofm?.fusionLimit ?? ex?.fusionLimit ?? md?.fusionLimit);

  // tags/categories
  const tags = uniq([...(ofm?.tags || []), ...(ws?.tags || []), ...(md?.tags || [])].map(clean));
  const categories = uniq([...(ofm?.categories || []), ...(ws?.categories || []), ...(md?.categories || [])].map(clean));

  // type (sources, sinon heuristique)
  let type =
    (ws?.type && clean(ws.type)) ||
    (ofm?.type && clean(ofm.type)) ||
    (ex?.Type && clean(ex.Type)) ||
    (md?.type && clean(md.type)) ||
    undefined;

  if (!type) {
    // heuristiques
    if (compatName) type = "Warframe Mod";
    else {
      const lowerTags = tags.map(t=>t.toLowerCase());
      const table = [
        ["rifle", "Rifle Mod"],
        ["shotgun", "Shotgun Mod"],
        ["pistol", "Pistol Mod"],
        ["melee", "Melee Mod"],
        ["archgun", "Arch-Gun Mod"],
        ["archmelee","Arch-Melee Mod"],
        ["companion","Companion Mod"],
        ["kitgun","Kitgun Mod"]
      ];
      for (const [needle, as] of table) {
        if (lowerTags.includes(needle)) { type = as; break; }
      }
      if (!type && categories.map(c=>c.toLowerCase()).includes("mod")) type = "Mod";
    }
    if (type) rep.with_type_heuristic += 1;
  }

  // sets
  let set; {
    let setName = null;
    for (const v of variants) { if (!setName) setName = setByMod.get(v) || null; }
    if (setName) set = setMeta.get(setName) || { name: setName };
  }

  // levelStats (WFStat > Export > Overframe)
  let levelStats = extractLevelStatsWFStat(ws) ||
                   extractLevelStatsGeneric(ex) ||
                   extractLevelStatsGeneric(ofm) ||
                   null;
  if (levelStats) rep.with_levelStats += 1;

  // drops (WFStat)
  let drops = null;
  if (Array.isArray(ws?.drops) && ws.drops.length) {
    drops = ws.drops.map(d => ({
      chance: typeof d?.chance === "number" ? d.chance : undefined,
      location: d?.location || d?.place || undefined,
      rarity: d?.rarity || undefined,
      type: d?.type || undefined,
    }));
    rep.with_drops += 1;
  }

  // stats fusionnées
  const obj = {
    id,
    name,
    ...(slug ? { slug } : {}),
    ...(rarity ? { rarity } : {}),
    ...(polarity ? { polarity } : {}),
    ...(type ? { type } : {}),
    ...(compatName ? { compatName } : {}),
    ...(categories.length ? { categories } : {}),
    ...(tags.length ? { tags } : {}),
    ...(typeof baseDrain === "number" ? { baseDrain } : {}),
    ...(typeof fusionLimit === "number" ? { fusionLimit } : {}),
    ...(set ? { set } : {}),
    ...(levelStats ? { levelStats } : {}),
    ...(drops ? { drops } : {}),
  };

  if (ws) rep.matched_wstat += 1;
  if (ex) rep.matched_export += 1;
  if (md) rep.matched_mods += 1;

  results.push(obj);
  if (rep.samples.length < 5) rep.samples.push(obj.name);
}

/* ------------------------------- Output ---------------------------------- */
results.sort((a,b)=>a.name.localeCompare(b.name));
rep.total = results.length;

fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2), "utf-8");

{
  const headers = ["id","name","rarity","polarity","type","compatName","baseDrain","fusionLimit","set.name","set.size","hasLevelStats","hasDrops"];
  const lines = [headers.join(",")];
  for (const m of results) {
    const row = [
      m.id, m.name, m.rarity||"", m.polarity||"", m.type||"", m.compatName||"",
      m.baseDrain ?? "", m.fusionLimit ?? "", m.set?.name||"", m.set?.size ?? "",
      m.levelStats ? 1 : 0, m.drops ? 1 : 0
    ].map(v => `"${String(v).replace(/"/g,'""')}"`);
    lines.push(row.join(","));
  }
  fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");
}

fs.writeFileSync(OUT_REP, JSON.stringify(rep, null, 2), "utf-8");

console.log(`OK → ${OUT_JSON} (${results.length} mods)`);
console.log(`OK → ${OUT_CSV}`);
console.log(`OK → ${OUT_REP}`);