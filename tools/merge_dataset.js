/* eslint-disable no-console */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const PATHS = {
  // PublicExport DE
  DE: {
    warframes: 'data/ExportWarframes_en.json',
    weapons:   'data/ExportWeapons_en.json',
    upgrades:  'data/ExportUpgrades_en.json', // mods
    relics:    'data/ExportRelicArcane_en.json', // contient reliques + arcanes
    companions:'data/ExportSentinels_en.json',
  },
  // WFCD items (build officiel ou fallback NPM)
  WFCD_ITEMS: {
    all: 'data/wfcd_items/All.json',
    warframes: 'data/wfcd_items/Warframes.json',
    weapons:   'data/wfcd_items/Weapons.json',
    mods:      'data/wfcd_items/Mods.json',
    companions:'data/wfcd_items/Companions.json',
    relics:    'data/wfcd_items/Relics.json',
    arcanes:   'data/wfcd_items/Arcanes.json',
  },
  // WFCD drops (slim fallback ou build complet)
  WFCD_DROPS: {
    slim: 'data/wfcd_drops/all.slim.json',
    // si tu as la version complète : 'data/wfcd_drops/missionRewards.json', etc.
  },
  // Tes fichiers maison (facultatif, surcharge)
  MINE: {
    warframes: 'data/warframes.json',
    weapons:   'data/weapons.json',
    mods:      'data/mods.json',
    relics:    'data/relics.json',
    companions:'data/companions.json',
  },
  OUT_DIR: 'data/unified',
};

async function loadJson(p, optional = false) {
  try {
    const raw = await readFile(p, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    if (optional) return null;
    throw new Error(`Impossible de lire ${p}: ${e.message}`);
  }
}

function indexBy(arr, key) {
  const m = new Map();
  for (const it of arr || []) {
    const k = it?.[key];
    if (k) m.set(k, it);
  }
  return m;
}

function byName(arr) {
  const m = new Map();
  for (const it of arr || []) {
    const k = it?.name;
    if (k) m.set(k, it);
  }
  return m;
}

/** merge shallow: copy fields when target missing */
function mergeMissing(target, source, fields) {
  if (!target || !source) return;
  for (const f of fields) {
    if (target[f] == null && source[f] != null) target[f] = source[f];
  }
}

/** attach or replace arrays (e.g. drops, patchlogs) */
function attachArray(target, source, field) {
  if (!target || !source) return;
  if (Array.isArray(source[field]) && source[field].length) {
    // si target n'en a pas, on met; si target en a, on merge uniq par JSON.stringify
    if (!Array.isArray(target[field]) || !target[field].length) {
      target[field] = source[field];
    } else {
      const seen = new Set(target[field].map(x => JSON.stringify(x)));
      for (const x of source[field]) {
        const key = JSON.stringify(x);
        if (!seen.has(key)) {
          target[field].push(x);
          seen.add(key);
        }
      }
    }
  }
}

/** apply mine overrides (full overwrite of listed fields if present) */
function overrideFields(target, mine, fields) {
  if (!target || !mine) return;
  for (const f of fields) {
    if (mine[f] != null) target[f] = mine[f];
  }
}

function normalizeDEArrayMaybe(objOrArr) {
  // Certains Export*.json sont des objets {ExportWeapons: [...]} : on aplanit
  if (Array.isArray(objOrArr)) return objOrArr;
  if (objOrArr && typeof objOrArr === 'object') {
    const firstKey = Object.keys(objOrArr)[0];
    if (firstKey && Array.isArray(objOrArr[firstKey])) return objOrArr[firstKey];
  }
  return [];
}

function pick(obj, keys) {
  return Object.fromEntries(Object.entries(obj || {}).filter(([k]) => keys.includes(k)));
}

function makeReportEntry(kind, id, from, fields) {
  return { kind, id, source: from, addedFields: fields };
}

/** Main per-kind merge */
function mergeKind({ kind, deList, wfcdList, dropsSlim, mineList }) {
  const out = [];
  const report = [];

  const de = normalizeDEArrayMaybe(deList);
  const idxDE_unique = indexBy(de, 'uniqueName');
  const idxDE_name   = byName(de);

  const wfcd = wfcdList || [];
  const idxW_name = byName(wfcd);
  const idxW_unique = indexBy(wfcd, 'uniqueName'); // souvent présent

  const idxMine_name   = byName(mineList || []);
  const idxMine_unique = indexBy(mineList || [], 'uniqueName');

  // Champs enrichis qu’on aime bien prendre de WFCD
  const WFCD_FIELDS_COMMON = ['wikiaUrl', 'polarities', 'exilus', 'aura', 'color', 'type', 'category'];
  const WFCD_FIELDS_WARFRAME = ['helminth', 'abilities'];
  const WFCD_FIELDS_WEAPON   = []; // on les reconstruit plutôt depuis DE, mais on prend wikiaUrl/drops/patchlogs
  const WFCD_FIELDS_MOD      = ['rarity', 'polarity', 'baseDrain', 'fusionLimit', 'compatName', 'levelStats'];

  // Overrides possibles depuis tes fichiers
  const OVERRIDE_FIELDS_COMMON = ['name', 'description', 'wikiaUrl'];
  const OVERRIDE_FIELDS_WARFRAME = ['helminth', 'polarities', 'aura', 'exilus'];
  const OVERRIDE_FIELDS_WEAPON   = ['polarities'];
  const OVERRIDE_FIELDS_MOD      = ['polarity', 'rarity', 'baseDrain', 'fusionLimit'];

  // on parcourt les éléments DE comme base
  for (const base of de) {
    const id = base.uniqueName || base.name;
    const merged = { ...base };

    // Trouver match WFCD par uniqueName puis name
    const wfcdMatch = (base.uniqueName && idxW_unique.get(base.uniqueName)) || idxW_name.get(base.name);
    const mineMatch = (base.uniqueName && idxMine_unique.get(base.uniqueName)) || idxMine_name.get(base.name);

    // Champs communs WFCD si manquants côté DE
    mergeMissing(merged, wfcdMatch, WFCD_FIELDS_COMMON);

    // Spécifiques selon kind
    if (kind === 'warframes') {
      mergeMissing(merged, wfcdMatch, WFCD_FIELDS_WARFRAME);
    } else if (kind === 'weapons') {
      mergeMissing(merged, wfcdMatch, WFCD_FIELDS_WEAPON);
    } else if (kind === 'mods') {
      mergeMissing(merged, wfcdMatch, WFCD_FIELDS_MOD);
    }

    // Drops & patchlogs (arrays, union)
    attachArray(merged, wfcdMatch, 'drops');
    attachArray(merged, wfcdMatch, 'patchlogs');

    // Fallback drops depuis le slim (si utile) — ici exemple basique par name
    if ((!merged.drops || !merged.drops.length) && dropsSlim) {
      const dropsForName = dropsSlim[merged.name];
      if (Array.isArray(dropsForName) && dropsForName.length) {
        merged.drops = dropsForName.map(d => pick(d, ['location', 'rarity', 'chance']));
        report.push(makeReportEntry(kind, id, 'WFCD_drops_slim', ['drops']));
      }
    }

    // Overrides depuis tes fichiers (si présents)
    if (mineMatch) {
      const commonBefore = JSON.stringify(pick(merged, OVERRIDE_FIELDS_COMMON));
      overrideFields(merged, mineMatch, OVERRIDE_FIELDS_COMMON);

      if (kind === 'warframes') {
        overrideFields(merged, mineMatch, OVERRIDE_FIELDS_WARFRAME);
      } else if (kind === 'weapons') {
        overrideFields(merged, mineMatch, OVERRIDE_FIELDS_WEAPON);
      } else if (kind === 'mods') {
        overrideFields(merged, mineMatch, OVERRIDE_FIELDS_MOD);
      }

      const commonAfter = JSON.stringify(pick(merged, OVERRIDE_FIELDS_COMMON));
      if (commonBefore !== commonAfter) {
        report.push(makeReportEntry(kind, id, 'MINE_override', OVERRIDE_FIELDS_COMMON));
      }
    }

    out.push(merged);
  }

  // Ajout de WFCD orphelins (qui n’existent pas dans DE mais que tu veux peut-être quand même)
  // Ici, on choisit de les ignorer par défaut. Décommente si tu veux les inclure :
  /*
  for (const w of wfcd) {
    const k = w.uniqueName || w.name;
    if (!idxDE_unique.get(w.uniqueName || '') && !idxDE_name.get(w.name || '')) {
      out.push(w);
      report.push(makeReportEntry(kind, k, 'WFCD_only', Object.keys(w)));
    }
  }
  */

  return { out, report };
}

async function main() {
  await mkdir(PATHS.OUT_DIR, { recursive: true });

  // Charger DE
  const deWarframes = await loadJson(PATHS.DE.warframes, true);
  const deWeapons   = await loadJson(PATHS.DE.weapons, true);
  const deUpgrades  = await loadJson(PATHS.DE.upgrades, true);
  const deRelicsArc = await loadJson(PATHS.DE.relics, true);
  const deCompanions= await loadJson(PATHS.DE.companions, true);

  // Charger WFCD items
  // On préfère sources dédiées si présentes, sinon fallback All.json + filtrage
  let wfcdAll = await loadJson(PATHS.WFCD_ITEMS.all, true);
  const wfcdWarframes = (await loadJson(PATHS.WFCD_ITEMS.warframes, true)) ||
                        (wfcdAll?.filter(i => i.category === 'Warframes') ?? []);
  const wfcdWeapons   = (await loadJson(PATHS.WFCD_ITEMS.weapons, true))   ||
                        (wfcdAll?.filter(i => ['Primary','Secondary','Melee','Arch-Gun','Arch-Melee','Crewship Weapon'].includes(i.category)) ?? []);
  const wfcdMods      = (await loadJson(PATHS.WFCD_ITEMS.mods, true))      ||
                        (wfcdAll?.filter(i => i.category === 'Mods') ?? []);
  const wfcdRelics    = (await loadJson(PATHS.WFCD_ITEMS.relics, true))    ||
                        (wfcdAll?.filter(i => i.category === 'Relics') ?? []);
  const wfcdCompanions= (await loadJson(PATHS.WFCD_ITEMS.companions, true))||
                        (wfcdAll?.filter(i => ['Companions','Sentinels','Beasts'].includes(i.category)) ?? []);

  // Charger drops slim si dispo
  const wfcdDropsSlim = await loadJson(PATHS.WFCD_DROPS.slim, true);

  // Charger tes fichiers (facultatifs)
  const mineWarframes = await loadJson(PATHS.MINE.warframes, true);
  const mineWeapons   = await loadJson(PATHS.MINE.weapons, true);
  const mineMods      = await loadJson(PATHS.MINE.mods, true);
  const mineRelics    = await loadJson(PATHS.MINE.relics, true);
  const mineCompanions= await loadJson(PATHS.MINE.companions, true);

  const allReports = [];

  // WARFRAMES
  if (deWarframes) {
    const { out, report } = mergeKind({
      kind: 'warframes',
      deList: deWarframes,
      wfcdList: wfcdWarframes,
      dropsSlim: wfcdDropsSlim?.Warframes || null, // si tu structures le slim par catégorie
      mineList: mineWarframes,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'warframes.unified.json'), JSON.stringify(out, null, 2));
    allReports.push(...report);
  }

  // WEAPONS
  if (deWeapons) {
    const { out, report } = mergeKind({
      kind: 'weapons',
      deList: deWeapons,
      wfcdList: wfcdWeapons,
      dropsSlim: wfcdDropsSlim?.Weapons || null,
      mineList: mineWeapons,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'weapons.unified.json'), JSON.stringify(out, null, 2));
    allReports.push(...report);
  }

  // MODS (DE=upgrades)
  if (deUpgrades) {
    const { out, report } = mergeKind({
      kind: 'mods',
      deList: deUpgrades,
      wfcdList: wfcdMods,
      dropsSlim: wfcdDropsSlim?.Mods || null,
      mineList: mineMods,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'mods.unified.json'), JSON.stringify(out, null, 2));
    allReports.push(...report);
  }

  // RELICS
  if (deRelicsArc) {
    const { out, report } = mergeKind({
      kind: 'relics',
      deList: deRelicsArc, // contient aussi des arcanes - à filtrer plus tard si besoin
      wfcdList: wfcdRelics,
      dropsSlim: wfcdDropsSlim?.Relics || null,
      mineList: mineRelics,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'relics.unified.json'), JSON.stringify(out, null, 2));
    allReports.push(...report);
  }

  // COMPANIONS
  if (deCompanions) {
    const { out, report } = mergeKind({
      kind: 'companions',
      deList: deCompanions,
      wfcdList: wfcdCompanions,
      dropsSlim: wfcdDropsSlim?.Companions || null,
      mineList: mineCompanions,
    });
    await writeFile(resolve(PATHS.OUT_DIR, 'companions.unified.json'), JSON.stringify(out, null, 2));
    allReports.push(...report);
  }

  // Rapport
  await writeFile(resolve(PATHS.OUT_DIR, '_report.json'), JSON.stringify(allReports, null, 2));
  console.log(`✔ Unified datasets written to ${PATHS.OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });