import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const rawDir = path.join(dataDir, "raw", "official");
const snapshotDir = path.join(dataDir, "snapshots", "latest");
const output = path.join(dataDir, "data-sync-input.json");

const sources = [
  ["warframes", "ExportWarframes.json"], ["weapons", "ExportWeapons.json"],
  ["mods", "ExportUpgrades.json"], ["arcanes", "ExportRelicArcane.json"],
  ["companions", "ExportSentinels.json"], ["resources", "ExportResources.json"],
  ["gear", "ExportGear.json"], ["recipes", "ExportRecipes.json"],
  ["enemies", "ExportEnemies.json"], ["customs", "ExportCustoms.json"],
  ["flavor", "ExportFlavour.json"], ["keys", "ExportKeys.json"],
];

function entries(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["data", "items", "records"]) if (Array.isArray(value[key])) return value[key];
  return Object.values(value);
}
function namesFrom(value, category) {
  return entries(value).map((item) => ({
    name: item?.name || item?.uniqueName || item?.itemName || "", category,
  })).filter((item) => String(item.name).trim());
}
async function readJson(file) { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; } }

async function main() {
  const all = [];
  for (const [category, filename] of sources) {
    const payload = await readJson(path.join(rawDir, filename)) || await readJson(path.join(snapshotDir, filename));
    if (payload) {
      const rows = namesFrom(payload, category);
      all.push(...rows);
      console.log(`[OFFICIAL] ${category}: ${rows.length}`);
    } else console.warn(`[OFFICIAL] ${category}: no official or snapshot payload`);
  }
  if (!all.length) throw new Error("No official items found; refusing to create an empty sync input");
  const unique = [...new Map(all.map((item) => [String(item.name).toLowerCase(), item])).values()];
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(unique, null, 2)}\n`, "utf8");
  console.log(`[OFFICIAL] ${unique.length} unique items written to ${output}`);
}
main().catch((error) => { console.error("[OFFICIAL] Fatal error:", error); process.exitCode = 1; });
