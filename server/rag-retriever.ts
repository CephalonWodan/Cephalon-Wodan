// CEPhalon Codex RAG — Tenno Codex retrieval layer.
// Style reminder: keep evidence compact, sourced, bilingual-aware, and readable in the HUD.
// Numeric truth remains in the Builder calculation engine; this module retrieves evidence only.

import ragIndex from "./rag-index.generated.js";
import { COMMUNITY_BUILD_REFERENCES } from "./community-builds.js";

type JsonRecord = Record<string, any>;
type CatalogKind = "warframe" | "weapon" | "mod" | "arcane" | "companion" | "archon_shard" | "community_video" | "community_guide" | "community_build";

export interface RagQueryInput { query: string; language: "fr" | "en"; missionType?: string; buildContext?: JsonRecord | null; advancedOptions?: JsonRecord | null; }
export interface RagEvidence { id: string; kind: CatalogKind; name: string; text: string; score: number; source: string; sourceUrl?: string; validationStatus?: string; expertCategory?: string; creator?: string; }
interface RagDocument extends Omit<RagEvidence, "score"> { aliases: string[]; tokens: string[]; record: JsonRecord; }

const STOP_WORDS = new Set(["a","au","aux","avec","dans","de","des","du","en","et","la","le","les","ma","mon","pour","sur","un","une","the","and","for","from","into","of","on","to","with","build","set","faire","donne","donner","quel","quelle","quels","quelles"]);
function normalize(value: unknown): string { return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9+#.%'-]+/g, " ").trim(); }
function tokens(value: unknown): string[] { return Array.from(new Set(normalize(value).split(/\s+/).filter(token => token.length > 1 && !STOP_WORDS.has(token)))); }
function compact(value: unknown, depth = 0): string {
  if (value === null || value === undefined || depth > 2) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.slice(0, 12).map(item => compact(item, depth + 1)).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value).slice(0, 18).map(([key, item]) => `${key}: ${compact(item, depth + 1)}`).filter(line => !line.endsWith(": ")).join(" | ");
  return "";
}

function sourceFor(item: JsonRecord): string {
  if (item.kind === "community_build" || item.validationStatus === "community_reference") return item.sourceType === "community_video" ? `Vidéo YouTube experte — ${item.creator || "créateur"}` : `Référence communautaire — ${item.creator || "source"}`;
  if (item.wikiUrl) return "Warframe Wiki + dataset local";
  if (item.sourceKey || item.effectIds) return "Archon Shard dataset + Warframe Wiki";
  return "dataset local normalisé";
}
function sourceUrlFor(item: JsonRecord): string | undefined { return item.sourceUrl || item.wikiUrl || (item.name ? `https://wiki.warframe.com/w/${encodeURIComponent(String(item.name).replaceAll(" ", "_"))}` : undefined); }

function makeCommunityDocument(build: typeof COMMUNITY_BUILD_REFERENCES[number]): RagDocument {
  const record: JsonRecord = { ...build, kind: "community_build", validationStatus: "community_reference" };
  const text = [
    "Type: community_build",
    `Nom: ${build.name}`,
    `Objet ciblé: ${build.targetItemName}`,
    `Créateur: ${build.creator}`,
    `Description: ${build.description}`,
    `Mission: ${build.missionType}`,
    `Difficulté: ${build.difficulty}`,
    `Mods recommandés: ${build.modNames.join("; ")}`,
    build.auraName ? `Aura: ${build.auraName}` : "",
    build.exilusName ? `Exilus: ${build.exilusName}` : "",
    `Arcanes recommandées: ${build.arcaneNames.join("; ")}`,
    build.archonShards?.length ? `Éclats: ${build.archonShards.map(s => `${s.shardName} — ${s.effectText}`).join("; ")}` : "",
  ].filter(Boolean).join("\n");
  return { id: build.id, kind: "community_build", name: build.name, text, score: 0, source: "Build communautaire — référence, non officiel", sourceUrl: undefined, validationStatus: "community_reference", aliases: [build.targetItemName, build.creator], tokens: tokens(`${build.name} ${build.targetItemName} ${build.creator} ${build.missionType} ${build.modNames.join(" ")}`), record };
}

let documentCache: RagDocument[] | null = null;
function getDocuments(): RagDocument[] {
  if (!documentCache) {
    const generated = (Array.isArray((ragIndex as any)?.documents) ? (ragIndex as any).documents : []) as RagDocument[];
    documentCache = [...generated, ...COMMUNITY_BUILD_REFERENCES.map(makeCommunityDocument)];
  }
  return documentCache;
}

function inferFacets(input: RagQueryInput): string[] {
  const context = input.buildContext || {};
  const advanced = input.advancedOptions || {};
  return [input.query,input.missionType,advanced.faction,advanced.enemyLevelBand,advanced.optimizationFocus,context.warframe?.name,context.primaryWeapon,context.secondaryWeapon,context.meleeWeapon,context.companion,context.companionWeapon,...(context.mods?.warframe || []),...(context.mods?.primary || []),...(context.mods?.secondary || []),...(context.mods?.melee || []),...(context.mods?.companion || []),...(context.arcanes || []),...(context.archonShards || [])].filter(Boolean).map(String);
}

function scoreDocument(document: RagDocument, input: RagQueryInput, queryTokens: Set<string>, facetText: string): number {
  const normalizedQuery = normalize(input.query); const normalizedName = normalize(document.name); let score = 0;
  if (normalizedQuery.includes(normalizedName) || normalizedName.includes(normalizedQuery)) score += 15;
  if (document.aliases.some(alias => facetText.includes(normalize(alias)))) score += 8;
  for (const token of Array.from(queryTokens)) if (document.tokens.includes(token)) score += 2;
  const kindText = normalize(document.kind);
  const expertCategory = normalize(document.expertCategory || document.record?.expertCategory || "");
  const isBuildQuery = /build|configuration|setup|optimise|optimiser|optimization|optimize|endgame|steel path|survie|survival|endurance|level cap|niveau max/.test(normalizedQuery);
  const isMechanicsQuery = /mecanique|mechanic|interaction|synergie|synergy|breakpoint|scaling|calcul|formule|speedrun|vitesse|route|farm.*rapide/.test(normalizedQuery);
  const isWeaponQuery = /arme|weapon|dps|degat|damage|crit|critique|incarnon|fusil|pistolet|melee|mêlée/.test(normalizedQuery);
  if (document.kind === "warframe" && (input.buildContext?.warframe?.name || /warframe|frame|capacite|ability|helminth|survie|survival|energie|energy/.test(normalizedQuery))) score += 4;
  if (document.kind === "weapon" && isWeaponQuery) score += 3;
  if (document.kind === "mod" && /mod|polarite|capacite|strength|force|duree|duration|range|portee/.test(normalizedQuery)) score += 3;
  if (document.kind === "archon_shard" && /eclat|shard|tauforge|tauforged|archonte|archon/.test(normalizedQuery)) score += 5;
  if (document.kind === "arcane" && /arcane|rang|max rank|effet|effect/.test(normalizedQuery)) score += 3;
  if (document.kind === "companion" && /compagnon|companion|sentinel|sentinelle|moa|hound|kavat|kubrow/.test(normalizedQuery)) score += 4;
  if (document.kind === "community_video") {
    score += isBuildQuery ? 3 : isMechanicsQuery ? 3 : isWeaponQuery ? 2 : 1;
    if (expertCategory === "mechanics" && isMechanicsQuery) score += 6;
    if (expertCategory === "builds" && isBuildQuery) score += 6;
    if (expertCategory === "weapons" && isWeaponQuery) score += 6;
    if (expertCategory === "weapons" && isBuildQuery && isWeaponQuery) score += 3;
  }
  if (document.kind === "community_guide") score += /defense|défense|team|équipe|map|carte|wave|vague|helminth|nuker|buffer|warframe|guide|farm|endo|aya/.test(normalizedQuery) ? 5 : 1;
  if (document.kind === "community_build" && isBuildQuery) score += 7;
  if (kindText && facetText.includes(kindText)) score += 1;
  return score;
}

export function retrieveRagEvidence(input: RagQueryInput, limit = 8): RagEvidence[] {
  const facets = inferFacets(input); const facetText = normalize(facets.join(" ")); const queryTokens = new Set(tokens(facets.join(" ")));
  return getDocuments().map(document => ({ document, score: scoreDocument(document,input,queryTokens,facetText) })).filter(result => result.score > 0).sort((a,b) => b.score - a.score || a.document.name.localeCompare(b.document.name)).slice(0,limit).map(({document,score}) => ({id:document.id,kind:document.kind,name:document.name,text:document.text,score,source:document.source || sourceFor(document.record || document),sourceUrl:document.sourceUrl || sourceUrlFor(document.record || document),validationStatus:(document as any).validationStatus,expertCategory:document.expertCategory || document.record?.expertCategory,creator:document.creator || document.record?.creator}));
}

function compactEvidenceText(text: string, maxChars = 1800): string { if (text.length <= maxChars) return text; return `${text.slice(0,maxChars).trim()}\n[… preuve abrégée pour réduire la latence …]`; }

export function buildRagContext(input: RagQueryInput): { evidence: RagEvidence[]; instructions: string } {
  const evidence = retrieveRagEvidence(input,5);
  const sourceLines = evidence.map((item,index) => `[${index+1}] ${item.name} — ${item.source}${item.expertCategory ? ` — expertise: ${item.expertCategory}` : ""}${item.validationStatus ? ` — statut: ${item.validationStatus}` : ""}${item.sourceUrl ? ` — ${item.sourceUrl}` : ""}`).join("\n");
  const evidenceText = evidence.map((item,index) => `\n[EVIDENCE ${index+1}]\n${compactEvidenceText(item.text)}`).join("\n");
  const highLevelBuildPolicy = input.language === "fr"
    ? `\n\n[POLITIQUE BUILD HAUT NIVEAU — OBLIGATOIRE]\n- À Steel Path / niveau 200+, ne mets PAS Vitality, Adaptation ou des mods de tanking génériques par réflexe. Ils ne sont justifiés que si la Warframe, le mode de survie ou la stratégie les exploite réellement.\n- Priorise d'abord les mécanismes propres à la Warframe, le contrôle, l'invulnérabilité/Overguard, le bouclier/Shield-gating si pertinent, l'énergie, la portée/durée/force selon les capacités, puis les dégâts et la synergie des armes.\n- Un slot de mod doit avoir une justification concrète. Pas de remplissage avec des mods défensifs génériques.\n- Pour une demande de build, fournis une configuration exploitable et précise, pas seulement une liste de conseils.\n- Termine la recommandation par un bloc `json:recommendation` valide, avec au minimum `mods` (tableau de `{name,rank}`) et, si connu, `aura`, `exilus`, `arcanes`, `archonShards`, `primary`, `companion`. Le JSON doit être séparé de l'explication.\n- Les noms de mods, armes, Warframes, arcanes et compagnons doivent provenir des preuves récupérées ou du contexte Builder. Ne crée aucun nom.\n- Les builds communautaires servent de références/meta, jamais de vérité officielle.\n`
    : `\n\n[HIGH-LEVEL BUILD POLICY — MANDATORY]\n- At Steel Path / level 200+, do NOT add Vitality, Adaptation or generic tank mods by reflex. They are justified only when the Warframe, survival mode or strategy actually benefits from them.\n- Prioritize the Warframe's own mechanics, control, invulnerability/Overguard, shield-gating when relevant, energy, range/duration/strength according to abilities, then weapon damage and synergies.\n- Every mod slot needs a concrete reason. Do not fill slots with generic defensive mods.\n- For a build request, provide an actionable precise configuration, not only general advice.\n- End the recommendation with a valid `json:recommendation` block containing at least `mods` (array of `{name,rank}`) and, when known, `aura`, `exilus`, `arcanes`, `archonShards`, `primary`, `companion`. Keep the JSON separate from the explanation.\n- Mod, weapon, Warframe, arcane and companion names must come from retrieved evidence or Builder context. Never invent names.\n- Community builds are meta references, never official truth.\n`;
  const instructions = input.language === "fr"
    ? `Utilise uniquement les éléments de preuve ci-dessous pour les faits spécifiques. Ne transforme pas une recommandation communautaire en donnée officielle. Ne fabrique jamais une statistique absente. Pour les chiffres finaux, fais confiance au snapshot calculé par le Builder. Si une donnée est absente ou marquée à revoir, dis-le explicitement. Cite les sources avec leur numéro.${highLevelBuildPolicy}\nSources récupérées:\n${sourceLines}\n${evidenceText}`
    : `Use only the evidence below for item-specific facts. Do not present a community recommendation as an official value. Never invent a missing statistic. For final numbers, trust the Builder calculation snapshot. If data is missing or requires review, say so explicitly. Cite sources by number.${highLevelBuildPolicy}\nRetrieved sources:\n${sourceLines}\n${evidenceText}`;
  return { evidence, instructions };
}

export function getRagDiagnostics() { const documents = getDocuments(); return { documents: documents.length, byKind: documents.reduce<Record<string,number>>((result,document) => { result[document.kind] = (result[document.kind] || 0) + 1; return result; }, {}) }; }
