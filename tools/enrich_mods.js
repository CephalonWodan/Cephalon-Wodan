// tools/enrich_mods.js (v2 + patches)
// Fusionne ExportUpgrades_en.json + modwarframestat.json + overframe-mods.json + overframe-modsets.json + Mods.json
// Produit: data/enriched_mods.json, data/enriched_mods_report.json, data/enriched_mods.csv

import fs from "fs";
import path from "path";

// ---------- Config ----------
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

// langue cible (évite d’injecter du FR si on veut EN)
const LANG_TARGET = process.env.LANG_TARGET || "en";
// exclure les arcanes ? (par défaut oui)
const EXCLUDE_ARCANES = String(process.env.EXCLUDE_ARCANES || "true") === "true";

// ---------- Utils ----------
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
function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}
function toLowerArray(arr) {
  return uniq((arr || []).map(x => String(x).toLowerCase()));
}

// Détection rudimentaire FR (pour éviter de mixer les langues)
function looksFrench(s) {
  if (!s) return false;
  const t = String(s).toLowerCase();
  if (/[àâçéèêëîïôùûüÿœ]/.test(t)) return true;
  const frWords = [" les ", " des ", " du ", " au ", " aux ", " une ", " un ", " et ", " pour ", " avec ", " dégâts ", "armure", "bouclier", "efficacité", "rechargement"];
  return frWords.some(w => t.includes(w));
}

// Merge helper: prend le 1er non-vide par priorité + provenance, avec garde langue si string
function takeFirst(dst, srcs, field, srcNames, provenance, { langFilter = true } = {}) {
  for (let i = 0; i < srcs.length; i++) {
    const v = srcs[i]?.[field];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (langFilter && LANG_TARGET === "en" && typeof v === "string" && looksFrench(v)) continue;
    dst[field] = v;
    provenance[field] = srcNames[i];
    return;
  }
}

// ---------- Charger sources ----------
const S_export = readIf(P_EXPORT);
const S_wstat  = readIf(P_WSTAT);
const S_ofmods = readIf(P_OFMODS);
const S_ofsets = readIf(P_OFSETS);
const S_mods   = readIf(P_MODS);

const A_export = asArray(S_export);
const A_wstat  = Array.isArray(S_wstat?.data) ? S_wstat.data : asArray(S_wstat); // accepte format { _meta, data }
const A_ofmods = asArray(S_ofmods);
const A_ofsets = asArray(S_ofsets);
const A_mods   = asArray(S_mods);

// ---------- Aides nom ----------
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

// Détection Mods/Arcanes côté Overframe
function isArcaneOF(m) {
  const cat = toLowerArray(m?.categories);
  const tag = String(m?.tag || "").toLowerCase();
  const pc  = String(m?.data?.ProductCategory || m?.ProductCategory || "").toLowerCase();
  if (pc.includes("arcane") || cat.includes("arcane") || tag === "arcane") return true;
  const pathish = String(m?.path || m?.storeItemType || "").toLowerCase();
  if (pathish.includes("/arcanes/")) return true;
  return false;
}
function isModOF(m) {
  if (isArcaneOF(m)) return false;
  const cat = toLowerArray(m?.categories);
  const tag = String(m?.tag || "").toLowerCase();
  const pc  = String(m?.data?.ProductCategory || m?.ProductCategory || "").toLowerCase();
  if (tag === "mod") return true;
  if (cat.includes("mod")) return true;
  if (pc === "upgrades") return true;
  return false;
}

// ---------- Index par nom (clé normalisée) ----------
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
  if (!isModOF(m)) continue; // filtre arcanes & non-mods à la source
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

// ---------- Helpers: génération d'effets textuels ----------
function fmtVal(v) {
  if (v == null) return "";
  if (typeof v === "number") {
    // Heuristique simple : petits nombres => pourcentages plausibles
    return Math.abs(v) <= 5 ? `${(v * 100).toFixed(0)}%` : `${v}`;
  }
  return String(v);
}
function pushEffect(arr, label, values, unit) {
  if (!label) return;
  if (Array.isArray(values) && values.length) {
    const text = values.map((vv) => fmtVal(vv)).join(" / ");
    arr.push(unit ? `${label}: ${text} ${unit}`.trim() : `${label}: ${text}`);
  } else {
    arr.push(unit ? `${label} ${unit}`.trim() : `${label}`);
  }
}
function effectFromExportEntry(e) {
  const stat = e?.stat || e?.name || e?.attribute || e?.type || e?.effect;
  if (!stat) return null;
  const unit = e?.unit || e?.suffix || undefined;
  let values = null;
  if (Array.isArray(e?.values)) values = e.values;
  else if (Array.isArray(e?.levels)) values = e.levels;
  else if (typeof e?.value === "number" || typeof e?.value === "string") values = [e.value];
  return { stat: String(stat), values: values ?? [], unit };
}
function effectFromOverframeBlock(b) {
  const stat = b?.stat || b?.name || b?.attribute || b?.type || b?.effect;
  if (!stat) return null;
  const unit = b?.unit || b?.suffix || undefined;
  let values = null;
  if (Array.isArray(b?.values)) values = b.values;
  else if (Array.isArray(b?.levels)) values = b.levels;
  else if (typeof b?.value === "number" || typeof b?.value === "string") values = [b.value];
  return { stat: String(stat), values: values ?? [], unit };
}

// ---------- Heuristiques Augment ----------
function detectAugment({ name, description, tags, categories, compat, type }) {
  const t = String(type || "").toLowerCase();
  const cats = toLowerArray(categories);
  const tgs  = toLowerArray(tags);
  const txt  = (name + " " + (description || "")).toLowerCase();

  if (tgs.includes("augment") || cats.includes("augment")) return true;
  if (t.includes("augment")) return true;
  if (/['’]s augment\b/i.test(name)) return true;
  if (/\baugment\b/.test(txt)) return true;

  // Augments de Warframes: compat = nom de Warframe souvent
  if (compat && !/melee|rifle|pistol|shotgun|archgun|sentinel|exilus/i.test(String(compat))) {
    if (/^[A-Z][a-z]+(\sPrime)?$/.test(String(compat))) return true;
  }
  return false;
}

// ---------- Union des noms ----------
const allKeys = new Set([
  ...mapExport.keys(),
  ...mapOfmods.keys(),
  ...mapWstat.keys(),
  ...mapMods.keys()
]);

// ---------- Extraction des stats structurées ----------
function extractStatsFromExport(u) {
  const out = [];
  if (!u) return out;
  const maxRank = u?.maxRank ?? u?.max_level ?? u?.maxLevel ?? null;
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
const seenIds = new Set();

for (const k of Array.from(allKeys).sort()) {
  const srcOf   = mapOfmods.get(k);
  const srcExp  = mapExport.get(k);
  const srcStat = mapWstat.get(k);
  const srcMods = mapMods.get(k);

  // Nom (priorité Overframe -> Export -> WStat -> Mods)
  const name =
    clean(
      srcOf?.name || srcOf?.title ||
      srcExp?.name || srcExp?.upgradeName ||
      srcStat?.name || srcMods?.name
    );
  if (!name) continue;
  const slug = slugify(name);
  if (seenIds.has(slug)) continue; // anti-doublon
  seenIds.add(slug);

  const provenance = {};
  const out = { id: slug, name, slug };

  // Description (garde langue)
  {
    const cand = {
      overframe: srcOf?.description || srcOf?.desc || srcOf?.effect || srcOf?.longDescription,
      export: srcExp?.description || srcExp?.Desc || srcExp?.desc,
      warframestat: srcStat?.description || srcStat?.desc,
      mods: srcMods?.description || srcMods?.desc
    };
    let chosen = cand.overframe ?? cand.export ?? cand.warframestat ?? cand.mods;
    if (LANG_TARGET === "en" && looksFrench(chosen)) {
      const alt = [cand.overframe, cand.export, cand.warframestat, cand.mods].find(v => v && !looksFrench(v));
      if (alt) chosen = alt;
    }
    if (chosen) {
      out.description = chosen;
      if (chosen === cand.overframe) provenance.description = "overframe";
      else if (chosen === cand.export) provenance.description = "export";
      else if (chosen === cand.warframestat) provenance.description = "warframestat";
      else if (chosen === cand.mods) provenance.description = "mods.json";
    }
  }

  // Rareté
  takeFirst(out,
    [srcOf, srcExp, srcStat, srcMods],
    "rarity",
    ["overframe", "export", "warframestat", "mods.json"],
    provenance
  );

  // Polarité
  takeFirst(out,
    [{ polarity: srcOf?.polarity ?? srcOf?.polaritySymbol }, srcExp, srcStat, srcMods],
    "polarity",
    ["overframe", "export", "warframestat", "mods.json"],
    provenance
  );

  // Drain
  takeFirst(out,
    [{ drain: srcOf?.baseDrain ?? srcOf?.drain }, srcExp, srcStat, srcMods],
    "drain",
    ["overframe", "export", "warframestat", "mods.json"],
    provenance
  );

  // Type / Tag (normalize vers "Mod" si reconnu)
  const typeCandidate = srcOf?.type ?? srcOf?.tag ?? srcExp?.Type ?? srcStat?.type ?? srcMods?.type;
  if (typeCandidate) {
    const t = String(typeCandidate).toLowerCase();
    out.type = (t === "mod" || t === "mods" || t.includes("upgrade")) ? "Mod" : typeCandidate;
    provenance.type = (srcOf?.type || srcOf?.tag) ? "overframe" : (srcExp?.Type ? "export" : (srcStat?.type ? "warframestat" : "mods.json"));
  } else {
    out.type = "Mod";
  }

  // Compat
  const compatCandidate = srcOf?.compatName ?? srcOf?.compat ?? srcExp?.Compat ?? srcStat?.compat ?? srcMods?.compat;
  if (compatCandidate) {
    out.compat = compatCandidate;
    provenance.compat = (srcOf?.compatName || srcOf?.compat) ? "overframe" : (srcExp?.Compat ? "export" : (srcStat?.compat ? "warframestat" : "mods.json"));
  }

  // Tags / Categories
  const tags = Array.isArray(srcOf?.tags) ? srcOf.tags :
               (Array.isArray(srcStat?.tags) ? srcStat.tags :
               (Array.isArray(srcMods?.tags) ? srcMods.tags : null));
  if (tags?.length) { out.tags = uniq(tags); provenance.tags = Array.isArray(srcOf?.tags) ? "overframe" : (Array.isArray(srcStat?.tags) ? "warframestat" : "mods.json"); }

  const cat = Array.isArray(srcOf?.categories) ? srcOf.categories :
              (Array.isArray(srcStat?.categories) ? srcStat.categories :
              (Array.isArray(srcMods?.categories) ? srcMods.categories : null));
  if (cat?.length) { out.categories = uniq(cat); provenance.categories = Array.isArray(srcOf?.categories) ? "overframe" : (Array.isArray(srcStat?.categories) ? "warframestat" : "mods.json"); }

  // ---------- RAW par source (pour rendu précis) ----------
  if (srcExp && (srcExp.upgradeEntries || srcExp.levelStats || srcExp.stats)) {
    out.raw = out.raw || {};
    out.raw.export = {
      upgradeEntries: asArray(srcExp.upgradeEntries),
      levelStats: asArray(srcExp.levelStats),
      stats: asArray(srcExp.stats),
      maxRank: srcExp?.maxRank ?? srcExp?.max_level ?? srcExp?.maxLevel ?? null
    };
  }
  if (srcOf && (srcOf.stats || srcOf.effects || srcOf.values)) {
    out.raw = out.raw || {};
    out.raw.overframe = {
      stats: asArray(srcOf.stats),
      effects: asArray(srcOf.effects),
      values: asArray(srcOf.values),
      maxRank: srcOf?.maxRank ?? srcOf?.max_level ?? srcOf?.maxLevel ?? null
    };
  }
  if (srcStat && (srcStat.effects || srcStat.stats || srcStat.levelStats)) {
    out.raw = out.raw || {};
    out.raw.warframestat = {
      effects: asArray(srcStat.effects),
      stats: asArray(srcStat.stats),
      levelStats: asArray(srcStat.levelStats),
      maxRank: srcStat?.maxRank ?? srcStat?.max_level ?? srcStat?.maxLevel ?? null
    };
  }

  // maxRank + drainByRank
  const ranksFrom =
    out.raw?.export?.maxRank ?? out.raw?.overframe?.maxRank ?? out.raw?.warframestat?.maxRank ?? null;
  if (typeof ranksFrom === "number") {
    out.maxRank = ranksFrom;
    provenance.maxRank = "mixed";
  }
  const drainVals = Array.isArray(srcOf?.drainByRank) ? srcOf.drainByRank
                    : Array.isArray(srcExp?.drainByRank) ? srcExp.drainByRank
                    : null;
  if (drainVals && drainVals.length) {
    out.drainByRank = drainVals;
    provenance.drainByRank = "mixed";
  }

  // ---------- Effects normalisés (lisibles) ----------
  const effects = [];
  const expEntries = asArray(srcExp?.upgradeEntries || srcExp?.stats || srcExp?.levelStats);
  for (const e of expEntries) {
    const eff = effectFromExportEntry(e);
    if (eff) pushEffect(effects, eff.stat, eff.values, eff.unit);
  }
  const ofBlocks = asArray(srcOf?.stats || srcOf?.effects || srcOf?.values);
  for (const b of ofBlocks) {
    const eff = effectFromOverframeBlock(b);
    if (eff) pushEffect(effects, eff.stat, eff.values, eff.unit);
  }
  if (effects.length === 0) {
    const wsBlocks = asArray(srcStat?.effects || srcStat?.stats || srcStat?.levelStats);
    for (const b of wsBlocks) {
      const eff = effectFromOverframeBlock(b);
      if (eff) pushEffect(effects, eff.stat, eff.values, eff.unit);
    }
  }
  if (effects.length) {
    out.effects = effects;
    provenance.effects =
      expEntries.length && ofBlocks.length ? "export|overframe"
      : (expEntries.length ? "export"
        : (ofBlocks.length ? "overframe" : "warframestat"));
  }

  // ---------- Stats (structure) conservées pour compat technique ----------
  const statsExp = extractStatsFromExport(srcExp);
  const statsOf  = extractStatsFromOverframe(srcOf);
  let stats = [];
  if (statsExp.length && statsOf.length) {
    stats = [...statsExp, ...statsOf];
    provenance.stats = "export|overframe";
  } else if (statsExp.length) {
    stats = statsExp; provenance.stats = "export";
  } else if (statsOf.length) {
    stats = statsOf; provenance.stats = "overframe";
  }
  if (stats.length) out.stats = stats;

  // ---------- URL Overframe : uniquement si fiable ----------
  {
    const pathish = String(srcOf?.url || srcOf?.path || "").toLowerCase();
    const numericId = /^\d+$/.test(String(srcOf?.id || srcOf?.arsenalId || "").trim())
      ? String(srcOf.id || srcOf.arsenalId).trim()
      : null;

    let url = null;
    if (numericId) {
      url = `https://overframe.gg/items/arsenal/${numericId}/`;
    } else if (pathish.includes("/items/arsenal/")) {
      url = srcOf.url || srcOf.path;
    }
    if (url) {
      out.urls = { ...(out.urls || {}), overframe: url };
      provenance.urls = "overframe";
    }
  }

  // Augment ?
  out.isAugment = detectAugment({
    name: out.name,
    description: out.description,
    tags: out.tags,
    categories: out.categories,
    compat: out.compat,
    type: out.type
  });
  provenance.isAugment = "derived";

  // --- Barrière anti-Arcane (sécurité finale) ---
  const looksArcane =
    /\barcane\b/i.test(out.name) ||
    String(out.type || "").toLowerCase().includes("arcane") ||
    (Array.isArray(out.categories) && out.categories.map(c => String(c).toLowerCase()).includes("arcane"));
  if (EXCLUDE_ARCANES && looksArcane) {
    report.push({ slug, name: out.name, excluded: "arcane-detected", provenance });
    continue;
  }

  // Stockage
  result.push(out);
  report.push({
    slug,
    name: out.name,
    provenance,
    mergedFrom: {
      overframe: !!srcOf,
      export: !!srcExp,
      warframestat: !!srcStat,
      mods_json: !!srcMods
    }
  });
}

// ---------- Tri & sorties ----------
result.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), "utf-8");
fs.writeFileSync(OUT_REP,  JSON.stringify(report,  null, 2), "utf-8");

// CSV rapide (aperçu)
const headers = ["id","name","rarity","polarity","drain","type","compat","isAugment","maxRank","set.name","set.size"];
const lines = [headers.join(",")];
for (const m of result) {
  const line = [
    m.id, m.name, m.rarity || "", m.polarity || "", m.drain ?? "", m.type || "", m.compat || "",
    m.isAugment ? "1" : "0", m.maxRank ?? "", m.set?.name || "", m.set?.size ?? ""
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  lines.push(line);
}
fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

console.log(`OK → ${OUT_JSON} (${result.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);
