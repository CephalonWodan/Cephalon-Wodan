import { isDamageBuffAbility, validateHelminthRestriction } from "../client/src/lib/helminth-data";

type Case = {
  label: string;
  abilityId: string;
  warframe: string;
  native: string;
  allowed: boolean;
};

const cases: Case[] = [
  { label: "Roar sur Vex Armor", abilityId: "rhino-roar", warframe: "Chroma", native: "Vex Armor", allowed: true },
  { label: "Roar sur une autre compétence", abilityId: "rhino-roar", warframe: "Chroma", native: "Spectral Scream", allowed: false },
  { label: "Eclipse sur cible officielle", abilityId: "mirage-eclipse", warframe: "Mirage", native: "Eclipse", allowed: true },
  { label: "Xata sur cible officielle", abilityId: "xaku-xata-s-whisper", warframe: "Xaku", native: "Xata's Whisper", allowed: true },
  { label: "Xata sur slot non autorisé", abilityId: "xaku-xata-s-whisper", warframe: "Xaku", native: "Grasp of Lohk", allowed: false },
  { label: "Alias historique Xata's Whisper", abilityId: "Xata's Whisper", warframe: "Xaku", native: "Xata's Whisper", allowed: true },
  { label: "Cible officielle Cyte-09", abilityId: "eclipse", warframe: "Cyte-09", native: "Resupply", allowed: true },
];

if (!isDamageBuffAbility("xaku-xata-s-whisper")) throw new Error("Xata's Whisper n'est pas reconnu comme buff de dégâts.");
for (const testCase of cases) {
  const result = validateHelminthRestriction(testCase.abilityId, testCase.warframe, testCase.native);
  if (result.allowed !== testCase.allowed) {
    throw new Error(`${testCase.label}: attendu ${testCase.allowed}, reçu ${result.allowed}. ${result.reason || ""}`);
  }
}
console.log(JSON.stringify({ passed: cases.length, damageBuffAlias: true }, null, 2));
