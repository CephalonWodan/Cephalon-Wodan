export interface HelminthAbility {
  id: string;
  name: string;
  sourceWarframe: string;
  description: string;
  energyCost: number;
  category: "offensive" | "defensive" | "buff" | "utility" | "crowd-control";
}

export const HELMINTH_ABILITIES: HelminthAbility[] = [
  {
    id: "ensnare",
    name: "Ensnare",
    sourceWarframe: "Khora",
    description: "Piège la cible dans un faisceau de liens vivants qui capturent les ennemis proches et les attirent vers un point central.",
    energyCost: 25,
    category: "crowd-control",
  },
  {
    id: "roar",
    name: "Roar",
    sourceWarframe: "Rhino",
    description: "Accorde un buff de dégâts multiplicatif pour toutes les sources de dégâts des alliés et de la Warframe dans une zone.",
    energyCost: 50,
    category: "buff",
  },
  {
    id: "dispenser",
    name: "Dispenser",
    sourceWarframe: "Protea",
    description: "Déploie un distributeur qui libère périodiquement des orbes de santé, d'énergie et des munitions.",
    energyCost: 50,
    category: "utility",
  },
  {
    id: "eclipse",
    name: "Eclipse",
    sourceWarframe: "Mirage",
    description: "Confère un bonus massif de dégâts aux attaques sous la lumière ou une réduction de dégâts dans l'obscurité.",
    energyCost: 25,
    category: "buff",
  },
  {
    id: "nourish",
    name: "Nourish",
    sourceWarframe: "Grendel",
    description: "Augmente l'efficacité énergétique, confère des dégâts viraux à toutes les armes et amplifie les soins reçus.",
    energyCost: 50,
    category: "buff",
  },
  {
    id: "pillage",
    name: "Pillage",
    sourceWarframe: "Hildryn",
    description: "Envoie une onde radiale qui arrache les boucliers et l'armure des ennemis pour reconstituer les boucliers et purger les statuts.",
    energyCost: 50,
    category: "defensive",
  },
  {
    id: "gloom",
    name: "Gloom",
    sourceWarframe: "Sevagoth",
    description: "Crée une zone de ténèbres qui ralentit les ennemis à portée et soigne la Warframe à chaque dégât infligé.",
    energyCost: 25,
    category: "crowd-control",
  },
  {
    id: "fire-walker",
    name: "Fire Walker",
    sourceWarframe: "Nezha",
    description: "Laisse une traînée de feu qui enflamme les ennemis, confère de la vitesse et purge les effets de statut.",
    energyCost: 25,
    category: "utility",
  },
  {
    id: "subsumed-shock",
    name: "Shock",
    sourceWarframe: "Volt",
    description: "Projette un arc électrique rapide étourdissant la cible et touchant les ennemis proches.",
    energyCost: 25,
    category: "offensive",
  },
  {
    id: "quiver",
    name: "Quiver",
    sourceWarframe: "Ivara",
    description: "Tire un ensemble de flèches polyvalentes (invisibilité, camouflage, tyrolienne, bruit).",
    energyCost: 25,
    category: "utility",
  },
  {
    id: "subsumed-smite",
    name: "Smite",
    sourceWarframe: "Oberon",
    description: "Frappe une cible avec de l'énergie sacrée, libérant des projectiles guidés infligeant des dégâts de radiation.",
    energyCost: 25,
    category: "offensive",
  },
  {
    id: "subsumed-banish",
    name: "Banish",
    sourceWarframe: "Limbo",
    description: "Bascule la cible dans le plan du Néant ou la ramène dans le plan matériel.",
    energyCost: 25,
    category: "utility",
  },
  {
    id: "subsumed-lull",
    name: "Lull",
    sourceWarframe: "Baruuk",
    description: "Endort les ennemis dans une zone d'effet grâce à une onde apaisante.",
    energyCost: 50,
    category: "crowd-control",
  },
  {
    id: "perspicacity",
    name: "Perspicacity",
    sourceWarframe: "Helminth",
    description: "Passe automatiquement le prochain piratage de console.",
    energyCost: 25,
    category: "utility",
  },
  {
    id: "targeted-excision",
    name: "Warcry",
    sourceWarframe: "Valkyr",
    description: "Booste la vitesse d'attaque et l'armure de la Warframe tout en ralentissant les ennemis proches.",
    energyCost: 75,
    category: "buff",
  },
];
