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
export type SlotPolarity = Polarity | "default" | "none";
export type BuildSlotKey = "warframe" | "primary" | "secondary" | "melee" | "companion";
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

export interface WarframeAbilityStat {
  label: string;
  modifier?: string;
  values?: Record<string, string | number>;
}

export interface WarframeAbility {
  name: string;
  description: string;
  uniqueName?: string;
  imageName?: string;
  officialStats?: WarframeAbilityStat[];
  strength?: string;
  duration?: string;
  range?: string;
  efficiency?: string;
  misc?: string;
}

export type WarframeAbilityEntry = WarframeAbility | string;

export interface WarframePassive {
  attribute?: string;
  description: string;
}

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
  abilities: WarframeAbilityEntry[];
  description: string;
  passive?: WarframePassive | string;
  imageUrl?: string;
  imageUrls?: string[];
  imageName?: string;
  wikiLink?: string;
  wikiLinks?: string[];
  wikiaUrl?: string;
  wikiUrl?: string;
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
  imageUrls?: string[];
  imageName?: string;
  wikiLink?: string;
  wikiLinks?: string[];
  wikiaUrl?: string;
  wikiUrl?: string;
  weaponClass?: string;
  trigger?: string;
  accuracy?: number;
  magazineSize?: number;
  reloadTime?: number;
  disposition?: number;
  damageTypes?: Record<string, number>;
  polarities?: Polarity[];
}

export interface CraftingComponent {
  name: string;
  count: number;
}

export interface CraftingRecipe {
  credits: number;
  buildTimeHours: number;
  components: CraftingComponent[];
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
  recipe?: CraftingRecipe;
  modifiers?: { name: string; effect: string }[];
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
  imageUrls?: string[];
  imageName?: string;
  wikiLink?: string;
  wikiLinks?: string[];
  wikiaUrl?: string;
  wikiUrl?: string;
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
  imageName?: string;
  iconName?: string;
  wikiLink?: string;
  wikiaUrl?: string;
  wikiUrl?: string;
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

export interface BuildIncarnonSelection {
  profileWeapon: string;
  active: boolean;
  selectedEvolution: number;
  selectedPerkByTier: Record<string, number | null>;
}

export interface BuildIncarnonSelections {
  primary: BuildIncarnonSelection | null;
  secondary: BuildIncarnonSelection | null;
  melee: BuildIncarnonSelection | null;
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

export interface ModularPartStat {
  name: string;
  healthBonus: number;
  shieldBonus: number;
  armorBonus: number;
}

export const MOA_PARTS_STATS: Record<string, ModularPartStat[]> = {
  heads: [
    { name: "Lambeo MOA", healthBonus: 100, shieldBonus: 50, armorBonus: 30 },
    { name: "Nychus MOA", healthBonus: 120, shieldBonus: 30, armorBonus: 40 },
    { name: "Oloro MOA", healthBonus: 80, shieldBonus: 90, armorBonus: 20 },
    { name: "Para MOA", healthBonus: 150, shieldBonus: 20, armorBonus: 50 },
  ],
  brackets: [
    { name: "Model 1 (Standard)", healthBonus: 50, shieldBonus: 50, armorBonus: 25 },
    { name: "Model 2 (Reinforced)", healthBonus: 100, shieldBonus: 0, armorBonus: 50 },
    { name: "Model 3 (Agile)", healthBonus: 25, shieldBonus: 100, armorBonus: 10 },
  ],
  cores: [
    { name: "Cold-Fusion Core", healthBonus: 200, shieldBonus: 100, armorBonus: 60 },
    { name: "Plasma Core", healthBonus: 100, shieldBonus: 200, armorBonus: 40 },
    { name: "Ion Core", healthBonus: 150, shieldBonus: 150, armorBonus: 50 },
  ],
  gyros: [
    { name: "Stabilizer Gyro", healthBonus: 40, shieldBonus: 40, armorBonus: 30 },
    { name: "Precision Gyro", healthBonus: 20, shieldBonus: 80, armorBonus: 20 },
    { name: "Aero Gyro", healthBonus: 60, shieldBonus: 20, armorBonus: 40 },
  ],
};

export const HOUND_PARTS_STATS: Record<string, ModularPartStat[]> = {
  heads: [
    { name: "Bhaira Hound", healthBonus: 130, shieldBonus: 60, armorBonus: 45 },
    { name: "Dorma Hound", healthBonus: 90, shieldBonus: 110, armorBonus: 30 },
    { name: "Hec Hound", healthBonus: 160, shieldBonus: 40, armorBonus: 60 },
  ],
  brackets: [
    { name: "Stabilizer Bracket", healthBonus: 60, shieldBonus: 60, armorBonus: 30 },
    { name: "Reinforced Bracket", healthBonus: 120, shieldBonus: 0, armorBonus: 70 },
    { name: "Agile Bracket", healthBonus: 30, shieldBonus: 120, armorBonus: 20 },
  ],
  cores: [
    { name: "Shattering Core", healthBonus: 180, shieldBonus: 80, armorBonus: 70 },
    { name: "Vampiric Core", healthBonus: 120, shieldBonus: 140, armorBonus: 50 },
    { name: "Overcharged Core", healthBonus: 150, shieldBonus: 150, armorBonus: 60 },
  ],
  gyros: [
    { name: "Surging Gyro", healthBonus: 50, shieldBonus: 50, armorBonus: 35 },
    { name: "Rebounding Gyro", healthBonus: 30, shieldBonus: 90, armorBonus: 25 },
    { name: "Nullifying Gyro", healthBonus: 70, shieldBonus: 30, armorBonus: 45 },
  ],
};

export const MOA_PARTS = {
  heads: MOA_PARTS_STATS.heads.map((p: ModularPartStat) => p.name),
  brackets: MOA_PARTS_STATS.brackets.map((p: ModularPartStat) => p.name),
  cores: MOA_PARTS_STATS.cores.map((p: ModularPartStat) => p.name),
  gyros: MOA_PARTS_STATS.gyros.map((p: ModularPartStat) => p.name),
};

export const HOUND_PARTS = {
  heads: HOUND_PARTS_STATS.heads.map((p: ModularPartStat) => p.name),
  brackets: HOUND_PARTS_STATS.brackets.map((p: ModularPartStat) => p.name),
  cores: HOUND_PARTS_STATS.cores.map((p: ModularPartStat) => p.name),
  gyros: HOUND_PARTS_STATS.gyros.map((p: ModularPartStat) => p.name),
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

export interface BuildSlotPolarities {
  warframe: SlotPolarity[];
  primary: SlotPolarity[];
  secondary: SlotPolarity[];
  melee: SlotPolarity[];
  companion: SlotPolarity[];
}

export interface HelminthSubstitution {
  abilityIndex: number;
  abilityId: string;
  abilityName: string;
  sourceWarframe: string;
  description: string;
  energyCost: number;
}

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
  auraMod: Mod | null;
  exilusMod: Mod | null;
  primaryMods: (Mod | null)[];
  secondaryMods: (Mod | null)[];
  meleeMods: (Mod | null)[];
  companionMods: (Mod | null)[];
  slotPolarities: BuildSlotPolarities;
  helminthSubstitution: HelminthSubstitution | null;
  warframeArcanes: (Arcane | null)[];
  primaryArcanes: (Arcane | null)[];
  secondaryArcanes: (Arcane | null)[];
  meleeArcanes: (Arcane | null)[];
  archonShards: (SelectedArchonShard | null)[];
  incarnonSelections: BuildIncarnonSelections;
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
export const COMPANIONS: Companion[] = (fullData.companions as Companion[]).map(c => {
  const type = (c.type || "").toLowerCase();
  let defaultRecipe = {
    credits: 25000,
    buildTimeHours: 24,
    components: [
      { name: "Morphics", count: 2 },
      { name: "Polymer Bundle", count: 1200 },
      { name: "Salvage", count: 3500 },
      { name: "Circuits", count: 900 }
    ]
  };
  if (type === "sentinel") {
    defaultRecipe = {
      credits: 15000,
      buildTimeHours: 24,
      components: [
        { name: "Control Module", count: 1 },
        { name: "Alloy Plate", count: 950 },
        { name: "Salvage", count: 600 },
        { name: "Nano Spores", count: 1200 }
      ]
    };
  } else if (type === "moa" || type === "hound") {
    defaultRecipe = {
      credits: 30000,
      buildTimeHours: 12,
      components: [
        { name: "Credits", count: 30000 },
        { name: "Reputation / Standing", count: 5000 },
        { name: "Modules & Pièces modulaires", count: 4 }
      ]
    };
  }
  return {
    ...c,
    recipe: c.recipe || defaultRecipe,
    modifiers: c.modifiers || [
      { name: "Lien Vital", effect: "+440% de PV basés sur le Warframe" },
      { name: "Lien Blindé", effect: "+110% d'armure basée sur le Warframe" },
      { name: "Détection Améliorée", effect: "+30m de rayon de radar ennemi" }
    ]
  };
});
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
    slotPolarities: {
      warframe: Array<SlotPolarity>(8).fill("default"),
      primary: Array<SlotPolarity>(8).fill("default"),
      secondary: Array<SlotPolarity>(8).fill("default"),
      melee: Array<SlotPolarity>(8).fill("default"),
      companion: Array<SlotPolarity>(10).fill("default"),
    },
    helminthSubstitution: null,
    warframeMods: Array(8).fill(null),
    auraMod: null,
    exilusMod: null,
    primaryMods: Array(8).fill(null),
    secondaryMods: Array(8).fill(null),
    meleeMods: Array(8).fill(null),
    companionMods: Array(10).fill(null),
    warframeArcanes: Array(2).fill(null),
    primaryArcanes: Array(1).fill(null),
    secondaryArcanes: Array(1).fill(null),
    meleeArcanes: Array(1).fill(null),
    archonShards: Array(5).fill(null),
    incarnonSelections: { primary: null, secondary: null, melee: null },
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
