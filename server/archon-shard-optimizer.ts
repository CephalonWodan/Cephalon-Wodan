// ============================================================
// ARCHON SHARD OPTIMIZER FOR CEPHALON ASSISTANT
// ============================================================

export interface ShardRecommendation {
  slot: number;
  color: string;
  variant: "Standard" | "Tauforged";
  effect: string;
  reason: { fr: string; en: string };
}

export function generateArchonShardRecommendations(
  frameName: string,
  missionType: string,
  optimizationFocus: string,
  lang: "fr" | "en"
): { summary: { fr: string; en: string }; shards: ShardRecommendation[] } {
  const isCasterOrSupport = /wisp|saryn|dante|octavia|nova|frost|rhino|citrine|gyre/i.test(frameName) || optimizationFocus === "survival" || optimizationFocus === "support";
  const isMeleeOrDPS = /mesa|baruuk|excalibur|gauss|kullervo|ash|styanax/i.test(frameName) || optimizationFocus === "damage" || optimizationFocus === "endurance";

  let shards: ShardRecommendation[] = [];

  if (isCasterOrSupport || missionType === "defense" || missionType === "survival") {
    shards = [
      {
        slot: 1,
        color: lang === "fr" ? "Rouge (Cramoisi)" : "Red (Crimson)",
        variant: "Tauforged",
        effect: lang === "fr" ? "+15% Puissance des capacités" : "+15% Ability Strength",
        reason: {
          fr: "Maximise l'impact des buffs et des compétences offensives/défensives principales.",
          en: "Maximizes the potency of core buffs and offensive/defensive abilities."
        }
      },
      {
        slot: 2,
        color: lang === "fr" ? "Rouge (Cramoisi)" : "Red (Crimson)",
        variant: "Tauforged",
        effect: lang === "fr" ? "+15% Puissance des capacités" : "+15% Ability Strength",
        reason: {
          fr: "Second palier de puissance pour atteindre les seuils de rupture en Steel Path.",
          en: "Second strength threshold to breach scaling requirements in Steel Path."
        }
      },
      {
        slot: 3,
        color: lang === "fr" ? "Jaune (Ambre)" : "Yellow (Amber)",
        variant: "Tauforged",
        effect: lang === "fr" ? "+30% Vitesse d'Incantation" : "+30% Casting Speed",
        reason: {
          fr: "Essentiel en haut niveau pour lancer les compétences instantanément et éviter l'interruption.",
          en: "Crucial in high-level play for instant ability casting and fluid repositioning."
        }
      },
      {
        slot: 4,
        color: lang === "fr" ? "Bleu (Azur)" : "Blue (Azure)",
        variant: "Tauforged",
        effect: lang === "fr" ? "+150 Points de Santé Max" : "+150 Max Health",
        reason: {
          fr: "Renforce la base de survie EHP pour encaisser les dégâts directs d'élite.",
          en: "Boosts baseline EHP pool to comfortably absorb elite enemy burst damage."
        }
      },
      {
        slot: 5,
        color: lang === "fr" ? "Violet" : "Violet",
        variant: "Tauforged",
        effect: lang === "fr" ? "+30% Dégâts Critiques si Énergie > 500" : "+30% Critical Damage when Energy > 500",
        reason: {
          fr: "Convertit la réserve d'énergie excédentaire en multiplicateur critique destructeur.",
          en: "Converts surplus energy reservoir into a potent critical damage multiplier."
        }
      }
    ];
  } else {
    shards = [
      {
        slot: 1,
        color: lang === "fr" ? "Améthyste" : "Topaz",
        variant: "Tauforged",
        effect: lang === "fr" ? "+45% Dégâts sur les ennemis affectés par Corrosif/Radiation" : "+45% Damage on Corrosive/Radiation affected enemies",
        reason: {
          fr: "Amplifie considérablement le DPS brut contre les factions blindées.",
          en: "Significantly amplifies raw weapon output against armored targets."
        }
      },
      {
        slot: 2,
        color: lang === "fr" ? "Jaune (Ambre)" : "Yellow (Amber)",
        variant: "Tauforged",
        effect: lang === "fr" ? "+30% Vitesse de Recharge / Incantation" : "+30% Reload / Casting Speed",
        reason: {
          fr: "Fluidifie l'enchaînement des tirs et le rythme de combat en mouvement.",
          en: "Smooths weapon reloading cycles and active combat cadence."
        }
      },
      {
        slot: 3,
        color: lang === "fr" ? "Rouge (Cramoisi)" : "Red (Crimson)",
        variant: "Tauforged",
        effect: lang === "fr" ? "+37.5% Dégâts Critiques d'Arme Principale" : "+37.5% Primary Critical Damage",
        reason: {
          fr: "Propulse les dégâts critiques des armes de tir à haut niveau.",
          en: "Boosts primary firearm critical tier ceilings in endurance runs."
        }
      },
      {
        slot: 4,
        color: lang === "fr" ? "Bleu (Azur)" : "Blue (Azure)",
        variant: "Tauforged",
        effect: lang === "fr" ? "+225% Armure" : "+225% Armor",
        reason: {
          fr: "Fournit une mitigation physique indispensable pour les warframes à armure native.",
          en: "Provides essential physical damage mitigation for baseline armor scaling."
        }
      },
      {
        slot: 5,
        color: lang === "fr" ? "Violet" : "Violet",
        variant: "Tauforged",
        effect: lang === "fr" ? "+30% Dégâts Critiques d'Arme de Mêlée" : "+30% Melee Critical Damage",
        reason: {
          fr: "Synergise parfaitement avec les builds de combo lourd et attaques chargées.",
          en: "Synergizes perfectly with heavy attack and high combo multiplier setups."
        }
      }
    ];
  }

  const summary = {
    fr: `Répartition optimisée de 5 éclats d'Archonte Tauforgés pour ${frameName || "cette configuration"} en mode ${missionType} (${optimizationFocus}) :`,
    en: `Optimized distribution of 5 Tauforged Archon Shards for ${frameName || "this configuration"} in ${missionType} mode (${optimizationFocus}):`
  };

  return { summary, shards };
}
