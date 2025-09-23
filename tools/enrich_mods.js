// tools/enrich_mods.js (v3 — clean fields, WStat priority, no URLs/slug/isAugment)
// Sources : ExportUpgrades_en.json + modwarframestat.json + overframe-mods.json + overframe-modsets.json + Mods.json
// Sorties : data/enriched_mods.json, data/enriched_mods_report.json, data/enriched_mods.csv

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

// ---------- Sets: mod -> set meta (depuis overframe-modsets.json) ----------
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

// ---------- Effects helpers (lisibles) ----------
function fmtVal(v) {
  if (v == null) return "";
  if (typeof v === "number") {
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
function effectFromBlock(b) {
  const stat = b?.stat || b?.name || b?.attribute || b?.type || b?.effect;
  if (!stat) return null;
  const unit = b?.unit || b?.suffix || undefined;
  let values = null;
  if (Array.isArray(b?.values)) values = b.values;
  else if (Array.isArray(b?.levels)) values = b.levels;
  else if (typeof b?.value === "number" || typeof b?.value === "string") values = [b.value];
  return { stat: String(stat), values: values ?? [], unit };
}
function extractStatsFromExport(u) {
  const out = [];
  if (!u) return out;
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

// ---------- Union des noms ----------
const allKeys = new Set([
  ...mapExport.keys(),
  ...mapOfmods.keys(),
  ...mapWstat.keys(),
  ...mapMods.keys()
]);

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
  const id = slugify(name);
  if (seenIds.has(id)) continue;
  seenIds.add(id);

  const provenance = {};
  const out = { id, name }; // pas de slug (redondant)

  // Description (garde langue)
  {
    const cand = {
      overframe: srcOf?.description || srcOf?.desc || srcOf?.effect || srcOf?.longDescription,
      export: srcExp?.description || srcExp?.Desc || srcExp?.desc,
      warframestat: srcStat?.description || srcStat?.desc,
      mods: srcMods?.description || srcMods?.desc
    };
    let chosen = cand.warframestat ?? cand.overframe ?? cand.export ?? cand.mods; // priorité WStat si dispo
    if (LANG_TARGET === "en" && looksFrench(chosen)) {
      const alt = [cand.warframestat, cand.overframe, cand.export, cand.mods].find(v => v && !looksFrench(v));
      if (alt) chosen = alt;
    }
    if (chosen) {
      out.description = chosen;
      if (chosen === cand.warframestat) provenance.description = "warframestat";
      else if (chosen === cand.overframe) provenance.description = "overframe";
      else if (chosen === cand.export) provenance.description = "export";
      else if (chosen === cand.mods) provenance.description = "mods.json";
    }
  }

  // Rareté / Polarité / Type (priorité WStat si présent, sinon autres)
  takeFirst(out,
    [srcStat, srcOf, srcExp, srcMods],
    "rarity",
    ["warframestat", "overframe", "export", "mods.json"],
    provenance
  );
  takeFirst(out,
    [srcStat, { polarity: srcOf?.polarity ?? srcOf?.polaritySymbol }, srcExp, srcMods],
    "polarity",
    ["warframestat", "overframe", "export", "mods.json"],
    provenance
  );
  // Type : normalise en "Mod" si besoin, mais on laisse le type WStat s'il est précis (ex: "Warframe Mod", "Primary Mod", etc.)
  {
    const tCand = srcStat?.type ?? srcOf?.type ?? srcOf?.tag ?? srcExp?.Type ?? srcMods?.type;
    if (tCand) {
      out.type = tCand;
      provenance.type = srcStat?.type ? "warframestat" : (srcOf?.type || srcOf?.tag) ? "overframe" : (srcExp?.Type ? "export" : "mods.json");
    } else {
      out.type = "Mod";
    }
  }

  // Compat / Tags / Categories
  takeFirst(out,
    [{ compatName: srcStat?.compatName }, srcOf, srcExp, srcMods],
    "compatName",
    ["warframestat", "overframe", "export", "mods.json"],
    provenance
  );
  const tags = Array.isArray(srcOf?.tags) ? srcOf.tags :
               (Array.isArray(srcStat?.tags) ? srcStat.tags :
               (Array.isArray(srcMods?.tags) ? srcMods.tags : null));
  if (tags?.length) { out.tags = uniq(tags); provenance.tags = Array.isArray(srcStat?.tags) ? "warframestat" : Array.isArray(srcOf?.tags) ? "overframe" : "mods.json"; }

  const cat = Array.isArray(srcOf?.categories) ? srcOf.categories :
              (Array.isArray(srcStat?.categories) ? srcStat.categories :
              (Array.isArray(srcMods?.categories) ? srcMods.categories : null));
  if (cat?.length) { out.categories = uniq(cat); provenance.categories = Array.isArray(srcStat?.categories) ? "warframestat" : Array.isArray(srcOf?.categories) ? "overframe" : "mods.json"; }

  // Champs spécifiques WarframeStat (prioritaires)
  if (typeof srcStat?.baseDrain === "number") { out.baseDrain = srcStat.baseDrain; provenance.baseDrain = "warframestat"; }
  if (typeof srcStat?.fusionLimit === "number") { out.fusionLimit = srcStat.fusionLimit; provenance.fusionLimit = "warframestat"; }
  if (Array.isArray(srcStat?.drops) && srcStat.drops.length) { out.drops = srcStat.drops; provenance.drops = "warframestat"; }

  // Drain générique si pas de baseDrain (fallback OF/Export/Mods)
  if (out.baseDrain == null) {
    const candidate = srcOf?.baseDrain ?? srcOf?.drain ?? srcExp?.baseDrain ?? srcMods?.drain ?? null;
    if (candidate != null) { out.baseDrain = candidate; provenance.baseDrain = provenance.baseDrain || "mixed"; }
  }

  // ---------- Effects lisibles ----------
  const effects = [];
  // Export-based
  for (const e of asArray(srcExp?.upgradeEntries || srcExp?.stats || srcExp?.levelStats)) {
    const eff = effectFromBlock(e);
    if (eff) pushEffect(effects, eff.stat, eff.values, eff.unit);
  }
  // Overframe-based
  for (const b of asArray(srcOf?.stats || srcOf?.effects || srcOf?.values)) {
    const eff = effectFromBlock(b);
    if (eff) pushEffect(effects, eff.stat, eff.values, eff.unit);
  }
  // Warframestat (seulement si rien d’autre n’a donné des effets structurés)
  if (effects.length === 0) {
    for (const b of asArray(srcStat?.effects || srcStat?.stats || srcStat?.levelStats)) {
      const eff = effectFromBlock(b);
      if (eff) pushEffect(effects, eff.stat, eff.values, eff.unit);
    }
  }
  if (effects.length) {
    out.effects = effects;
    provenance.effects = "auto";
  }

  // ---------- LevelStats texte par rang (depuis WarframeStat si dispo) ----------
  if (Array.isArray(srcStat?.levelStats) && srcStat.levelStats.length) {
    out.levelStats = srcStat.levelStats;
    provenance.levelStats = "warframestat";
  }
  // NB: on n’écrit pas maxRank si null, de toute façon levelStats suffit.

  // ---------- RAW (uniquement si non vide) ----------
  const raw = {};
  const rx = asArray(srcExp?.upgradeEntries || srcExp?.stats || srcExp?.levelStats);
  if (rx.length) raw.export = { upgradeEntries: rx };
  const ro = asArray(srcOf?.stats || srcOf?.effects || srcOf?.values);
  if (ro.length) raw.overframe = { stats: ro };
  const rw = (Array.isArray(srcStat?.effects) && srcStat.effects.length) ||
             (Array.isArray(srcStat?.stats)   && srcStat.stats.length)   ? {
               effects: asArray(srcStat.effects),
               stats:   asArray(srcStat.stats)
             } : null;
  if (rw) raw.warframestat = rw;
  if (Object.keys(raw).length) out.raw = raw; // sinon pas de raw.*

  // ---------- Set (depuis OF sets)
  const setName = setByMod.get(k);
  if (setName) {
    out.set = setMeta.get(setName) || { name: setName };
    provenance.set = "overframe-modsets";
  }

  // --- Barrière anti-Arcane (sécurité finale) ---
  const looksArcane =
    /\barcane\b/i.test(out.name) ||
    String(out.type || "").toLowerCase().includes("arcane") ||
    (Array.isArray(out.categories) && out.categories.map(c => String(c).toLowerCase()).includes("arcane"));
  if (EXCLUDE_ARCANES && looksArcane) {
    report.push({ id, name: out.name, excluded: "arcane-detected", provenance });
    continue;
  }

  // Stockage
  result.push(out);
  report.push({
    id,
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

// ---------- CSV (aperçu ciblé) ----------
const headers = [
  "id","name","type","polarity","rarity",
  "baseDrain","fusionLimit","compatName",
  "hasLevelStats","dropsCount"
];
const lines = [headers.join(",")];
for (const m of result) {
  const line = [
    m.id, m.name, m.type||"", m.polarity||"", m.rarity||"",
    m.baseDrain ?? "", m.fusionLimit ?? "", m.compatName || "",
    Array.isArray(m.levelStats) && m.levelStats.length ? "1":"0",
    Array.isArray(m.drops) ? m.drops.length : 0
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
  lines.push(line);
}
fs.writeFileSync(OUT_CSV, lines.join("\n"), "utf-8");

console.log(`OK → ${OUT_JSON} (${result.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);
