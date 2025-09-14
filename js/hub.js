// js/hub.js
const API_BASE = 'https://cephalon-wodan-production.up.railway.app/api';

export async function getWorldState(platform = 'pc', lang = 'en') {
  const url = `${API_BASE}/${platform}?lang=${encodeURIComponent(lang)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Erreur API worldstate (${resp.status})`);
  }
  return resp.json();
}

export async function getSection(platform = 'pc', section, lang = 'en') {
  const validSections = [
    'earthCycle','cetusCycle','vallisCycle','cambionCycle','duviriCycle',
    'fissures','alerts','invasions','nightwave','sortie','archonHunt',
    'voidTrader','syndicateMissions','bounties'
  ];
  if (!validSections.includes(section)) {
    throw new Error(`Section inconnue : ${section}`);
  }
  const url = `${API_BASE}/${platform}/${section}?lang=${encodeURIComponent(lang)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Erreur API worldstate section (${resp.status})`);
  }
  return resp.json();
}
