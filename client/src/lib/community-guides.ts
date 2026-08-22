// Tenno Codex — Community guide index
// Style reminder: source-first editorial cards, amber creator signal, cyan action button.
// These entries summarize public source topics; they are not endorsements and do not fabricate exact mod lists.

export type GuideCreator = "PANDAAHH" | "Vũ Thắng" | "MHBlacky" | "TheKengineer";
export type GuideCategory = "Warframe" | "Arme" | "Mécanique" | "Progression" | "Compagnon";

export interface CommunityGuide {
  id: string;
  creator: GuideCreator;
  category: GuideCategory;
  targetItemName?: string;
  title: { fr: string; en: string };
  summary: { fr: string; en: string };
  sourceLabel: { fr: string; en: string };
  sourceUrl: string;
  mission: { fr: string; en: string };
  tags: string[];
}

export const COMMUNITY_GUIDES: CommunityGuide[] = [
  {
    id: "pandaahh-mesa-three-builds",
    creator: "PANDAAHH",
    category: "Warframe",
    targetItemName: "Mesa",
    title: { fr: "Mesa — trois orientations de build", en: "Mesa — three build directions" },
    summary: { fr: "Une comparaison de trois orientations pour Mesa, à consulter avant de choisir entre confort, dégâts et spécialisation de mission.", en: "A comparison of three Mesa directions to review before choosing between comfort, damage, and mission specialization." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=2FvnrCRSPak",
    mission: { fr: "Comparaison / missions générales", en: "Comparison / general missions" },
    tags: ["Mesa", "comparaison", "PANDAAHH"],
  },
  {
    id: "pandaahh-chroma-buffer",
    creator: "PANDAAHH",
    category: "Warframe",
    targetItemName: "Chroma",
    title: { fr: "Chroma — buffer de soutien", en: "Chroma — support buffer" },
    summary: { fr: "Une approche orientée soutien et amplification de l’équipe, à adapter aux armes équipées et au rôle attendu en mission.", en: "A support-oriented approach focused on team amplification, to be adapted to equipped weapons and the intended mission role." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=NIyvpENS4r8",
    mission: { fr: "Soutien / équipe", en: "Support / squad" },
    tags: ["Chroma", "support", "PANDAAHH"],
  },
  {
    id: "pandaahh-khora-cascade",
    creator: "PANDAAHH",
    category: "Warframe",
    targetItemName: "Khora",
    title: { fr: "Khora — Cascade du Néant", en: "Khora — Void Cascade" },
    summary: { fr: "Un guide axé sur le contrôle de zone et la tenue d’une rotation Cascade, avec une lecture pratique des compromis du build.", en: "A guide focused on area control and sustaining a Void Cascade rotation, with a practical view of the build’s trade-offs." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=lv7idKY8VXI",
    mission: { fr: "Cascade / Steel Path", en: "Void Cascade / Steel Path" },
    tags: ["Khora", "contrôle", "PANDAAHH"],
  },
  {
    id: "pandaahh-excalibur-umbra",
    creator: "PANDAAHH",
    category: "Warframe",
    targetItemName: "Excalibur Umbra",
    title: { fr: "Excalibur — normal et Umbra", en: "Excalibur — standard and Umbra" },
    summary: { fr: "Un point de départ pour comparer les variantes Excalibur et construire une orientation mêlée cohérente avec le contenu visé.", en: "A starting point for comparing Excalibur variants and building a melee direction suited to the intended content." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=mJDDkfR7l74",
    mission: { fr: "Mêlée / polyvalent", en: "Melee / general" },
    tags: ["Excalibur", "Umbra", "mêlée"],
  },
  {
    id: "pandaahh-wisp-offensive",
    creator: "PANDAAHH",
    category: "Warframe",
    targetItemName: "Wisp",
    title: { fr: "Wisp offensive — contrôle et dégâts de zone", en: "Offensive Wisp — control and area damage" },
    summary: { fr: "Une variante offensive de Wisp centrée sur les zones et le remplacement d’une capacité, avec une gestion précise du rythme des pouvoirs.", en: "An offensive Wisp variant centered on area effects and replacing an ability, with careful ability pacing." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=lBY5qRzrCmY",
    mission: { fr: "Nettoyage / zone", en: "Clearing / area control" },
    tags: ["Wisp", "Helminth", "zone"],
  },
  {
    id: "pandaahh-rhino-larkspur",
    creator: "PANDAAHH",
    category: "Arme",
    targetItemName: "Larkspur Prime",
    title: { fr: "Rhino + Larkspur Prime — Cascade niveau 9999", en: "Rhino + Larkspur Prime — level 9999 Cascade" },
    summary: { fr: "Une configuration expérimentale de haut niveau combinant buff, strip et Archgun ; la vidéo expose aussi ses limites d’exécution.", en: "A high-level experimental setup combining buffing, armor strip, and an Archgun; the video also explains its execution limits." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=uNeduQVBsgs",
    mission: { fr: "Cascade / endurance", en: "Void Cascade / endurance" },
    tags: ["Rhino", "Larkspur", "level cap"],
  },
  {
    id: "vu-thang-volt-helicopter",
    creator: "Vũ Thắng",
    category: "Warframe",
    targetItemName: "Volt",
    title: { fr: "Volt Helicopter — mobilité et vitesse", en: "Volt Helicopter — mobility and speed" },
    summary: { fr: "Une approche de Volt orientée mobilité et vitesse, présentée avec une démonstration de gameplay plutôt qu’une promesse universelle.", en: "A mobility- and speed-focused Volt approach, presented through gameplay rather than as a universal recommendation." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=2tLKeqKWBtY",
    mission: { fr: "Mobilité / contenu rapide", en: "Mobility / fast content" },
    tags: ["Volt", "mobilité", "Vũ Thắng"],
  },
  {
    id: "vu-thang-vasto-dagath",
    creator: "Vũ Thắng",
    category: "Arme",
    targetItemName: "Vasto Prime",
    title: { fr: "Vasto Incarnon + Dagath", en: "Vasto Incarnon + Dagath" },
    summary: { fr: "Une synergie entre une arme Incarnon et Dagath, articulée autour de la transformation de l’arme et de l’exploitation des fenêtres de dégâts.", en: "A synergy between an Incarnon weapon and Dagath, built around the weapon’s transformation and damage windows." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=BGhchbZIjn8",
    mission: { fr: "Dégâts / Incarnon", en: "Damage / Incarnon" },
    tags: ["Vasto", "Incarnon", "Dagath"],
  },
  {
    id: "thekengineer-frame-guides",
    creator: "TheKengineer",
    category: "Mécanique",
    title: { fr: "Frame Guides — comprendre avant d’optimiser", en: "Frame Guides — understand before optimizing" },
    summary: { fr: "Une collection de guides analytiques sur les rôles, les capacités et les compromis qui permet de mieux comprendre les choix derrière chaque configuration.", en: "An analytical guide collection covering roles, abilities, and trade-offs to clarify the choices behind each configuration." },
    sourceLabel: { fr: "Ouvrir la playlist source", en: "Open source playlist" },
    sourceUrl: "https://www.youtube.com/playlist?list=PLnXNtfBmru96CQNYCLNUEjwxo25Himxag",
    mission: { fr: "Mécaniques / théorie", en: "Mechanics / theory" },
    tags: ["analyse", "capacités", "TheKengineer"],
  },
  {
    id: "thekengineer-farm-frames",
    creator: "TheKengineer",
    category: "Progression",
    title: { fr: "Choisir et obtenir ses Warframes", en: "Choosing and farming Warframes" },
    summary: { fr: "Une analyse de progression et de farm, avec un passage consacré à Dante, Uriel et d’autres Warframes récentes.", en: "A progression and farming analysis featuring Dante, Uriel, and other recent Warframes." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=a0Byav8N0bg",
    mission: { fr: "Progression / acquisition", en: "Progression / acquisition" },
    tags: ["farm", "Dante", "Uriel"],
  },
  {
    id: "thekengineer-sirius-orion",
    creator: "TheKengineer",
    category: "Warframe",
    targetItemName: "Sirius",
    title: { fr: "Sirius & Orion — analyse du kit et des problèmes", en: "Sirius & Orion — kit analysis and issues" },
    summary: { fr: "Une lecture critique du lancement de Sirius et Orion, qui examine leur kit, leurs promesses et les points qui méritent encore d’être clarifiés après leur arrivée.", en: "A critical look at the launch of Sirius and Orion, examining their kits, their strengths, and the points that still deserve clarification after release." },
    sourceLabel: { fr: "Voir la vidéo source", en: "Watch source video" },
    sourceUrl: "https://www.youtube.com/watch?v=-cXmSFP4wB0",
    mission: { fr: "Analyse / nouveautés", en: "Analysis / new releases" },
    tags: ["Sirius", "Orion", "analyse"],
  },
  {
    id: "mhblacky-channel",
    creator: "MHBlacky",
    category: "Mécanique",
    title: { fr: "MHBlacky — guides accessibles et endgame", en: "MHBlacky — accessible guides and endgame" },
    summary: { fr: "Une sélection de guides pédagogiques et de contenus endgame de MHBlacky, pensée pour progresser des fondamentaux vers les activités les plus exigeantes du Système d’Origine.", en: "A selection of MHBlacky’s approachable guides and endgame content, designed to take players from core fundamentals to the most demanding activities in the Origin System." },
    sourceLabel: { fr: "Ouvrir la chaîne source", en: "Open source channel" },
    sourceUrl: "https://www.youtube.com/@MHBlacky_ENG/about",
    mission: { fr: "Guides / endgame", en: "Guides / endgame" },
    tags: ["guides", "endgame", "MHBlacky"],
  },
];
