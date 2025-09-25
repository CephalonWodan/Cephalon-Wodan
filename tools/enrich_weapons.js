// tools/enrich_weapons.js
import fs from 'fs';
import path from 'path';

// Définition des chemins
const DATA_DIR   = path.resolve('data');
const OF_DIR     = path.join(DATA_DIR, 'overframe');
const WFCD_DIR   = path.join(DATA_DIR, 'wfcd_items');

const P_EXPORT   = path.join(DATA_DIR, 'ExportWeapons_en.json');
const P_OFITEMS  = path.join(OF_DIR,   'overframe-items.json');
const P_OFMODULAR= path.join(OF_DIR,   'overframe-modularparts.json');

// Fichiers WFCD susceptibles d’exister (mettre à jour selon votre repo)
const WFCD_FILES = {
  primary:    path.join(WFCD_DIR, 'Primary.json'),
  secondary:  path.join(WFCD_DIR, 'Secondary.json'),
  melee:      path.join(WFCD_DIR, 'Melee.json'),
  archgun:    path.join(WFCD_DIR, 'Arch-Gun.json'),
  archmelee:  path.join(WFCD_DIR, 'Arch-Melee.json'),
  zaw:        path.join(WFCD_DIR, 'Zaws.json'),
  kitgun:     path.join(WFCD_DIR, 'Kitguns.json')
};

// Fonctions utilitaires
const asArray = (v) => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
const readIf  = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null;
const clean   = (s) => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
const slugify = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

// Normalisation de clé de nom pour faire correspondre les sources
function keyifyName(name) {
  return clean(name).toLowerCase().replace(/[\s\-–_'"`]+/g, ' ').replace(/\s+/g,' ').trim();
}

// Lecture des sources
const A_export   = asArray(readIf(P_EXPORT));
const A_ofItems  = asArray(readIf(P_OFITEMS));
const A_ofMods   = asArray(readIf(P_OFMODULAR));
const M_wfcd     = {};
for (const [sub, p] of Object.entries(WFCD_FILES)) {
  M_wfcd[sub] = asArray(readIf(p) || []);
}

// Construction d’index par nom
function mapByName(arr, nameFn) {
  const m = new Map();
  for (const it of arr) {
    const n = nameFn(it);
    if (!n) continue;
    m.set(keyifyName(n), it);
  }
  return m;
}

const mapExport   = mapByName(A_export,  (o) => o.name || o.uniqueName || o.displayName);
const mapOfItems  = mapByName(A_ofItems, (o) => o.name);
const mapOfMods   = mapByName(A_ofMods,  (o) => o.name);
const mapWfcd     = {};
for (const [sub, arr] of Object.entries(M_wfcd)) {
  mapWfcd[sub] = mapByName(arr, (o) => o.name);
}

// Fonction pour déduire la sous‑catégorie (subtype)
function inferSubtype(exportObj, wfcdMaps) {
  // On tente d’abord la classification WFCD
  for (const [sub, m] of Object.entries(wfcdMaps)) {
    if (m.has(keyifyName(exportObj.name))) return sub;
  }
  // À défaut, on se base sur le type DE (WeaponCategory dans Export)
  const cat = String(exportObj?.type || '').toLowerCase();
  if (/archgun/.test(cat)) return 'archgun';
  if (/arch.*melee/.test(cat)) return 'archmelee';
  if (/bow|rifle|shotgun|sniper|assault/.test(cat)) return 'primary';
  if (/pistol|dual/.test(cat)) return 'secondary';
  if (/melee|blade|polearm/.test(cat)) return 'melee';
  return 'primary';
}

// Fusion principale
const result = [];
const report = [];

for (const key of new Set([
  ...mapExport.keys(),
  ...mapOfItems.keys(),
  ...mapOfMods.keys(),
  ...Object.values(mapWfcd).flatMap(m => m.keys())
])) {
  const srcExp = mapExport.get(key);
  const srcOF  = mapOfItems.get(key);
  const srcMod = mapOfMods.get(key);

  // Agrégation WFCD : on récupère la première occurrence d’un sous‑ensemble
  let subType = null;
  for (const sub of Object.keys(mapWfcd)) {
    if (mapWfcd[sub].has(key)) { subType = sub; break; }
  }

  // Nom
  const name = clean(srcOF?.name || srcExp?.name);
  if (!name) continue;
  const slug = slugify(name);

  // Id : on préfère l’id Overframe s’il est numérique, sinon slug
  const id = String(srcOF?.id || slug).trim();

  // Ensemble de provenance
  const provenance = {};

  const out = { id, slug, name, categories: ['weapon'] };
  // Sous‑catégorie
  out.subtype = subType || inferSubtype(srcExp || {}, mapWfcd);
  provenance.subtype = subType ? 'wfcd' : 'heuristic';

  // Type complet (ex : "Rifle", "Pistol") s’il existe
  if (srcExp?.type) {
    out.type = srcExp.type;
    provenance.type = 'export';
  } else if (srcOF?.type) {
    out.type = srcOF.type;
    provenance.type = 'overframe';
  }

  // Rareté (si disponible dans WFCD ou Overframe)
  const rar = srcExp?.rarity || srcOF?.rarity;
  if (rar) { out.rarity = rar; provenance.rarity = srcExp?.rarity ? 'export' : 'overframe'; }

  // Statistiques principales (dégâts, critique, statut, etc.)
  // Ces champs doivent être adaptés selon vos besoins ; on concatène sans déduplication.
  const stats = {};
  if (srcExp) {
    stats.damage = srcExp?.damage?.split(',') || srcExp?.damageTypes;
    stats.critChance = srcExp?.criticalChance;
    stats.critMultiplier = srcExp?.criticalMultiplier;
    stats.statusChance = srcExp?.procChance;
    stats.fireRate = srcExp?.fireRate;
  }
  if (srcOF) {
    stats.damage = stats.damage || srcOF?.damageTypes;
    stats.critChance = stats.critChance || srcOF?.critChance;
    stats.critMultiplier = stats.critMultiplier || srcOF?.critMultiplier;
    stats.statusChance = stats.statusChance || srcOF?.statusChance;
    stats.fireRate = stats.fireRate || srcOF?.fireRate;
  }
  // Nettoyage des valeurs vides
  for (const [k, v] of Object.entries(stats)) {
    if (v !== undefined && v !== null) out[k] = v;
  }

  // Flag pour savoir si l’arme est Prime / Umbra / Wraith etc.
  const lname = name.toLowerCase();
  out.isPrime = /prime\b/.test(lname);
  out.isUmbra = /\bumbra\b/.test(lname);
  out.isWraith = /\bwraith\b/.test(lname);
  out.isDex = /\bdex\b/.test(lname);

  // Sources globales
  out.source = {
    export: !!srcExp,
    overframe: !!srcOF,
    wfcd: !!subType,
    modular: !!srcMod
  };

  result.push(out);
  report.push({ slug, name: out.name, provenance });
}

// Ordre alphabétique
result.sort((a,b) => a.name.localeCompare(b.name));

// Sorties
fs.writeFileSync(path.join(DATA_DIR, 'enriched_weapons.json'), JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'enriched_weapons_report.json'), JSON.stringify(report, null, 2));

// Génération rapide d’un CSV
const headers = ['id','slug','name','subtype','rarity','type','isPrime','isUmbra','isWraith','isDex'];
const csvLines = [headers.join(',')];
for (const w of result) {
  const row = headers.map(h => `"${String(w[h] ?? '').replace(/"/g,'""')}"`);
  csvLines.push(row.join(','));
}
fs.writeFileSync(path.join(DATA_DIR, 'enriched_weapons.csv'), csvLines.join('\n'));
console.log(`OK: ${result.length} armes enrichies`);
