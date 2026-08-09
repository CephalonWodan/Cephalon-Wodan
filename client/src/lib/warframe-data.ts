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
export const WARFRAMES: Warframe[] = [
  { id: "excalibur", name: "Excalibur", isPrime: false, role: "Attaque", health: 100, shield: 100, armor: 225, energy: 100, mastery: 0, abilities: ["Slash Dash", "Radial Blind", "Radial Javelin", "Exalted Blade"], description: "Maître de l'épée, équilibré et polyvalent. Idéal pour les débutants.", rarity: "common" },
  { id: "excalibur-prime", name: "Excalibur Prime", isPrime: true, role: "Attaque", health: 100, shield: 100, armor: 225, energy: 100, mastery: 0, abilities: ["Slash Dash", "Radial Blind", "Radial Javelin", "Exalted Blade"], description: "Version Prime d'Excalibur, obtenue via les Fondateurs.", rarity: "prime" },
  { id: "mag", name: "Mag", isPrime: false, role: "Contrôle", health: 75, shield: 150, armor: 65, energy: 125, mastery: 0, abilities: ["Pull", "Magnetize", "Polarize", "Crush"], description: "Manipulatrice des champs magnétiques, excellente contre les Corpus.", rarity: "common" },
  { id: "volt", name: "Volt", isPrime: false, role: "Vitesse", health: 100, shield: 100, armor: 100, energy: 100, mastery: 0, abilities: ["Shock", "Speed", "Electric Shield", "Discharge"], description: "Maître de l'électricité, augmente la vitesse de l'équipe.", rarity: "common" },
  { id: "loki", name: "Loki", isPrime: false, role: "Furtivité", health: 75, shield: 75, armor: 65, energy: 150, mastery: 0, abilities: ["Decoy", "Invisibility", "Switch Teleport", "Radial Disarm"], description: "Spécialiste de la furtivité et du sabotage.", rarity: "uncommon" },
  { id: "rhino", name: "Rhino", isPrime: false, role: "Tank", health: 150, shield: 100, armor: 275, energy: 100, mastery: 0, abilities: ["Rhino Charge", "Iron Skin", "Roar", "Rhino Stomp"], description: "Tank indestructible, protège l'équipe avec son armure d'acier.", rarity: "uncommon" },
  { id: "saryn", name: "Saryn", isPrime: false, role: "Nuisance", health: 125, shield: 75, armor: 175, energy: 150, mastery: 0, abilities: ["Spores", "Molt", "Toxic Lash", "Miasma"], description: "Reine des dégâts de zone avec ses spores toxiques.", rarity: "rare" },
  { id: "mesa", name: "Mesa", isPrime: false, role: "Tireur d'élite", health: 125, shield: 100, armor: 65, energy: 100, mastery: 0, abilities: ["Ballistic Battery", "Shooting Gallery", "Shatter Shield", "Peacemaker"], description: "Pistolière hors pair, dévastatrice en mode Peacemaker.", rarity: "rare" },
  { id: "nova", name: "Nova", isPrime: false, role: "Contrôle", health: 75, shield: 150, armor: 65, energy: 150, mastery: 0, abilities: ["Null Star", "Antimatter Drop", "Worm Hole", "Molecular Prime"], description: "Manipulatrice de l'antimatière, ralentit ou accélère les ennemis.", rarity: "rare" },
  { id: "trinity", name: "Trinity", isPrime: false, role: "Support", health: 100, shield: 100, armor: 65, energy: 150, mastery: 0, abilities: ["Well of Life", "Energy Vampire", "Link", "Blessing"], description: "Guérisseuse de l'équipe, indispensable en missions difficiles.", rarity: "uncommon" },
  { id: "ash", name: "Ash", isPrime: false, role: "Assassin", health: 150, shield: 100, armor: 65, energy: 100, mastery: 0, abilities: ["Shuriken", "Smoke Screen", "Teleport", "Blade Storm"], description: "Assassin ninja, élimine les ennemis avec précision.", rarity: "uncommon" },
  { id: "ember", name: "Ember", isPrime: false, role: "Pyromane", health: 100, shield: 100, armor: 65, energy: 150, mastery: 0, abilities: ["Fireball", "Immolation", "Fire Blast", "Inferno"], description: "Maîtresse du feu, incendie tout sur son passage.", rarity: "uncommon" },
  { id: "frost", name: "Frost", isPrime: false, role: "Défense", health: 100, shield: 150, armor: 190, energy: 100, mastery: 0, abilities: ["Freeze", "Ice Wave", "Snow Globe", "Avalanche"], description: "Défenseur glacial, protège les objectifs avec ses globes de neige.", rarity: "uncommon" },
  { id: "nidus", name: "Nidus", isPrime: false, role: "Tank", health: 225, shield: 0, armor: 275, energy: 100, mastery: 5, abilities: ["Virulence", "Larva", "Parasitic Link", "Ravenous"], description: "Parasite infernal qui grandit en puissance au fil du combat.", rarity: "rare" },
  { id: "octavia", name: "Octavia", isPrime: false, role: "Support", health: 100, shield: 100, armor: 65, energy: 150, mastery: 0, abilities: ["Mallet", "Resonator", "Metronome", "Amp"], description: "Barde musicale qui booste l'équipe avec ses mélodies.", rarity: "rare" },
  { id: "wisp", name: "Wisp", isPrime: false, role: "Support", health: 75, shield: 75, armor: 65, energy: 175, mastery: 0, abilities: ["Reservoirs", "Wil-O-Wisp", "Breach Surge", "Sol Gate"], description: "Spectre mystérieux qui renforce l'équipe avec ses réservoirs.", rarity: "legendary" },
  { id: "revenant", name: "Revenant", isPrime: false, role: "Tank", health: 175, shield: 100, armor: 225, energy: 150, mastery: 0, abilities: ["Enthrall", "Mesmer Skin", "Reave", "Danse Macabre"], description: "Eidolon revenu, presque invincible avec sa peau de Mesmer.", rarity: "rare" },
  { id: "khora", name: "Khora", isPrime: false, role: "Contrôle", health: 125, shield: 100, armor: 275, energy: 150, mastery: 0, abilities: ["Whipclaw", "Ensnare", "Venari", "Strangledome"], description: "Chasseuse avec sa compagne Venari, piège les ennemis.", rarity: "rare" },
  { id: "gauss", name: "Gauss", isPrime: false, role: "Vitesse", health: 150, shield: 100, armor: 175, energy: 100, mastery: 0, abilities: ["Mach Rush", "Kinetic Plating", "Thermal Sunder", "Redline"], description: "Coureur hypercinétique, atteint des vitesses impossibles.", rarity: "rare" },
  { id: "gara", name: "Gara", isPrime: false, role: "Défense", health: 100, shield: 100, armor: 150, energy: 150, mastery: 0, abilities: ["Shattered Lash", "Splinter Storm", "Vitrify", "Mass Vitrify"], description: "Maîtresse du verre, crée des murs impénétrables.", rarity: "rare" },
];

// ---- WEAPONS DATA ----
export const WEAPONS: Weapon[] = [
  { id: "braton", name: "Braton", type: "primary", isPrime: false, mastery: 0, damage: 26, critChance: 0.16, critMultiplier: 1.6, statusChance: 0.16, fireRate: 8.75, rarity: "common", description: "Fusil d'assaut polyvalent, parfait pour débuter." },
  { id: "braton-prime", name: "Braton Prime", type: "primary", isPrime: true, mastery: 8, damage: 30, critChance: 0.20, critMultiplier: 2.0, statusChance: 0.20, fireRate: 9.58, rarity: "prime", description: "Version Prime du Braton, puissance accrue." },
  { id: "soma", name: "Soma", type: "primary", isPrime: false, mastery: 6, damage: 12, critChance: 0.30, critMultiplier: 3.0, statusChance: 0.07, fireRate: 15, rarity: "rare", description: "Mitrailleuse à haute cadence et critique élevé." },
  { id: "soma-prime", name: "Soma Prime", type: "primary", isPrime: true, mastery: 6, damage: 14, critChance: 0.35, critMultiplier: 3.0, statusChance: 0.09, fireRate: 15, rarity: "prime", description: "Version Prime du Soma, encore plus létale." },
  { id: "tigris", name: "Tigris", type: "primary", isPrime: false, mastery: 10, damage: 260, critChance: 0.15, critMultiplier: 1.5, statusChance: 0.25, fireRate: 2.0, rarity: "rare", description: "Fusil à pompe dévastateur à courte portée." },
  { id: "tigris-prime", name: "Tigris Prime", type: "primary", isPrime: true, mastery: 13, damage: 494, critChance: 0.15, critMultiplier: 1.5, statusChance: 0.30, fireRate: 2.0, rarity: "prime", description: "Le fusil à pompe le plus puissant du jeu." },
  { id: "rubico", name: "Rubico", type: "primary", isPrime: false, mastery: 7, damage: 187, critChance: 0.32, critMultiplier: 2.4, statusChance: 0.12, fireRate: 3.67, rarity: "rare", description: "Sniper précis avec un excellent critique." },
  { id: "rubico-prime", name: "Rubico Prime", type: "primary", isPrime: true, mastery: 12, damage: 187, critChance: 0.38, critMultiplier: 2.8, statusChance: 0.12, fireRate: 3.67, rarity: "prime", description: "Le meilleur sniper pour les Eidolons." },
  { id: "lenz", name: "Lenz", type: "primary", isPrime: false, mastery: 10, damage: 200, critChance: 0.42, critMultiplier: 2.0, statusChance: 0.28, fireRate: 1.0, rarity: "legendary", description: "Arc cryogénique qui gèle et explose les ennemis." },
  { id: "kuva-bramma", name: "Kuva Bramma", type: "primary", isPrime: false, mastery: 8, damage: 162, critChance: 0.35, critMultiplier: 2.4, statusChance: 0.27, fireRate: 1.0, rarity: "legendary", description: "Arc Kuva avec des flèches explosives dévastatrices." },
  { id: "lato", name: "Lato", type: "secondary", isPrime: false, mastery: 0, damage: 45, critChance: 0.20, critMultiplier: 1.5, statusChance: 0.10, fireRate: 6.17, rarity: "common", description: "Pistolet de départ, fiable et précis." },
  { id: "lato-prime", name: "Lato Prime", type: "secondary", isPrime: true, mastery: 0, damage: 55, critChance: 0.25, critMultiplier: 2.0, statusChance: 0.15, fireRate: 6.17, rarity: "prime", description: "Version Prime du Lato, réservée aux Fondateurs." },
  { id: "akstiletto", name: "Akstiletto", type: "secondary", isPrime: false, mastery: 6, damage: 38, critChance: 0.22, critMultiplier: 2.0, statusChance: 0.28, fireRate: 8.33, rarity: "rare", description: "Pistolets jumelés avec statut élevé." },
  { id: "akstiletto-prime", name: "Akstiletto Prime", type: "secondary", isPrime: true, mastery: 10, damage: 40, critChance: 0.24, critMultiplier: 2.0, statusChance: 0.32, fireRate: 8.33, rarity: "prime", description: "Meilleurs pistolets jumelés pour le statut." },
  { id: "catchmoon", name: "Catchmoon", type: "secondary", isPrime: false, mastery: 0, damage: 280, critChance: 0.22, critMultiplier: 1.8, statusChance: 0.28, fireRate: 2.0, rarity: "rare", description: "Kitgun dévastateur à courte portée." },
  { id: "nikana", name: "Nikana", type: "melee", isPrime: false, mastery: 2, damage: 115, critChance: 0.15, critMultiplier: 1.5, statusChance: 0.15, fireRate: 1.0, rarity: "uncommon", description: "Katana japonais, élégant et efficace." },
  { id: "nikana-prime", name: "Nikana Prime", type: "melee", isPrime: true, mastery: 12, damage: 145, critChance: 0.20, critMultiplier: 2.0, statusChance: 0.20, fireRate: 1.0, rarity: "prime", description: "Le katana Prime, l'une des meilleures lames." },
  { id: "galatine", name: "Galatine", type: "melee", isPrime: false, mastery: 5, damage: 225, critChance: 0.15, critMultiplier: 2.0, statusChance: 0.25, fireRate: 0.917, rarity: "rare", description: "Épée à deux mains massive, dégâts de zone." },
  { id: "galatine-prime", name: "Galatine Prime", type: "melee", isPrime: true, mastery: 14, damage: 265, critChance: 0.20, critMultiplier: 2.0, statusChance: 0.30, fireRate: 0.917, rarity: "prime", description: "La grande épée Prime, dévastatrice." },
  { id: "reaper-prime", name: "Reaper Prime", type: "melee", isPrime: true, mastery: 8, damage: 190, critChance: 0.25, critMultiplier: 2.0, statusChance: 0.25, fireRate: 0.833, rarity: "prime", description: "Faux Prime avec d'excellentes statistiques." },
  { id: "lesion", name: "Lesion", type: "melee", isPrime: false, mastery: 6, damage: 175, critChance: 0.15, critMultiplier: 2.0, statusChance: 0.35, fireRate: 1.08, rarity: "rare", description: "Bâton de combat avec statut toxique élevé." },
];

// ---- COMPANIONS DATA ----
export const COMPANIONS: Companion[] = [
  { id: "carrier", name: "Carrier", type: "sentinel", mastery: 0, health: 300, shield: 300, armor: 50, rarity: "common", description: "Sentinelle utilitaire qui ramasse les ressources automatiquement." },
  { id: "carrier-prime", name: "Carrier Prime", type: "sentinel", mastery: 0, health: 400, shield: 400, armor: 65, rarity: "prime", description: "Version Prime du Carrier, plus résistante." },
  { id: "helios", name: "Helios", type: "sentinel", mastery: 0, health: 200, shield: 200, armor: 50, rarity: "uncommon", description: "Sentinelle qui scanne automatiquement les ennemis pour le Codex." },
  { id: "helios-prime", name: "Helios Prime", type: "sentinel", mastery: 0, health: 300, shield: 300, armor: 65, rarity: "prime", description: "Version Prime d'Helios, scanner amélioré." },
  { id: "djinn", name: "Djinn", type: "sentinel", mastery: 0, health: 200, shield: 200, armor: 50, rarity: "uncommon", description: "Sentinelle qui peut ressusciter une fois par mission." },
  { id: "kubrow", name: "Kubrow", type: "beast", mastery: 0, health: 450, shield: 100, armor: 50, rarity: "uncommon", description: "Chien de combat loyal et puissant." },
  { id: "kavat", name: "Kavat", type: "beast", mastery: 0, health: 300, shield: 100, armor: 50, rarity: "rare", description: "Chat de combat agile avec des capacités uniques." },
  { id: "smeeta-kavat", name: "Smeeta Kavat", type: "beast", mastery: 0, health: 300, shield: 100, armor: 50, rarity: "rare", description: "Kavat porte-bonheur qui multiplie les ressources et les affections." },
  { id: "panzer-vulpaphyla", name: "Panzer Vulpaphyla", type: "vulpaphyla", mastery: 0, health: 300, shield: 100, armor: 50, rarity: "legendary", description: "Renard des Cambion qui propage des spores virales." },
  { id: "hound", name: "Hound", type: "hound", mastery: 0, health: 400, shield: 200, armor: 100, rarity: "rare", description: "Chien mécanique des Corpus, personnalisable." },
];

// ---- MODS DATA ----
export const MODS: Mod[] = [
  { id: "serration", name: "Serration", rarity: "common", maxRank: 10, polarity: "madurai", type: "primary", description: "Augmente les dégâts de base", effect: "+165% Dégâts" },
  { id: "split-chamber", name: "Split Chamber", rarity: "uncommon", maxRank: 5, polarity: "any", type: "primary", description: "Chance de tirer une balle supplémentaire", effect: "+90% Multishot" },
  { id: "point-strike", name: "Point Strike", rarity: "common", maxRank: 5, polarity: "madurai", type: "primary", description: "Augmente la chance de coup critique", effect: "+150% Critique" },
  { id: "vital-sense", name: "Vital Sense", rarity: "rare", maxRank: 5, polarity: "madurai", type: "primary", description: "Augmente le multiplicateur critique", effect: "+120% Multi-Critique" },
  { id: "heavy-caliber", name: "Heavy Caliber", rarity: "rare", maxRank: 10, polarity: "any", type: "primary", description: "Dégâts élevés avec pénalité de précision", effect: "+165% Dégâts, -55% Précision" },
  { id: "vigilante-armaments", name: "Vigilante Armaments", rarity: "uncommon", maxRank: 5, polarity: "any", type: "primary", description: "Multishot avec bonus Vigilante", effect: "+60% Multishot" },
  { id: "hornet-strike", name: "Hornet Strike", rarity: "common", maxRank: 10, polarity: "madurai", type: "secondary", description: "Augmente les dégâts des pistolets", effect: "+220% Dégâts" },
  { id: "barrel-diffusion", name: "Barrel Diffusion", rarity: "uncommon", maxRank: 5, polarity: "any", type: "secondary", description: "Multishot pour pistolets", effect: "+120% Multishot" },
  { id: "pistol-gambit", name: "Pistol Gambit", rarity: "common", maxRank: 5, polarity: "madurai", type: "secondary", description: "Critique pistolet", effect: "+120% Critique" },
  { id: "lethal-torrent", name: "Lethal Torrent", rarity: "rare", maxRank: 5, polarity: "any", type: "secondary", description: "Cadence et multishot pistolet", effect: "+60% Cadence, +60% Multishot" },
  { id: "pressure-point", name: "Pressure Point", rarity: "common", maxRank: 5, polarity: "madurai", type: "melee", description: "Dégâts mêlée de base", effect: "+120% Dégâts" },
  { id: "true-steel", name: "True Steel", rarity: "uncommon", maxRank: 5, polarity: "madurai", type: "melee", description: "Critique mêlée", effect: "+120% Critique" },
  { id: "organ-shatter", name: "Organ Shatter", rarity: "rare", maxRank: 5, polarity: "any", type: "melee", description: "Multiplicateur critique mêlée", effect: "+90% Multi-Critique" },
  { id: "blood-rush", name: "Blood Rush", rarity: "rare", maxRank: 5, polarity: "naramon", type: "melee", description: "Critique augmente avec le combo", effect: "+60% Critique/Combo" },
  { id: "condition-overload", name: "Condition Overload", rarity: "rare", maxRank: 3, polarity: "any", type: "melee", description: "Dégâts augmentent avec les statuts actifs", effect: "+80% Dégâts/Statut" },
  { id: "vitality", name: "Vitality", rarity: "common", maxRank: 10, polarity: "vazarin", type: "warframe", description: "Augmente les points de vie", effect: "+440% Vie" },
  { id: "redirection", name: "Redirection", rarity: "common", maxRank: 10, polarity: "vazarin", type: "warframe", description: "Augmente les boucliers", effect: "+440% Boucliers" },
  { id: "steel-fiber", name: "Steel Fiber", rarity: "uncommon", maxRank: 10, polarity: "any", type: "warframe", description: "Augmente l'armure", effect: "+110% Armure" },
  { id: "streamline", name: "Streamline", rarity: "uncommon", maxRank: 5, polarity: "zenurik", type: "warframe", description: "Réduit le coût en énergie", effect: "+30% Efficacité" },
  { id: "intensify", name: "Intensify", rarity: "uncommon", maxRank: 5, polarity: "madurai", type: "warframe", description: "Augmente la puissance des capacités", effect: "+30% Puissance" },
  { id: "continuity", name: "Continuity", rarity: "common", maxRank: 5, polarity: "naramon", type: "warframe", description: "Augmente la durée des capacités", effect: "+30% Durée" },
  { id: "stretch", name: "Stretch", rarity: "common", maxRank: 5, polarity: "naramon", type: "warframe", description: "Augmente la portée des capacités", effect: "+45% Portée" },
  { id: "primed-continuity", name: "Primed Continuity", rarity: "legendary", maxRank: 10, polarity: "naramon", type: "warframe", description: "Version Prime de Continuity", effect: "+55% Durée" },
  { id: "primed-flow", name: "Primed Flow", rarity: "legendary", maxRank: 10, polarity: "naramon", type: "warframe", description: "Augmente massivement la réserve d'énergie", effect: "+275% Énergie" },
  { id: "adaptation", name: "Adaptation", rarity: "rare", maxRank: 10, polarity: "any", type: "warframe", description: "Résistance aux dégâts récents", effect: "Jusqu'à +90% Résistance" },
  { id: "umbral-vitality", name: "Umbral Vitality", rarity: "legendary", maxRank: 5, polarity: "umbra", type: "warframe", description: "Vie et armure Umbra", effect: "+770% Vie, +110% Armure" },
];

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
