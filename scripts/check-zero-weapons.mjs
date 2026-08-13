import catalog from '../client/src/lib/warframe-data-full.json' with { type: 'json' };

const weapons = catalog.weapons ?? [];
const isZero = weapon => [weapon.damage, weapon.critChance, weapon.critMultiplier, weapon.statusChance]
  .every(value => Number(value ?? 0) === 0);
const zeroWeapons = weapons.filter(isZero);

console.log(JSON.stringify({
  total: weapons.length,
  zeroWeapons: zeroWeapons.length,
  kept: weapons.length - zeroWeapons.length,
  sample: zeroWeapons.slice(0, 20).map(({ id, name, type, damage, critChance, critMultiplier, statusChance }) => ({ id, name, type, damage, critChance, critMultiplier, statusChance })),
}, null, 2));
