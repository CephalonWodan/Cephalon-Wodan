// ============================================================
// WARFRAME SET BUILDER — Data Layer
// Tenno Codex dark theme: #0a0e14 bg, #4fc3f7 cyan accent
// ============================================================

export type Rarity = "common" | "uncommon" | "rare" | "legendary" | "prime";
export type WeaponType = "primary" | "secondary" | "melee" | "archgun" | "archmelee";
export type DamageType = "impact" | "puncture" | "slash" | "heat" | "cold" | "electricity" | "toxin" | "blast" | "corrosive" | "gas" | "magnetic" | "radiation" | "viral";

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
}

export interface Companion {
  id: string;
  name: string;
  type: "sentinel" | "beast" | "moa" | "hound" | "predasite" | "vulpaphyla";
  mastery: number;
  health: number;
  shield: number;
  armor: number;
  rarity: Rarity;
  description: string;
  imageUrl?: string;
}

export interface Mod {
  id: string;
  name: string;
  rarity: Rarity;
  maxRank: number;
  polarity: "madurai" | "vazarin" | "naramon" | "zenurik" | "unairu" | "penjaga" | "umbra" | "any";
  type: "warframe" | "primary" | "secondary" | "melee" | "companion" | "archwing" | "universal";
  description: string;
  effect: string;
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
  createdAt: string;
}

// ---- WARFRAMES DATA ----
// Charger les données complètes depuis le fichier JSON
import fullData from './warframe-data-full.json';

// Convertir les données brutes en interfaces TypeScript
const convertedWarframes = fullData.warframes.map((w: any) => ({
  id: w.id,
  name: w.name,
  isPrime: w.name.includes('Prime'),
  role: 'Guerrier',
  health: w.health,
  shield: w.shield,
  armor: w.armor,
  energy: w.energy,
  mastery: 0,
  abilities: [],
  description: w.description || '',
  rarity: w.rarity,
}));

export const WARFRAMES: Warframe[] = convertedWarframes;

// ---- WEAPONS DATA ----
const convertedWeapons = fullData.weapons.map((w: any) => ({
  id: w.id,
  name: w.name,
  type: (w.id.includes('melee') ? 'melee' : w.id.includes('secondary') ? 'secondary' : 'primary') as WeaponType,
  isPrime: w.name.includes('Prime'),
  mastery: 0,
  damage: w.damage || 10,
  critChance: w.critChance || 0,
  critMultiplier: w.critMult || 1,
  statusChance: w.procChance || 0,
  fireRate: w.fireRate || 1,
  rarity: w.rarity,
  description: w.description || '',
}));

export const WEAPONS: Weapon[] = convertedWeapons;

// ---- COMPANIONS DATA ----
const convertedCompanions = fullData.companions.map((c: any) => ({
  id: c.id,
  name: c.name,
  type: (c.type || 'sentinel') as any,
  mastery: 0,
  health: c.health || 100,
  shield: c.shield || 0,
  armor: c.armor || 0,
  rarity: c.rarity,
  description: c.description || '',
}));

export const COMPANIONS: Companion[] = convertedCompanions;

// ---- MODS DATA ----
const convertedMods = fullData.mods.map((m: any) => ({
  id: m.id,
  name: m.name,
  rarity: m.rarity,
  maxRank: 10,
  polarity: ('madurai') as any,
  type: (m.type === 'Warframe' ? 'warframe' : 'primary') as any,
  description: m.description || '',
  effect: `${m.baseDrain ? '+' + m.baseDrain + ' drain' : 'Mod'}`,
}));

export const MODS: Mod[] = convertedMods.slice(0, 300);
// ---- HELPER FUNCTIONS ----
export function getRarityColor(rarity: Rarity): string {
  const colors: Record<Rarity, string> = {
    common: "#b0bec5",
    uncommon: "#66bb6a",
    rare: "#42a5f5",
    legendary: "#ffd700",
    prime: "#ff6b35",
  };
  return colors[rarity];
}

export function getRarityLabel(rarity: Rarity): string {
  const labels: Record<Rarity, string> = {
    common: "Commun",
    uncommon: "Peu commun",
    rare: "Rare",
    legendary: "Légendaire",
    prime: "Prime",
  };
  return labels[rarity];
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
    createdAt: new Date().toISOString(),
  };
}
