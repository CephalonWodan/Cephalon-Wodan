// tools/enrich_weapons.js
// Base: data/wfstat_weapons.json (WFStat.us)
// Compléments: WFCD (catégorisation fine), ExportWeapons_en.json (stats), Overframe (ID/slug éventuel)
// Produit: data/enriched_weapons.json + data/enriched_weapons_report.json

import fs from "fs";
import path from "path";

const DATA = path.resolve("data");
const OF   = path.join(DATA, "overframe");
const WFCD = path.join(DATA, "wfcd_items");

// Entrées
const P_WFSTAT = path.join(DATA, "wfstat_weapons.json");
const P_EXPORT = path.join(DATA, "ExportWeapons_en.json");
const P_OF_ITEMS = path.join(OF, "overframe-items.json");

// WFCD categorisation
const WFCD_FILES = {
  primary:   path.join(WFCD, "Primary.json"),
  secondary: path.join(WFCD, "Secondary.json"),
  melee:     path.join(WFCD, "Melee.json"),
  archgun:   path.join(WFCD, "Arch-Gun.json"),
  archmelee: path.join(WFCD, "Arch-Melee.json"),
  zaw:       path.join(WFCD, "Zaws.json"),
  kitgun:    path.join(WFCD, "Kitguns.json"),
};

// Utils
const readIf = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : null);
const asArray = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);
const clean = (s) => String(s ?? "").replace(/<[^>]+>\s*/g, "").trim();
const keyify = (s) => clean(s).toLowerCase().replace(/[\s\-–_'"`]+/g, " ").replace(/\s+/g, " ");
const slugify = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function indexByName(arr, nameSel) {
  const m = new Map();
  for (const it of asArray(arr)) {
    const n = nameSel(it);
    if (!n) continue;
    m.set(keyify(n), it);
  }
  return m;
}

// Charge datasets
const WFSTAT = asArray(readIf(P_WFSTAT) || []);
const EXPORT = asArray(readIf(P_EXPORT) || []);
const OFITEM = asArray(readIf(P_OF_ITEMS) || []);

const mExport = indexByName(EXPORT, (o) => o.name || o.displayName || o.uniqueName);
const mOver   = indexByName(OFITEM, (o) => o.name);

// WFCD maps
const mWfcd = {};
for (const [sub, p] of Object.entries(WFCD_FILES)) {
  mWfcd[sub] = indexByName(asArray(readIf(p) || []), (o) => o.name);
}
function subtypeFromWFCD(name) {
  const k = keyify(name);
  for (const [sub, map] of Object.entries(mWfcd)) if (map.has(k)) return sub;
  return null;
}

// Flags
function flagsFromName(n) {
  const s = String(n || "").toLowerCase();
  return {
    isPrime:  /\bprime\b/.test(s),
    isUmbra:  /\bumbra\b/.test(s),
    isWraith: /\bwraith\b/.test(s),
    isDex:    /\bdex\b/.test(s),
  };
}

// Mapping WFStat → subtype (filet de sécurité si WFCD ne tranche pas)
function subtypeHeuristic(wfType, name) {
  const t = String(wfType || "").toLowerCase();
  if (/arch-?gun/.test(t)) return "archgun";
  if (/arch-?melee/.test(t)) return "archmelee";
  if (/kitgun/.test(t)) return "kitgun";
  if (/zaw/.test(t)) return "zaw";
  if (/melee/.test(t)) return "melee";
  if (/secondary|pistol|dual/.test(t)) return "secondary";
  if (/primary|rifle|shotgun|sniper|bow|assault/.test(t)) return "primary";
  // quelques hints dans le nom
  const n = String(name||"").toLowerCase();
  if (/arquebex|morgha|kuva grattler|grattler|velocitus|larkspur/.test(n)) return "archgun";
  return null;
}

// Construction
const out = [];
let wfcdHits = 0, expHits = 0, ofHits = 0, heuristicHits = 0;

for (const w of WFSTAT) {
  const name = clean(w.name || w.weaponName);
  if (!name) continue;

  // Sous-type par WFCD d’abord
  let subtype = subtypeFromWFCD(name);
  if (subtype) wfcdHits++;
  if (!subtype) {
    subtype = subtypeHeuristic(w.type, name);
    if (subtype) heuristicHits++;
  }
  if (!subtype) {
    // On reste strict : si on ne sait pas classer → on ignore
    continue;
  }

  // overframe (id/slug pratiques si présents)
  const of = mOver.get(keyify(name));
  if (of) ofHits++;

  // export (stats éventuelles)
  const ex = mExport.get(keyify(name));
  if (ex) expHits++;

  // id/slug
  const slug = of?.slug ? String(of.slug) : (w.slug ? String(w.slug) : slugify(name));
  const id   = of?.id   ? String(of.id)   : (w.uniqueName || w._id || slug);

  const flags = flagsFromName(name);

  const item = {
    id, slug, name,
    categories: ["weapon"],
    subtype,
    // champs WFStat utiles (non exhaustif)
    type: w.type || undefined,
    masteryReq: w.masteryReq ?? w.mastery ?? undefined,
    disposition: w.disposition ?? undefined,
    trigger: w.trigger ?? undefined,
    accuracy: w.accuracy ?? undefined,
    noise: w.noise ?? undefined,
    // dégâts/crit/status si présents
    criticalChance: w.criticalChance ?? w.critChance ?? undefined,
    criticalMultiplier: w.criticalMultiplier ?? w.critMultiplier ?? undefined,
    statusChance: w.procChance ?? w.statusChance ?? undefined,
    fireRate: w.fireRate ?? undefined,
    damageTypes: w.damageTypes || w.damage || undefined,
    polarities: w.polarities || undefined,
    // flags dérivés
    ...flags,
    // provenance
    source: {
      wfstat: true,
      wfcd: !!subtypeFromWFCD(name),
      export: !!ex,
      overframe: !!of
    }
  };

  // Compléments export si absents
  if (ex) {
    if (item.type === undefined && ex.type) item.type = ex.type;
    if (item.criticalChance === undefined && ex.criticalChance) item.criticalChance = ex.criticalChance;
    if (item.criticalMultiplier === undefined && ex.criticalMultiplier) item.criticalMultiplier = ex.criticalMultiplier;
    if (item.statusChance === undefined && ex.procChance) item.statusChance = ex.procChance;
    if (item.fireRate === undefined && ex.fireRate) item.fireRate = ex.fireRate;
    if (!item.damageTypes && (ex.damageTypes || ex.damage)) item.damageTypes = ex.damageTypes || ex.damage;
  }

  out.push(item);
}

// Sorties
out.sort((a,b)=>a.name.localeCompare(b.name));
fs.writeFileSync(path.join(DATA, "enriched_weapons.json"), JSON.stringify(out, null, 2), "utf-8");

const report = {
  total: out.length,
  hits: { wfcd: wfcdHits, export: expHits, overframe: ofHits, heuristicSubtype: heuristicHits }
};
fs.writeFileSync(path.join(DATA, "enriched_weapons_report.json"), JSON.stringify(report, null, 2), "utf-8");

console.log(`OK → enriched_weapons.json (${out.length})`);
console.log(`Hits:`, report.hits);