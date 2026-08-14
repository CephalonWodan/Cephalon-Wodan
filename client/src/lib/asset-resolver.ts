/**
 * Résolveur d'assets unifié pour l'application WARFRAME Set Builder
 * Associe chaque type d'objet (Warframe, Arme, Mod, Arcane, Compagnon, Éclat) à son visuel officiel ou à un fallback de haute qualité.
 */

export function resolveAssetUrl(name: string, type: 'warframe' | 'weapon' | 'mod' | 'arcane' | 'companion' | 'shard' | 'generic'): string {
  if (!name) return 'https://wiki.warframe.com/images/Lotus_Logo.png';

  const cleanName = name.trim().toLowerCase();

  // Mappings spécifiques pour les cas notables
  if (cleanName.includes('sirius')) {
    return 'https://wiki.warframe.com/images/SiriusLargePortrait.png?ec3e7';
  }
  if (cleanName.includes('uriel')) {
    return 'https://wiki.warframe.com/images/UrielLargePortrait.png?51357';
  }
  if (cleanName.includes('dante')) {
    return 'https://wiki.warframe.com/images/DantePortrait.png';
  }

  // Fallbacks par catégorie basés sur le Wiki officiel
  switch (type) {
    case 'warframe':
      return `https://wiki.warframe.com/images/${encodeURIComponent(name.replace(/\s+/g, '_'))}Portrait.png`;
    case 'weapon':
      return `https://wiki.warframe.com/images/${encodeURIComponent(name.replace(/\s+/g, '_'))}.png`;
    case 'mod':
      return `https://wiki.warframe.com/images/ModCardDark.png`;
    case 'arcane':
      return `https://wiki.warframe.com/images/ArcaneEnhancement.png`;
    case 'companion':
      return `https://wiki.warframe.com/images/Companion.png`;
    case 'shard':
      return `https://wiki.warframe.com/images/ArchonShardRed.png`;
    default:
      return 'https://wiki.warframe.com/images/Lotus_Logo.png';
  }
}
