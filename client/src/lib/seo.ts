// Tenno Codex SEO — route-aware metadata for the bilingual SPA.
// Style reminder: concise, factual metadata; no keyword stuffing; French and English are first-class.

export type SeoLanguage = "fr" | "en";

const SITE_URL = "https://cephalon-wodan-f3oa.vercel.app";

const ROUTE_META: Record<string, { fr: { title: string; description: string; keywords: string }; en: { title: string; description: string; keywords: string } }> = {
  "/": {
    fr: { title: "WARFRAME Set Builder — Constructeur de builds FR", description: "Créez des builds Warframe complets avec Warframes, armes, compagnons, mods, arcanes, éclats d’Archonte et calculs de statistiques.", keywords: "Warframe build, set builder, builds Warframe français, mods, arcanes, éclats d’Archonte" },
    en: { title: "WARFRAME Set Builder — Build Planner", description: "Create complete Warframe loadouts with Warframes, weapons, companions, mods, arcanes, Archon Shards, and live stat calculations.", keywords: "Warframe build, set builder, build planner, mods, arcanes, Archon Shards" },
  },
  "/builder": {
    fr: { title: "Créer un build Warframe — Set Builder", description: "Assemblez et comparez un set Warframe avec modding avancé, polarités, arcanes, éclats, Incarnon et statistiques calculées.", keywords: "Warframe builder, créateur de build, modding Warframe, Incarnon, Steel Path" },
    en: { title: "Create a Warframe Build — Set Builder", description: "Assemble and compare a Warframe loadout with advanced modding, polarities, arcanes, shards, Incarnon, and calculated stats.", keywords: "Warframe builder, build creator, Warframe modding, Incarnon, Steel Path" },
  },
  "/warframes": {
    fr: { title: "Catalogue des Warframes — Warframe Set Builder", description: "Explorez les Warframes, leurs statistiques, capacités, passifs et détails de progression dans le catalogue Tenno Codex.", keywords: "Warframes, statistiques Warframe, capacités Warframe, catalogue Warframe" },
    en: { title: "Warframe Catalog — Warframe Set Builder", description: "Explore Warframes, stats, abilities, passives, and progression details in the Tenno Codex catalog.", keywords: "Warframes, Warframe stats, Warframe abilities, Warframe catalog" },
  },
  "/weapons": {
    fr: { title: "Catalogue des armes Warframe — Set Builder", description: "Recherchez les armes primaires, secondaires et de mêlée avec dégâts, critique, statut et profils Incarnon vérifiés.", keywords: "armes Warframe, armes Incarnon, dégâts Warframe, catalogue armes" },
    en: { title: "Warframe Weapon Catalog — Set Builder", description: "Search primary, secondary, and melee weapons with verified damage, critical, status, and Incarnon profiles.", keywords: "Warframe weapons, Incarnon weapons, Warframe damage, weapon catalog" },
  },
  "/mods": {
    fr: { title: "Catalogue des mods Warframe — Set Builder", description: "Consultez les effets, rangs, coûts et catégories des mods Warframe pour préparer vos configurations.", keywords: "mods Warframe, mods de Warframe, modding, catalogue mods" },
    en: { title: "Warframe Mod Catalog — Set Builder", description: "Browse Warframe mod effects, ranks, costs, and categories to plan your configurations.", keywords: "Warframe mods, modding, mod catalog, Warframe build" },
  },
  "/companions": {
    fr: { title: "Catalogue des compagnons Warframe — Set Builder", description: "Explorez les compagnons, Sentinelles, MOA, Hounds, armes et configurations de compagnons Warframe.", keywords: "compagnons Warframe, Sentinelles, MOA, Hound, armes de compagnon" },
    en: { title: "Warframe Companion Catalog — Set Builder", description: "Explore companions, Sentinels, MOAs, Hounds, weapons, and Warframe companion configurations.", keywords: "Warframe companions, Sentinels, MOA, Hound, companion weapons" },
  },
  "/arcanes": {
    fr: { title: "Catalogue des arcanes Warframe — Set Builder", description: "Recherchez les arcanes Warframe, leurs effets et leurs rangs pour compléter vos builds.", keywords: "arcanes Warframe, effets arcanes, catalogue Warframe" },
    en: { title: "Warframe Arcane Catalog — Set Builder", description: "Search Warframe arcanes, effects, and ranks to complete your builds.", keywords: "Warframe arcanes, arcane effects, Warframe catalog" },
  },
  "/archon-shards": {
    fr: { title: "Éclats d’Archonte — Warframe Set Builder", description: "Comparez les effets des éclats d’Archonte et préparez des répartitions adaptées à vos Warframes.", keywords: "éclats d’Archonte, Tauforgé, shards Warframe, build Warframe" },
    en: { title: "Archon Shards — Warframe Set Builder", description: "Compare Archon Shard effects and plan distributions tailored to your Warframes.", keywords: "Archon Shards, Tauforged, Warframe shards, Warframe build" },
  },
  "/relics": {
    fr: { title: "Catalogue des reliques du Néant — Warframe Set Builder", description: "Filtrez les reliques du Néant par composant Prime et simulez les ouvertures Radshare.", keywords: "reliques Warframe, reliques du Néant, Prime, Radshare" },
    en: { title: "Void Relic Catalog — Warframe Set Builder", description: "Filter Void Relics by Prime component and simulate Radshare openings.", keywords: "Warframe relics, Void Relics, Prime, Radshare" },
  },
  "/guides": {
    fr: { title: "Guides et builds Warframe — Tenno Codex", description: "Retrouvez des guides communautaires sourcés de PANDAAHH, Vũ Thắng, MHBlacky et TheKengineer.", keywords: "guides Warframe, builds Warframe, PANDAAHH, MHBlacky, TheKengineer" },
    en: { title: "Warframe Guides and Builds — Tenno Codex", description: "Explore sourced community guides from PANDAAHH, Vũ Thắng, MHBlacky, and TheKengineer.", keywords: "Warframe guides, Warframe builds, PANDAAHH, MHBlacky, TheKengineer" },
  },
  "/worldstate": {
    fr: { title: "Worldstate Warframe en direct — Set Builder", description: "Consultez les fissures, alertes, invasions, cycles et incursions Steel Path du système Origin.", keywords: "Warframe worldstate, fissures, alertes, invasions, Steel Path" },
    en: { title: "Live Warframe Worldstate — Set Builder", description: "Check Void Fissures, alerts, invasions, cycles, and Steel Path incursions across the Origin System.", keywords: "Warframe worldstate, Void Fissures, alerts, invasions, Steel Path" },
  },
  "/resources": {
    fr: { title: "Ressources Warframe — Tenno Codex", description: "Accédez aux ressources et références utiles pour progresser et optimiser vos sets Warframe.", keywords: "ressources Warframe, références Warframe, Tenno Codex" },
    en: { title: "Warframe Resources — Tenno Codex", description: "Access useful resources and references to progress and optimize your Warframe loadouts.", keywords: "Warframe resources, Warframe references, Tenno Codex" },
  },
};

export function getSeoMeta(pathname: string, language: SeoLanguage) {
  return ROUTE_META[pathname] || ROUTE_META["/"];
}

export function applySeo(pathname: string, language: SeoLanguage) {
  const meta = getSeoMeta(pathname, language)[language];
  const canonicalPath = pathname === "/" ? "/" : pathname;
  const canonical = `${SITE_URL}${canonicalPath}`;
  document.title = meta.title;
  document.documentElement.lang = language;
  const setMeta = (selector: string, attribute: "name" | "property", value: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, selector.match(/\[(?:name|property)="([^"]+)"/)?.[1] || "");
      document.head.appendChild(element);
    }
    element.content = value;
  };
  setMeta('meta[name="description"]', "name", meta.description);
  setMeta('meta[name="keywords"]', "name", meta.keywords);
  setMeta('meta[property="og:title"]', "property", meta.title);
  setMeta('meta[property="og:description"]', "property", meta.description);
  setMeta('meta[property="og:type"]', "property", "website");
  setMeta('meta[property="og:url"]', "property", canonical);
  setMeta('meta[property="og:locale"]', "property", language === "fr" ? "fr_FR" : "en_US");
  setMeta('meta[name="twitter:card"]', "name", "summary");
  setMeta('meta[name="twitter:title"]', "name", meta.title);
  setMeta('meta[name="twitter:description"]', "name", meta.description);
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
  link.href = canonical;
  document.head.querySelectorAll('link[rel="alternate"]').forEach(element => element.remove());
  for (const [hrefLang, href] of [["fr", canonical], ["en", canonical], ["x-default", `${SITE_URL}${canonicalPath}`]] as const) {
    const alternate = document.createElement("link");
    alternate.rel = "alternate";
    alternate.hreflang = hrefLang;
    alternate.href = href;
    document.head.appendChild(alternate);
  }
}
