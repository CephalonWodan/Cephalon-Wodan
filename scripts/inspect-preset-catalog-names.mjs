import fs from "node:fs";

const data = JSON.parse(fs.readFileSync(new URL("../client/src/lib/warframe-data-full.json", import.meta.url), "utf8"));
const groups = {
  warframes: data.warframes || [],
  mods: data.mods || [],
  arcanes: data.arcanes || [],
};
const terms = ["Wisp", "Revenant", "Torid", "Latron", "Power", "Puissance", "Augur", "Reservoir", "Réservoir", "Blind Rage", "Colère", "Amar", "Hatred", "Continuity", "Intensify", "Vitality", "Vitalité", "Adaptation", "Energize", "Energisant", "Mue", "Mote", "Shred", "Split", "Point Strike", "Vital Sense", "Tir", "Critique", "Force", "Flow", "Flux", "Arcane", "Aptitude", "Péroxydation", "Furtive", "Précise", "Vile", "Hunter", "Chasseur", "Drain"];
for (const [group, items] of Object.entries(groups)) {
  const hits = items.map(item => item.name).filter(name => terms.some(term => name.toLowerCase().includes(term.toLowerCase())));
  console.log(`\n${group.toUpperCase()}`);
  console.log(hits.join("\n"));
}
