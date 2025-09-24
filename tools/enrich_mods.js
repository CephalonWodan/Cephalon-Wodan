// tools/enrich_mods.js
// Fusionne Overframe + DE Export + WarframeStat pour produire un JSON "propre"
// Entrées :
//   data/overframe/overframe-mods.json
//   data/overframe/overframe-modsets.json
//   data/ExportUpgrades_en.json
//   data/modwarframestat.json
// Sorties :
//   data/enriched_mods.json
//   data/enriched_mods_report.json
//   data/enriched_mods.csv

import fs from "node:fs";
import path from "node:path";

// ------------------------------ Helpers -----------------------------------
const DATA_DIR = path.resolve("data");
const OF_DIR   = path.join(DATA_DIR, "overframe");

const P_OFMODS = path.join(OF_DIR,   "overframe-mods.json");
const P_OFSETS = path.join(OF_DIR,   "overframe-modsets.json");
const P_EXPORT = path.join(DATA_DIR, "ExportUpgrades_en.json");
const P_WSTAT  = path.join(DATA_DIR, "modwarframestat.json");

const OUT_JSON = path.join(DATA_DIR, "enriched_mods.json");
const OUT_REP  = path.join(DATA_DIR, "enriched_mods_report.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_mods.csv");

function readJsonIf(p) {
  if (!fs.existsSync(p)) return null;
  const txt = fs.readFileSync(p, "utf-8");
  try { return JSON.parse(txt); }
  catch (e) { throw new Error(`JSON invalide: ${p}\n${e.message}`); }
}
const asArray = (v) => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);

const clean = (s) => String(s ?? "")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

const keyName = (s) => clean(s).toLowerCase().replace(/[\s'`"_-]+/g, " ").replace(/\s+/g, " ").trim();
const slugify = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ------------------------- Charger les sources -----------------------------
const S_ofmods = readJsonIf(P_OFMODS) ?? [];
const S_ofsets = readJsonIf(P_OFSETS) ?? [];
const S_export = readJsonIf(P_EXPORT) ?? [];
const S_wstat  = readJsonIf(P_WSTAT)  ?? [];

const A_ofmods = asArray(S_ofmods);
const A_ofsets = asArray(S_ofsets);
const A_export = asArray(S_export);
const A_wstat  = asArray(S_wstat);

// ---------------------- Index par nom normalisé ---------------------------
const mapOF = new Map();
for (const m of A_ofmods) {
  const n = m?.name || m?.title || m?.displayName;
  if (!n) continue;
  mapOF.set(keyName(n), m);
}

const mapExport = new Map();
for (const u of A_export) {
  const n = u?.name || u?.upgradeName || u?.displayName;
  if (!n) continue;
  mapExport.set(keyName(n), u);
}

const mapW = new Map();
for (const m of A_wstat) {
  const n = m?.name || m?.displayName;
  if (!n) continue;
  mapW.set(keyName(n), m);
}

// ---------- Sets Overframe : modName -> meta du set ----------
const setByMod = new Map();
const setMeta  = new Map();
for (const s of A_ofsets) {
  const setName = s?.name || s?.title || s?.setName;
  if (!setName) continue;
  const members = asArray(s.mods || s.members || s.items).map(String);
  for (const m of members) setByMod.set(keyName(m), setName);
  setMeta.set(setName, {
    name: setName,
    size: members.length || undefined,
    bonus: s?.bonus || s?.description || s?.effect || undefined,
  });
}

// ------------------ Extraction des stats par rang --------------------------
function statsFromWarframeStat(w) {
  // w.levelStats: [{ stats: ["+10% Ability Duration"], ... }, ...]
  const lv = asArray(w?.levelStats);
  if (!lv.length) return null;
  // on garde tel quel (utile côté front)
  return lv.map(x => ({ stats: asArray(x?.stats).map(String) }))
           .filter(x => (x.stats?.length));
}

function statsFromExport(u) {
  // On essaie d’aplatir en textes lisibles si pas de levelStats côté WFStat
  if (!u) return null;
  const entries = asArray(u.upgradeEntries || u.levelStats || u.stats || u.effects || u.values);
  if (!entries.length) return null;

  const linesPerRank = new Map(); // rank -> [strings]
  for (const e of entries) {
    const rank = typeof e?.rank === "number" ? e.rank : null;
    const name = e?.stat || e?.name || e?.attribute || e?.type || e?.effect;
    if (!name) continue;
    const unit = e?.unit || e?.suffix || "";
    let values = null;
    if (Array.isArray(e?.values)) values = e.values;
    else if (Array.isArray(e?.levels)) values = e.levels;
    else if (typeof e?.value === "number" || typeof e?.value === "string") values = [e.value];

    const txt = `${name}${values ? `: ${values.join(" / ")}` : ""}${unit ? ` ${unit}` : ""}`;
    const target = rank ?? -1; // -1 pour "non classé"
    if (!linesPerRank.has(target)) linesPerRank.set(target, []);
    linesPerRank.get(target).push(txt);
  }

  if (!linesPerRank.size) return null;

  // ordonner par rang croissant, -1 en premier si présent
  const ranks = [...linesPerRank.keys()].sort((a,b)=>a-b);
  return ranks.map(r => ({ stats: linesPerRank.get(r) }));
}

// ------------------------ Merge principal ----------------------------------
const allKeys = new Set([...mapOF.keys(), ...mapW.keys(), ...mapExport.keys()]);
const out = [];
const report = [];

for (const k of [...allKeys].sort()) {
  const of = mapOF.get(k) || null;
  const wf = mapW.get(k)  || null;
  const ex = mapExport.get(k) || null;

  // Nom / slug (priorité Overframe, sinon WFStat, sinon Export)
  const name = clean(of?.name || of?.title || wf?.name || ex?.name || ex?.upgradeName);
  if (!name) continue;
  const slug = slugify(name);

  // id : on prend l’ID Overframe s’il existe (numérique en texte), sinon slug
  const id = String(of?.id ?? slug);

  // Type & catégories : Overframe en priorité
  const type = of?.type || wf?.type || ex?.Type || undefined;
  const categories = Array.isArray(of?.categories) && of.categories.length ? of.categories
                     : (Array.isArray(wf?.categories) ? wf.categories : undefined);

  // Polarity / rarity (Overframe puis WFStat puis Export)
  const polarity = of?.polarity ?? of?.polaritySymbol ?? wf?.polarity ?? ex?.Polarity ?? undefined;
  const rarity   = of?.rarity   ?? wf?.rarity          ?? ex?.Rarity   ?? undefined;

  // Compat / drains / fusion
  const compatName  = of?.compatName ?? wf?.compat ?? wf?.compatName ?? ex?.Compat ?? undefined;
  const baseDrain   = of?.baseDrain  ?? wf?.baseDrain ?? ex?.baseDrain ?? undefined;
  const fusionLimit = wf?.fusionLimit ?? ex?.fusionLimit ?? undefined;

  // Set
  const setName = setByMod.get(k);
  const set = setName ? (setMeta.get(setName) || { name: setName }) : undefined;

  // Augment ?
  const isAugment =
    (Array.isArray(of?.tags) && of.tags.some(t => /augment/i.test(String(t)))) ||
    /augment/i.test(name) ||
    /augment/i.test(String(of?.description || wf?.description || ex?.description || "")) || false;

  // Stats par rang (WFStat prioritaire, sinon Export)
  const levelStats = statsFromWarframeStat(wf) || statsFromExport(ex) || undefined;

  // Drops (WFStat)
  const drops = Array.isArray(wf?.drops) && wf.drops.length ? wf.drops.map(d => ({
    chance: d?.chance ?? undefined,
    location: d?.location ?? undefined,
    rarity: d?.rarity ?? undefined,
    type: d?.type ?? undefined,
  })) : undefined;

  // Construction de l’objet final (sans champs vides/indéfinis)
  const obj = { id, slug, name };
  if (type) obj.type = type;
  if (categories?.length) obj.categories = categories;
  if (rarity) obj.rarity = rarity;
  if (polarity) obj.polarity = polarity;
  if (compatName) obj.compatName = compatName;
  if (typeof baseDrain === "number") obj.baseDrain = baseDrain;
  if (typeof fusionLimit === "number") obj.fusionLimit = fusionLimit;
  obj.isAugment = !!isAugment;
  if (set) obj.set = set;
  if (levelStats) obj.levelStats = levelStats;
  if (drops) obj.drops = drops;

  out.push(obj);

  // Rapport
  report.push({
    slug, name, id,
    sources: {
      overframe: !!of,
      warframestat: !!wf,
      export: !!ex
    }
  });
}

// ----------------------------- Sorties -------------------------------------
out.sort((a,b)=>a.name.localeCompare(b.name));

fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf-8");
fs.writeFileSync(OUT_REP,  JSON.stringify({
  total: out.length,
  inputs: {
    overframe_mods: !!S_ofmods,
    overframe_sets: !!S_ofsets,
    export_upgrades: !!S_export,
    warframestat: !!S_wstat
  }
}, null, 2), "utf-8");

// CSV compact (quelques champs principaux)
const headers = [
  "id","slug","name","type","rarity","polarity","compatName","baseDrain","fusionLimit","isAugment","set.name","set.size"
];
const lines = [headers.join(",")];
for (const m of out) {
  const row = [
    m.id, m.slug, m.name, m.type || "", m.rarity || "", m.polarity || "",
    m.compatName || "", m.baseDrain ?? "", m.fusionLimit ?? "",
    m.isAugment ? 1 : 0, m.set?.name || "", m.set?.size ?? ""
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
  lines.push(row);
}
fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

console.log(`OK → ${OUT_JSON} (${out.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);