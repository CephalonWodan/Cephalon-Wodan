// tools/enrich_weapons.js
// Base: data/wfstat_weapons.json (WFStat.us)
// Compléments: WFCD (catégorisation fine), ExportWeapons_en.json (stats), Overframe (ID/slug éventuel)
// Produit: data/enriched_weapons.json + data/enriched_weapons_report.json

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA = path.resolve('data');
const OF   = path.join(DATA, 'overframe');
const WFCD = path.join(DATA, 'wfcd_items');

// Entrées
const P_WFSTAT   = path.join(DATA, 'wfstat_weapons.json');
const P_EXPORT   = path.join(DATA, 'ExportWeapons_en.json');
const P_OF_ITEMS = path.join(OF,   'overframe-items.json');

// WFCD categorisation
const WFCD_FILES = {
  primary:   path.join(WFCD, 'Primary.json'),
  secondary: path.join(WFCD, 'Secondary.json'),
  melee:     path.join(WFCD, 'Melee.json'),
  archgun:   path.join(WFCD, 'Arch-Gun.json'),
  archmelee: path.join(WFCD, 'Arch-Melee.json'),
  zaw:       path.join(WFCD, 'Zaws.json'),
  kitgun:    path.join(WFCD, 'Kitguns.json'),
};

// Utils
function readIf(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null;
}
function asArray(v) {
  return Array.isArray(v) ? v : (v ? Object.values(v) : []);
}
function clean(s) {
  return String(s == null ? '' : s).replace(/<[^>]+>\s*/g, '').trim();
}
function keyify(s) {
  return clean(s).toLowerCase().replace(/[\s\-–_'"`]+/g, ' ').replace(/\s+/g, ' ');
}
function slugify(s) {
  return clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---- Helpers dégâts/attaques ----
function normalizeDamageMap(dmg) {
  const out = {};
  let total = 0;
  if (!dmg || typeof dmg !== 'object') return out;
  for (const k of Object.keys(dmg)) {
    if (k === 'total') continue;
    const val = Number(dmg[k]) || 0;
    if (val > 0) { out[k] = val; total += val; }
  }
  if (total > 0) out.total = Math.round(total * 1000) / 1000; // anti 70.0000002
  return out;
}
function pctToFrac(v) {
  return v == null ? undefined : (Number(v) / 100);
}
function hydrateAttackWithItemStats(attack, item) {
  if (attack.critChance   == null) attack.critChance   = item.criticalChance;
  if (attack.critMult     == null) attack.critMult     = item.criticalMultiplier;
  if (attack.statusChance == null) attack.statusChance = item.statusChance;
  const baseSpeed = item.attackSpeed != null ? item.attackSpeed : item.fireRate;
  if (attack.speed == null) attack.speed = baseSpeed;
  return attack;
}
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
  if (!dmg || typeof dmg !== 'object') return;
  const sum = Object.keys(dmg)
    .filter(k => k !== 'total')
    .reduce((s, k) => s + (Number(dmg[k]) || 0), 0);
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

// Export: peut être un tableau direct, ou un objet { ExportWeapons: [...] }
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
} else if (OF_RAW && typeof OF_RAW === 'object') {
  OVERFRAME = Object.values(OF_RAW);
}

const mExport = indexByName(EXPORT,   o => o.name || o.displayName || o.uniqueName);
const mOver   = indexByName(OVERFRAME,o => o.name);

// WFCD maps
const mWfcd = {};
for (const sub of Object.keys(WFCD_FILES)) {
  const data = readIf(WFCD_FILES[sub]);
  mWfcd[sub] = indexByName(asArray(data || []), o => o.name);
}
function subtypeFromWFCD(name) {
  const k = keyify(name);
  for (const sub of Object.keys(mWfcd)) {
    const map = mWfcd[sub];
    if (map.has(k)) return sub;
  }
  return null;
}

// Flags
function flagsFromName(n) {
  const s = String(n || '').toLowerCase();
  return {
    isPrime:  /\bprime\b/.test(s),
    isUmbra:  /\bumbra\b/.test(s),
    isWraith: /\bwraith\b/.test(s),
    isDex:    /\bdex\b/.test(s),
  };
}

// Mapping WFStat → subtype (filet de sécurité si WFCD ne tranche pas)
function subtypeHeuristic(wfType, name) {
  const t = String(wfType || '').toLowerCase();
  if (/arch-?gun/.test(t)) return 'archgun';
  if (/arch-?melee/.test(t)) return 'archmelee';
  if (/kitgun/.test(t)) return 'kitgun';
  if (/zaw/.test(t)) return 'zaw';
  if (/melee/.test(t)) return 'melee';
  if (/secondary|pistol|dual/.test(t)) return 'secondary';
  if (/primary|rifle|shotgun|sniper|bow|assault/.test(t)) return 'primary';
  const n = String(name||'').toLowerCase();
  if (/arquebex|morgha|kuva grattler|grattler|velocitus|larkspur/.test(n)) return 'archgun';
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
  if (!subtype) continue;

  // overframe (id/slug pratiques si présents)
  const of = mOver.get(keyify(name));
  if (of) ofHits++;

  // export (stats éventuelles)
  const ex = mExport.get(keyify(name));
  if (ex) expHits++;

  // id/slug
  const slug = of && of.slug ? String(of.slug) : (w.slug ? String(w.slug) : slugify(name));
  const id   = of && of.id   ? String(of.id)   : (w.uniqueName || w._id || slug);

  const flags = flagsFromName(name);

  const item = {
    id, slug, name,
    categories: ['weapon'],
    subtype,
    // champs WFStat utiles
    type: w.type || undefined,
    masteryReq: w.masteryReq != null ? w.masteryReq : (w.mastery != null ? w.mastery : undefined),
    disposition: w.disposition != null ? w.disposition : undefined,
    trigger: w.trigger != null ? w.trigger : undefined,
    accuracy: w.accuracy != null ? w.accuracy : undefined,
    noise: w.noise != null ? w.noise : undefined,
    // dégâts/crit/status si présents
    criticalChance: w.criticalChance != null ? w.criticalChance : (w.critChance != null ? w.critChance : undefined),
    criticalMultiplier: w.criticalMultiplier != null ? w.criticalMultiplier : (w.critMultiplier != null ? w.critMultiplier : undefined),
    statusChance: w.procChance != null ? w.procChance : (w.statusChance != null ? w.statusChance : undefined),
    fireRate: w.fireRate != null ? w.fireRate : undefined, // sera renommé → attackSpeed si melee
    damageTypes: (w.damageTypes || w.damage || undefined),
    polarities: w.polarities || undefined,
    // flags dérivés
    isPrime: flags.isPrime,
    isUmbra: flags.isUmbra,
    isWraith: flags.isWraith,
    isDex: flags.isDex
    // NOTE: pas de "source" dans la sortie
  };

  // Compléments export si absents
  if (ex) {
    if (item.type === undefined && ex.type) item.type = ex.type;
    if (item.criticalChance === undefined && ex.criticalChance != null) item.criticalChance = ex.criticalChance;
    if (item.criticalMultiplier === undefined && ex.criticalMultiplier != null) item.criticalMultiplier = ex.criticalMultiplier;
    if (item.statusChance === undefined && ex.procChance != null) item.statusChance = ex.procChance;
    if (item.fireRate === undefined && ex.fireRate != null) item.fireRate = ex.fireRate;
    if (!item.damageTypes && (ex.damageTypes || ex.damage)) item.damageTypes = ex.damageTypes || ex.damage;
  }

  // description (priorité WFStat, repli Export)
  const descriptionText = w.description || (ex && ex.description) || '';
  if (descriptionText) item.description = clean(descriptionText);

  // attacks[] (WFStat → attacks; sinon synthèse depuis damageTypes)
  let attacks = [];
  if (Array.isArray(w.attacks) && w.attacks.length) {
    attacks = w.attacks.map(a => {
      const attack = {
        name: a.name || 'Primary Fire',
        speed: a.speed, // cadence locale à l’attaque (WFStat)
        critChance: pctToFrac(a.crit_chance),
        critMult: a.crit_mult,
        statusChance: pctToFrac(a.status_chance),
        shotType: a.shot_type,
        shotSpeed: a.shot_speed != null ? a.shot_speed : a.flight,
        chargeTime: a.charge_time,
        falloff: a.falloff ? Object.assign({}, a.falloff) : undefined,
        damage: normalizeDamageMap(a.damage || {})
      };
      return hydrateAttackWithItemStats(attack, item);
    }).filter(Boolean);
  }
  if (!attacks.length) {
    // fallback: une seule attaque synthétique depuis damageTypes
    attacks = [hydrateAttackWithItemStats({
      name: 'Primary Fire',
      damage: normalizeDamageMap(item.damageTypes || {})
    }, item)];
  }

  // cohérence par attaque (swap S/P si clair + total recalculé)
  for (const atk of attacks) {
    if (maybeSwapPS(atk.damage, item.damageTypes)) {
      // inversions évidentes S/P corrigées
    }
    recomputeTotal(atk.damage);
  }
  item.attacks = attacks;

  // damageTypes épuré/normalisé (supprime 0 et recalc total)
  if (item.damageTypes) item.damageTypes = normalizeDamageMap(item.damageTypes);

  // ---- ENRICHISSEMENTS SPÉCIFIQUES MÉLÉE ----
  const isMelee = (item.subtype === 'melee') || (String(item.type || '').toLowerCase() === 'melee');
  if (isMelee) {
    // rename fireRate -> attackSpeed
    if (item.fireRate !== undefined) {
      item.attackSpeed = item.fireRate;
      delete item.fireRate;
    }
    // Champs melee depuis WFStat (si présents)
    const meleeFields = [
      'range',
      'slideAttack',
      'slamAttack', 'slamRadialDamage', 'slamRadius',
      'heavyAttackDamage', 'heavySlamAttack', 'heavySlamRadialDamage', 'heavySlamRadius',
      'comboDuration', 'followThrough', 'windUp', 'blockingAngle', 'stancePolarity',
      // facultatif WFStat : damageBlock (peut apparaître sur certaines armes bouclier)
      'damageBlock'
    ];
    for (const f of meleeFields) {
      if (w[f] != null) item[f] = w[f];
      else if (ex && ex[f] != null) item[f] = ex[f]; // repli Export si par hasard présent
    }
    // attacks[].speed -> attacks[].attackSpeed pour la mêlée
    for (const atk of item.attacks) {
      if (Object.prototype.hasOwnProperty.call(atk, 'speed')) {
        atk.attackSpeed = atk.speed;
        delete atk.speed;
      }
    }
  }

  out.push(item);
}

// Sorties
out.sort((a,b)=>a.name.localeCompare(b.name));
fs.writeFileSync(path.join(DATA, 'enriched_weapons.json'), JSON.stringify(out, null, 2), 'utf-8');

const report = {
  total: out.length,
  hits: { wfcd: wfcdHits, export: expHits, overframe: ofHits, heuristicSubtype: heuristicHits }
};
fs.writeFileSync(path.join(DATA, 'enriched_weapons_report.json'), JSON.stringify(report, null, 2), 'utf-8');

console.log(`OK → enriched_weapons.json (${out.length})`);
console.log('Hits:', report.hits);
