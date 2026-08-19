import { WEAPONS } from "../client/src/lib/warframe-data";
import { createIncarnonSelection, getIncarnonBonus, getIncarnonEvolution, getIncarnonProfile } from "../client/src/lib/incarnon-data";

const torid = WEAPONS.find(weapon => /torid/i.test(weapon.name));
const magistar = WEAPONS.find(weapon => /magistar/i.test(weapon.name));
if (!torid || !magistar) throw new Error("Armes de vérification introuvables dans le dataset");
const toridProfile = getIncarnonProfile(torid);
const magistarProfile = getIncarnonProfile(magistar);
if (!toridProfile || !magistarProfile) throw new Error("Profils Incarnon non résolus");
const toridSelection = { ...createIncarnonSelection(toridProfile), active: true };
const toridBonus = getIncarnonBonus(toridProfile, toridSelection);
const magistarEvolutionOne = getIncarnonEvolution(magistarProfile, 1);
if (!magistarEvolutionOne) throw new Error("Évolution I Magistar absente");
console.log(JSON.stringify({
  torid: toridProfile.weapon,
  toridEvolutionOneActivation: getIncarnonEvolution(toridProfile, 1)?.activation,
  toridEvolutionOneBonus: toridBonus,
  magistar: magistarProfile.weapon,
  magistarEvolutionOneChallenges: magistarEvolutionOne.unlockChallenges,
}, null, 2));
