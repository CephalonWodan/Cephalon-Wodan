import { resolveElementalDamage } from "../client/src/lib/elemental-damage";
import type { Mod } from "../client/src/lib/warframe-data";

function mod(name: string, effect: string, selectedRank = 3, maxRank = 3): Mod {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    rarity: "rare",
    maxRank,
    selectedRank,
    polarity: "madurai",
    type: "primary",
    description: effect,
    effect,
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const blast = resolveElementalDamage([
  mod("Thermite Rounds", "+60% Heat"),
  mod("Rime Rounds", "+60% Cold"),
], 100);
assert(blast.elements.length === 1, "Heat + Cold doit produire une seule ligne");
assert(blast.elements[0].key === "blast", "Heat + Cold doit produire Blast/Explosion");
assert(blast.elements[0].name === "Explosion", "Blast doit être libellé Explosion en français");
assert(blast.elements[0].damage === 120, "Le dégât fusionné doit additionner les deux contributions");
assert(blast.elements[0].components?.join("+") === "Feu+Glace", "La composition de Blast doit être affichée");

const radiation = resolveElementalDamage([
  mod("Thermite Rounds", "+60% Heat"),
  mod("High Voltage", "+60% Electricity"),
], 100);
assert(radiation.elements[0].key === "radiation", "Heat + Electricity doit produire Radiation");

const viral = resolveElementalDamage([
  mod("Rime Rounds", "+60% Cold"),
  mod("Malignant Force", "+60% Toxin"),
], 100);
assert(viral.elements[0].key === "viral", "Cold + Toxin doit produire Viral");

const duplicateHeat = resolveElementalDamage([
  mod("Hellfire", "+60% Heat"),
  mod("Thermite Rounds", "+60% Heat"),
], 100);
assert(duplicateHeat.elements.length === 1, "Deux sources Heat doivent rester une seule ligne");
assert(duplicateHeat.elements[0].key === "heat" && duplicateHeat.elements[0].damage === 120, "Les bonus Heat doivent être cumulés");

const conversion = resolveElementalDamage([
  mod("Thermite Rounds", "+60% Heat"),
  mod("Rime Rounds", "+60% Cold"),
  mod("Elemental Conversion", "Converts all elemental damage types into Toxin"),
], 100);
assert(conversion.elements.length === 1, "Une conversion globale doit supprimer les lignes de fusion normales");
assert(conversion.elements[0].key === "toxin", "La conversion globale doit utiliser son type cible");
assert(conversion.elements[0].kind === "conversion", "La ligne convertie doit être marquée conversion");
assert(conversion.conversion?.sourceMod === "Elemental Conversion", "Le mod de conversion doit être conservé");

const partialConversion = resolveElementalDamage([
  mod("Thermite Rounds", "+60% Heat"),
  mod("Rime Rounds", "+60% Cold"),
  mod("Impact Conversion", "20% of Damage converted into Impact"),
], 100);
assert(partialConversion.elements[0].key === "blast", "Une conversion partielle non élémentaire ne doit pas désactiver la fusion");

console.log("elemental-damage-smoke: OK");
