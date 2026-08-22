// WARFRAME SET BUILDER — Community Presets Library
// Tenno Codex HUD reminder: community ideas are references, never endorsements.
// Official catalog data remains authoritative for names, effects and calculations.
// ============================================================

export type CommunityPresetCreator = "TheKengineer" | "MHBlacky" | "PANDAAHH";
export type CommunityPresetCategory = "Warframe" | "Arme Primaire" | "Arme Secondaire" | "Arme Mêlée";

export interface CommunityPreset {
  id: string;
  name: string;
  creator: CommunityPresetCreator;
  category: CommunityPresetCategory;
  targetItemName: string;
  description: string;
  missionType: string;
  difficulty: "Steel Path" | "Endgame" | "Général";
  modNames: string[];
  auraName?: string;
  exilusName?: string;
  arcaneNames: string[];
  archonShards?: Array<{ shardName: string; effectText: string }>;
}

export const COMMUNITY_PRESETS: CommunityPreset[] = [
  {
    id: "preset-wisp-defense-mhblacky",
    name: "Wisp Prime // Défense Force & Portée",
    creator: "MHBlacky",
    category: "Warframe",
    targetItemName: "Wisp Prime",
    description: "Référence Défense orientée Puissance, portée des Motes et contrôle de zone. Les cinq éclats rouges Tauforged (+15 % chacun) restent à sélectionner séparément dans le Builder.",
    missionType: "Défense / Survie",
    difficulty: "Steel Path",
    modNames: ["Fused Reservoir", "Blind Rage", "Augur Reach", "Amar’s Hatred", "Augur Secrets", "Primed Continuity", "Archon Intensify", "Transient Fortitude"],
    auraName: "Power Donation",
    exilusName: "Power Drift",
    arcaneNames: ["Arcane Agility", "Arcane Bellicose"],
    archonShards: Array.from({ length: 5 }, () => ({ shardName: "Tauforged Crimson", effectText: "15% Ability Strength" })),
  },
  {
    id: "preset-revenant-endurance-thekengineer",
    name: "Revenant Prime // Endurance Immortality",
    creator: "TheKengineer",
    category: "Warframe",
    targetItemName: "Revenant Prime",
    description: "Archétype Endurance fondé sur la Durée, la Puissance et la réduction du risque pour maintenir Mesmer Skin sur les longues missions.",
    missionType: "Endurance / Arbitrage",
    difficulty: "Steel Path",
    modNames: ["Primed Continuity", "Constitution", "Umbral Intensify", "Augur Secrets", "Umbral Vitality", "Augur Message", "Primed Flow", "Adaptation"],
    auraName: "Growing Power",
    exilusName: "Power Drift",
    arcaneNames: ["Arcane Guardian", "Arcane Avenger"],
  },
  {
    id: "preset-torid-incarnon-pandahh",
    name: "Torid Incarnon // Crit & Statut",
    creator: "PANDAAHH",
    category: "Arme Primaire",
    targetItemName: "Torid",
    description: "Archétype Incarnon orienté propagation, critique, tir multiple et dégâts de statut pour l’Extermination et les Fissures.",
    missionType: "Fissure / Extermination",
    difficulty: "Steel Path",
    modNames: ["Galvanized Chamber", "Critical Delay", "Vital Sense", "Malignant Force", "Vile Acceleration", "Hunter Munitions", "Galvanized Aptitude", "Primed Shred"],
    arcaneNames: ["Primary Merciless"],
  },
  {
    id: "preset-latron-incarnon-thekengineer",
    name: "Latron Prime Incarnon // Headshots",
    creator: "TheKengineer",
    category: "Arme Primaire",
    targetItemName: "Latron Prime",
    description: "Archétype de précision exploitant les tirs à la tête, le multiplicateur critique et la forme Incarnon contre les cibles prioritaires.",
    missionType: "Assassinat / Incursion",
    difficulty: "Steel Path",
    modNames: ["Galvanized Chamber", "Galvanized Scope", "Galvanized Aptitude", "Vital Sense", "Hunter Munitions", "Primed Shred", "Hammer Shot", "Vile Acceleration"],
    arcaneNames: ["Primary Deadhead"],
  },
  // Nouveaux presets inspirés de TheKengineer & MHBlacky
  {
    id: "preset-saryn-spores-thekengineer",
    name: "Saryn Prime // Spores & Miasme Nuke",
    creator: "TheKengineer",
    category: "Warframe",
    targetItemName: "Saryn Prime",
    description: "Configuration de référence pour la propagation continue des Spores et le contrôle de zone par Miasme en Steel Path.",
    missionType: "Sanctuaire / Survie",
    difficulty: "Steel Path",
    modNames: ["Venom Dose", "Blind Rage", "Augur Reach", "Primed Continuity", "Streamline", "Stretch", "Umbral Intensify", "Adaptation"],
    auraName: "Corrosive Projection",
    exilusName: "Cunning Drift",
    arcaneNames: ["Arcane Energize", "Arcane Grace"],
  },
  {
    id: "preset-glaive-prime-mhblacky",
    name: "Glaive Prime // Heavy Attack Bleed",
    creator: "MHBlacky",
    category: "Arme Mêlée",
    targetItemName: "Glaive Prime",
    description: "Build Mêlée explosif centré sur les attaques lourdes et les dégâts de Tranchant (Slash) inarrêtables en Steel Path.",
    missionType: "Arbitrage / Incursion",
    difficulty: "Steel Path",
    modNames: ["Sacrificial Steel", "Killing Blow", "Corrupt Charge", "Primed Fever Strike", "North Wind", "Pressure Point", "Smite Grineer", "Quick Return"],
    arcaneNames: ["Melee Exposure"],
  },
  {
    id: "preset-braton-incarnon-thekengineer",
    name: "Braton Prime Incarnon // Status Shred",
    creator: "TheKengineer",
    category: "Arme Primaire",
    targetItemName: "Braton Prime",
    description: "Exploitation de la forme Incarnon du Brraton Prime pour saturer les ennemis de statuts corrosifs et viraux.",
    missionType: "Survie / Alerte",
    difficulty: "Steel Path",
    modNames: ["Galvanized Chamber", "Galvanized Aptitude", "Vital Sense", "Critical Delay", "Malignant Force", "Rime Rounds", "Hunter Munitions", "Vile Acceleration"],
    arcaneNames: ["Primary Merciless"],
  },
  {
    id: "preset-felarx-mhblacky",
    name: "Felarx // Zero-Crit Devastation",
    creator: "MHBlacky",
    category: "Arme Primaire",
    targetItemName: "Felarx",
    description: "Build de dégâts bruts sans critique (Devastating Attrition) maximisant les dégâts non-critiques sur les boss.",
    missionType: "Assassinat / Chasse",
    difficulty: "Steel Path",
    modNames: ["Galvanized Hell", "Primed Point Blank", "Contagious Spread", "Toxic Barrage", "Chilling Reload", "Shotgun Savvy", "Vigilante Armaments", "Incendiary Coat"],
    arcaneNames: ["Primary Deadhead"],
  }
];
