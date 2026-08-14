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
  arcanes?: Array<Record<string, any>>;
  archonShards?: Array<Record<string, any>>;
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
  selectedRank?: number;
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
  effectCount?: number;
  effectIds?: string[];
  sourceKey?: string;
  description: string;
  imageUrl?: string;
}

export interface SelectedArchonShard {
  shard: ArchonShard;
  effectIndex: number;
}

export interface ItemDropSource {
  location: string;
  type: string;
  chance: number;
  rarity?: string;
}

export interface PrimeRelicReward {
  itemName: string;
  rarity: "Common" | "Uncommon" | "Rare";
  chance: number;
}

export interface PrimeRelic {
  id: string;
  era: "Lith" | "Meso" | "Neo" | "Axi" | "Requiem";
  name: string;
  state: "Intact" | "Exceptional" | "Flawless" | "Radiant";
  rewards: PrimeRelicReward[];
}

export interface WorldStateAlert {
  id: string;
  type: string;
  missionNode: string;
  faction: string;
  reward: string;
  eta: string;
}

export interface WorldStateData {
  fissures: { id: string; node: string; tier: string; missionType: string; active: boolean }[];
  alerts: WorldStateAlert[];
  cycles: { name: string; state: string; timeRemaining: string }[];
}

export interface CompanionParts {
  head?: string;
  bracket?: string;
  core?: string;
  gyro?: string;
}

export interface CompanionParts {
  head?: string;
  bracket?: string;
  core?: string;
  gyro?: string;
}

export const MOA_PARTS = {
  heads: ["Lambeo MOA", "Nychus MOA", "Oloro MOA", "Para MOA"],
  brackets: ["Model 1", "Model 2", "Model 3"],
  cores: ["Cold-Fusion Core", "Plasma Core", "Ion Core"],
  gyros: ["Stabilizer Gyro", "Precision Gyro", "Aero Gyro"],
};

export const HOUND_PARTS = {
  heads: ["Bhaira Hound", "Dorma Hound", "Hec Hound"],
  brackets: ["Stabilizer Bracket", "Reinforced Bracket", "Agile Bracket"],
  cores: ["Shattering Core", "Vampiric Core", "Overcharged Core"],
  gyros: ["Surging Gyro", "Rebounding Gyro", "Nullifying Gyro"],
};

export const COMPANION_PRECEPTS = [
  { id: "hound-retribution", name: "Retribution (Hound)", type: "hound", description: "Envoie un rayon de choc sur l’ennemi ciblé et étourdit." },
  { id: "hound-synergized-nodes", name: "Synergized Nodes (Hound)", type: "hound", description: "Laisse tomber des zones d’énergie pour recharger les boucliers et les capacités." },
  { id: "hound-reflex-denial", name: "Reflex Denial (Hound)", type: "hound", description: "Désarme les ennemis proches en cas de dégâts subis." },
  { id: "moa-tractor-beam", name: "Tractor Beam (MOA)", type: "moa", description: "Augmente la durée de visée planée du Warframe de 120%." },
  { id: "moa-security-override", name: "Security Override (MOA)", type: "moa", description: "Piratage automatique des consoles de décryptage proches." },
  { id: "moa-shock-wave", name: "Shock Wave (MOA)", type: "moa", description: "Émet une onde de choc au sol renversant les adversaires proches." },
  { id: "fetch", name: "Fetch (Universel)", type: "universal", description: "Aspire les butins et ressources à proximité du compagnon." },
  { id: "vacuum", name: "Vacuum (Sentinelle/Robotic)", type: "universal", description: "Aspire les objets et munitions à grande distance." },
  { id: "shield-charger", name: "Shield Charger (Robotic)", type: "universal", description: "Augmente les boucliers du Warframe et de l’arme de soutien." },
  { id: "calculated-shot", name: "Calculated Shot (Robotic)", type: "universal", description: "Tire avec précision sur les points faibles ennemis désignés." }
];

export interface BuildSet {
  id: string;
  name: string;
  description: string;
  capacityBoosts: {
    warframe: boolean;
    primary: boolean;
    secondary: boolean;
    melee: boolean;
    companion: boolean;
  };
  warframe?: Warframe;
  primaryWeapon?: Weapon;
  secondaryWeapon?: Weapon;
  meleeWeapon?: Weapon;
  companion?: Companion;
  companionParts?: CompanionParts;
  warframeMods: (Mod | null)[];
  primaryMods: (Mod | null)[];
  secondaryMods: (Mod | null)[];
  meleeMods: (Mod | null)[];
  companionMods: (Mod | null)[];
  warframeArcanes: (Arcane | null)[];
  primaryArcanes: (Arcane | null)[];
  secondaryArcanes: (Arcane | null)[];
  meleeArcanes: (Arcane | null)[];
  archonShards: (SelectedArchonShard | null)[];
  createdAt: string;
}

export const WARFRAMES: Warframe[] = fullData.warframes as Warframe[];

// Retain only weapons with at least one usable combat metric. The raw source remains
// untouched, while every catalogue consumer (catalogue, counters and builder) receives
// the cleaned list automatically.
const hasCombatProfile = (weapon: Record<string, any>) =>
  [weapon.damage, weapon.critChance, weapon.critMultiplier, weapon.statusChance]
    .some(value => Number(value ?? 0) !== 0);

export const WEAPONS: Weapon[] = fullData.weapons.filter(hasCombatProfile) as Weapon[];
export const MODS: Mod[] = fullData.mods as Mod[];
export const COMPANIONS: Companion[] = fullData.companions as Companion[];
export const ARCANES: Arcane[] = (fullData as any).arcanes as Arcane[];
export const ARCHON_SHARDS: ArchonShard[] = fullData.archonShards as ArchonShard[];
export const ARCHON_SHARD_EFFECT_TOTAL = ARCHON_SHARDS.reduce((total, shard) => total + (shard.effectCount ?? shard.effects.length), 0);

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
    capacityBoosts: { warframe: false, primary: false, secondary: false, melee: false, companion: false },
    warframeMods: Array(8).fill(null),
    primaryMods: Array(8).fill(null),
    secondaryMods: Array(8).fill(null),
    meleeMods: Array(8).fill(null),
    companionMods: Array(8).fill(null),
    warframeArcanes: Array(2).fill(null),
    primaryArcanes: Array(1).fill(null),
    secondaryArcanes: Array(1).fill(null),
    meleeArcanes: Array(1).fill(null),
    archonShards: Array(5).fill(null),
    createdAt: new Date().toISOString(),
  };
}


import relicsJson from "./relics-data.json";
export const PRIME_RELICS: PrimeRelic[] = relicsJson as PrimeRelic[];

export const WORLD_STATE_MOCK: WorldStateData = {
  fissures: [
    { id: "f1", node: "Hydron (Sedna)", tier: "Axi", missionType: "Défense", active: true },
    { id: "f2", node: "Helene (Saturne)", tier: "Neo", missionType: "Défense", active: true },
    { id: "f3", node: "Io (Jupiter)", tier: "Meso", missionType: "Défense", active: true },
    { id: "f4", node: "Tethys (Saturne)", tier: "Lith", missionType: "Assassinat", active: true },
  ],
  alerts: [
    { id: "a1", type: "Alerte de Fissure Spéciale", missionNode: "Marduk (Void)", faction: "Corrupted", reward: "Adaptation (Mod) + 15,000 CR", eta: "1h 24m" },
    { id: "a2", type: "Invasion Grineer vs Corpus", missionNode: "Stöfler (Lua)", faction: "Grineer", reward: "Orokin Catalyst Blueprint", eta: "4h 12m" }
  ],
  cycles: [
    { name: "Cetus (Plaines d'Eidolon)", state: "Nuit", timeRemaining: "31m 45s" },
    { name: "Vallée Orbis (Venus)", state: "Chaud", timeRemaining: "12m 10s" },
    { name: "Deimos (Cambion)", state: "Ferm", timeRemaining: "54m 02s" }
  ]
};
