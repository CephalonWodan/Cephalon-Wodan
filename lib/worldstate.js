// --- juste sous ALLOWED_SECTIONS, ajoute (on inclut aussi 'bounties' comme alias)
export const ALLOWED_SECTIONS = new Set([
  "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
  "fissures","alerts","invasions","nightwave","sortie","archonHunt",
  "voidTrader","syndicateMissions","bounties"  // <= alias accepté
]);

// --- mapping public → propriété du parseur
const SECTION_MAP = {
  // cycles (objets)
  earthCycle: "earthCycle",
  cetusCycle: "cetusCycle",
  vallisCycle: "vallisCycle",
  cambionCycle: "cambionCycle",
  duviriCycle: "duviriCycle",

  // listes
  fissures: "fissures",
  alerts: "alerts",
  invasions: "invasions",
  syndicateMissions: "syndicateMissions",
  bounties: "syndicateMissions",             // <= alias /bounties

  // objets
  nightwave: "nightwave",
  sortie: "sortie",
  archonHunt: "archonHunt",
  voidTrader: "voidTrader",
};

// pour garantir la bonne forme selon la section demandée
const LIST_SECTIONS = new Set(["fissures","alerts","invasions","syndicateMissions","bounties"]);
const OBJ_SECTIONS  = new Set([
  "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
  "nightwave","sortie","archonHunt","voidTrader"
]);

function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

// Résout le nom public vers la propriété interne du parseur
function resolveProp(section) {
  const key = SECTION_MAP[section];
  return key || section;
}

export async function getSection(platform, section /*, lang */) {
  const ws = await getParsed(platform);
  const prop = resolveProp(section);
  return ensureShape(section, ws?.[prop]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle","cetusCycle","vallisCycle","cambionCycle","duviriCycle",
    "fissures","alerts","invasions","nightwave","sortie","archonHunt",
    "voidTrader","syndicateMissions"  // <= maintenant présent dans l’agrégat
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) {
    const prop = resolveProp(k);
    out[k] = ensureShape(k, ws?.[prop]);
  }
  return out;
}
