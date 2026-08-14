/**
 * Script de gestion et de cache local des assets visuels (mods, arcanes, warframes, armes)
 * Permet de télécharger et de valider les images pour éviter les liens brisés.
 */

import fs from 'fs';
import path from 'path';

const ASSET_CACHE_DIR = path.join(process.cwd(), 'client', 'public', 'assets', 'cache');

if (!fs.existsSync(ASSET_CACHE_DIR)) {
  fs.mkdirSync(ASSET_CACHE_DIR, { recursive: true });
}

console.log('=== Warframe Asset Cache Manager ===');
console.log(`Dossier de cache cible : ${ASSET_CACHE_DIR}`);
console.log('Le gestionnaire de cache local est prêt à synchroniser les visuels.');
