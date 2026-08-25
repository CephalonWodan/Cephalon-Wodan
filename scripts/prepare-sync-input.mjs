// Prepare a normalized list of item names for the Wiki enrichment job.
// The remote dataset is used for discovery only; it never overwrites the local
// calculation dataset. Failed optional sources are reported and skipped.
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const output = path.join(dataDir, "data-sync-input.json");
const sources = {
  warframes: "Warframes.json",
  weapons: "Weapons.json",
  mods: "Mods.json",
  arcanes: "Arcanes.json",
  companions: "Companions.json",
  archonShards: "ArchonShards.json",
};
const base = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/";

function namesFrom(value, category) {
  const items = Array.isArray(value) ? value : value?.data || [];
  return items
    .map(item => ({ name: item?.name || item?.uniqueName, category }))
    .filter(item => typeof item.name === "string" && item.name.trim());
}

const all = [];
for (const [category, filename] of Object.entries(sources)) {
  try {
    const response = await fetch(`${base}${filename}`, { headers: { "User-Agent": "WarframeSetBuilderBot/3.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = namesFrom(await response.json(), category);
    all.push(...items);
    console.log(`[INPUT] ${category}: ${items.length}`);
  } catch (error) {
    console.warn(`[INPUT] source ignorée ${filename}: ${error.message}`);
  }
}

if (all.length === 0) {
  try {
    const local = JSON.parse(await fs.readFile(path.join(root, "client/src/lib/warframe-data-full.json"), "utf8"));
    all.push(...namesFrom(local, "warframes"));
  } catch (error) {
    console.warn(`[INPUT] fallback local indisponible: ${error.message}`);
  }
}

const unique = [...new Map(all.map(item => [item.name.toLowerCase(), item])).values()];
await fs.mkdir(dataDir, { recursive: true });
await fs.writeFile(output, `${JSON.stringify(unique, null, 2)}\n`, "utf8");
console.log(`[INPUT] ${unique.length} items normalisés dans ${output}`);
