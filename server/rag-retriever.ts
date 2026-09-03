// CEPhalon Codex RAG — Tenno Codex retrieval layer.
// Style reminder: keep evidence compact, sourced, bilingual-aware, and readable in the HUD.
// Numeric truth remains in the Builder calculation engine; this module retrieves evidence only.

import ragIndex from "./rag-index.generated";

type JsonRecord = Record<string, any>;
type CatalogKind = "warframe" | "weapon" | "mod" | "arcane" | "companion" | "archon_shard" | "community_video" | "community_guide";

export interface RagQueryInput {
  query: string;
  language: "fr" | "en";
  missionType?: string;
  buildContext?: JsonRecord | null;
  advancedOptions?: JsonRecord | null;
}

export interface RagEvidence {
  id: string;
  kind: CatalogKind;
  name: string;
  text: string;
  score: number;
  source: string;
  sourceUrl?: string;
  validationStatus?: string;
}

interface RagDocument extends Omit<RagEvidence, "score"> {
  aliases: string[];
  tokens: string[];
  record: JsonRecord;
}

const STOP_WORDS = new Set([
  "a", "au", "aux", "avec", "dans", "de", "des", "du", "en", "et", "la", "le", "les", "ma", "mon", "pour", "sur", "un", "une", "the", "and", "for", "from", "into", "of", "on", "the", "to", "with", "build", "set", "faire", "faire", "donne", "donner", "quel", "quelle", "quels", "quelles",
]);

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.%'-]+/g, " ")
    .trim();
}

function tokens(value: unknown): string[] {
  return Array.from(new Set(normalize(value).split(/\s+/).filter(token => token.length > 1 && !STOP_WORDS.has(token))));
}

function compact(value: unknown, depth = 0): string {
  if (value === null || value === undefined || depth > 2) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.slice(0, 12).map(item => compact(item, depth + 1)).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value).slice(0, 18).map(([key, item]) => `${key}: ${compact(item, depth + 1)}`).filter(line => !line.endsWith(": ")).join(" | ");
  return "";
}

function recordText(kind: CatalogKind, item: JsonRecord, language: "fr" | "en"): string {
  const fields: string[] = [
    `Type: ${kind}`,
    `Nom: ${item.name || ""}`,
    item.type ? `Catégorie: ${item.type}` : "",
    item.description ? `Description: ${item.description}` : "",
    item.effect ? `Effet: ${item.effect}` : "",
    item.role ? `Rôle: ${item.role}` : "",
    item.weaponClass ? `Classe: ${item.weaponClass}` : "",
    item.damage ? `Dégâts totaux: ${item.damage}` : "",
    item.critChance ? `Chance critique: ${item.critChance}` : "",
    item.critMultiplier ? `Multiplicateur critique: ${item.critMultiplier}` : "",
    item.statusChance ? `Chance de statut: ${item.statusChance}` : "",
    item.fireRate ? `Cadence: ${item.fireRate}` : "",
    item.health ? `Santé: ${item.health}` : "",
    item.shield ? `Bouclier: ${item.shield}` : "",
    item.armor ? `Armure: ${item.armor}` : "",
    item.energy ? `Énergie: ${item.energy}` : "",
    item.polarity ? `Polarité: ${item.polarity}` : "",
    item.maxRank !== undefined ? `Rang maximum: ${item.maxRank}` : "",
    item.compatName ? `Compatibilité: ${item.compatName}` : "",
    item.abilities ? `Capacités: ${compact(item.abilities)}` : "",
    item.officialStats ? `Statistiques officielles: ${compact(item.officialStats)}` : "",
    item.effects ? `Effets disponibles: ${compact(item.effects)}` : "",
    item.effectIds ? `Identifiants d'effets: ${compact(item.effectIds)}` : "",
    item.damageTypes ? `Répartition des dégâts: ${compact(item.damageTypes)}` : "",
    language === "fr" ? "Langue de référence: français" : "Reference language: English",
  ];
  return fields.filter(Boolean).join("\n");
}

function sourceFor(item: JsonRecord): string {
  if (item.wikiUrl) return "Warframe Wiki + dataset local";
  if (item.sourceKey || item.effectIds) return "Archon Shard dataset + Warframe Wiki";
  return "dataset local normalisé";
}

function sourceUrlFor(item: JsonRecord): string | undefined {
  return item.wikiUrl || (item.name ? `https://wiki.warframe.com/w/${encodeURIComponent(String(item.name).replaceAll(" ", "_"))}` : undefined);
}

let documentCache: RagDocument[] | null = null;
function getDocuments(): RagDocument[] {
  if (!documentCache) {
    documentCache = (Array.isArray((ragIndex as any)?.documents) ? (ragIndex as any).documents : []) as RagDocument[];
  }
  return documentCache;
}

function includesAny(value: string, words: string[]): boolean {
  return words.some(word => value.includes(normalize(word)));
}

function inferFacets(input: RagQueryInput): string[] {
  const context = input.buildContext || {};
  const advanced = input.advancedOptions || {};
  return [
    input.query,
    input.missionType,
    advanced.faction,
    advanced.enemyLevelBand,
    advanced.optimizationFocus,
    context.warframe?.name,
    context.primaryWeapon,
    context.secondaryWeapon,
    context.meleeWeapon,
    context.companion,
    context.companionWeapon,
    ...(context.mods?.warframe || []),
    ...(context.mods?.primary || []),
    ...(context.mods?.secondary || []),
    ...(context.mods?.melee || []),
    ...(context.mods?.companion || []),
    ...(context.arcanes || []),
    ...(context.archonShards || []),
  ].filter(Boolean).map(String);
}

function scoreDocument(document: RagDocument, input: RagQueryInput, queryTokens: Set<string>, facetText: string): number {
  const normalizedQuery = normalize(input.query);
  const normalizedName = normalize(document.name);
  let score = 0;
  if (normalizedQuery.includes(normalizedName) || normalizedName.includes(normalizedQuery)) score += 15;
  if (document.aliases.some(alias => normalize(facetText).includes(normalize(alias)))) score += 8;
  for (const token of Array.from(queryTokens)) if (document.tokens.includes(token)) score += 2;
  const kindText = normalize(document.kind);
  if (document.kind === "warframe" && (input.buildContext?.warframe?.name || /warframe|frame|capacite|ability|helminth|survie|survival|energie|energy/.test(normalizedQuery))) score += 4;
  if (document.kind === "weapon" && /arme|weapon|dps|degat|damage|crit|critique|melee|mêlée/.test(normalizedQuery)) score += 3;
  if (document.kind === "mod" && /mod|polarite|capacite|strength|force|duree|duration|range|portee/.test(normalizedQuery)) score += 3;
  if (document.kind === "archon_shard" && /eclat|shard|tauforge|tauforged|archonte|archon/.test(normalizedQuery)) score += 5;
  if (document.kind === "arcane" && /arcane|rang|max rank|effet|effect/.test(normalizedQuery)) score += 3;
  if (document.kind === "companion" && /compagnon|companion|sentinel|sentinelle|moa|hound|kavat|kubrow/.test(normalizedQuery)) score += 4;
  if (document.kind === "community_video" && /video|youtube|guide|build|creator|créateur|conseil|recommend|mission|warframe/.test(normalizedQuery)) score += 2;
  if (document.kind === "community_guide" && /defense|défense|team|équipe|map|carte|wave|vague|helminth|nuker|buffer|warframe/.test(normalizedQuery)) score += 5;
  if (kindText && facetText.includes(kindText)) score += 1;
  return score;
}

export function retrieveRagEvidence(input: RagQueryInput, limit = 8): RagEvidence[] {
  const facets = inferFacets(input);
  const facetText = normalize(facets.join(" "));
  const queryTokens = new Set(tokens(facets.join(" ")));
  return getDocuments()
    .map(document => ({ document, score: scoreDocument(document, input, queryTokens, facetText) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.document.name.localeCompare(b.document.name))
    .slice(0, limit)
    .map(({ document, score }) => ({
      id: document.id,
      kind: document.kind,
      name: document.name,
      text: document.text,
      score,
      source: document.source,
      sourceUrl: document.sourceUrl,
      validationStatus: (document as any).validationStatus,
    }));
}

export function buildRagContext(input: RagQueryInput): { evidence: RagEvidence[]; instructions: string } {
  const evidence = retrieveRagEvidence(input, 8);
  const sourceLines = evidence.map((item, index) => `[${index + 1}] ${item.name} — ${item.source}${item.validationStatus ? ` — statut: ${item.validationStatus}` : ""}${item.sourceUrl ? ` — ${item.sourceUrl}` : ""}`).join("\n");
  const evidenceText = evidence.map((item, index) => `\n[EVIDENCE ${index + 1}]\n${item.text}`).join("\n");
  const instructions = input.language === "fr"
    ? `Utilise uniquement les éléments de preuve ci-dessous pour les faits spécifiques. Ne transforme pas une recommandation communautaire en donnée officielle. Ne fabrique jamais une statistique absente. Pour les chiffres finaux, fais confiance au snapshot calculé par le Builder. Si une donnée est absente ou marquée à revoir, dis-le explicitement. Cite les sources avec leur numéro.\n\nSources récupérées:\n${sourceLines}\n${evidenceText}`
    : `Use only the evidence below for item-specific facts. Do not present a community recommendation as an official value. Never invent a missing statistic. For final numbers, trust the Builder calculation snapshot. If data is missing or requires review, say so explicitly. Cite sources by number.\n\nRetrieved sources:\n${sourceLines}\n${evidenceText}`;
  return { evidence, instructions };
}

export function getRagDiagnostics() {
  const documents = getDocuments();
  return {
    documents: documents.length,
    byKind: documents.reduce<Record<string, number>>((result, document) => {
      result[document.kind] = (result[document.kind] || 0) + 1;
      return result;
    }, {}),
  };
}
