import fs from "node:fs";

const data = JSON.parse(fs.readFileSync(new URL("../client/src/lib/warframe-data-full.json", import.meta.url), "utf8"));
const catalog = {
  warframes: (data.warframes || []).map(item => item.name),
  mods: (data.mods || []).map(item => item.name),
  arcanes: (data.arcanes || []).map(item => item.name),
};
const wanted = {
  warframes: ["Wisp", "Revenant", "Torid", "Latron"],
  mods: ["Power Donation", "Fused Reservoir", "Blind Rage", "Augur Reach", "Augur Secrets", "Amar's Hatred", "Primed Continuity", "Archon Intensify", "Transient Fortitude", "Augur Message", "Augur Secrets", "Umbral Intensify", "Growing Power", "Power Drift", "Vigilante Pursuit", "Vigilante Armaments", "Split Chamber", "Galvanized Chamber", "Critical Delay", "Point Strike", "Vital Sense", "Galvanized Aptitude", "Malignant Force", "Vile Acceleration", "Hunter Munitions", "Primed Shred", "Tactical Pump", "Hammer Shot", "Critical Deceleration", "Galvanized Scope", "Galvanized Aptitude"],
  arcanes: ["Arcane Agility", "Arcane Guardian", "Arcane Avenger", "Arcane Energize", "Arcane Primary Charger", "Primary Merciless", "Primary Deadhead", "Primary Dexterity"],
};
for (const [group, queries] of Object.entries(wanted)) {
  console.log(`\n${group.toUpperCase()}`);
  for (const query of queries) {
    const exact = catalog[group].find(name => name.toLowerCase() === query.toLowerCase());
    const close = catalog[group].filter(name => name.toLowerCase().includes(query.toLowerCase().split(" ")[0])).slice(0, 8);
    console.log(`${query} => ${exact || "MISSING"}${exact ? "" : ` | proches: ${close.join(", ")}`}`);
  }
}
