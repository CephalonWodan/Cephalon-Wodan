/* eslint-disable no-console */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const PATHS = {
  // PublicExport (issus de ton autre workflow)
  DE: {
    warframes:  'data/ExportWarframes_en.json',
    weapons:    'data/ExportWeapons_en.json',
    upgrades:   'data/ExportUpgrades_en.json',     // Mods
    relicArc:   'data/ExportRelicArcane_en.json',  // Relics + Arcanes
    companions: 'data/ExportSentinels_en.json',
  },
  // WFCD items (buildés par le workflow WFCD)
  WFCD_ITEMS: {
    all:        'data/wfcd_items/All.json',
    warframes:  'data/wfcd_items/Warframes.json',
    weapons:    'data/wfcd_items/Weapons.json',
    mods:       'data/wfcd_items/Mods.json',
    companions: 'data/wfcd_items/Companions.json',
    relics:     'data/wfcd_items/Relics.json',
    arcanes:    'data/wfcd_items/Arcanes.json',
  },
  WFCD_DROPS: {
    slim: 'data/wfcd_drops/all.slim.json', // optionnel
  },

  // TES FICHIERS (réels) — tous optionnels, intégrés s’ils existent
  MINE: {
    // Abilities (plusieurs variantes : on les prend dans l’ordre de préférence)
    wfAbilities:  'data/warframe_abilities.json',      // { name -> [{name,description},...] }
    abilitiesByWF:'data/abilities_by_warframe.json',   // idem, format proche
    abilities:    'data/abilities.json',               // fallback générique

    // Arcanes (sources et mappings persos)
    arcanes:      'data/arcanes.json',
    arcanesList:  'data/arcanes_list.json',
    arcanesMap:   'data/arcanes_map.json',

    // Compagnons (overrides)
    companions:   'data/companions.json',

    // Overrides globaux
    polarities:   'data/polarity_overrides.json',      // { uniqueName|name -> ["V","D",...] }
    awOverrides:  'data/aw_overrides.json',            // Archwing/Necramech (type/category/polarities/flags)
  },

  OUT_DIR: 'data/unified',
};

/* ---------- utilitaires ---------- */
async function loadJson(p, optional = false) {
  try { return JSON.parse(await readFile(p, 'utf-8')); }
  catch (e) { if (optional) return null; throw new Error(`Read ${p} failed: ${e.message}`); }
}

function normalizeDEArrayMaybe(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    const k = Object.keys(obj)[0];
    if (k && Array.isArray(obj[k])) return obj[k];
  }
  return [];
}

const idxBy = (arr, key) => {
  const m = new Map();
  for (const it of arr || []) { const k = it?.[key]; if (k) m.set(k, it); }
  return m;
};
const idxByName = (arr) => {
  const m = new Map();
  for (const it of arr || []) { const k = it?.name; if (k) m.set(k, it); }
  return m;
};

function mergeMissing(target, source, fields) {
  if (!target || !source) return;
  for (const f of fields) if (target[f] == null && source[f] != null) target[f] = source[f];
}
function overrideFields(target, from, fields) {
  if (!target || !from) return;
  for (const f of fields) if (from[f] != null) target[f] = from[f];
}
function attachArrayUnion(target, source, field) {
  if (!target || !source) return;
  if (Array.isArray(source[field]) && source[field].length) {
    if (!Array.isArray(target[field])) target[field] = [];
    const seen = new Set(target[field].map(x => JSON.stringify(x)));
    for (const x of source[field]) {
      const k = JSON.stringify(x);
      if (!seen.has(k)) { target[field].push(x); seen.add(k); }
    }
  }
}
const pick = (obj, keys) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => keys.includes(k)));

/* ---------- intégration de tes fichiers ---------- */
function buildPolarityOverrideFn(polarityMap) {
  if (!polarityMap) return () => {};
  const byKey = new Map(Object.entries(polarityMap)); // name or uniqueName -> array
  return (item) => {
    const key = item.uniqueName && byKey.has(item.uniqueName) ? item.uniqueName :
                (byKey.has(item.name) ? item.name : null);
    if (!key) return;
    const value = byKey.get(key);
    if (Array.isArray(value) && value.length) item.polarities = value;
  };
}

function buildAWOverrideFn(awMap) {
  // expected: { key -> { type?, category?, polarities?, flags?... } }
  if (!awMap) return () => {};
  const byKey = new Map(Object.entries(awMap));
  return (item) => {
    const key = item.uniqueName && byKey.has(item.uniqueName) ? item.uniqueName :
                (byKey.has(item.name) ? item.name : null);
    if (!key) return;
    const src = byKey.get(key);
    for (const [k, v] of Object.entries(src)) item[k] = v;
  };
}

function attachWFAbilities(merged, wfAbilitiesLookup, wfName) {
  if (!merged || !wfAbilitiesLookup) return;
  const list = wfAbilitiesLookup.get(wfName) || wfAbilitiesLookup.get(merged.name);
  if (Array.isArray(list) && list.length) {
    // Simplification: name + description
    merged.abilities = list.map(a => pick(a, ['name', 'description']));
  }
}

function buildWFAbilitiesLookup(wfAbilities, abilitiesByWF, abilities) {
  // priorité: warframe_abilities.json > abilities_by_warframe.json > abilities.json (fallback)
  const map = new Map();

  if (wfAbilities && typeof wfAbilities === 'object' && !Array.isArray(wfAbilities)) {
    // { "Mag": [{name,description}, ...], ... }
    for (const [k, v] of Object.entries(wfAbilities)) if (Array.isArray(v)) map.set(k, v);
  }
  if (abilitiesByWF && typeof abilitiesByWF === 'object' && !Array.isArray(abilitiesByWF)) {
    for (const [k, v] of Object.entries(abilitiesByWF)) if (Array.isArray(v) && !map.has(k)) map.set(k, v);
  }
  // abilities.json : format libre ; si c’est un tableau avec { warframe, name, description }, on re-bucket
  if (Array.isArray(abilities)) {
    for (const ab of abilities) {
      const wf = ab.warframe || ab.frame || ab.owner || ab.wf || ab.warframeName;
      if (!wf) continue;
      if (!map.has(wf)) map.set(wf, []);
      map.get(wf).push(pick(ab, ['name', 'description']));
    }
  }
  return map;
}

function mergeArcanesFromMine(unified, mineArcanesArray, mineMapByName, mineListByName) {
  if (!Array.isArray(unified) || (!Array.isArray(mineArcanesArray) && !mineMapByName && !mineListByName)) return;
  const byName = idxByName(unified);
  const applyOne = (name, src) => {
    const t = byName.get(name);
    if (!t) return;
    // champs qu’on autorise depuis tes fichiers
    overrideFields(t, src, ['wikiaUrl', 'description', 'rarity', 'rankMax', 'effects', 'type']);
  };

  if (Array.isArray(mineArcanesArray)) for (const a of mineArcanesArray) if (a?.name) applyOne(a.name, a);
  if (mineMapByName && typeof mineMapByName === 'object') {
    for (const [name, obj] of Object.entries(mineMapByName)) applyOne(name, obj);
  }
  if (mineListByName && Array.isArray(mineListByName)) {
    for (const a of mineListByName) if (a?.name) applyOne(a.name, a);
  }
}

/* ---------- fusion par catégorie ---------- */
function mergeKind({ kind, deList, wfcdList, dropsSlim, mineList, wfAbilitiesLookup, applyPolarityOverride, applyAWOverride }) {
  const out = [];

  const de = normalizeDEArrayMaybe(deList);
  const idxW_unique = idxBy(wfcdList || [], 'uniqueName');
  const idxW_name   = idxByName(wfcdList || []);
  const idxM_unique = idxBy(mineList || [], 'uniqueName');
  const idxM_name   = idxByName(mineList || []);

  // champs pris à WFCD si absents côté DE
  const WFCD_COMMON = ['wikiaUrl', 'polarities', 'exilus', 'aura', 'color', 'type', 'category'];
  const WFCD_WF     = ['helminth', 'abilities']; // abilities seront de toute façon remplacées par tes fichiers si fournis
  const WFCD_MOD    = ['rarity', 'polarity', 'baseDrain', 'fusionLimit', 'compatName', 'levelStats'];

  // overrides depuis TES fichiers
  const OVERRIDE_COMMON = ['name', 'description', 'wikiaUrl'];
  const OVERRIDE_WF     = ['helminth', 'polarities', 'aura', 'exilus'];
  const OVERRIDE_WPN    = ['polarities']; // étends si tu veux
  const OVERRIDE_MOD    = ['polarity', 'rarity', 'baseDrain', 'fusionLimit'];

  for (const base of de) {
    const merged = { ...base };
    const wfcd = (base.uniqueName && idxW_unique.get(base.uniqueName)) || idxW_name.get(base.name);
    const mine = (base.uniqueName && idxM_unique.get(base.uniqueName)) || idxM_name.get(base.name);

    // enrichissements WFCD
    mergeMissing(merged, wfcd, WFCD_COMMON);
    if (kind === 'warframes') mergeMissing(merged, wfcd, WFCD_WF);
    if (kind === 'mods')      mergeMissing(merged, wfcd, WFCD_MOD);

    attachArrayUnion(merged, wfcd, 'drops');
    attachArrayUnion(merged, wfcd, 'patchlogs');

    // drops slim (si fournis) — simple mapping par nom
    if ((!merged.drops || !merged.drops.length) && dropsSlim && dropsSlim[merged.name]) {
      merged.drops = (dropsSlim[merged.name] || []).map(d => pick(d, ['location', 'rarity', 'chance']));
    }

    // TES overrides
    if (mine) {
      overrideFields(merged, mine, OVERRIDE_COMMON);
      if (kind === 'warframes') overrideFields(merged, mine, OVERRIDE_WF);
      if (kind === 'weapons')   overrideFields(merged, mine, OVERRIDE_WPN);
      if (kind === 'mods')      overrideFields(merged, mine, OVERRIDE_MOD);
    }

    // TES overrides globaux
    if (applyPolarityOverride) applyPolarityOverride(merged);
    if (applyAWOverride && (kind === 'weapons' || kind === 'warframes' || kind === 'companions')) applyAWOverride(merged);

    // Abilities : si warframe + tu as des fichiers d’abilities, on remplace
    if (kind === 'warframes' && wfAbilitiesLookup) {
      attachWFAbilities(merged, wfAbilitiesLookup, merged.name);
    }

    out.push(merged);
  }

  return out;
}

/* ---------- main ---------- */
async function main() {
  await mkdir(PATHS.OUT_DIR, { recursive: true });

  // Charger DE
  const deWF   = await loadJson(PATHS.DE.warframes,  true);
  const deWPN  = await loadJson(PATHS.DE.weapons,    true);
  const deMOD  = await loadJson(PATHS.DE.upgrades,   true);
  const deRA   = await loadJson(PATHS.DE.relicArc,   true);
  const deCOMP = await loadJson(PATHS.DE.companions, true);

  // Charger WFCD items
  const allItems = await loadJson(PATHS.WFCD_ITEMS.all, true);
  const pickCat = (pred) => (allItems || []).filter(pred);

  const wfiWF   = (await loadJson(PATHS.WFCD_ITEMS.warframes,  true)) || pickCat(i => i.category === 'Warframes');
  const wfiWPN  = (await loadJson(PATHS.WFCD_ITEMS.weapons,    true)) || pickCat(i => ['Primary','Secondary','Melee','Arch-Gun','Arch-Melee','Crewship Weapon'].includes(i.category));
  const wfiMOD  = (await loadJson(PATHS.WFCD_ITEMS.mods,       true)) || pickCat(i => i.category === 'Mods');
  const wfiREL  = (await loadJson(PATHS.WFCD_ITEMS.relics,     true)) || pickCat(i => i.category === 'Relics');
  const wfiARC  = (await loadJson(PATHS.WFCD_ITEMS.arcanes,    true)) || pickCat(i => i.category === 'Arcanes');
  const wfiCOMP = (await loadJson(PATHS.WFCD_ITEMS.companions, true)) || pickCat(i => ['Companions','Sentinels','Beasts'].includes(i.category));

  // Drops slim (optionnel)
  const dropsSlim = await loadJson(PATHS.WFCD_DROPS.slim, true) || {};

  // TES fichiers (réels)
  const mineAbilities      = await loadJson(PATHS.MINE.abilities,    true);
  const mineWFAbilities    = await loadJson(PATHS.MINE.wfAbilities,  true);
  const mineAbilitiesByWF  = await loadJson(PATHS.MINE.abilitiesByWF,true);
  const mineArcanes        = await loadJson(PATHS.MINE.arcanes,      true);
  const mineArcanesList    = await loadJson(PATHS.MINE.arcanesList,  true);
  const mineArcanesMap     = await loadJson(PATHS.MINE.arcanesMap,   true);
  const mineCompanions     = await loadJson(PATHS.MINE.companions,   true);
  const minePolarityMap    = await loadJson(PATHS.MINE.polarities,   true);
  const mineAWOverrides    = await loadJson(PATHS.MINE.awOverrides,  true);

  const wfAbilitiesLookup  = buildWFAbilitiesLookup(mineWFAbilities, mineAbilitiesByWF, mineAbilities);
  const applyPolarityOverride = buildPolarityOverrideFn(minePolarityMap);
  const applyAWOverride       = buildAWOverrideFn(mineAWOverrides);

  /* ---------- MERGE ---------- */

  // Warframes
  if (deWF) {
    const merged = mergeKind({
      kind: 'warframes',
      deList: deWF,
      wfcdList: wfiWF,
      dropsSlim: dropsSlim.Warframes || null,
      mineList: null,               // tu peux fournir ici un warframes.json si tu veux des overrides additionnels nommés
      wfAbilitiesLookup,
      applyPolarityOverride,
      applyAWOverride,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'warframes.unified.json'), JSON.stringify(merged, null, 2));
  }

  // Weapons (inclut Archwing/Necramech via aw_overrides.json)
  if (deWPN) {
    const merged = mergeKind({
      kind: 'weapons',
      deList: deWPN,
      wfcdList: wfiWPN,
      dropsSlim: dropsSlim.Weapons || null,
      mineList: null,
      wfAbilitiesLookup: null,
      applyPolarityOverride,
      applyAWOverride,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'weapons.unified.json'), JSON.stringify(merged, null, 2));
  }

  // Mods
  if (deMOD) {
    const merged = mergeKind({
      kind: 'mods',
      deList: deMOD,
      wfcdList: wfiMOD,
      dropsSlim: dropsSlim.Mods || null,
      mineList: null,
      wfAbilitiesLookup: null,
      applyPolarityOverride,
      applyAWOverride: null,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'mods.unified.json'), JSON.stringify(merged, null, 2));
  }

  // Companions (avec tes overrides)
  if (deCOMP) {
    const merged = mergeKind({
      kind: 'companions',
      deList: deCOMP,
      wfcdList: wfiCOMP,
      dropsSlim: dropsSlim.Companions || null,
      mineList: mineCompanions,  // ← tes corrections
      wfAbilitiesLookup: null,
      applyPolarityOverride,
      applyAWOverride,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'companions.unified.json'), JSON.stringify(merged, null, 2));
  }

  // Relics + Arcanes
  if (deRA) {
    // 1) Relics unifiées
    const relicsDE = normalizeDEArrayMaybe(deRA)?.filter(x => /Relic/i.test(x?.name || ''));
    const mergedRelics = mergeKind({
      kind: 'relics',
      deList: relicsDE,
      wfcdList: wfiREL,
      dropsSlim: dropsSlim.Relics || null,
      mineList: null,
      wfAbilitiesLookup: null,
      applyPolarityOverride: null,
      applyAWOverride: null,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'relics.unified.json'), JSON.stringify(mergedRelics, null, 2));

    // 2) Arcanes unifiées
    const arcanesDE = normalizeDEArrayMaybe(deRA)?.filter(x => /Arcane/i.test(x?.name || '') || /Arcane/i.test(x?.type || ''));
    // base = WFCD arcanes si dispo, sinon DE filtré
    let arcanesBase = Array.isArray(wfiARC) && wfiARC.length ? wfiARC : arcanesDE;
    arcanesBase = arcanesBase || [];

    // enrichir par tes fichiers (3 sources possibles)
    const mineMapByName = mineArcanesMap && typeof mineArcanesMap === 'object' ? mineArcanesMap : null;
    mergeArcanesFromMine(arcanesBase, mineArcanes, mineMapByName, mineArcanesList);

    await writeFile(resolve(PATHS.OUT_DIR, 'arcanes.unified.json'), JSON.stringify(arcanesBase, null, 2));
  }

  console.log('✔ Unified datasets written to', PATHS.OUT_DIR);
}

main().catch(e => { console.error(e); process.exit(1); });