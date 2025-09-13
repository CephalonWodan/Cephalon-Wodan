// Parser v5 + cache 60s, endpoints officiels

export const ALLOWED_PLATFORMS = new Set(["pc", "ps4", "xb1", "swi", "mob"]);
export const ALLOWED_SECTIONS = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
  "voidTrader", "syndicateMissions"
]);

export function normalizeLang(raw = "en") {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("fr") ? "fr" : "en";
}

// Endpoints exacts (PC/PS4/XB1/Switch/iOS)
const PLATFORM_HOST = {
  pc:  "content.warframe.com",
  ps4: "content-ps4.warframe.com",
  xb1: "content-xb1.warframe.com",
  swi: "content-swi.warframe.com",
  mob: "content-mob.warframe.com",
};
function worldstateUrl(platform = "pc") {
  const host = PLATFORM_HOST[platform] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

// Cache mémoire
const TTL_MS = Number(process.env.WS_TTL_MS || 60_000);
const _cache = {
  pc:  { at: 0, parsed: null },
  ps4: { at: 0, parsed: null },
  xb1: { at: 0, parsed: null },
  swi: { at: 0, parsed: null },
  mob: { at: 0, parsed: null },
};

async function fetchWorldstateText(platform) {
  const url = worldstateUrl(platform);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== "string") throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

// ---------- i18n helpers: charge le pack et, si dispo, l’active ----------
async function loadLanguagePack(locale) {
  try {
    // default export = objet avec languages, solNodes, sortie, etc.
    const dataMod = await import("warframe-worldstate-data");
    const data = dataMod?.default ?? dataMod;

    // utilities: getLanguage (et parfois setLanguage)
    const utilsMod = await import("warframe-worldstate-data/utilities");
    const utilities = utilsMod?.default ?? utilsMod;

    const getLanguage = utilities?.getLanguage;
    const setLanguage = utilities?.setLanguage; // existe sur les versions récentes

    const pack = typeof getLanguage === "function" ? getLanguage(locale) : undefined;

    // active globalement si possible (certaines parties du parser lisent un registre global)
    if (pack && typeof setLanguage === "function") {
      setLanguage(pack);
    }

    return { data, utilities, pack };
  } catch (e) {
    // i18n facultatif : on pourra parser en EN par défaut
    return { data: null, utilities: null, pack: null };
  }
}

// ---------- pont universel vers le parser v5 ----------
async function parseWorldstate(text, locale = "en") {
  const [{ default: Parser, WorldState, parseArray, parseAsyncArray }, i18n] = await Promise.all([
    import("warframe-worldstate-parser"),
    loadLanguagePack(locale),
  ]);

  // On essaye dans l’ordre recommandé par le README du parser (appel comme fn),
  // puis on retombe sur les autres formes si besoin. (Voir NPM docs)  [oai_citation:2‡npm](https://www.npmjs.com/package/warframe-worldstate-parser)
  const errors = [];

  // 1) appel direct (export default fonction)
  if (typeof Parser === "function") {
    try {
      return await Parser(text);
    } catch (e) {
      errors.push(e);
    }
  }

  // 2) classe exportée nommée
  if (typeof WorldState === "function") {
    try {
      return new WorldState(text, { locale });
    } catch (e) {
      errors.push(e);
    }
  }

  // 3) helpers tableaux – certains builds exposent ces parseurs
  if (typeof parseArray === "function" || typeof parseAsyncArray === "function") {
    try {
      const obj = JSON.parse(text);
      // recrée l’objet WorldState minimal à partir des blocs (si nécessaire)
      if (typeof WorldState === "function") {
        return new WorldState(obj, { locale });
      }
    } catch (e) {
      errors.push(e);
    }
  }

  // 4) dernier recours: aucun parseur utilisable -> renvoyer squelette vide
  console.error("[worldstate] attempts errors (first 3):", errors.slice(0, 3).map(String));
  return null;
}

function shapeWs(ws) {
  // Normalise la forme attendue pour tes endpoints
  const out = {
    earthCycle: ws?.earthCycle ?? {},
    cetusCycle: ws?.cetusCycle ?? {},
    vallisCycle: ws?.vallisCycle ?? {},
    cambionCycle: ws?.cambionCycle ?? {},
    duviriCycle: ws?.duviriCycle ?? {},
    fissures: Array.isArray(ws?.fissures) ? ws.fissures : [],
    alerts: Array.isArray(ws?.alerts) ? ws.alerts : [],
    invasions: Array.isArray(ws?.invasions) ? ws.invasions : [],
    nightwave: ws?.nightwave ?? {},
    sortie: ws?.sortie ?? {},
    archonHunt: ws?.archonHunt ?? {},
    voidTrader: ws?.voidTrader ?? {},
    syndicateMissions: Array.isArray(ws?.syndicateMissions) ? ws.syndicateMissions : [],
  };
  return out;
}

async function getParsed(platform) {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchWorldstateText(platform);

  // langue serveur = EN (stable) ; tu pourras ajouter `normalizeLang` si tu veux
  const ws = await parseWorldstate(text, "en");

  // si le parser a échoué, renvoie squelette vide (mais pas d’erreur 5xx côté route)
  const parsed = ws ? shapeWs(ws) : {
    earthCycle:{}, cetusCycle:{}, vallisCycle:{}, cambionCycle:{}, duviriCycle:{},
    fissures:[], alerts:[], invasions:[], nightwave:{}, sortie:{}, archonHunt:{},
    voidTrader:{}, syndicateMissions:[],
  };

  _cache[platform] = { at: now, parsed };
  return parsed;
}

const LIST_SECTIONS = new Set(["fissures", "alerts", "invasions", "syndicateMissions"]);
const OBJ_SECTIONS  = new Set([
  "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
  "nightwave", "sortie", "archonHunt", "voidTrader"
]);
function ensureShape(section, value) {
  if (LIST_SECTIONS.has(section)) return Array.isArray(value) ? value : [];
  if (OBJ_SECTIONS.has(section))  return value ?? {};
  return value ?? null;
}

export async function getSection(platform, section /*, lang */) {
  const sec = section === "bounties" ? "syndicateMissions" : section;
  const ws = await getParsed(platform);
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform /*, lang */) {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions"
  ];
  const ws = await getParsed(platform);
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}