/* eslint-disable no-console */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Items from '@wfcd/items';

const OUT = 'data_build';
const FN = {
  warframes: 'warframes.wfcd.json',
  weapons:   'weapons.wfcd.json',
  mods:      'mods.wfcd.json',
  arcanes:   'arcanes.wfcd.json',
  companions:'companions.wfcd.json',
  relics:    'relics.wfcd.json',
  // optionnel :
  unified:   'items.unified.wfcd.json',
};

const keep = (obj, keys) => Object.fromEntries(
  Object.entries(obj).filter(([k]) => keys.includes(k))
);

function normalizeWarframe(i) {
  const base = keep(i, [
    'name','uniqueName','type','health','shield','armor','power','stamina',
    'polarities','aura','exilus','description','wikiaUrl','color'
  ]);
  if (Array.isArray(i.abilities)) {
    base.abilities = i.abilities.map(a => keep(a, ['name','description']));
  }
  if (i.helminth?.name) base.helminthAbility = keep(i.helminth, ['name','description']);
  if (Array.isArray(i.drops) && i.drops.length)
    base.drops = i.drops.map(d => keep(d, ['location','rarity','chance']));
  if (Array.isArray(i.patchlogs) && i.patchlogs.length)
    base.patchlogs = i.patchlogs.map(p => keep(p, ['name','date','url','additions']));
  return base;
}

function normalizeWeapon(i) {
  const base = keep(i, [
    'name','uniqueName','type','category','slot','masteryReq',
    'damage','damagePerShot','totalDamage','critChance','critMult',
    'statusChance','fireRate','magazineSize','reloadTime',
    'polarities','description','wikiaUrl','color'
  ]);
  if (Array.isArray(i.drops) && i.drops.length)
    base.drops = i.drops.map(d => keep(d, ['location','rarity','chance']));
  if (Array.isArray(i.patchlogs) && i.patchlogs.length)
    base.patchlogs = i.patchlogs.map(p => keep(p, ['name','date','url','additions']));
  return base;
}

function normalizeMod(i) {
  const base = keep(i, [
    'name','uniqueName','type','rarity','polarity','baseDrain',
    'fusionLimit','compatName','description','wikiaUrl'
  ]);
  if (Array.isArray(i.levelStats)) base.levelStats = i.levelStats;
  if (Array.isArray(i.drops) && i.drops.length)
    base.drops = i.drops.map(d => keep(d, ['location','rarity','chance']));
  return base;
}

function normalizeGeneric(i) {
  const base = keep(i, ['name','uniqueName','type','category','description','wikiaUrl']);
  if (Array.isArray(i.drops) && i.drops.length)
    base.drops = i.drops.map(d => keep(d, ['location','rarity','chance']));
  return base;
}

async function main() {
  const items = new Items().items;

  const warframes = items.filter(i => i.category === 'Warframes').map(normalizeWarframe);
  const weapons   = items.filter(i => ['Primary','Secondary','Melee','Arch-Gun','Arch-Melee','Crewship Weapon']
                                      .includes(i.category)).map(normalizeWeapon);
  const mods      = items.filter(i => i.category === 'Mods').map(normalizeMod);
  const arcanes   = items.filter(i => i.category === 'Arcanes').map(normalizeGeneric);
  const companions= items.filter(i => ['Companions','Sentinels','Beasts'].includes(i.category))
                         .map(normalizeGeneric);
  const relics    = items.filter(i => i.category === 'Relics').map(normalizeGeneric);

  await mkdir(OUT, { recursive: true });

  const writes = [
    [FN.warframes,  warframes],
    [FN.weapons,    weapons],
    [FN.mods,       mods],
    [FN.arcanes,    arcanes],
    [FN.companions, companions],
    [FN.relics,     relics],
    // optionnel : dataset complet
    [FN.unified,    items],
  ].map(async ([file, data]) => {
    await writeFile(resolve(OUT, file), JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✔ ${OUT}/${file}`, data.length);
  });

  await Promise.all(writes);
}

main().catch(err => { console.error(err); process.exit(1); });
