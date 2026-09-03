import { retrieveRagEvidence } from "./rag-retriever.js";

type Language = "fr" | "en";

const FACT_PATTERNS = [
  /\b(combien|quel(?:le|s)?|quels|quelle|what|how much|how many|stats?|statistiques?|d[ée]gats?|damage|crit(?:ique|ical)?|statut|status|cadence|fire rate|polar(?:it[ée]|ity)|sant[ée]|health|bouclier|shield|armure|armor|[ée]nergie|energy|rang|max(?:imum)? rank|co[uû]t|cost|drop|tombe|tomber|obtenir|where|o[uù])\b/i,
];

const COMPLEX_PATTERNS = [
  /\b(build|configuration|configure|optimise|optimiser|optimisation|optimize|optimization|compare|compar(?:e|er)|pourquoi|why|remplace|remplacer|replace|conseille|conseiller|recommend|recommandation|steel path|niveau \d+|level \d+|survie|survival|d[ée]fense|defense|dps|synergie|synergy)\b/i,
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.%'-]+/g, " ")
    .trim();
}

function isSimpleFactQuestion(query: string): boolean {
  const normalized = normalize(query);
  if (query.length > 220) return false;
  if (COMPLEX_PATTERNS.some(pattern => pattern.test(normalized))) return false;
  return FACT_PATTERNS.some(pattern => pattern.test(normalized));
}

function findEntityEvidence(query: string, language: Language) {
  const evidence = retrieveRagEvidence({ query, language }, 8);
  const normalizedQuery = normalize(query);

  return evidence
    .filter(item => {
      const name = normalize(item.name);
      return name.length > 2 && (normalizedQuery.includes(name) || name.includes(normalizedQuery));
    })
    .sort((a, b) => b.score - a.score)[0];
}

function extractLines(text: string, labels: string[]): string[] {
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  return lines.filter(line => labels.some(label => normalize(line).startsWith(normalize(label))));
}

function formatFactAnswer(query: string, evidence: ReturnType<typeof findEntityEvidence>, language: Language): string | null {
  if (!evidence) return null;

  const normalizedQuery = normalize(query);
  const isDamage = /\b(d[ée]gats?|damage|hit|hits)\b/i.test(normalizedQuery);
  const isCrit = /\b(crit|critique|critical)\b/i.test(normalizedQuery);
  const isStatus = /\b(statut|status)\b/i.test(normalizedQuery);
  const isFireRate = /\b(cadence|fire rate|tir|rate of fire)\b/i.test(normalizedQuery);
  const isDefense = /\b(sant[ée]|health|bouclier|shield|armure|armor|[ée]nergie|energy)\b/i.test(normalizedQuery);
  const isPolarity = /\b(polarit[ée]|polarity)\b/i.test(normalizedQuery);

  let labels: string[] = [];
  if (isDamage) labels = ["Dégâts totaux", "Répartition des dégâts"];
  else if (isCrit) labels = ["Chance critique", "Multiplicateur critique"];
  else if (isStatus) labels = ["Chance de statut"];
  else if (isFireRate) labels = ["Cadence"];
  else if (isDefense) labels = ["Santé", "Bouclier", "Armure", "Énergie"];
  else if (isPolarity) labels = ["Polarité"];

  const selected = labels.length > 0 ? extractLines(evidence.text, labels) : [];
  if (selected.length === 0) return null;

  const title = language === "fr" ? `**${evidence.name}**` : `**${evidence.name}**`;
  const intro = language === "fr" ? "Donnée directe du Codex :" : "Direct Codex data:";
  return `${intro}\n\n${title}\n${selected.map(line => `- ${line}`).join("\n")}`;
}

export function tryAnswerSimpleFact(query: string, language: Language): string | null {
  if (!isSimpleFactQuestion(query)) return null;
  const evidence = findEntityEvidence(query, language);
  return formatFactAnswer(query, evidence, language);
}
