import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const rawDir = path.join(dataDir, "raw", "official");
const snapshotDir = path.join(dataDir, "snapshots", "latest");

const sources = {
  warframes: "ExportWarframes.json",
  weapons: "ExportWeapons.json",
  upgrades: "ExportUpgrades.json",
  mods: "ExportUpgrades.json",
  arcanes: "ExportRelicArcane.json",
  sentinels: "ExportSentinels.json",
  resources: "ExportResources.json",
  drones: "ExportDrones.json",
  customs: "ExportCustoms.json",
  flavor: "ExportFlavour.json",
  keys: "ExportKeys.json",
  gear: "ExportGear.json",
  relicArcane: "ExportRelicArcane.json",
  recipes: "ExportRecipes.json",
  enemies: "ExportEnemies.json",
};

const primaryBase = "https://content.warframe.com/MobileExport/Manifest/";
const fallbackBase = "http://content.warframe.com/MobileExport/Manifest/";

function candidateUrls(filename) {
  return [
    new URL(filename, primaryBase).href,
    new URL(filename, fallbackBase).href,
  ];
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "CephalonWodan-OfficalSync/1.0" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

function isValidPayload(payload) {
  if (Array.isArray(payload)) return payload.length > 0;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return payload.data.length > 0;
    return Object.keys(payload).length > 0;
  }
  return false;
}

async function loadFromDisk(filePath) {
  try {
    return await readJsonFile(filePath);
  } catch {
    return null;
  }
}

async function resolvePayload(category, filename) {
  let lastError = null;

  for (const url of candidateUrls(filename)) {
    try {
      const payload = await fetchJson(url);
      if (!isValidPayload(payload)) {
        throw new Error(`Payload empty for ${filename}`);
      }
      return payload;
    } catch (error) {
      lastError = error;
      console.warn(`[OFFICIAL] ${category}: ${url} -> ${error.message}`);
    }
  }

  const localPath = path.join(rawDir, filename);
  const local = await loadFromDisk(localPath);
  if (local) {
    console.warn(`[OFFICIAL] ${category}: fallback to cached official snapshot ${filename}`);
    return local;
  }

  const snapshotPath = path.join(snapshotDir, filename);
  const snapshot = await loadFromDisk(snapshotPath);
  if (snapshot) {
    console.warn(`[OFFICIAL] ${category}: fallback to latest snapshot ${filename}`);
    return snapshot;
  }

  throw new Error(`Unable to fetch official Warframe export for ${category}. Last error: ${lastError?.message ?? "unknown"}`);
}

async function main() {
  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(snapshotDir, { recursive: true });

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    source: "Warframe Mobile Export official endpoints",
    categories: {},
  };

  for (const [category, filename] of Object.entries(sources)) {
    console.log(`[OFFICIAL] Loading ${category} from ${filename}`);
    const payload = await resolvePayload(category, filename);
    const targetPath = path.join(rawDir, filename);
    await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    snapshot.categories[category] = {
      filename,
      length: Array.isArray(payload) ? payload.length : Array.isArray(payload?.data) ? payload.data.length : Object.keys(payload ?? {}).length,
      source: "official",
    };
  }

  await fs.writeFile(path.join(snapshotDir, "official-snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`[OFFICIAL] Snapshot saved to ${snapshotDir}`);
}

main().catch((error) => {
  console.error("[OFFICIAL] Fatal error:", error);
  process.exitCode = 1;
});
