export interface HelminthAbility {
  id: string;
  name: string;
  sourceWarframe: string;
  description: string;
  energyCost: number;
  category: "offensive" | "defensive" | "buff" | "utility" | "crowd-control";
  officialRole?: string;
  damageOrStatus?: string;
  wikiSource?: string;
  isDamageBuff?: boolean;
}

export const HELMINTH_ABILITIES: HelminthAbility[] = [
  { id: "ash-shuriken", name: "Shuriken", sourceWarframe: "Ash", description: "Aptitude subsumable officielle de Ash. Rôle : Armor Strip.", energyCost: 25, category: "offensive", officialRole: "Armor Strip", damageOrStatus: "Slash", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "atlas-petrify", name: "Petrify", sourceWarframe: "Atlas", description: "Aptitude subsumable officielle de Atlas. Rôle : Crowd Control.", energyCost: 75, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "banshee-silence", name: "Silence", sourceWarframe: "Banshee", description: "Aptitude subsumable officielle de Banshee. Rôle : Damage Debuff.", energyCost: 50, category: "buff", officialRole: "Damage Debuff", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "baruuk-lull", name: "Lull", sourceWarframe: "Baruuk", description: "Aptitude subsumable officielle de Baruuk. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "caliban-sentient-wrath", name: "Sentient Wrath", sourceWarframe: "Caliban", description: "Aptitude subsumable officielle de Caliban. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "chroma-elemental-ward", name: "Elemental Ward", sourceWarframe: "Chroma", description: "Aptitude subsumable officielle de Chroma. Rôle : Health Bonus.", energyCost: 50, category: "buff", officialRole: "Health Bonus", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "citrine-fractured-blast", name: "Fractured Blast", sourceWarframe: "Citrine", description: "Aptitude subsumable officielle de Citrine. Rôle : Crowd Control.", energyCost: 25, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "cyte-09-evade", name: "Evade", sourceWarframe: "Cyte-09", description: "Aptitude subsumable officielle de Cyte-09. Rôle : Healing.", energyCost: 50, category: "defensive", officialRole: "Healing", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "dagath-wyrd-scythes", name: "Wyrd Scythes", sourceWarframe: "Dagath", description: "Aptitude subsumable officielle de Dagath. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "dante-dark-verse", name: "Dark Verse", sourceWarframe: "Dante", description: "Aptitude subsumable officielle de Dante. Rôle : Damage.", energyCost: 50, category: "offensive", officialRole: "Damage", damageOrStatus: "Slash", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "equinox-rest-rage", name: "Rest & Rage", sourceWarframe: "Equinox", description: "Aptitude subsumable officielle de Equinox. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "excalibur-radial-blind", name: "Radial Blind", sourceWarframe: "Excalibur", description: "Aptitude subsumable officielle de Excalibur. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Blind", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "follie-self-portrait", name: "Self Portrait", sourceWarframe: "Follie", description: "Aptitude subsumable officielle de Follie. Rôle : Damage Reduction.", energyCost: 50, category: "offensive", officialRole: "Damage Reduction", damageOrStatus: "Corrosive", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "frost-ice-wave", name: "Ice Wave", sourceWarframe: "Frost", description: "Aptitude subsumable officielle de Frost. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Cold", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "gara-spectrorage", name: "Spectrorage", sourceWarframe: "Gara", description: "Aptitude subsumable officielle de Gara. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "garuda-blood-altar", name: "Blood Altar", sourceWarframe: "Garuda", description: "Aptitude subsumable officielle de Garuda. Rôle : Healing.", energyCost: 50, category: "defensive", officialRole: "Healing", damageOrStatus: "—", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "gauss-thermal-sunder", name: "Thermal Sunder", sourceWarframe: "Gauss", description: "Aptitude subsumable officielle de Gauss. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "grendel-nourish", name: "Nourish", sourceWarframe: "Grendel", description: "Aptitude subsumable officielle de Grendel. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "gyre-coil-horizon", name: "Coil Horizon", sourceWarframe: "Gyre", description: "Aptitude subsumable officielle de Gyre. Rôle : Damage.", energyCost: 50, category: "offensive", officialRole: "Damage", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "harrow-condemn", name: "Condemn", sourceWarframe: "Harrow", description: "Aptitude subsumable officielle de Harrow. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "hildryn-pillage", name: "Pillage", sourceWarframe: "Hildryn", description: "Aptitude subsumable officielle de Hildryn. Rôle : Defense Strip.", energyCost: 50, category: "utility", officialRole: "Defense Strip", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "hydroid-tempest-barrage", name: "Tempest Barrage", sourceWarframe: "Hydroid", description: "Aptitude subsumable officielle de Hydroid. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "inaros-desiccation", name: "Desiccation", sourceWarframe: "Inaros", description: "Aptitude subsumable officielle de Inaros. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "—", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "jade-ophanim-eyes", name: "Ophanim Eyes", sourceWarframe: "Jade", description: "Aptitude subsumable officielle de Jade. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "khora-ensnare", name: "Ensnare", sourceWarframe: "Khora", description: "Aptitude subsumable officielle de Khora. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "—", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "koumei-omamori", name: "Omamori", sourceWarframe: "Koumei", description: "Aptitude subsumable officielle de Koumei. Rôle : Healing.", energyCost: 50, category: "defensive", officialRole: "Healing", damageOrStatus: "—", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "kullervo-wrathful-advance", name: "Wrathful Advance", sourceWarframe: "Kullervo", description: "Aptitude subsumable officielle de Kullervo. Rôle : Damage Buff.", energyCost: 50, category: "buff", officialRole: "Damage Buff", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "lavos-vial-rush", name: "Vial Rush", sourceWarframe: "Lavos", description: "Aptitude subsumable officielle de Lavos. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "limbo-banish", name: "Banish", sourceWarframe: "Limbo", description: "Aptitude subsumable officielle de Limbo. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "mag-pull", name: "Pull", sourceWarframe: "Mag", description: "Aptitude subsumable officielle de Mag. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Magnetic", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "mesa-shooting-gallery", name: "Shooting Gallery", sourceWarframe: "Mesa", description: "Aptitude subsumable officielle de Mesa. Rôle : Damage Buff.", energyCost: 50, category: "buff", officialRole: "Damage Buff", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "mirage-eclipse", name: "Eclipse", sourceWarframe: "Mirage", description: "Aptitude subsumable officielle de Mirage. Rôle : Damage Buff.", energyCost: 50, category: "buff", officialRole: "Damage Buff", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist", isDamageBuff: true },
  { id: "nekros-terrify", name: "Terrify", sourceWarframe: "Nekros", description: "Aptitude subsumable officielle de Nekros. Rôle : Armor Strip.", energyCost: 50, category: "offensive", officialRole: "Armor Strip", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "nezha-fire-walker", name: "Fire Walker", sourceWarframe: "Nezha", description: "Aptitude subsumable officielle de Nezha. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "nidus-larva", name: "Larva", sourceWarframe: "Nidus", description: "Aptitude subsumable officielle de Nidus. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Toxin", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "nokko-brightbonnet", name: "Brightbonnet", sourceWarframe: "Nokko", description: "Aptitude subsumable officielle de Nokko. Rôle : Energy Restore.", energyCost: 50, category: "utility", officialRole: "Energy Restore", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "nova-null-star", name: "Null Star", sourceWarframe: "Nova", description: "Aptitude subsumable officielle de Nova. Rôle : Damage Reduction.", energyCost: 50, category: "offensive", officialRole: "Damage Reduction", damageOrStatus: "Blast", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "nyx-mind-control", name: "Mind Control", sourceWarframe: "Nyx", description: "Aptitude subsumable officielle de Nyx. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "oberon-smite", name: "Smite", sourceWarframe: "Oberon", description: "Aptitude subsumable officielle de Oberon. Rôle : Armor Strip.", energyCost: 50, category: "offensive", officialRole: "Armor Strip", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "octavia-resonator", name: "Resonator", sourceWarframe: "Octavia", description: "Aptitude subsumable officielle de Octavia. Rôle : Damage.", energyCost: 50, category: "offensive", officialRole: "Damage", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "oraxia-webbed-embrace", name: "Webbed Embrace", sourceWarframe: "Oraxia", description: "Aptitude subsumable officielle de Oraxia. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "protea-dispensary", name: "Dispensary", sourceWarframe: "Protea", description: "Aptitude subsumable officielle de Protea. Rôle : Healing.", energyCost: 50, category: "defensive", officialRole: "Healing", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "qorvex-chyrinka-pillar", name: "Chyrinka Pillar", sourceWarframe: "Qorvex", description: "Aptitude subsumable officielle de Qorvex. Rôle : Damage.", energyCost: 50, category: "offensive", officialRole: "Damage", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "revenant-reave", name: "Reave", sourceWarframe: "Revenant", description: "Aptitude subsumable officielle de Revenant. Rôle : Healing.", energyCost: 50, category: "defensive", officialRole: "Healing", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "rhino-roar", name: "Roar", sourceWarframe: "Rhino", description: "Aptitude subsumable officielle de Rhino. Rôle : Damage Buff.", energyCost: 50, category: "buff", officialRole: "Damage Buff", damageOrStatus: "Puncture", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist", isDamageBuff: true },
  { id: "saryn-molt", name: "Molt", sourceWarframe: "Saryn", description: "Aptitude subsumable officielle de Saryn. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "sevagoth-gloom", name: "Gloom", sourceWarframe: "Sevagoth", description: "Aptitude subsumable officielle de Sevagoth. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "styanax-tharros-strike", name: "Tharros Strike", sourceWarframe: "Styanax", description: "Aptitude subsumable officielle de Styanax. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "temple-pyrotechnics", name: "Pyrotechnics", sourceWarframe: "Temple", description: "Aptitude subsumable officielle de Temple. Rôle : Damage.", energyCost: 50, category: "offensive", officialRole: "Damage", damageOrStatus: "Impact", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "titania-spellbind", name: "Spellbind", sourceWarframe: "Titania", description: "Aptitude subsumable officielle de Titania. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "trinity-well-of-life", name: "Well of Life", sourceWarframe: "Trinity", description: "Aptitude subsumable officielle de Trinity. Rôle : Healing.", energyCost: 50, category: "defensive", officialRole: "Healing", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "uriel-remedium", name: "Remedium", sourceWarframe: "Uriel", description: "Aptitude subsumable officielle de Uriel. Rôle : Healing.", energyCost: 50, category: "defensive", officialRole: "Healing", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "valkyr-warcry", name: "Warcry", sourceWarframe: "Valkyr", description: "Aptitude subsumable officielle de Valkyr. Rôle : Attack Speed Buff.", energyCost: 50, category: "buff", officialRole: "Attack Speed Buff", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "vauban-tesla-nervos", name: "Tesla Nervos", sourceWarframe: "Vauban", description: "Aptitude subsumable officielle de Vauban. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Blast", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "volt-shock", name: "Shock", sourceWarframe: "Volt", description: "Aptitude subsumable officielle de Volt. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "voruna-lycath-s-hunt", name: "Lycath's Hunt", sourceWarframe: "Voruna", description: "Aptitude subsumable officielle de Voruna. Rôle : Healing.", energyCost: 50, category: "defensive", officialRole: "Healing", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "wisp-breach-surge", name: "Breach Surge", sourceWarframe: "Wisp", description: "Aptitude subsumable officielle de Wisp. Rôle : Damage.", energyCost: 50, category: "offensive", officialRole: "Damage", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "wukong-defy", name: "Defy", sourceWarframe: "Wukong", description: "Aptitude subsumable officielle de Wukong. Rôle : Invulnerability.", energyCost: 50, category: "utility", officialRole: "Invulnerability", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "xaku-xata-s-whisper", name: "Xata's Whisper", sourceWarframe: "Xaku", description: "Aptitude subsumable officielle de Xaku. Rôle : Damage Buff.", energyCost: 50, category: "buff", officialRole: "Damage Buff", damageOrStatus: "Void", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "yareli-aquablades", name: "Aquablades", sourceWarframe: "Yareli", description: "Aptitude subsumable officielle de Yareli. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" },
  { id: "zephyr-airburst", name: "Airburst", sourceWarframe: "Zephyr", description: "Aptitude subsumable officielle de Zephyr. Rôle : Crowd Control.", energyCost: 50, category: "crowd-control", officialRole: "Crowd Control", damageOrStatus: "Non précisé", wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist" }
];

export interface HelminthRestrictionTarget {
  warframe: string;
  ability: string;
}

export interface HelminthRestrictionRule {
  damageBuffId: string;
  allowedTargets: HelminthRestrictionTarget[];
}

const RESTRICTED_DAMAGE_BUFF_TARGETS: HelminthRestrictionTarget[] = [
  { warframe: "chroma", ability: "vex armor" },
  { warframe: "cyte-09", ability: "resupply" },
  { warframe: "mirage", ability: "eclipse" },
  { warframe: "octavia", ability: "amp" },
  { warframe: "oraxia", ability: "silken stride" },
  { warframe: "rhino", ability: "roar" },
  { warframe: "temple", ability: "ripper's wail" },
  { warframe: "uriel", ability: "demonium" },
  { warframe: "xaku", ability: "xata's whisper" },
];

export const HELMINTH_DAMAGE_BUFF_RESTRICTIONS: HelminthRestrictionRule[] = [
  { damageBuffId: "eclipse", allowedTargets: RESTRICTED_DAMAGE_BUFF_TARGETS },
  { damageBuffId: "roar", allowedTargets: RESTRICTED_DAMAGE_BUFF_TARGETS },
  { damageBuffId: "xatas-whisper", allowedTargets: RESTRICTED_DAMAGE_BUFF_TARGETS },
];

function canonicalDamageBuffId(abilityId: string): string {
  const found = HELMINTH_ABILITIES.find(a => a.id === abilityId);
  const normalized = (found?.name || abilityId).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized === "xataswhisper") return "xatas-whisper";
  if (normalized === "roar") return "roar";
  if (normalized === "eclipse") return "eclipse";
  return normalized;
}

export function isDamageBuffAbility(abilityId: string): boolean {
  const found = HELMINTH_ABILITIES.find(a => a.id === abilityId);
  return Boolean(found?.isDamageBuff || ["roar", "eclipse", "xatas-whisper"].includes(canonicalDamageBuffId(abilityId)));
}

export function validateHelminthRestriction(abilityId: string, warframeName: string, nativeAbilityName: string): { allowed: boolean; reason?: string } {
  if (!isDamageBuffAbility(abilityId)) return { allowed: true };
  const normalizedWf = warframeName.trim().toLowerCase();
  const normalizedNative = nativeAbilityName.trim().toLowerCase();
  const canonicalId = canonicalDamageBuffId(abilityId);
  const rule = HELMINTH_DAMAGE_BUFF_RESTRICTIONS.find(r => r.damageBuffId === canonicalId);
  if (!rule) return { allowed: true };
  const targetMatches = rule.allowedTargets.some(target => normalizedWf.includes(target.warframe) && normalizedNative === target.ability);
  if (!targetMatches) {
    const targets = rule.allowedTargets.map(target => target.warframe + " → " + target.ability).join(', ');
    return { allowed: false, reason: "Restriction officielle : " + abilityId + " ne peut remplacer que l'une des capacités natives suivantes : " + targets + ". Cela empêche de cumuler ce buff de dégâts avec une autre capacité incompatible." };
  }
  return { allowed: true };
}