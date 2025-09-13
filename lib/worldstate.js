// lib/worldstate.js
// Parser v5 + cache 60s, endpoints officiels (robuste fn/classe + locale)

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
  const r = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": "Cephalon-Wodan/1.0 (+worldstate)" },
  });
  if (!r.ok) throw new Error(`worldstate ${platform} ${r.status}`);
  const text = await r.text();
  if (!text || typeof text !== "string") throw new Error(`worldstate ${platform} empty-response`);
  return text;
}

const jsonify = (x) => JSON.parse(JSON.stringify(x));

// ——— parser bridge: supporte "fn" OU "class", + langues ———
async function parseWorldstate(text, locale = "en") {
  const mod = await import("warframe-worldstate-parser");

  // langues (boss de sortie, etc.)
  const utils = (await import("warframe-worldstate-data/utilities")).default;
  const language = typeof utils?.getLanguage === "function" ? utils.getLanguage(locale) : undefined;

  // on parse une seule fois la chaîne -> objet
  let obj;
  try { obj = JSON.parse(text); }
  catch { throw new Error("worldstate: invalid JSON"); }

  const def = mod?.default;
  const Ctor = mod?.WorldState;
  const opts = { locale, language };

  // 1) export par défaut en tant que fonction (cas doc npm)
  if (typeof def === "function") {
    // a) essayer en fonction avec la string
    try {
      const ws = await def(text, opts);
      return jsonify(ws);
    } catch {}
    // b) certaines builds acceptent un objet
    try {
      const ws = await def(obj, opts);
      return jsonify(ws);
    } catch {}
    // c) si en réalité c'est une classe, on tente "new" avec OBJET
    try {
      // @ts-ignore
      const inst = new def(obj, opts);
      return jsonify(inst);
    } catch {}
  }

  // 2) export nommé "WorldState" (classe) — attend OBJET
  if (typeof Ctor === "function") {
    const inst = new Ctor(obj, opts);
    return jsonify(inst);
  }

  throw new Error("warframe-worldstate-parser: aucun parseur compatible trouvé");
}

async function getParsed(platform, locale = "en") {
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("bad platform");
  const now = Date.now();
  const c = _cache[platform];
  if (c?.parsed && (now - c.at) < TTL_MS) return c.parsed;

  const text = await fetchWorldstateText(platform);
  const parsed = await parseWorldstate(text, locale);

  _cache[platform] = { at: now, parsed };
  return parsed;
}

// Formes attendues
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

export async function getSection(platform, section, lang = "en") {
  const sec = section === "bounties" ? "syndicateMissions" : section;
  const ws = await getParsed(platform, normalizeLang(lang));
  return ensureShape(sec, ws?.[sec]);
}

export async function getAggregated(platform, lang = "en") {
  const keys = [
    "earthCycle", "cetusCycle", "vallisCycle", "cambionCycle", "duviriCycle",
    "fissures", "alerts", "invasions", "nightwave", "sortie", "archonHunt",
    "voidTrader", "syndicateMissions"
  ];
  const ws = await getParsed(platform, normalizeLang(lang));
  const out = {};
  for (const k of keys) out[k] = ensureShape(k, ws?.[k]);
  return out;
}