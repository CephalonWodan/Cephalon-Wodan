// tools/enrich_weapons.js
// Refactor: garde seulement les vraies armes, classe les parts, et nettoie les faux positifs.

import fs from "fs";
import path from "path";

// ----------------------- Chemins -----------------------
const DATA_DIR = path.resolve("data");
const OF_DIR   = path.join(DATA_DIR, "overframe");
const WFCD_DIR = path.join(DATA_DIR, "wfcd_items");

const P_EXPORT    = path.join(DATA_DIR, "ExportWeapons_en.json");
const P_OF_ITEMS  = path.join(OF_DIR, "overframe-items.json");
const P_OF_MODS   = path.join(OF_DIR, "overframe-modularparts.json");

// Fichiers WFCD (autorité pour la liste d’armes complètes)
const WFCD_FILES = {
  primary:    path.join(WFCD_DIR, "Primary.json"),
  secondary:  path.join(WFCD_DIR, "Secondary.json"),
  melee:      path.join(WFCD_DIR, "Melee.json"),
  archgun:    path.join(WFCD_DIR, "Arch-Gun.json"),
  archmelee:  path.join(WFCD_DIR, "Arch-Melee.json"),
  kitgun:     path.join(WFCD_DIR, "Kitguns.json"),
  zaw:        path.join(WFCD_DIR, "Zaws.json"),
};

// ----------------------- Helpers -----------------------
const readIf = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : null);
const asArray = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);
const clean = (s) => String(s ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();
const slugify = (s) =>
  clean(s).toLowerCase().replace(/<[^>]+>\s*/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const keyName = (s) =>
  clean(s).toLowerCase().replace(/<[^>]+>\s*/g, "").replace(/[\s\-–_'"`]+/g, " ").replace(/\s+/g, " ").trim();

const PRIME_RX = /\bprime\b/i;
const UMBRA_RX = /\bumbra\b/i;
const WRAITH_RX = /\bwraith\b/i;
const DEX_RX = /\bdex\b/i;

// Pour détecter des pièces d’armes et remonter le parent
const PART_WORDS = [
  "barrel","receiver","stock","blade","handle","guard","string","upper limb","lower limb",
  "ornament","gauntlet","link","rivet","casing","capsule","engine","weapon pod","grip","strike","pommel"
];
const PART_RX = new RegExp(`\\b(${PART_WORDS.map(w => w.replace(/\s+/g,"\\s+")).join("|")})\\b`, "i");

// Faux positifs fréquents à exclure du set “armes”
const EXCLUDE_HINTS = [
  // Warframes & pieces
  "chassis","neuroptics","systems",
  // Archwings & pièces
  "harness","wings",
  // Ressources / tokens / matériaux / segments / compagnons
  "alloy","plate","crystal","toroid","engine","segment","tag","debt-bond","shard","scale","alloy",
  "resource","blueprint","bp","kavat","kubrow","hound","moa","drone","gyro","battery"
];

const EXCLUDE_RX = new RegExp(`\\b(${EXCLUDE_HINTS.map(w => w.replace(/\s+/g,"\\s+")).join("|")})\\b`, "i");

// ------------------- Lecture des sources -------------------
const EXP_WEAPONS = asArray(readIf(P_EXPORT));                // optionnel
const OF_ITEMS    = asArray(readIf(P_OF_ITEMS));              // items OF (bruit + parts utiles)
const OF_MODPARTS = asArray(readIf(P_OF_MODS));               // parts modulaires

const WFCD = {};
for (const [sub, p] of Object.entries(WFCD_FILES)) WFCD[sub] = asArray(readIf(p) || []);

// Index simples par nom
function mapByName(arr, pickName) {
  const m = new Map();
  for (const it of arr) {
    const n = pickName(it);
    if (!n) continue;
    m.set(keyName(n), it);
  }
  return m;
}

const mapExport = mapByName(EXP_WEAPONS, (o) => o.name || o.displayName || o.uniqueName);
const mapOF     = mapByName(OF_ITEMS,    (o) => o.name);
const mapMod    = mapByName(OF_MODPARTS, (o) => o.name);
const mapWFCD   = {};
for (const [sub, arr] of Object.entries(WFCD)) mapWFCD[sub] = mapByName(arr, (o) => o.name);

// ------------------- Classification -------------------
function subtypeFromWFCD(nameKey) {
  for (const [sub, m] of Object.entries(mapWFCD)) if (m.has(nameKey)) return sub;
  return null;
}

function isWeaponName(name) {
  // On accepte si présent dans WFCD (source d’autorité) ou ExportWeapons
  const k = keyName(name);
  if (subtypeFromWFCD(k)) return true;
  if (mapExport.has(k)) return true;
  return false;
}

function isPartName(name) {
  return PART_RX.test(name);
}

function isClearlyExcluded(name) {
  return EXCLUDE_RX.test(name);
}

function parentNameFromPart(name) {
  // Exemple: "Afuris Prime Barrel" => "Afuris Prime"
  // On enlève le mot de pièce terminal s’il est présent
  let base = clean(name);
  base = base.replace(PART_RX, "").replace(/\s{2,}/g, " ").trim();
  // cas “Upper Limb / Lower Limb”
  base = base.replace(/\b(upper|lower)\s+limb\b/i, "").trim();
  return base || null;
}

// ------------------- Fusion -------------------
const result = [];
const report = [];

function pushWeapon(base) {
  const name = clean(base.name);
  if (!name) return;

  // Filtre brut : pas de frame/archwing/resources/etc.
  if (isClearlyExcluded(name) && !isPartName(name)) return;

  const id   = String(base.id ?? base.uniqueName ?? slugify(name));
  const slug = slugify(name);

  const out = {
    id, slug, name,
    categories: ["weapon"],
    isPrime: PRIME_RX.test(name),
    isUmbra: UMBRA_RX.test(name),
    isWraith: WRAITH_RX.test(name),
    isDex: DEX_RX.test(name),
    source: { export: false, overframe: false, wfcd: false, modular: false }
  };
  const prov = {};

  // subtype depuis WFCD si possible
  const k = keyName(name);
  const subWFCD = subtypeFromWFCD(k);
  if (subWFCD) {
    out.subtype = subWFCD; prov.subtype = "wfcd"; out.source.wfcd = true;
  }

  // fallback : ExportWeapons type
  const exp = mapExport.get(k);
  if (exp) {
    out.source.export = true;
    if (!out.subtype) {
      const t = String(exp.type || "").toLowerCase();
      if (/arch-?gun/.test(t)) out.subtype = "archgun";
      else if (/arch.*melee/.test(t)) out.subtype = "archmelee";
      else if (/melee/.test(t)) out.subtype = "melee";
      else if (/pistol|secondary/.test(t)) out.subtype = "secondary";
      else out.subtype = "primary";
      prov.subtype ??= "export-heuristic";
    }
    // quelques stats de base si dispo
    if (exp.criticalChance != null) out.critChance = exp.criticalChance;
    if (exp.criticalMultiplier != null) out.critMultiplier = exp.criticalMultiplier;
    if (exp.procChance != null) out.statusChance = exp.procChance;
    if (exp.fireRate != null) out.fireRate = exp.fireRate;
  }

  // overframe presence
  if (mapOF.has(k)) out.source.overframe = true;

  // modular parts (sert à tagger kitgun/zaw si besoin)
  if (mapMod.has(k)) out.source.modular = true;

  // Si on n’a aucune preuve que c’est une arme complète (WFCD ou Export), on ne garde pas (sauf si c’est une part)
  const keepAsWholeWeapon = out.source.wfcd || out.source.export;

  if (keepAsWholeWeapon) {
    // Forcer subtype kitgun/zaw si le nom/mapping le suggère
    if (!out.subtype) out.subtype = "primary";
    result.push(out);
    report.push({ slug, name: out.name, type: "weapon", provenance: prov });
  }
}

function pushPart(base) {
  const name = clean(base.name);
  if (!name || !isPartName(name)) return;

  const id   = String(base.id ?? base.uniqueName ?? slugify(name));
  const slug = slugify(name);

  const parentName = parentNameFromPart(name);
  const parentSlug = parentName ? slugify(parentName) : null;

  const out = {
    id, slug, name,
    categories: ["weapon","part"],
    parentSlug,
    source: { export: false, overframe: false, wfcd: false, modular: false }
  };

  const k = keyName(name);
  if (mapOF.has(k)) out.source.overframe = true;
  if (mapMod.has(k)) out.source.modular = true;

  // On ne met pas de subtype pour les parts ; c’est l’arme parente qui sera typée
  result.push(out);
  report.push({ slug, name: out.name, type: "part", parentSlug });
}

// 1) Autorité WFCD : toutes les armes listées par WFCD (peu de bruit)
for (const [sub, arr] of Object.entries(WFCD)) {
  for (const it of arr) pushWeapon({ ...it, subtype: sub });
}

// 2) ExportWeapons (si présent) : ajoute les armes absentes de WFCD (au cas où)
for (const it of EXP_WEAPONS || []) {
  if (isWeaponName(it.name)) pushWeapon(it);
}

// 3) Overframe items : uniquement pour compléter par des parts, pas pour créer de nouvelles “armes”
for (const it of OF_ITEMS) {
  // parts claires
  if (isPartName(it.name)) pushPart(it);
  // ignorer le reste (trop de bruit dans OF_items pour les “armes”)
}

// 4) Overframe modular parts : parts Zaw/Kitgun
for (const it of OF_MODPARTS) {
  pushPart(it);
}

// Dé-duplication par slug (on garde le plus “riche” en sources)
const bySlug = new Map();
for (const w of result) {
  const prev = bySlug.get(w.slug);
  if (!prev) { bySlug.set(w.slug, w); continue; }
  // merge sources + champs utiles
  const merged = { ...prev, ...w };
  merged.source = {
    export: prev.source.export || w.source.export,
    overframe: prev.source.overframe || w.source.overframe,
    wfcd: prev.source.wfcd || w.source.wfcd,
    modular: prev.source.modular || w.source.modular,
  };
  if (!merged.subtype && w.subtype) merged.subtype = w.subtype;
  bySlug.set(w.slug, merged);
}

// Tri
const final = Array.from(bySlug.values()).sort((a,b) => a.name.localeCompare(b.name));

// Écritures
fs.writeFileSync(path.join(DATA_DIR, "enriched_weapons.json"), JSON.stringify(final, null, 2));
fs.writeFileSync(path.join(DATA_DIR, "enriched_weapons_report.json"), JSON.stringify(report, null, 2));

// CSV court
const headers = ["id","slug","name","categories","subtype","parentSlug","isPrime","isUmbra","isWraith","isDex"];
const lines = [headers.join(",")];
for (const w of final) {
  const row = headers.map(h => {
    const v = Array.isArray(w[h]) ? w[h].join("|") : (w[h] ?? "");
    return `"${String(v).replace(/"/g,'""')}"`;
  });
  lines.push(row.join(","));
}
fs.writeFileSync(path.join(DATA_DIR, "enriched_weapons.csv"), lines.join("\n"));

console.log(`OK: ${final.length} entrées (armes & parts)`);
