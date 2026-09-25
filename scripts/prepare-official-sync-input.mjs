import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const rawDir = path.join(dataDir, "raw", "official");
const snapshotManifestPath = path.join(dataDir, "snapshots", "latest", "official-snapshot.json");
const output = path.join(dataDir, "data-sync-input.json");

const sources = [
  { category: "warframes", file: "ExportWarframes.json" },
  { category: "weapons", file: "ExportWeapons.json" },
  { category: "mods", file: "ExportUpgrades.json" },
  { category: "arcanes", file: "ExportRelicArcane.json" },
  { category: "companions", file: "ExportSentinels.json" },
  { category: "resources", file: "ExportResources.json" },
  { category: "gear", file: "ExportGear.json" },
  { category: "recipes", file: "ExportRecipes.json" },
  { category: "enemies", file: "ExportEnemies.json" },
  { category: "customs", file: "ExportCustoms.json" },
  { category: "flavor", file: "ExportFlavour.json" },
  { category: "keys", file: "ExportKeys.json" },
];

function extractEntries(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.records)) return value.records;
  return Object.values(value);
}

function namesFrom(value, category) {
  return extractEntries(value)
    .map((item) => ({
      name: typeof item?.name === "string" ? item.name : typeof item?.uniqueName === "string" ? item.uniqueName : typeof item?.itemName === "string" ? item.itemName : "",
      category,
    }))
    .filter((item) => typeof item.name === "string" && item.name.trim().length > 0);
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(rawDir, { recursive: true });

  const all = [];
  let loadedFromOfficial = 0;

  for (const { category, file } of sources) {
    const filePath = path.join(rawDir, file);
    const payload = await readJsonIfExists(filePath);

    if (!payload) {
      const snapshotPayload = await readJsonIfExists(snapshotManifestPath);
      if (snapshotPayload?.categories?.[category]) {
        const snapshotFile = path.join(dataDir, "snapshots", "latest", snapshotPayload.categories[category].filename || file);
        const latest = await readJsonIfExists(snapshotFile);
        if (latest) {
          all.push(...namesFrom(latest, category));
          console.warn(`[OFFICIAL] ${category}: using latest snapshot fallback`);
          continue;
        }
      }

      const localFallback = path.join(root, "client", "src", "lib", "warframe-data-full.json");
      const localData = await readJsonIfExists(localFallback);
      if (localData) {
        all.push(...namesFrom(localData?.[category] ?? localData, category));
        console.warn(`[OFFICIAL] ${category}: using local dataset fallback`);
      }
      continue;
    }

    loadedFromOfficial += 1;
    all.push(...namesFrom(payload, category));
    console.log(`[OFFICIAL] ${category}: ${namesFrom(payload, category).length} items loaded`);
  }

  const unique = [...new Map(all.map((item) => [String(item.name).toLowerCase(), item])).values()];
  await fs.writeFile(output, `${JSON.stringify(unique, null, 2)}\n`, "utf8");

  console.log(`[OFFICIAL] ${unique.length} unique items prepared at ${output}. Official payloads used: ${loadedFromOfficial}`);
}

main().catch((error) => {
  console.error("[OFFICIAL] Fatal error:", error);
  process.exitCode = 1;
});
