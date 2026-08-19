import fs from "node:fs";

const helminthSource = fs.readFileSync(new URL("../client/src/lib/helminth-data.ts", import.meta.url), "utf8");
const builderSource = fs.readFileSync(new URL("../client/src/pages/SetBuilder.tsx", import.meta.url), "utf8");

const abilityCount = (helminthSource.match(/\{ id: /g) || []).length;
const requiredBuffIds = ["eclipse", "roar", "xatas-whisper"];
const requiredTargets = [
  'warframe: "chroma", ability: "vex armor"',
  'warframe: "cyte-09", ability: "resupply"',
  'warframe: "mirage", ability: "eclipse"',
  'warframe: "octavia", ability: "amp"',
  'warframe: "oraxia", ability: "silken stride"',
  'warframe: "rhino", ability: "roar"',
  'warframe: "temple", ability: "ripper\'s wail"',
  'warframe: "uriel", ability: "demonium"',
  'warframe: "xaku", ability: "xata\'s whisper"',
];

if (abilityCount < 40) throw new Error(`Catalogue Helminth incomplet: ${abilityCount} entrées détectées.`);
for (const id of requiredBuffIds) {
  if (!helminthSource.includes(`damageBuffId: "${id}"`)) throw new Error(`Buff restreint absent: ${id}`);
}
for (const target of requiredTargets) {
  if (!helminthSource.includes(target)) throw new Error(`Cible officielle absente: ${target}`);
}
if (!builderSource.includes("getNativeAbilityEntries")) throw new Error("Le fallback des capacités natives est absent.");
if (!builderSource.includes("validateHelminthRestriction(ability.id, wfName, nativeAbilityName)")) throw new Error("La sélection ne valide pas la capacité native ciblée.");
if (!builderSource.includes("Remplacer cette compétence")) throw new Error("Le sélecteur de slot natif est absent.");

console.log(JSON.stringify({ abilityCount, restrictedBuffs: requiredBuffIds.length, officialTargets: requiredTargets.length, nativeSlotSelector: true }, null, 2));
