// tools/enrich_mods.js
// Build: node tools/enrich_mods.js
// Inputs (dans ./data et ./data/overframe):
//   - ExportUpgrades_en.json
//   - modwarframestat.json
//   - overframe-mods.json
//   - overframe-modsets.json
//   - Mods.json
// Outputs:
//   - data/enriched_mods.json
//   - data/enriched_mods.csv

import fs from "fs";
import path from "path";

/* ------------------------------ Utils ----------------------------------- */
const DATA_DIR = path.resolve("data");
const OF_DIR   = path.join(DATA_DIR, "overframe");

const P_EXPORT = path.join(DATA_DIR, "ExportUpgrades_en.json");
const P_WSTAT  = path.join(DATA_DIR, "modwarframestat.json");
const P_OFMODS = path.join(OF_DIR,   "overframe-mods.json");
const P_OFSETS = path.join(OF_DIR,   "overframe-modsets.json");
const P_MODS   = path.join(DATA_DIR, "Mods.json");

const OUT_JSON = path.join(DATA_DIR, "enriched_mods.json");
const OUT_CSV  = path.join(DATA_DIR, "enriched_mods.csv");

const readIf = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : null);
const asArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];

const normStr = (s) => String(s ?? "").trim();
const clean = (s) =>
  normStr(s)
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/–/g, "-")
    .replace(/\u00A0/g, " ")
    .trim();
const slugify = (s) =>
  clean(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const keyifyName = (name) =>
  clean(name)
    .toLowerCase()
    .replace(/[\s\-–_'"`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

/* -------- Heuristique fiable pour isAugment (PATCH demandé) ------------- */
const isAugmentHeuristic = ({ name, tags = [], categories = [], description, wstatType }) => {
  const n = String(name || "");
  const t = String(wstatType || "");
  const bag = [...(tags || []), ...(categories || [])].map((x) => String(x || "").toLowerCase());
  if (/augment/i.test(n)) return true;
  if (/augment/i.test(String(description || ""))) return true;
  if (/augment/i.test(t)) return true;
  if (bag.includes("augment")) return true;
  return false;
};

/* --------------------------- Charge les sources -------------------------- */
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

/* ---------------------- Index par nom (clé normalisée) ------------------- */
const nameOfExport = (u) => u?.name || u?.upgradeName || u?.displayName || null;
const nameOfOf     = (m) => m?.name || m?.title || m?.displayName || null;
const nameOfWstat  = (m) => m?.name || m?.displayName || null;
const nameOfMods   = (m) => m?.name || m?.title || null;

const mapExport = new Map();
for (const u of A_export) {
  const n = nameOfExport(u);
  if (n) mapExport.set(keyifyName(n), u);
}
const mapOfmods = new Map();
for (const m of A_ofmods) {
  const n = nameOfOf(m);
  if (n) mapOfmods.set(keyifyName(n), m);
}
const mapWstat = new Map();
for (const m of A_wstat) {
  const n = nameOfWstat(m);
  if (n) mapWstat.set(keyifyName(n), m);
}
const mapMods = new Map();
for (const m of A_mods) {
  const n = nameOfMods(m);
  if (n) mapMods.set(keyifyName(n), m);
}

/* ------------------ Sets Overframe : mod -> meta du set ------------------ */
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
    bonus: s?.bonus || s?.description || s?.effect || null,
  });
}

/* ----------------------- Fonctions d’extraction stats -------------------- */
function extractLevelStatsFromExport(u) {
  // Normalise en tableau de { stats: [string] } par rang.
  if (!u) return null;
  const entries = asArray(u.levelStats || u.stats || u.effects || u.upgradeEntries);
  if (!entries.length) return null;

  // Beaucoup d’exports mettent les textes dans "stats" ou "description"
  const out = [];
  for (const e of entries) {
    const texts = [];
    if (Array.isArray(e?.stats)) {
      texts.push(...e.stats.map((x) => String(x)));
    } else if (e?.description) {
      texts.push(String(e.description));
    } else if (e?.effect) {
      texts.push(String(e.effect));
    }
    if (!texts.length && (typeof e?.value === "number" || typeof e?.value === "string")) {
      texts.push(String(e.value));
    }
    if (texts.length) out.push({ stats: texts });
  }
  return out.length ? out : null;
}

function extractMetaFromWFStat(w) {
  if (!w) return {};
  const rarity      = w.rarity || w.modRarity || w.tier || null;
  const polarity    = w.polarity || w.polaritySymbol || null;
  const type        = w.type || null; // ex: "Warframe Mod", "Rifle Mod", etc.
  const baseDrain   = typeof w.baseDrain === "number" ? w.baseDrain : null;
  const fusionLimit = typeof w.fusionLimit === "number" ? w.fusionLimit : null;
  const compatName  = w.compatName || w.compatibility || null;

  const drops = Array.isArray(w.drops) && w.drops.length ? w.drops.map((d) => ({
    chance: d.chance,
    location: d.location || d.place || undefined,
    rarity: d.rarity || undefined,
    type: d.type || undefined,
  })) : null;

  return { rarity, polarity, type, baseDrain, fusionLimit, compatName, drops };
}

/* ------------------------------ Fusion ----------------------------------- */
const allKeys = new Set([
  ...mapOfmods.keys(),
  ...mapExport.keys(),
  ...mapWstat.keys(),
  ...mapMods.keys(),
]);

const results = [];

for (const k of Array.from(allKeys).sort()) {
  const ofm = mapOfmods.get(k); // overframe
  const ex  = mapExport.get(k); // export upgrades (rang par rang)
  const ws  = mapWstat.get(k);  // warframestat mod json
  const mj  = mapMods.get(k);   // ton Mods.json (fallback meta)

  // Nom & slug
  const name = clean(
    ofm?.name ||
    ofm?.title ||
    ex?.name ||
    ex?.upgradeName ||
    ws?.name ||
    mj?.name
  );
  if (!name) continue;
  const slug = slugify(name);

  // ID —> préférence demandée: ID Overframe
  const id =
    String(ofm?.id ?? "") ||
    String(ws?.uniqueName ?? "") ||
    slug;

  // Meta (priorité WFStat -> Overframe -> Mods.json)
  const metaWs  = extractMetaFromWFStat(ws);
  const rarity  = metaWs.rarity || ofm?.rarity || mj?.rarity || null;
  const polarity = metaWs.polarity || ofm?.polarity || mj?.polarity || null;

  // Type utile pour filtrer (Warframe Mod, Rifle Mod, etc.)
  const type = metaWs.type || ofm?.type || mj?.type || null;

  const compatName  = metaWs.compatName || ofm?.compatName || mj?.compatName || null;
  const baseDrain   = metaWs.baseDrain ?? ofm?.baseDrain ?? mj?.baseDrain ?? null;
  const fusionLimit = metaWs.fusionLimit ?? ofm?.fusionLimit ?? mj?.fusionLimit ?? null;

  // Catégories & tags
  const categories = uniq([
    ...(Array.isArray(ofm?.categories) ? ofm.categories : []),
    ...(Array.isArray(ws?.categories) ? ws.categories : []),
    ...(Array.isArray(mj?.categories) ? mj.categories : []),
  ]).map(String);

  const tagsHint = uniq([
    ...(Array.isArray(ofm?.tags) ? ofm.tags : []),
    ...(Array.isArray(ws?.tags) ? ws.tags : []),
    ...(Array.isArray(mj?.tags) ? mj.tags : []),
  ]).map(String);

  // Set (depuis overframe-modsets)
  const setName = setByMod.get(k);
  const set = setName ? setMeta.get(setName) || { name: setName } : null;

  // Level stats (priorité ExportUpgrades → meilleur texte rang/rang)
  const levelStats = extractLevelStatsFromExport(ex);

  // Drops (WFStat)
  const drops = metaWs.drops || null;

  // isAugment (heuristique PATCH)
  const isAugment = isAugmentHeuristic({
    name,
    tags: tagsHint,
    categories,
    description: ws?.description || ofm?.description || ex?.description,
    wstatType: ws?.type,
  });

  // Objet final : compact, pas de champs vides, pas d’URLs/redondances
  const obj = {
    id,
    name,
    ...(slug ? { slug } : {}),
    ...(rarity ? { rarity } : {}),
    ...(polarity ? { polarity } : {}),
    ...(type ? { type } : {}),
    isAugment,
    ...(compatName ? { compatName } : {}),
    ...(categories.length ? { categories } : {}),
    ...(tagsHint.length ? { tags: tagsHint } : {}),
    ...(typeof baseDrain === "number" ? { baseDrain } : {}),
    ...(typeof fusionLimit === "number" ? { fusionLimit } : {}),
    ...(set ? { set } : {}),
    ...(levelStats ? { levelStats } : {}),
    ...(drops ? { drops } : {}),
  };

  results.push(obj);
}

/* ---------------------------- Sortie fichiers ---------------------------- */
results.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2), "utf-8");

// CSV court pour inspection / debug
{
  const headers = [
    "id",
    "name",
    "slug",
    "rarity",
    "polarity",
    "type",
    "compatName",
    "isAugment",
    "baseDrain",
    "fusionLimit",
    "set.name",
    "set.size",
    "hasLevelStats",
    "hasDrops",
  ];
  const lines = [headers.join(",")];
  for (const m of results) {
    const row = [
      m.id,
      m.name,
      m.slug || "",
      m.rarity || "",
      m.polarity || "",
      m.type || "",
      m.compatName || "",
      m.isAugment ? 1 : 0,
      m.baseDrain ?? "",
      m.fusionLimit ?? "",
      m.set?.name || "",
      m.set?.size ?? "",
      m.levelStats ? 1 : 0,
      m.drops ? 1 : 0,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(row.join(","));
  }
  fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");
}

console.log(`OK → ${OUT_JSON} (${results.length} mods)`);
console.log(`OK → ${OUT_CSV}`);