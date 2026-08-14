import fs from "node:fs";

const rawDataPath = "/home/ubuntu/warframe-set-builder/client/src/lib/relics-wfcd.json";
if (!fs.existsSync(rawDataPath)) {
  console.error("Fichier source WFCD introuvable.");
  process.exit(1);
}

const rawText = fs.readFileSync(rawDataPath, "utf8");
const rawRelics = JSON.parse(rawText);

const normalizedRelics = rawRelics.map((r, index) => {
  const name = r.name || `Relic ${index + 1}`;
  const parts = name.split(" ");
  const era = ["Lith", "Meso", "Neo", "Axi", "Requiem"].includes(parts[0]) ? parts[0] : "Lith";
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, "-");

  const rewards = (r.rewards || []).map(rew => ({
    itemName: rew.item?.name || rew.itemName || "Unknown Prime Part",
    rarity: rew.rarity || "Common",
    chance: typeof rew.chance === "number" ? rew.chance : 25.33
  }));

  return {
    id,
    era,
    name,
    state: r.state || "Radiant",
    rewards
  };
});

fs.writeFileSync("/home/ubuntu/warframe-set-builder/client/src/lib/relics-data.json", JSON.stringify(normalizedRelics, null, 2));
console.log(`Conversion réussie : ${normalizedRelics.length} reliques authentiques WFCD normalisées.`);
