// Compact runtime mirror of client/src/lib/community-presets.ts.
// Community builds are references only; official catalog data remains authoritative.

export interface CommunityBuildReference {
  id: string;
  name: string;
  creator: string;
  targetItemName: string;
  description: string;
  missionType: string;
  difficulty: string;
  modNames: string[];
  auraName?: string;
  exilusName?: string;
  arcaneNames: string[];
  archonShards?: Array<{ shardName: string; effectText: string }>;
}

export const COMMUNITY_BUILD_REFERENCES: CommunityBuildReference[] = [
  {
    id: "preset-wisp-defense-mhblacky",
    name: "Wisp Prime // Défense Force & Portée",
    creator: "MHBlacky",
    targetItemName: "Wisp Prime",
    description: "Référence Défense orientée Puissance, portée des Motes et contrôle de zone.",
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
    targetItemName: "Revenant Prime",
    description: "Référence Endurance fondée sur la Durée, la Puissance et Mesmer Skin.",
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
    targetItemName: "Torid",
    description: "Référence Incarnon orientée propagation, critique, tir multiple et statut.",
    missionType: "Fissure / Extermination",
    difficulty: "Steel Path",
    modNames: ["Galvanized Chamber", "Critical Delay", "Vital Sense", "Malignant Force", "Vile Acceleration", "Hunter Munitions", "Galvanized Aptitude", "Primed Shred"],
    arcaneNames: ["Primary Merciless"],
  },
  {
    id: "preset-latron-incarnon-thekengineer",
    name: "Latron Prime Incarnon // Headshots",
    creator: "TheKengineer",
    targetItemName: "Latron Prime",
    description: "Référence Incarnon de précision exploitant les tirs à la tête et le multiplicateur critique.",
    missionType: "Assassinat / Incursion",
    difficulty: "Steel Path",
    modNames: ["Galvanized Chamber", "Galvanized Scope", "Galvanized Aptitude", "Vital Sense", "Hunter Munitions", "Primed Shred", "Hammer Shot", "Vile Acceleration"],
    arcaneNames: ["Primary Deadhead"],
  },
];
