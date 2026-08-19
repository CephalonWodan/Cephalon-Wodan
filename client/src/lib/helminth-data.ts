export interface HelminthAbility {
  id: string;
  name: string;
  sourceWarframe: string;
  description: string;
  energyCost: number;
  category: "offensive" | "defensive" | "buff" | "utility" | "crowd-control";
  isDamageBuff?: boolean;
}

export const HELMINTH_ABILITIES: HelminthAbility[] = [
  { id: "ensnare", name: "Ensnare", sourceWarframe: "Khora", description: "Piège la cible dans un faisceau de liens vivants qui capturent les ennemis proches et les attirent vers un point central.", energyCost: 25, category: "crowd-control" },
  { id: "roar", name: "Roar", sourceWarframe: "Rhino", description: "Accorde un buff de dégâts multiplicatif pour toutes les sources de dégâts des alliés et de la Warframe dans une zone.", energyCost: 50, category: "buff", isDamageBuff: true },
  { id: "dispenser", name: "Dispenser", sourceWarframe: "Protea", description: "Déploie un distributeur qui libère périodiquement des orbes de santé, d'énergie et des munitions.", energyCost: 50, category: "utility" },
  { id: "eclipse", name: "Eclipse", sourceWarframe: "Mirage", description: "Confère un bonus massif de dégâts aux attaques sous la lumière ou une réduction de dégâts dans l'obscurité.", energyCost: 25, category: "buff", isDamageBuff: true },
  { id: "xatas-whisper", name: "Xata's Whisper", sourceWarframe: "Xaku", description: "Imprègne les armes de dégâts du Néant supplémentaires avec effet de magnétisme et absorption.", energyCost: 25, category: "buff", isDamageBuff: true },
  { id: "nourish", name: "Nourish", sourceWarframe: "Grendel", description: "Augmente l'efficacité énergétique, confère des dégâts viraux à toutes les armes et amplifie les soins reçus.", energyCost: 50, category: "buff" },
  { id: "pillage", name: "Pillage", sourceWarframe: "Hildryn", description: "Envoie une onde radiale qui arrache les boucliers et l'armure des ennemis pour reconstituer les boucliers et purger les statuts.", energyCost: 50, category: "defensive" },
  { id: "gloom", name: "Gloom", sourceWarframe: "Sevagoth", description: "Crée une zone de ténèbres qui ralentit les ennemis à portée et soigne la Warframe à chaque dégât infligé.", energyCost: 25, category: "crowd-control" },
  { id: "fire-walker", name: "Fire Walker", sourceWarframe: "Nezha", description: "Laisse une traînée de feu qui enflamme les ennemis, confère de la vitesse et purge les effets de statut.", energyCost: 25, category: "utility" },
  { id: "subsumed-shock", name: "Shock", sourceWarframe: "Volt", description: "Projette un arc électrique rapide étourdissant la cible et touchant les ennemis proches.", energyCost: 25, category: "offensive" },
  { id: "quiver", name: "Quiver", sourceWarframe: "Ivara", description: "Tire un ensemble de flèches polyvalentes (invisibilité, camouflage, tyrolienne, bruit).", energyCost: 25, category: "utility" },
  { id: "subsumed-smite", name: "Smite", sourceWarframe: "Oberon", description: "Frappe une cible avec de l'énergie sacrée, libérant des projectiles guidés infligeant des dégâts de radiation.", energyCost: 25, category: "offensive" },
  { id: "subsumed-banish", name: "Banish", sourceWarframe: "Limbo", description: "Bascule la cible dans le plan du Néant ou la ramène dans le plan matériel.", energyCost: 25, category: "utility" },
  { id: "subsumed-lull", name: "Lull", sourceWarframe: "Baruuk", description: "Endort les ennemis dans une zone d'effet grâce à une onde apaisante.", energyCost: 50, category: "crowd-control" },
  { id: "perspicacity", name: "Perspicacity", sourceWarframe: "Helminth", description: "Passe automatiquement le prochain piratage de console.", energyCost: 25, category: "utility" },
  { id: "targeted-excision", name: "Warcry", sourceWarframe: "Valkyr", description: "Booste la vitesse d'attaque et l'armure de la Warframe tout en ralentissant les ennemis proches.", energyCost: 75, category: "buff" },
  { id: "subsumed-pull", name: "Pull", sourceWarframe: "Mag", description: "Attire tous les ennemis proches vers le joueur avec force.", energyCost: 25, category: "crowd-control" },
  { id: "subsumed-tempest", name: "Tempest Barrage", sourceWarframe: "Hydroid", description: "Invoque un barrage de bombes d'eau corrosives sur une zone ciblée.", energyCost: 50, category: "offensive" },
  { id: "subsumed-elemental", name: "Elemental Ward", sourceWarframe: "Chroma", description: "Émet une aura élémentaire augmentant santé, armure ou bouclier selon l'émissif.", energyCost: 50, category: "buff" },
  { id: "subsumed-defy", name: "Defy", sourceWarframe: "Wukong", description: "Convertit les dégâts subis en un bonus d'armure temporaire avant de riposter.", energyCost: 50, category: "defensive" },
  { id: "subsumed-parasitic", name: "Parasitic Armor", sourceWarframe: "Nidus", description: "Sacrifie les boucliers ou la santé pour un bonus d'armure massif.", energyCost: 25, category: "defensive" },
  { id: "subsumed-infested", name: "Infested Mobility", sourceWarframe: "Nidus", description: "Augmente considérablement la vitesse de déplacement et de parkour.", energyCost: 25, category: "utility" },
  { id: "subsumed-mind", name: "Mind Control", sourceWarframe: "Nyx", description: "Convertit temporairement un ennemi en allié.", energyCost: 50, category: "crowd-control" },
  { id: "subsumed-well", name: "Well of Life", sourceWarframe: "Trinity", description: "Suspend un ennemi et crée une fontaine de soin.", energyCost: 25, category: "defensive" },
  { id: "subsumed-energy", name: "Energy Vampire", sourceWarframe: "Trinity", description: "Marque un ennemi pour restituer de l'énergie à l'escouade.", energyCost: 50, category: "utility" },
  { id: "subsumed-condemn", name: "Condemn", sourceWarframe: "Harrow", description: "Enchaîne les ennemis face au joueur et génère des boucliers.", energyCost: 50, category: "crowd-control" },
  { id: "subsumed-silence", name: "Silence", sourceWarframe: "Banshee", description: "Émet une onde sonore étouffant les alertes ennemies et paralysant les aptitudes eximus.", energyCost: 50, category: "crowd-control" },
  { id: "subsumed-null", name: "Null Star", sourceWarframe: "Nova", description: "Crée des particules d'antimatière orbitales réduisant les dégâts subis.", energyCost: 50, category: "defensive" },
  { id: "subsumed-fire-blast", name: "Fire Blast", sourceWarframe: "Ember", description: "Libère une onde de choc enflammée qui réduit l'armure ennemie.", energyCost: 50, category: "offensive" },
  { id: "subsumed-ripline", name: "Rip Line", sourceWarframe: "Valkyr", description: "Tire un grappin pour se propulser ou attirer un ennemi.", energyCost: 25, category: "utility" },
  { id: "subsumed-psychic-bolts", name: "Psychic Bolts", sourceWarframe: "Nyx", description: "Projette des éclats psychiques réduisant l'armure et les boucliers cibles.", energyCost: 50, category: "offensive" },
  { id: "subsumed-radial-blind", name: "Radial Blind", sourceWarframe: "Excalibur", description: "Aveugle tous les ennemis dans un rayon étendu.", energyCost: 50, category: "crowd-control" },
  { id: "subsumed-shuriken", name: "Shuriken", sourceWarframe: "Ash", description: "Lance des lames tranchantes infligeant des dégâts de taillade garantis.", energyCost: 25, category: "offensive" },
  { id: "subsumed-venom-dose", name: "Venom Dose", sourceWarframe: "Saryn", description: "Augmente les dégâts toxiques des armes de l'escouade.", energyCost: 25, category: "buff" },
  { id: "subsumed-rebuild", name: "Rebuild", sourceWarframe: "Protea", description: "Restaure rapidement les boucliers.", energyCost: 25, category: "defensive" },
  { id: "subsumed-sleight", name: "Sleight of Hand", sourceWarframe: "Mirage", description: "Piège les éléments de l'environnement.", energyCost: 50, category: "crowd-control" },
  { id: "subsumed-voracious", name: "Voracious Metastasis", sourceWarframe: "Nidus", description: "Convertit l'énergie en soins et régénération pour les alliés.", energyCost: 50, category: "utility" },
  { id: "subsumed-spectral", name: "Spectral Scream", sourceWarframe: "Chroma", description: "Crache un flux d'énergie élémentaire.", energyCost: 25, category: "offensive" },
  { id: "subsumed-ice-wave", name: "Ice Wave", sourceWarframe: "Frost", description: "Projette une vague de glace gelant les ennemis au sol.", energyCost: 50, category: "crowd-control" },
  { id: "subsumed-radial-howl", name: "Radial Howl", sourceWarframe: "Excalibur Umbra", description: "Pousse un cri perçant aveuglant et étourdissant les ennemis.", energyCost: 50, category: "crowd-control" }
];

export interface HelminthRestrictionRule {
  damageBuffId: string;
  allowedWarframes: string[]; // Noms normalisés en minuscules
}

export const HELMINTH_DAMAGE_BUFF_RESTRICTIONS: HelminthRestrictionRule[] = [
  {
    damageBuffId: "eclipse",
    allowedWarframes: ["chroma", "cyte-09", "mirage", "octavia", "oraxia", "rhino", "temple", "uriel", "xaku"],
  },
  {
    damageBuffId: "roar",
    allowedWarframes: ["chroma", "cyte-09", "mirage", "octavia", "oraxia", "rhino", "temple", "uriel", "xaku"],
  },
  {
    damageBuffId: "xatas-whisper",
    allowedWarframes: ["chroma", "cyte-09", "mirage", "octavia", "oraxia", "rhino", "temple", "uriel", "xaku"],
  },
];

export function isDamageBuffAbility(abilityId: string): boolean {
  const found = HELMINTH_ABILITIES.find(a => a.id === abilityId);
  return Boolean(found?.isDamageBuff || found?.id === "roar" || found?.id === "eclipse" || found?.id === "xatas-whisper");
}

export function validateHelminthRestriction(abilityId: string, warframeName: string): { allowed: boolean; reason?: string } {
  if (!isDamageBuffAbility(abilityId)) return { allowed: true };
  const normalizedWf = warframeName.toLowerCase();
  const rule = HELMINTH_DAMAGE_BUFF_RESTRICTIONS.find(r => r.damageBuffId === abilityId);
  if (!rule) return { allowed: true };
  const isAllowed = rule.allowedWarframes.some((allowedName: string) => normalizedWf.includes(allowedName));
  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Cette aptitude de buff de dégâts ne peut être installée que sur les Warframes disposant déjà d'un buff natif compatible (${rule.allowedWarframes.join(", ").toUpperCase()}) selon les règles du Wiki.`,
    };
  }
  return { allowed: true };
}
