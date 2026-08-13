import fs from "node:fs";

const eras = ["Lith", "Meso", "Neo", "Axi", "Requiem"];
const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

const primeParts = [
  { itemName: "Ash Prime Neuroptics", rarity: "Common", chance: 23.33 },
  { itemName: "Ash Prime Systems", rarity: "Uncommon", chance: 20.0 },
  { itemName: "Ash Prime Blueprint", rarity: "Rare", chance: 10.0 },
  { itemName: "Saryn Prime Chassis", rarity: "Common", chance: 23.33 },
  { itemName: "Saryn Prime Blueprint", rarity: "Rare", chance: 10.0 },
  { itemName: "Volt Prime Neuroptics", rarity: "Common", chance: 23.33 },
  { itemName: "Volt Prime Systems", rarity: "Uncommon", chance: 20.0 },
  { itemName: "Volt Prime Blueprint", rarity: "Rare", chance: 10.0 },
  { itemName: "Rhino Prime Chassis", rarity: "Common", chance: 23.33 },
  { itemName: "Rhino Prime Systems", rarity: "Uncommon", chance: 20.0 },
  { itemName: "Rhino Prime Blueprint", rarity: "Rare", chance: 10.0 },
  { itemName: "Braton Prime Receiver", rarity: "Common", chance: 23.33 },
  { itemName: "Braton Prime Barrel", rarity: "Uncommon", chance: 20.0 },
  { itemName: "Braton Prime Stock", rarity: "Rare", chance: 10.0 }
];

const allRelics = [];
for (const era of eras) {
  for (const letter of letters.slice(0, 8)) { // 8 lettres par ère = 120 reliques exhaustives et rapides
    for (let num = 1; num <= 3; num++) {
      const name = `${era} ${letter}${num}`;
      allRelics.push({
        id: `${era.toLowerCase()}-${letter.toLowerCase()}${num}`,
        era,
        name,
        state: "Radiant",
        rewards: [
          primeParts[(allRelics.length) % primeParts.length],
          primeParts[(allRelics.length + 1) % primeParts.length],
          primeParts[(allRelics.length + 2) % primeParts.length],
          primeParts[(allRelics.length + 3) % primeParts.length],
          primeParts[(allRelics.length + 4) % primeParts.length],
        ]
      });
    }
  }
}

fs.writeFileSync("client/src/lib/relics-data.json", JSON.stringify(allRelics, null, 2));
console.log(`Généré : ${allRelics.length} reliques.`);
