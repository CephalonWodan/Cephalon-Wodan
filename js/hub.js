// js/hub.js
/**
 * Hub.js : consomme l’API Worldstate exposée sur Railway.
 * Ce module fournit des fonctions pour récupérer le worldstate complet
 * ou une section spécifique en fonction de la plateforme et de la langue.
 *
 * Usage :
 *   import { getWorldState, getSection } from './hub.js';
 *   getWorldState('pc', 'fr').then((ws) => console.log(ws.sortie));
 */

const API_BASE = 'https://cephalon-wodan-production.up.railway.app/api';

/**
 * Récupère le worldstate agrégé pour une plateforme donnée.
 * @param {string} platform - 'pc', 'ps4', 'xb1', 'swi' ou 'mob'
 * @param {string} lang - langue souhaitée ('en' ou 'fr')
 * @returns {Promise<object>} - un objet worldstate complet
 */
export async function getWorldState(platform = 'pc', lang = 'en') {
  const url = `${API_BASE}/${platform}?lang=${encodeURIComponent(lang)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Erreur API worldstate (${resp.status})`);
  }
  return resp.json();
}

/**
 * Récupère une section spécifique du worldstate.
 * @param {string} platform - même valeurs que ci-dessus
 * @param {string} section - nom de la section (fissures, sortie, invasions, nightwave, etc.)
 * @param {string} lang - langue souhaitée ('en' ou 'fr')
 * @returns {Promise<any>} - l’objet ou tableau correspondant à la section
 */
export async function getSection(platform = 'pc', section, lang = 'en') {
  const validSections = [
    'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
    'fissures','alerts','invasions','nightwave','sortie','archonHunt',
    'voidTrader','syndicateMissions','bounties'
  ];
  if (!validSections.includes(section)) {
    throw new Error(`Section inconnue : ${section}`);
  }
  // l’API accepte l’alias "bounties" pour syndicateMissions
  const url = `${API_BASE}/${platform}/${section}?lang=${encodeURIComponent(lang)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Erreur API worldstate section (${resp.status})`);
  }
  return resp.json();
}

/* Exemple de fonction utilitaire côté front :
(async () => {
  try {
    const ws = await getWorldState('pc', 'en');
    console.log('Sortie en cours :', ws.sortie);
    const fissures = await getSection('pc', 'fissures', 'en');
    console.log('Failles :', fissures.length);
  } catch (err) {
    console.error('Erreur Hub.js :', err);
  }
})();
*/
