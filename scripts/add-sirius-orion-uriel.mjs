import fs from "node:fs";

const filePath = "client/src/lib/warframe-data-full.json";
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

const additions = [
  {
    id: "sirius-orion",
    name: "Sirius & Orion",
    isPrime: false,
    role: "Support",
    health: 475,
    shield: 355,
    armor: 160,
    energy: 200,
    mastery: 0,
    abilities: ["Coronal Ejection", "Jade Stars", "Light's Sanctuary", "Celestial Clash"],
    description: "Wield the power of the stars in a constant battle for supremacy. The dueling sons, Sirius & Orion, occupy the space of a single Warframe, jockeying for position to rain cosmic destruction upon foes.",
    rarity: "rare",
    imageUrl: "https://wiki.warframe.com/images/SiriusLargePortrait.png?ec3e7",
    polarities: ["vazarin", "naramon", "any"],
    aura: "vazarin",
  },
  {
    id: "uriel",
    name: "Uriel",
    isPrime: false,
    role: "Damage / Crowd Control",
    health: 566,
    shield: 566,
    armor: 105,
    energy: 100,
    mastery: 0,
    abilities: ["Infernalis", "Remedium", "Demonium", "Brimstone"],
    description: "To fight as the Heretic of Xata is to have demons at your back. Uriel incinerates foes with searing brimstone, and commands three fiendish summons to do his devil's work.",
    rarity: "rare",
    imageUrl: "https://wiki.warframe.com/images/UrielLargePortrait.png?51357",
    polarities: ["naramon", "vazarin"],
    aura: "madurai",
  },
];

const byId = new Map(data.warframes.map((warframe) => [warframe.id, warframe]));
for (const warframe of additions) byId.set(warframe.id, warframe);
data.warframes = [...byId.values()];
fs.writeFileSync(filePath, JSON.stringify(data));
console.log(`Catalogue mis à jour : ${data.warframes.length} Warframes.`);
console.log(additions.map(({ id, name }) => `${id} — ${name}`).join("\n"));
