// ============================================================
// WARFRAME SET BUILDER — Cephalon-Wodan catalog adapter
// Design reminder: Tenno Codex HUD — dense but readable, technical labels,
// cyan hierarchy with Prime orange, and predictable category sorting.
// ============================================================

import catalog from "./warframe-data-full.json";

export type Rarity = "common" | "uncommon" | "rare" | "legendary" | "prime";
export type WeaponType = "primary" | "secondary" | "melee" | "archgun" | "archmelee";
export type DamageType = "impact" | "puncture" | "slash" | "heat" | "cold" | "electricity" | "toxin" | "blast" | "corrosive" | "gas" | "magnetic" | "radiation" | "viral";
export type CompanionType = "sentinel" | "beast" | "moa" | "hound" | "predasite" | "vulpaphyla";
export type ModType = "warframe" | "primary" | "secondary" | "melee" | "companion" | "archwing" | "necramech" | "parazon" | "kdrive" | "universal";
export type Polarity = "madurai" | "vazarin" | "naramon" | "zenurik" | "unairu" | "penjaga" | "umbra" | "any";
export type ArcaneType = "warframe" | "primary" | "secondary" | "melee" | "operator" | "amp" | "kitgun" | "zaw" | "bow" | "shotgun";
export type ArchonShardVariant = "standard" | "tauforged";

type CatalogData = {
  warframes: Array<Record<string, any>>;
  weapons: Array<Record<string, any>>;
  mods: Array<Record<string, any>>;
  companions: Array<Record<string, any>>;
};

const fullData = catalog as CatalogData;

export interface Warframe {
  id: string;
  name: string;
  isPrime: boolean;
  role: string;
  health: number;
  shield: number;
  armor: number;
  energy: number;
  mastery: number;
  abilities: string[];
  description: string;
  imageUrl?: string;
  rarity: Rarity;
  polarities?: Polarity[];
  aura?: Polarity;
}

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  isPrime: boolean;
  mastery: number;
  damage: number;
  critChance: number;
  critMultiplier: number;
  statusChance: number;
  fireRate: number;
  rarity: Rarity;
  description: string;
  imageUrl?: string;
  weaponClass?: string;
  trigger?: string;
  accuracy?: number;
  magazineSize?: number;
  reloadTime?: number;
  disposition?: number;
  damageTypes?: Record<string, number>;
  polarities?: Polarity[];
}

export interface Companion {
  id: string;
  name: string;
  type: CompanionType;
  mastery: number;
  health: number;
  shield: number;
  armor: number;
  rarity: Rarity;
  description: string;
  imageUrl?: string;
  polarities?: Polarity[];
}

export interface Mod {
  id: string;
  name: string;
  rarity: Rarity;
  maxRank: number;
  polarity: Polarity;
  type: ModType;
  description: string;
  effect: string;
  compatName?: string;
  isAugment?: boolean;
  imageUrl?: string;
  dropCount?: number;
}

export interface Arcane {
  id: string;
  name: string;
  type: ArcaneType | string;
  rarity: Rarity;
  maxRank: number;
  criteria: string;
  description: string;
  dissolution: number;
  introduced?: string;
  isRefreshable?: boolean;
  upgradeTypes?: string[];
  imageUrl?: string;
  iconUrl?: string;
}

export interface ArchonShard {
  id: string;
  name: string;
  color: string;
  variant: ArchonShardVariant;
  rarity: Rarity;
  effects: string[];
  description: string;
  imageUrl?: string;
}

export interface BuildSet {
  id: string;
  name: string;
  description: string;
  warframe?: Warframe;
  primaryWeapon?: Weapon;
  secondaryWeapon?: Weapon;
  meleeWeapon?: Weapon;
  companion?: Companion;
  warframeMods: (Mod | null)[];
  primaryMods: (Mod | null)[];
  secondaryMods: (Mod | null)[];
  meleeMods: (Mod | null)[];
  warframeArcanes: (Arcane | null)[];
  primaryArcanes: (Arcane | null)[];
  secondaryArcanes: (Arcane | null)[];
  meleeArcanes: (Arcane | null)[];
  archonShards: (ArchonShard | null)[];
  createdAt: string;
}

export const WARFRAMES: Warframe[] = fullData.warframes as Warframe[];
export const WEAPONS: Weapon[] = fullData.weapons as Weapon[];
export const MODS: Mod[] = fullData.mods as Mod[];
export const COMPANIONS: Companion[] = fullData.companions as Companion[];
export const ARCANES: Arcane[] = (fullData as any).arcanes as Arcane[];
export const ARCHON_SHARDS: ArchonShard[] = (fullData as any).archonShards as ArchonShard[];

export const CATALOG_COUNTS = {
  warframes: WARFRAMES.length,
  weapons: WEAPONS.length,
  mods: MODS.length,
  companions: COMPANIONS.length,
  arcanes: ARCANES.length,
  archonShards: ARCHON_SHARDS.length,
};

export function getRarityColor(rarity: Rarity): string {
  const colors: Record<Rarity, string> = {
    common: "#b0bec5",
    uncommon: "#66bb6a",
    rare: "#42a5f5",
    legendary: "#ffd700",
    prime: "#ff6b35",
  };
  return colors[rarity] || colors.common;
}

export function getRarityLabel(rarity: Rarity): string {
  const labels: Record<Rarity, string> = {
    common: "Commun",
    uncommon: "Peu commun",
    rare: "Rare",
    legendary: "Légendaire",
    prime: "Prime",
  };
  return labels[rarity] || labels.common;
}

export function createEmptyBuild(name: string = "Nouveau Set"): BuildSet {
  return {
    id: Date.now().toString(),
    name,
    description: "",
    warframeMods: Array(8).fill(null),
    primaryMods: Array(8).fill(null),
    secondaryMods: Array(8).fill(null),
    meleeMods: Array(8).fill(null),
    warframeArcanes: Array(2).fill(null),
    primaryArcanes: Array(1).fill(null),
    secondaryArcanes: Array(1).fill(null),
    meleeArcanes: Array(1).fill(null),
    archonShards: Array(5).fill(null),
    createdAt: new Date().toISOString(),
  };
}
