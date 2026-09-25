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

const primaryBase = process.env.WARFRAME_EXPORT_BASE_URL || "https://content.warframe.com/MobileExport/Manifest/";
const fallbackBases = [primaryBase, "http://content.warframe.com/MobileExport/Manifest/"];

function candidateUrls(filename) {
  return [...new Set(fallbackBases.map((base) => new URL(filename, base).href))];
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "CephalonWodan-OfficialSync/1.0" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

function entryCount(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === "object") {
    for (const key of ["data", "items", "records"]) if (Array.isArray(payload[key])) return payload[key].length;
    return Object.keys(payload).length;
  }
  return 0;
}

function isValidPayload(payload) {
  return entryCount(payload) > 0;
}

async function loadFromDisk(filePath) {
  try { return await readJsonFile(filePath); } catch { return null; }
}

async function resolvePayload(category, filename) {
  let lastError;
  for (const url of candidateUrls(filename)) {
    try {
      const payload = await fetchJson(url);
      if (!isValidPayload(payload)) throw new Error(`empty payload (${entryCount(payload)} entries)`);
      return { payload, source: url };
    } catch (error) {
      lastError = error;
      console.warn(`[OFFICIAL] ${category}: ${url} -> ${error.message}`);
    }
  }

  const cached = await loadFromDisk(path.join(rawDir, filename));
  if (cached && isValidPayload(cached)) return { payload: cached, source: "raw-cache" };
  const snapshot = await loadFromDisk(path.join(snapshotDir, filename));
  if (snapshot && isValidPayload(snapshot)) return { payload: snapshot, source: "snapshot" };
  throw new Error(`No valid export for ${category}: ${lastError?.message ?? "unknown error"}`);
}

async function writeJsonAtomic(filePath, value) {
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

async function main() {
  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(snapshotDir, { recursive: true });
  const manifest = { fetchedAt: new Date().toISOString(), source: "Warframe Mobile Export", categories: {} };

  for (const [category, filename] of Object.entries(sources)) {
    console.log(`[OFFICIAL] Loading ${category} from ${filename}`);
    const { payload, source } = await resolvePayload(category, filename);
    await writeJsonAtomic(path.join(rawDir, filename), payload);
    await writeJsonAtomic(path.join(snapshotDir, filename), payload);
    manifest.categories[category] = { filename, entries: entryCount(payload), source };
  }

  await writeJsonAtomic(path.join(snapshotDir, "official-snapshot.json"), manifest);
  console.log(`[OFFICIAL] Snapshot saved: ${snapshotDir}`);
}

main().catch((error) => { console.error("[OFFICIAL] Fatal error:", error); process.exitCode = 1; });
