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

// ---- Helpers dégâts/attaques
function normalizeDamageMap(dmg) {
  const out = {}; let total = 0;
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
function hydrateAttackWithItemStats(a, item) {
  if (a.critChance   == null) a.critChance   = item.criticalChance;
  if (a.critMult     == null) a.critMult     = item.criticalMultiplier;
  if (a.statusChance == null) a.statusChance = item.statusChance;
  const baseSpeed = item.attackSpeed ?? item.fireRate;
  if (a.speed == null) a.speed = baseSpeed;
  return a;
}
// (laisse maybeSwapPS défini mais on ne l’utilise plus)
function maybeSwapPS(atkDmg, baseDmg) {
  if (!atkDmg || !baseDmg) return false;
  const { puncture:pA, slash:sA } = atkDmg;
  const { puncture:pB, slash:sB } = baseDmg;
  if ([pA,sA,pB,sB].some(v => v == null)) return false;
  const eq = (x,y)=>Math.abs(Number(x)-Number(y))<=1e-3;
  if (eq(pA,sB) && eq(sA,pB)) { atkDmg.puncture = sA; atkDmg.slash = pA; return true; }
  return false;
}
function recomputeTotal(dmg) {
  if (!dmg || typeof dmg !== "object") return;
  const sum = Object.entries(dmg)
    .filter(([k]) => k !== "total")
    .reduce((s,[,v]) => s + (Number(v)||0), 0);
  dmg.total = Math.round(sum * 1000) / 1000;
}
function indexByName(arr, nameSel) {
  const m = new Map();
  for (const it of asArray(arr)) {
    const n = nameSel(it); if (!n) continue;
    m.set(keyify(n), it);
  }
  return m;
}

// ---- Mapping Export DE → damageTypes (ordre damagePerShot)
const DAMAGE_KEYS = [
  "impact","puncture","slash","heat","cold","electricity","toxin",
  "blast","radiation","gas","magnetic","viral","corrosive",
  "void","tau","cinematic","shieldDrain","healthDrain","energyDrain","true"
];
function mapExportDamage(ex) {
  const arr = ex && Array.isArray(ex.damagePerShot) ? ex.damagePerShot : null;
  if (!arr) return null;
  const out = {};
  let total = 0;
  for (let i = 0; i < Math.min(arr.length, DAMAGE_KEYS.length); i++) {
    const v = Number(arr[i]) || 0;
    if (v > 0) { out[DAMAGE_KEYS[i]] = v; total += v; }
  }
  if (total > 0) out.total = Math.round(total * 1000) / 1000;
  return out;
}

// Charge datasets
const WFSTAT = asArray(readIf(P_WFSTAT) || []);
const EXP_RAW = readIf(P_EXPORT);
let EXPORT = [];
if (Array.isArray(EXP_RAW)) EXPORT = EXP_RAW;
else if (EXP_RAW && Array.isArray(EXP_RAW.ExportWeapons)) EXPORT = EXP_RAW.ExportWeapons;
else EXPORT = asArray(EXP_RAW || []);
const OF_RAW = readIf(P_OF_ITEMS);
let OVERFRAME = [];
if (Array.isArray(OF_RAW)) OVERFRAME = OF_RAW;
else if (OF_RAW && typeof OF_RAW === "object") OVERFRAME = Object.values(OF_RAW);

// Index
const mExport = indexByName(EXPORT, (o) => o.name || o.displayName || o.uniqueName);
const mOver   = indexByName(OVERFRAME, (o) => o.name);

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

// Flags & heuristique
function flagsFromName(n) {
  const s = String(n || "").toLowerCase();
  return { isPrime:/\bprime\b/.test(s), isUmbra:/\bumbra\b/.test(s), isWraith:/\bwraith\b/.test(s), isDex:/\bdex\b/.test(s) };
}
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

// Build
const out = [];
let wfcdHits = 0, expHits = 0, ofHits = 0, heuristicHits = 0;

for (const w of WFSTAT) {
  const name = clean(w.name || w.weaponName);
  if (!name) continue;

  let subtype = subtypeFromWFCD(name);
  if (subtype) wfcdHits++; else { subtype = subtypeHeuristic(w.type, name); if (subtype) heuristicHits++; }
  if (!subtype) continue;

  const of = mOver.get(keyify(name)); if (of) ofHits++;
  const ex = mExport.get(keyify(name)); if (ex) expHits++;

  const slug = of?.slug ? String(of.slug) : (w.slug ? String(w.slug) : slugify(name));
  const id   = of?.id   ? String(of.id)   : (w.uniqueName || w._id || slug);

  const flags = flagsFromName(name);

  const item = {
    id, slug, name,
    categories: ["weapon"],
    subtype,
    type: w.type ?? undefined,
    masteryReq: w.masteryReq ?? w.mastery ?? undefined,
    disposition: w.disposition ?? undefined,
    trigger: w.trigger ?? undefined,
    accuracy: w.accuracy ?? undefined,
    noise: w.noise ?? undefined,
    criticalChance: w.criticalChance ?? w.critChance ?? undefined,
    criticalMultiplier: w.criticalMultiplier ?? w.critMultiplier ?? undefined,
    statusChance: w.procChance ?? w.statusChance ?? undefined,
    fireRate: w.fireRate ?? undefined,   // renommé → attackSpeed si melee
    damageTypes: w.damageTypes || w.damage || undefined,
    polarities: w.polarities || undefined,
    ...flags
  };

  // Compléments Export
  if (ex) {
    if (item.type === undefined && ex.type) item.type = ex.type;
    if (item.criticalChance === undefined && ex.criticalChance != null) item.criticalChance = ex.criticalChance;
    if (item.criticalMultiplier === undefined && ex.criticalMultiplier != null) item.criticalMultiplier = ex.criticalMultiplier;
    if (item.statusChance === undefined && ex.procChance != null) item.statusChance = ex.procChance;
    if (item.fireRate === undefined && ex.fireRate != null) item.fireRate = ex.fireRate;

    // ✅ Préférence aux dégâts DE (damagePerShot) s'ils sont dispo
    const exDmg = mapExportDamage(ex);
    if (exDmg && Object.keys(exDmg).length) {
      item.damageTypes = exDmg; // ex: Acceltra → impact 26, puncture 35.2, slash 8.8, total 70
    } else if (!item.damageTypes && (ex.damageTypes || ex.damage)) {
      item.damageTypes = ex.damageTypes || ex.damage;
    }
  }

  // Description
  const descriptionText = w.description || ex?.description || "";
  if (descriptionText) item.description = clean(descriptionText);

  // Attaques
  let attacks = [];
  if (Array.isArray(w.attacks) && w.attacks.length) {
    attacks = w.attacks.map(a => hydrateAttackWithItemStats({
      name: a.name || "Primary Fire",
      speed: a.speed,
      critChance: pctToFrac(a.crit_chance),
      critMult: a.crit_mult,
      statusChance: pctToFrac(a.status_chance),
      shotType: a.shot_type,
      shotSpeed: a.shot_speed ?? a.flight,
      chargeTime: a.charge_time,
      falloff: a.falloff ? { ...a.falloff } : undefined,
      damage: normalizeDamageMap(a.damage || {})
    }, item)).filter(Boolean);
  }
  if (!attacks.length) {
    attacks = [hydrateAttackWithItemStats({ name:"Primary Fire", damage: normalizeDamageMap(item.damageTypes || {}) }, item)];
  }
  for (const atk of attacks) {
    // ⛔ On NE swap plus Puncture/Slash automatiquement — on respecte WFStat tel quel
    // if (maybeSwapPS(atk.damage, item.damageTypes)) { /* swap P/S */ }
    recomputeTotal(atk.damage);
  }
  item.attacks = attacks;

  // damageTypes final (on garde le top-level référence, normalisé/arrondi)
  if (item.damageTypes) item.damageTypes = normalizeDamageMap(item.damageTypes);

  // Spécifique mêlée
  const isMelee = (item.subtype === "melee") || (String(item.type||"").toLowerCase() === "melee");
  if (isMelee) {
    if (item.fireRate !== undefined) { item.attackSpeed = item.fireRate; delete item.fireRate; }
    const meleeFields = [
      "range","slideAttack",
      "slamAttack","slamRadialDamage","slamRadius",
      "heavyAttackDamage","heavySlamAttack","heavySlamRadialDamage","heavySlamRadius",
      "comboDuration","followThrough","windUp","blockingAngle","stancePolarity","damageBlock"
    ];
    for (const f of meleeFields) {
      if (w[f] != null) item[f] = w[f]; else if (ex && ex[f] != null) item[f] = ex[f];
    }
    for (const atk of item.attacks) {
      if ("speed" in atk) { atk.attackSpeed = atk.speed; delete atk.speed; }
    }
  }

  out.push(item);
}

// Sorties
out.sort((a,b)=>a.name.localeCompare(b.name));
fs.writeFileSync(path.join(DATA, "enriched_weapons.json"), JSON.stringify(out, null, 2), "utf-8");

const report = { total: out.length, hits: { wfcd: wfcdHits, export: expHits, overframe: ofHits, heuristicSubtype: heuristicHits } };
fs.writeFileSync(path.join(DATA, "enriched_weapons_report.json"), JSON.stringify(report, null, 2), "utf-8");

console.log(`OK → enriched_weapons.json (${out.length})`);
console.log("Hits:", report.hits);
