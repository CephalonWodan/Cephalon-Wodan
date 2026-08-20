/**
 * Résolveur d'assets unifié pour l'application WARFRAME Set Builder.
 *
 * Design reminder: Tenno Codex HUD — l'image locale/API reste prioritaire,
 * les liens Wiki servent de seconde ligne de récupération, et le visuel Lotus
 * ne doit apparaître qu'après l'échec de toutes les sources connues.
 */

export type AssetType = "warframe" | "weapon" | "mod" | "arcane" | "companion" | "shard" | "generic";

export interface AssetLike {
  id?: string;
  name?: string;
  imageUrl?: string;
  imageUrls?: string[];
  iconUrl?: string;
  imageName?: string;
  iconName?: string;
  wikiLink?: string;
  wikiaUrl?: string;
  wikiUrl?: string;
}

const WIKI_IMAGE_BASE = "https://wiki.warframe.com/images/";
const WARFRAMESTAT_IMAGE_BASE = "https://cdn.warframestat.us/img/";
const WIKI_ITEMS_API = "https://api.warframestat.us/items/search/";
const DEFAULT_ASSET = `${WIKI_IMAGE_BASE}Lotus_Logo.png`;
const EXPLICIT_WIKI_ASSETS: Record<string, string[]> = {
  uriel: [`${WIKI_IMAGE_BASE}Uriel.png?1982c`],
  cyte09: [`${WIKI_IMAGE_BASE}Cyte09.png?f7d72`],
  sirius: [`${WIKI_IMAGE_BASE}S%26O-Sirius.png?b2f2a`],
  orion: [`${WIKI_IMAGE_BASE}S%26O-Orion.png?b2f2a`],
  siriusorion: [`${WIKI_IMAGE_BASE}S%26O-Sirius.png?b2f2a`, `${WIKI_IMAGE_BASE}S%26O-Orion.png?b2f2a`],
  baneofgrineer: [`${WIKI_IMAGE_BASE}BaneofGrineerMod.png?e027b`],
  baneofcorpus: [`${WIKI_IMAGE_BASE}BaneofCorpusMod.png`],
  baneoforokin: [`${WIKI_IMAGE_BASE}BaneofOrokinMod.png`],
  baneofinfested: [`${WIKI_IMAGE_BASE}BaneofInfestedMod.png?e443f`],
  surefooted: [`${WIKI_IMAGE_BASE}SureFootedMod.png`],
  primedsurefooted: [`${WIKI_IMAGE_BASE}PrimedSureFootedMod.png?508ee`],
};
const CATEGORY_FALLBACKS: Record<AssetType, string> = {
  warframe: `${WIKI_IMAGE_BASE}Warframe.png`,
  weapon: `${WIKI_IMAGE_BASE}Weapon.png`,
  mod: `${WIKI_IMAGE_BASE}ModCardDark.png`,
  arcane: `${WIKI_IMAGE_BASE}ArcaneEnhancement.png`,
  companion: `${WIKI_IMAGE_BASE}Companion.png`,
  shard: `${WIKI_IMAGE_BASE}ArchonShardRed.png`,
  generic: DEFAULT_ASSET,
};

const wikiImageCache = new Map<string, string | null>();
const wikiImageRequests = new Map<string, Promise<string | null>>();

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

function normalizeName(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

function isImageUrl(value: string): boolean {
  return /\.(?:png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i.test(value);
}

function normalizeFileName(fileName: unknown): string | null {
  if (typeof fileName !== "string" || !fileName.trim()) return null;
  return fileName.trim().replace(/^File:/i, "").replace(/\s+/g, "_");
}

function cdnImageFromFileName(fileName: unknown): string | null {
  const normalized = normalizeFileName(fileName);
  return normalized ? `${WARFRAMESTAT_IMAGE_BASE}${encodeURIComponent(normalized)}` : null;
}

function wikiImageFromFileName(fileName: unknown): string | null {
  const normalized = normalizeFileName(fileName);
  return normalized ? `${WIKI_IMAGE_BASE}${encodeURIComponent(normalized)}` : null;
}

function explicitWikiCandidates(asset: AssetLike): string[] {
  const keys = [asset.id, asset.name].filter((value): value is string => Boolean(value)).map(normalizeName);
  return keys.flatMap(key => EXPLICIT_WIKI_ASSETS[key] || []);
}

function nameCandidates(name: string, type: AssetType): string[] {
  const normalizedName = name.trim().replace(/\s+/g, "_");
  const encodedName = encodeURIComponent(normalizedName);
  const plainName = encodeURIComponent(name.trim());
  if (!name.trim()) return [];

  switch (type) {
    case "warframe":
      return [`${WIKI_IMAGE_BASE}${encodedName}Portrait.png`, `${WIKI_IMAGE_BASE}${encodedName}.png`, `${WIKI_IMAGE_BASE}${plainName}.png`];
    case "weapon":
      return [`${WIKI_IMAGE_BASE}${encodedName}.png`, `${WIKI_IMAGE_BASE}${plainName}.png`];
    case "mod":
      return [`${WIKI_IMAGE_BASE}${encodedName}Mod.png`, `${WIKI_IMAGE_BASE}${encodedName}.png`];
    case "arcane":
      return [`${WIKI_IMAGE_BASE}${encodedName}.png`, `${WIKI_IMAGE_BASE}${encodedName}Arcane.png`];
    default:
      return [`${WIKI_IMAGE_BASE}${encodedName}.png`];
  }
}

/**
 * Construit les URLs connues sans réseau. Les propriétés imageUrl/iconUrl sont
 * placées en premier, puis les noms de fichiers fournis par l'API, les URLs
 * d'image Wiki directes et enfin les conventions Wiki historiques.
 */
export function getAssetFallback(type: AssetType): string {
  return CATEGORY_FALLBACKS[type] || DEFAULT_ASSET;
}

export function resolveAssetCandidates(item: AssetLike | string, type: AssetType): string[] {
  const asset = typeof item === "string" ? { name: item } : item;
  const name = asset.name?.trim() || "";
  const candidates = [
    ...explicitWikiCandidates(asset),
    ...(Array.isArray(asset.imageUrls) ? asset.imageUrls.map(cleanUrl) : []),
    cleanUrl(asset.imageUrl),
    cleanUrl(asset.iconUrl),
    cdnImageFromFileName(asset.imageName),
    cdnImageFromFileName(asset.iconName),
    wikiImageFromFileName(asset.imageName),
    wikiImageFromFileName(asset.iconName),
    cleanUrl(asset.wikiLink && isImageUrl(asset.wikiLink) ? asset.wikiLink : null),
    cleanUrl(asset.wikiaUrl && isImageUrl(asset.wikiaUrl) ? asset.wikiaUrl : null),
    cleanUrl(asset.wikiUrl && isImageUrl(asset.wikiUrl) ? asset.wikiUrl : null),
    ...nameCandidates(name, type),
  ];
  return Array.from(new Set(candidates.filter((candidate): candidate is string => Boolean(candidate))));
}

/** Compatibilité avec les appels historiques qui ne fournissent qu'un nom. */
export function resolveAssetUrl(name: string, type: AssetType): string {
  return resolveAssetCandidates(name, type)[0] || getAssetFallback(type);
}

/**
 * Interroge l'API d'objets pour retrouver le imageName officiel associé à un
 * nom et le convertir en URL image Wiki. Le lien wikiaUrl est conservé dans
 * les données pour la traçabilité, mais n'est pas injecté directement dans
 * <img> puisqu'il s'agit généralement d'une page et non d'un fichier image.
 */
async function fetchWikiPageImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: { Accept: "text/html" } });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return cleanUrl(match?.[1] || null);
  } catch {
    return null;
  }
}

export async function fetchWikiImageUrl(name: string, type: AssetType): Promise<string | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;
  const cacheKey = `${type}:${normalizeName(trimmedName)}`;
  if (wikiImageCache.has(cacheKey)) return wikiImageCache.get(cacheKey) || null;
  const existingRequest = wikiImageRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const response = await fetch(`${WIKI_ITEMS_API}${encodeURIComponent(trimmedName)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Items API HTTP ${response.status}`);
      const payload: unknown = await response.json();
      const records = Array.isArray(payload) ? payload : (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items) ? (payload as { items: unknown[] }).items : []);
      const target = normalizeName(trimmedName);
      const exact = records.find(record => {
        if (!record || typeof record !== "object") return false;
        return normalizeName(String((record as { name?: unknown }).name || "")) === target;
      });
      const approximate = records.find(record => {
        if (!record || typeof record !== "object") return false;
        const recordName = normalizeName(String((record as { name?: unknown }).name || ""));
        return Boolean(recordName) && (recordName.includes(target) || target.includes(recordName));
      });
      const record = (exact || approximate) as { imageName?: unknown; iconName?: unknown; imageUrl?: unknown; iconUrl?: unknown; wikiaUrl?: unknown; wikiLink?: unknown } | undefined;
      const pageUrl = cleanUrl(record?.wikiaUrl) || cleanUrl(record?.wikiLink);
      const pageImage = pageUrl ? await fetchWikiPageImage(pageUrl) : null;
      const result = pageImage || cdnImageFromFileName(record?.imageName) || cdnImageFromFileName(record?.iconName) || wikiImageFromFileName(record?.imageName) || wikiImageFromFileName(record?.iconName) || cleanUrl(record?.imageUrl) || cleanUrl(record?.iconUrl);
      wikiImageCache.set(cacheKey, result);
      return result;
    } catch {
      wikiImageCache.set(cacheKey, null);
      return null;
    } finally {
      wikiImageRequests.delete(cacheKey);
    }
  })();

  wikiImageRequests.set(cacheKey, request);
  return request;
}
