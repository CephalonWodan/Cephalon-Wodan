/**
 * Moteur de calcul centralisé pour le WARFRAME Set Builder
 * Conforme aux règles officielles du Wiki (Calculating Bonuses, Health, Shield, Abilities, Damage).
 */

export interface CalculatedStat {
  base: number;
  bonusPercent: number;
  flatBonus: number;
  final: number;
  sources: { name: string; value: number; type: 'percent' | 'flat' }[];
}

export interface WeaponCalculationResult {
  baseDamage: number;
  moddedDamage: number;
  criticalChance: number;
  criticalMultiplier: number;
  statusChance: number;
  multishot: number;
  elementalBreakdown: { type: string; damage: number }[];
  averageHit: number;
  criticalAverage: number;
  headshotAverage: number;
  dps: number;
}

/**
 * Calcule une statistique additive (ex: Santé, Boucliers, Armure, Énergie) selon la formule du Wiki:
 * Final = Base * (1 + Sum(ModPercents) + Sum(ShardPercents)) + Sum(FlatBonuses)
 */
export function calculateStatWithBreakdown(
  base: number,
  sources: { name: string; value: number; type: 'percent' | 'flat' }[]
): CalculatedStat {
  let percentSum = 0;
  let flatSum = 0;

  for (const src of sources) {
    if (src.type === 'percent') {
      percentSum += src.value;
    } else {
      flatSum += src.value;
    }
  }

  const final = Math.round((base * (1 + percentSum) + flatSum) * 10) / 10;

  return {
    base,
    bonusPercent: Math.round(percentSum * 1000) / 10,
    flatBonus: Math.round(flatSum * 10) / 10,
    final: Math.max(0, final),
    sources,
  };
}

/**
 * Calcule l'EHP (Effective Health Pool) en tenant compte de l'armure et de la réduction de dégâts:
 * DR = Armor / (Armor + 300)
 * EHP = Health / (1 - DR) = Health * (Armor + 300) / 300
 */
export function calculateEHP(health: number, armor: number): number {
  if (armor <= 0) return health;
  return Math.round(health * (armor + 300) / 300);
}

/**
 * Calcule les dégâts d'une arme, ses critiques, ses tirs à la tête et son DPS estimé
 */
export function calculateWeaponStats(
  baseDamage: number,
  critChance: number,
  critMulti: number,
  statusChance: number,
  fireRate: number,
  multishot: number,
  damageModsPercent: number,
  critChanceModsPercent: number,
  critMultiModsPercent: number,
  elementalDamagePercents: { type: string; percent: number }[],
  factionMultiplier: number = 1.0,
  comboMultiplier: number = 1.0,
  isMelee: boolean = false,
  stanceBonus: number = 0.0
): WeaponCalculationResult {
  // Dégâts de base moddés
  const moddedDamage = baseDamage * (1 + damageModsPercent) * factionMultiplier * (isMelee ? (1 + comboMultiplier * 0.5 + stanceBonus) : 1);
  
  // Critique
  const finalCritChance = critChance * (1 + critChanceModsPercent);
  const finalCritMulti = critMulti * (1 + critMultiModsPercent);

  // Dégâts élémentaires additionnels
  let totalElementalDamage = 0;
  const elementalBreakdown = elementalDamagePercents.map(el => {
    const dmg = moddedDamage * el.percent;
    totalElementalDamage += dmg;
    return { type: el.type, damage: Math.round(dmg * 10) / 10 };
  });

  const totalHitDamage = moddedDamage + totalElementalDamage;

  // Dégâts moyens par coup tenant compte du critique (Crit Average = Hit * (1 + CC * (CM - 1)))
  const critAverage = totalHitDamage * (1 + Math.max(0, finalCritChance) * (finalCritMulti - 1));
  
  // Tirs à la tête (Headshot multi x2.0 standard)
  const headshotAverage = critAverage * 2.0;

  // DPS estimé (Dégâts moyens * Cadence de tir * Multishot)
  const dps = Math.round(critAverage * fireRate * Math.max(1, multishot));

  return {
    baseDamage,
    moddedDamage: Math.round(moddedDamage * 10) / 10,
    criticalChance: Math.round(finalCritChance * 100),
    criticalMultiplier: Math.round(finalCritMulti * 100) / 100,
    statusChance: Math.round(statusChance * 100),
    multishot,
    elementalBreakdown,
    averageHit: Math.round(totalHitDamage * 10) / 10,
    criticalAverage: Math.round(critAverage * 10) / 10,
    headshotAverage: Math.round(headshotAverage * 10) / 10,
    dps,
  };
}
