// ============================================================
// COMMUNITY GUIDES LIBRARY — Authentic Builds from Recognized Creators
// (TheKengineer, MHBlacky, PANDAAHH, etc.)
// ============================================================

export interface CommunityGuide {
  id: string;
  title: { fr: string; en: string };
  creator: string;
  category: "warframe" | "weapon" | "melee" | "companion" | "endgame";
  description: { fr: string; en: string };
  loadoutSummary: {
    frame?: string;
    weapon?: string;
    keyMods: string[];
    arcanes: string[];
    shards?: string;
  };
  details: { fr: string; en: string };
}

export const COMMUNITY_GUIDES: CommunityGuide[] = [
  {
    id: "saryn-spores-kengineer",
    title: {
      fr: "Saryn Prime — Spores & Miasme (TheKengineer)",
      en: "Saryn Prime — Spores & Miasma (TheKengineer)"
    },
    creator: "TheKengineer",
    category: "warframe",
    description: {
      fr: "Guide d'optimisation axé sur le maintien des Spores, une portée élevée et l'amplification virale pour le Steel Path.",
      en: "Optimization guide focusing on spore maintenance, high range, and viral amplification for Steel Path."
    },
    loadoutSummary: {
      frame: "Saryn Prime",
      keyMods: ["Allonge Accrue", "Continuité Accrue", "Colère Aveugle", "Expertise Ciblée", "Vigueur du Chasseur"],
      arcanes: ["Arcane Mue Augmentée", "Arcane Garde"],
      shards: "3 Éclats Cramoisis (Puissance) + 2 Éclats Ambre (Vitesse de cast)"
    },
    details: {
      fr: "Basé sur les méthodologies de calcul de TheKengineer : maximise la portée pour propager les Spores à travers les pièces tout en maintenant une force suffisante pour amplifier les dégâts de Miasme et bénéficier des bonus d'Arcane Mue Augmentée.",
      en: "Based on TheKengineer's calculation methodology: maximizes range to spread Spores across tiles while maintaining enough strength to amplify Miasma damage and stack Arcane Energize/Molt Augmented."
    }
  },
  {
    id: "wisp-defense-mhblacky",
    title: {
      fr: "Wisp Prime — Réservoirs & Défense de Zone (MHBlacky)",
      en: "Wisp Prime — Reservoirs & Area Defense (MHBlacky)"
    },
    creator: "MHBlacky",
    category: "warframe",
    description: {
      fr: "Configuration de défense haut niveau combinant des Pylônes de soins surpuissants et une force de capacité maximale.",
      en: "High-level defense configuration combining overpowered reservoirs and maximum ability strength."
    },
    loadoutSummary: {
      frame: "Wisp Prime",
      keyMods: ["Don de Puissance", "Colère Aveugle", "Intensité Umbrale", "Continuité Accrue", "Allonge Archonte"],
      arcanes: ["Arcane Mue Augmentée", "Arcane Énergie"],
      shards: "5 Éclats Cramoisis Tauforged (+15% Puissance chacun)"
    },
    details: {
      fr: "Inspiré des configurations de référence de MHBlacky pour tenir les missions de défense et d'arbitrage en endurance, en maximisant le buff de santé et de régénération des Réservoirs.",
      en: "Inspired by MHBlacky's reference builds for holding high-level defense and arbitration endurance missions by maximizing Reservoirs' health and regen buffs."
    }
  },
  {
    id: "glaive-prime-pandaahh",
    title: {
      fr: "Glaive Prime — Heavy Attack Explosif (PANDAAHH)",
      en: "Glaive Prime — Explosive Heavy Attack (PANDAAHH)"
    },
    creator: "PANDAAHH",
    category: "melee",
    description: {
      fr: "Build mêlée dévastateur basé sur les attaques lourdes lancées et les dégâts de tranchant en zone.",
      en: "Devastating melee build based on thrown heavy attacks and area slash damage."
    },
    loadoutSummary: {
      weapon: "Glaive Prime",
      keyMods: ["Frappe Sacrificielle", "Acier Sacrificiel", "Surcharge d'État", "Accélération Meurtrière", "Fracas Organique"],
      arcanes: ["Courroux Meurtrier"],
    },
    details: {
      fr: "Reprend la structure popularisée par PANDAAHH pour éliminer instantanément des groupes d'ennemis en Steel Path grâce au double multiplicateur critique des mods Sacrificiels sur l'explosion du glaive.",
      en: "Follows PANDAAHH's popular setup to instantly wipe out Steel Path enemy groups thanks to the sacrificial mod critical multiplier synergy on glaive detonations."
    }
  },
  {
    id: "felarx-zerocrit-meta",
    title: {
      fr: "Felarx — Évolution Zéro-Crit & Dégâts Bruts (TheKengineer)",
      en: "Felarx — Zero-Crit & Raw Damage Meta (TheKengineer)"
    },
    creator: "TheKengineer",
    category: "weapon",
    description: {
      fr: "Exploitation des avantages d'évolution de l'Incarnon pour transformer le Felarx en monstre de dégâts non-critiques.",
      en: "Leveraging Incarnon evolution perks to turn the Felarx into a non-critical raw damage monster."
    },
    loadoutSummary: {
      weapon: "Felarx",
      keyMods: ["Chambre Split", "Calibre Lourd", "Poudrière", "Point Blank Galvanisé", "Diffusion Galvanisée"],
      arcanes: ["Accélération Principale"],
    },
    details: {
      fr: "Analyse approfondie par TheKengineer démontrant l'énorme multiplicateur multiplicatif des avantages d'évolution de non-critique sur les armes Incarnon du syndicat des Cavalier du Néant.",
      en: "In-depth analysis by TheKengineer demonstrating the massive multiplicative bonus of non-critical evolution perks on Voidrig / Zariman Incarnon weapons."
    }
  }
];
