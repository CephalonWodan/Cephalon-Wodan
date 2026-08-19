import rawIncarnonData from "./incarnon-data.json";
import type { Weapon } from "./warframe-data";

export interface IncarnonPerk {
  name: string;
  text: string;
}

export interface IncarnonEvolution {
  tier: number;
  unlockChallenges: string[];
  activation: string | null;
  perks: IncarnonPerk[];
}

export interface IncarnonProfile {
  weapon: string;
  variant: string;
  slot: string;
  family: string;
  evolutionsCount: number;
  evolutions: IncarnonEvolution[];
}

export interface IncarnonSelection {
  profileWeapon: string;
  active: boolean;
  selectedEvolution: number;
  selectedPerkByTier: Record<string, number | null>;
}

export type IncarnonSlot = "primary" | "secondary" | "melee";

export interface IncarnonBonus {
  damagePercent: number;
  criticalChanceFlat: number;
  criticalMultiplierFlat: number;
  statusChanceFlat: number;
  sources: string[];
}

export const INCARNON_PROFILES = rawIncarnonData as IncarnonProfile[];

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function baseWeaponName(value: string): string {
  return normalizeName(value)
    .replace(/\s+(prime|wraith|vandal|prisma|mk1|telos|dex|rakta|synoid|sancti)$/i, "")
    .trim();
}

export function getIncarnonProfile(weapon?: Pick<Weapon, "name"> | null): IncarnonProfile | null {
  if (!weapon?.name) return null;
  const normalizedWeapon = normalizeName(weapon.name);
  const baseName = baseWeaponName(weapon.name);
  return INCARNON_PROFILES.find(profile => {
    const normalizedProfile = normalizeName(profile.weapon);
    return normalizedWeapon === normalizedProfile || baseName === normalizedProfile || normalizedWeapon.startsWith(`${normalizedProfile} `);
  }) || null;
}

export function getIncarnonEvolution(profile: IncarnonProfile | null, tier: number): IncarnonEvolution | null {
  return profile?.evolutions.find(evolution => evolution.tier === tier) || null;
}

function parseFirstNumber(pattern: RegExp, text: string): number | null {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

/**
 * Extrait uniquement les bonus chiffrés présents dans le texte du perk sélectionné.
 * Une forme Incarnon dont l’Évolution I ne contient qu’une activation ne reçoit pas
 * de bonus inventé : le calcul reste identique jusqu’à l’ajout d’une valeur source.
 */
export function getIncarnonBonus(profile: IncarnonProfile | null, selection?: IncarnonSelection | null): IncarnonBonus {
  const empty: IncarnonBonus = { damagePercent: 0, criticalChanceFlat: 0, criticalMultiplierFlat: 0, statusChanceFlat: 0, sources: [] };
  if (!profile || !selection?.active) return empty;
  const evolution = getIncarnonEvolution(profile, selection.selectedEvolution || 1);
  if (!evolution) return empty;
  const perkIndex = selection.selectedPerkByTier?.[String(evolution.tier)];
  const perk = typeof perkIndex === "number" ? evolution.perks[perkIndex] : null;
  if (!perk) return empty;

  const bonus = { ...empty };
  const text = perk.text;
  const damage = parseFirstNumber(/(?:increase\s+damage\s+by|damage\s*:\s*)\s*\+?(\d+(?:\.\d+)?)(?:%|\b)/i, text);
  if (damage !== null) {
    // Le texte officiel « Increase Damage by +150 » correspond à +150 % de la base.
    bonus.damagePercent += damage / 100;
    bonus.sources.push(`${perk.name} : +${damage} % dégâts`);
  }
  const damagePercent = parseFirstNumber(/(?:increase\s+damage\s+by|damage\s*:\s*)\s*\+?(\d+(?:\.\d+)?)\s*%/i, text);
  if (damagePercent !== null && damage === null) {
    bonus.damagePercent += damagePercent / 100;
    bonus.sources.push(`${perk.name} : +${damagePercent} % dégâts`);
  }
  const critical = parseFirstNumber(/critical\s+chance\s+by\s*\+?(\d+(?:\.\d+)?)\s*%/i, text);
  if (critical !== null) {
    bonus.criticalChanceFlat += critical / 100;
    bonus.sources.push(`${perk.name} : +${critical} % chance critique`);
  }
  const criticalMultiplier = parseFirstNumber(/critical\s+damage\s+multiplier\s+by\s*\+?(\d+(?:\.\d+)?)\s*x/i, text);
  if (criticalMultiplier !== null) {
    bonus.criticalMultiplierFlat += criticalMultiplier;
    bonus.sources.push(`${perk.name} : +${criticalMultiplier}x multiplicateur critique`);
  }
  const status = parseFirstNumber(/status\s+chance\s+by\s*\+?(\d+(?:\.\d+)?)\s*%/i, text);
  if (status !== null) {
    bonus.statusChanceFlat += status / 100;
    bonus.sources.push(`${perk.name} : +${status} % chance de statut`);
  }
  return bonus;
}

export function createIncarnonSelection(profile: IncarnonProfile): IncarnonSelection {
  return {
    profileWeapon: profile.weapon,
    active: false,
    selectedEvolution: 1,
    selectedPerkByTier: { "1": profile.evolutions.find(evolution => evolution.tier === 1)?.perks.length ? 0 : null },
  };
}

export function getIncarnonExportTree(weapon: Weapon | undefined, selection: IncarnonSelection | null | undefined) {
  const profile = getIncarnonProfile(weapon);
  if (!profile || !selection) return null;
  return {
    weapon: weapon?.name,
    profileWeapon: profile.weapon,
    family: profile.family,
    active: selection.active,
    selectedEvolution: selection.selectedEvolution,
    selectedPerkByTier: selection.selectedPerkByTier,
    evolutions: profile.evolutions,
  };
}
