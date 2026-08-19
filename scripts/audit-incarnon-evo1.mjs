import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("client/src/lib/incarnon-data.json", "utf8"));
const withPerks = data.filter((entry) => entry.evolutions.find((e) => e.tier === 1)?.perks?.length);
const withActivation = data.filter((entry) => entry.evolutions.find((e) => e.tier === 1)?.activation);
console.log(JSON.stringify({ total: data.length, withEvolution1Perks: withPerks.map((entry) => ({ weapon: entry.weapon, perks: entry.evolutions.find((e) => e.tier === 1).perks })), withActivationCount: withActivation.length }, null, 2));
