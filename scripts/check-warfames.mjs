import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("client/src/lib/warframe-data-full.json", "utf8"));
const names = ["Sirius", "Orion", "Sirius & Orion", "Uriel"];
const matches = data.warframes.filter((item) => names.some((name) => item.name.toLowerCase().includes(name.toLowerCase())));
const samples = data.warframes.filter((item) => !item.isPrime).slice(0, 5);
console.log(JSON.stringify({ count: data.warframes.length, matches, samples }, null, 2));
