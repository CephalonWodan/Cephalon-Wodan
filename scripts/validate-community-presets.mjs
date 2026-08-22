import fs from "node:fs";

const data = JSON.parse(fs.readFileSync(new URL("../client/src/lib/warframe-data-full.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../client/src/lib/community-presets.ts", import.meta.url), "utf8");
const catalog = {
  warframes: new Set((data.warframes || []).map(item => item.name.toLowerCase())),
  weapons: new Set((data.weapons || []).map(item => item.name.toLowerCase())),
  mods: new Set((data.mods || []).map(item => item.name.toLowerCase())),
  arcanes: new Set((data.arcanes || []).map(item => item.name.toLowerCase())),
  shards: new Set((data.archonShards || []).map(item => item.name.toLowerCase())),
};
const targetItems = [...source.matchAll(/targetItemName:\s*"([^"]+)"/g)].map(match => match[1]);
const presetMods = [
  ...[...source.matchAll(/(?:auraName|exilusName):\s*"([^"]+)"/g)].map(match => match[1]),
  ...[...source.matchAll(/modNames:\s*\[([^\]]*)\]/g)].flatMap(match => [...match[1].matchAll(/"([^"]+)"/g)].map(item => item[1])),
];
const presetArcanes = [...source.matchAll(/arcaneNames:\s*\[([^\]]*)\]/g)].flatMap(match => [...match[1].matchAll(/"([^"]+)"/g)].map(item => item[1]));
const shardFields = [...source.matchAll(/shardName:\s*"([^"]+)"/g)].map(match => match[1]);
const missing = {
  targetItems: targetItems.filter(name => !catalog.warframes.has(name.toLowerCase()) && !catalog.weapons.has(name.toLowerCase())),
  mods: [...new Set(presetMods.filter(name => !catalog.mods.has(name.toLowerCase())))],
  arcanes: [...new Set(presetArcanes.filter(name => !catalog.arcanes.has(name.toLowerCase())))],
  shards: [...new Set(shardFields.filter(name => !catalog.shards.has(name.toLowerCase())))],
};
console.log(JSON.stringify({
  presetCount: (source.match(/^\s+id: "preset-/gm) || []).length,
  missing,
  status: Object.values(missing).every(values => values.length === 0) ? "valid" : "invalid",
}, null, 2));
if (Object.values(missing).some(values => values.length > 0)) process.exitCode = 1;
