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
const P_WFSTAT   = path.join(DATA, "wfstat_weapons.json");
const P_EXPORT   = path.join(DATA, "ExportWeapons_en.json");
const P_OF_ITEMS = path.join(OF,   "overframe-items.json");

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
const readIf  = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : null);
const asArray = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);
const clean   = (s) => String(s ?? "").replace(/<[^>]+>\s*/g, "").trim();
const keyify  = (s) => clean(s).toLowerCase().replace(/[\s\-–_'"`]+/g, " ").replace(/\s+/g, " ");
const slugify = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---- Helpers dégâts/attaques ----
function normalizeDamageMap(dmg) {
  const out = {};
  let total = 0;
  if (!dmg || typeof dmg !== "object") return out;
  for (const [k, v] of Object.entries(dmg)) {
    if (k === "total") continue;
    const val = Number(v) || 0;
    if (val > 0) { out[k] = val; total += val; }
  }
  if (total > 0) out.total = Math.round(total * 1000) / 1000; // anti 70.0000002
  return out;
}
const pctToFrac = (v) => (v == null ? undefined : Number(v) / 100);

function hydrateAttackWithItemStats(attack, item) {
  attack.critChance   = attack.critChance   ?? item.criticalChance;
  attack.critMult     = attack.critMult     ?? item.criticalMultiplier;
  attack.statusChance = attack.statusChance ?? item.statusChance;
  const baseSpeed = item.attackSpeed ?? item.fireRate;
  attack.speed = attack.speed ?? baseSpeed;
  return attack;
}

// Swapper Puncture/Slash si clairement inversés vs dégâts globaux
function maybeSwapPS(atkDmg, baseDmg) {
  if (!atkDmg || !baseDmg) return false;
  const pA = atkDmg.puncture, sA = atkDmg.slash;
  const pB = baseDmg.puncture, sB = baseDmg.slash;
  if (pA == null || sA == null || pB == null || sB == null) return false;
  const eq = (a,b) => Math.abs(Number(a) - Number(b)) <= 1e-3;
  if (eq(pA, sB) && eq(sA, pB)) { atkDmg.puncture = sA; atkDmg.slash = pA; return true; }
  return false;
}
function recomputeTotal(dmg) {
  if (!dmg || typeof dmg !== "object") return;
  const sum = Object.entries(dmg)
    .filter(([k]) => k !== "total")
    .reduce((s, [,v]) => s + (Number(v)||0), 0);
  dmg.total = Math.round(sum * 1000) / 1000;
}

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

// Export peut être un objet { ExportWeapons: [...] } ou un tableau direct
const EXP_RAW = readIf(P_EXPORT);
let EXPORT = [];
if (Array.isArray(EXP_RAW)) {
  EXPORT = EXP_RAW;
} else if (EXP_RAW && Array.isArray(EXP_RAW.ExportWeapons)) {
  EXPORT = EXP_RAW.ExportWeapons;
} else {
  EXPORT = asArray(EXP_RAW || []);
}

const OF_RAW = readIf(P_OF_ITEMS);
let OVERFRAME = [];
if (Array.isArray(OF_RAW)) {
  OVERFRAME = OF_RAW;
} else if (OF_RAW && typeof OF_RAW === "object") {
  OVERFRAME = Object.values(OF_RAW);
}

const mExport = indexByName(EXPORT, (o) => o.name || o.displayName || o.uniqueName);
const mOver   = indexByName(OVERFRAME, (o) => o.name);

// WFCD maps
const mWfcd = {};
for (const [sub, p] of Object.entries(WFCD_FILES)) {
  const data = readIf(p);
  mWfcd[sub] = indexByName(asArray(data || []), (o) => o.name);
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
  const n = String(name||"").toLowerCase();
  if (/arquebex|morgha|kuva grattler|grattler|velocitus|larkspur/.test(n)) return "archgun";
  return null;
}

// Construction
const out = [];
let wfcdHits = 0, expHits = 0, ofHits = 0, heuristicHits = 0;

for (
