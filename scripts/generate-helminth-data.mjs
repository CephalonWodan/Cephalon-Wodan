import fs from "node:fs";

const wikiPath = "/home/ubuntu/upload/wiki.warframe.com_w_Helminth_Subsumable_Ability_Checklist_1787165617644.md";
const fullDataPath = "/home/ubuntu/warframe-set-builder/client/src/lib/warframe-data-full.json";
const source = fs.readFileSync(wikiPath, "utf8");
const fullData = JSON.parse(fs.readFileSync(fullDataPath, "utf8"));
const start = source.indexOf("### Subsumable Ability Checklist");
const end = source.indexOf("#### Power Scaling", start);
const section = source.slice(start, end > start ? end : start + 30000);
const rows = [];
console.error({ start, end, sectionLength: section.length });
for (const line of section.split(/\r?\n/)) {
  if (!line.startsWith("|")) continue;
  const columns = line.split("|").map(value => value.trim());
  if (columns.length < 5 || columns[1] === "Warframe" || columns[1].includes("---")) continue;
  rows.push({ warframe: columns[1], ability: columns[2], role: columns[4].replace(/\\s+/g, " ").trim(), damage: (columns[5] || "Non précisé").replace(/\\s+/g, " ").trim() });
}

const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugify = value => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escape = value => value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
const categoryFor = role => {
  const lower = role.toLowerCase();
  if (lower.includes("crowd control") || lower.includes("stealth")) return "crowd-control";
  if (lower.includes("buff") || lower.includes("damage debuff") || lower.includes("health bonus") || lower.includes("shield bonus") || lower.includes("armor bonus")) return "buff";
  if (lower.includes("damage") || lower.includes("armor strip")) return "offensive";
  if (lower.includes("healing") || lower.includes("defensive")) return "defensive";
  return "utility";
};
const abilityCost = (warframe, ability) => {
  const frame = fullData.warframes.find(item => normalize(item.name) === normalize(warframe));
  const entry = frame?.abilities?.find(item => typeof item === "object" && normalize(item.name) === normalize(ability));
  const match = typeof entry?.efficiency === "string" ? entry.efficiency.match(/(\d+(?:\.\d+)?)\s*energy/i) : null;
  return match ? Number(match[1]) : 50;
};
const records = rows.map(row => ({
  id: slugify(`${row.warframe}-${row.ability}`),
  name: row.ability,
  sourceWarframe: row.warframe,
  description: `Aptitude subsumable officielle de ${row.warframe}. Rôle : ${row.role || "utilitaire"}.`,
  energyCost: abilityCost(row.warframe, row.ability),
  category: categoryFor(row.role),
  officialRole: row.role || "Non précisé",
  damageOrStatus: row.damage || "Non précisé",
  wikiSource: "https://wiki.warframe.com/w/Helminth#Subsumable_Ability_Checklist",
}));

const header = `export interface HelminthAbility {\n  id: string;\n  name: string;\n  sourceWarframe: string;\n  description: string;\n  energyCost: number;\n  category: \"offensive\" | \"defensive\" | \"buff\" | \"utility\" | \"crowd-control\";\n  officialRole?: string;\n  damageOrStatus?: string;\n  wikiSource?: string;\n  isDamageBuff?: boolean;\n}\n\nexport const HELMINTH_ABILITIES: HelminthAbility[] = [\n`;
const recordsText = records.map((record, index) => `  { id: "${escape(record.id)}", name: "${escape(record.name)}", sourceWarframe: "${escape(record.sourceWarframe)}", description: "${escape(record.description)}", energyCost: ${record.energyCost}, category: "${record.category}", officialRole: "${escape(record.officialRole)}", damageOrStatus: "${escape(record.damageOrStatus)}", wikiSource: "${record.wikiSource}"${["eclipse", "roar", "xatas-whisper"].some(id => record.id.includes(id)) ? ", isDamageBuff: true" : ""} }${index < records.length - 1 ? "," : ""}`).join("\n");
const footer = [
  "",
  "];",
  "",
  "export interface HelminthRestrictionTarget {",
  "  warframe: string;",
  "  ability: string;",
  "}",
  "",
  "export interface HelminthRestrictionRule {",
  "  damageBuffId: string;",
  "  allowedTargets: HelminthRestrictionTarget[];",
  "}",
  "",
  "const RESTRICTED_DAMAGE_BUFF_TARGETS: HelminthRestrictionTarget[] = [",
  "  { warframe: \"chroma\", ability: \"vex armor\" },",
  "  { warframe: \"cyte-09\", ability: \"resupply\" },",
  "  { warframe: \"mirage\", ability: \"eclipse\" },",
  "  { warframe: \"octavia\", ability: \"amp\" },",
  "  { warframe: \"oraxia\", ability: \"silken stride\" },",
  "  { warframe: \"rhino\", ability: \"roar\" },",
  "  { warframe: \"temple\", ability: \"ripper's wail\" },",
  "  { warframe: \"uriel\", ability: \"demonium\" },",
  "  { warframe: \"xaku\", ability: \"xata's whisper\" },",
  "];",
  "",
  "export const HELMINTH_DAMAGE_BUFF_RESTRICTIONS: HelminthRestrictionRule[] = [",
  "  { damageBuffId: \"eclipse\", allowedTargets: RESTRICTED_DAMAGE_BUFF_TARGETS },",
  "  { damageBuffId: \"roar\", allowedTargets: RESTRICTED_DAMAGE_BUFF_TARGETS },",
  "  { damageBuffId: \"xatas-whisper\", allowedTargets: RESTRICTED_DAMAGE_BUFF_TARGETS },",
  "];",
  "",
  "function canonicalDamageBuffId(abilityId: string): string {",
  "  const found = HELMINTH_ABILITIES.find(a => a.id === abilityId);",
  "  const normalized = (found?.name || abilityId).toLowerCase().replace(/[^a-z0-9]/g, \"\");",
  "  if (normalized === \"xataswhisper\") return \"xatas-whisper\";",
  "  if (normalized === \"roar\") return \"roar\";",
  "  if (normalized === \"eclipse\") return \"eclipse\";",
  "  return normalized;",
  "}",
  "",
  "export function isDamageBuffAbility(abilityId: string): boolean {",
  "  const found = HELMINTH_ABILITIES.find(a => a.id === abilityId);",
  "  return Boolean(found?.isDamageBuff || [\"roar\", \"eclipse\", \"xatas-whisper\"].includes(canonicalDamageBuffId(abilityId)));",
  "}",
  "",
  "export function validateHelminthRestriction(abilityId: string, warframeName: string, nativeAbilityName: string): { allowed: boolean; reason?: string } {",
  "  if (!isDamageBuffAbility(abilityId)) return { allowed: true };",
  "  const normalizedWf = warframeName.trim().toLowerCase();",
  "  const normalizedNative = nativeAbilityName.trim().toLowerCase();",
  "  const canonicalId = canonicalDamageBuffId(abilityId);",
  "  const rule = HELMINTH_DAMAGE_BUFF_RESTRICTIONS.find(r => r.damageBuffId === canonicalId);", 
  "  if (!rule) return { allowed: true };",
  "  const targetMatches = rule.allowedTargets.some(target => normalizedWf.includes(target.warframe) && normalizedNative === target.ability);",
  "  if (!targetMatches) {",
  "    const targets = rule.allowedTargets.map(target => target.warframe + \" → \" + target.ability).join(', ');",
  "    return { allowed: false, reason: \"Restriction officielle : \" + abilityId + \" ne peut remplacer que l'une des capacités natives suivantes : \" + targets + \". Cela empêche de cumuler ce buff de dégâts avec une autre capacité incompatible.\" };",
  "  }",
  "  return { allowed: true };",
  "}",
].join("\n");

fs.writeFileSync("/home/ubuntu/warframe-set-builder/client/src/lib/helminth-data.ts", header + recordsText + footer);
console.log(`Generated ${records.length} official Helminth abilities.`);
