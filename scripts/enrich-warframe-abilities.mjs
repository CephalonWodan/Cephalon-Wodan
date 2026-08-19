// WARFRAME SET BUILDER — Enrichissement officiel des capacités natives
// Source prioritaire : WFCD/warframe-items (données issues des exports du jeu)
// Statistiques : Module:Ability/data/stats du Wiki Warframe.
// Fallbacks spéciaux : noms publiés par le Wiki Warframe pour Stalker et Sevagoth's Shadow.

import fs from "node:fs";
import path from "node:path";

const datasetPath = path.resolve("client/src/lib/warframe-data-full.json");
const wfcdPath = process.env.WFCD_ALL_PATH ? path.resolve(process.env.WFCD_ALL_PATH) : null;
const wfcdUrl = process.env.WFCD_ALL_URL || "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/All.json";
const statsPath = process.env.ABILITY_STATS_RAW_PATH ? path.resolve(process.env.ABILITY_STATS_RAW_PATH) : null;
const statsUrl = process.env.ABILITY_STATS_RAW_URL || "https://wiki.warframe.com/w/Module:Ability/data/stats?action=raw";

const readText = filePath => fs.readFileSync(filePath, "utf8");
const readJson = filePath => JSON.parse(readText(filePath));
const loadJson = async (filePath, url) => {
  if (filePath) return readJson(filePath);
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText} (${url})`);
  return response.json();
};
const loadText = async (filePath, url) => {
  if (filePath) return readText(filePath);
  const response = await fetch(url, { headers: { accept: "text/plain" } });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText} (${url})`);
  return response.text();
};

function parseLuaValue(value) {
  const trimmed = value.trim().replace(/,$/, "");
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\([\\"'])/g, "$1");
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : trimmed;
}

function parseAbilityStats(luaSource) {
  const statsByUniqueName = {};
  let currentUniqueName = null;
  let currentStat = null;
  for (const rawLine of luaSource.split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, "");
    const entryMatch = line.match(/^\s*\["([^"\n]+)"\]\s*=\s*\{\s*$/);
    if (entryMatch) {
      currentUniqueName = entryMatch[1];
      statsByUniqueName[currentUniqueName] = [];
      currentStat = null;
      continue;
    }
    if (!currentUniqueName) continue;
    if (/^\s*\{\s*$/.test(line) && /^\s*\t?\t/.test(line)) {
      currentStat = {};
      continue;
    }
    if (currentStat) {
      const labelMatch = line.match(/^\s*Label\s*=\s*([\s\S]+?),?\s*$/);
      if (labelMatch) {
        currentStat.label = parseLuaValue(labelMatch[1]);
        continue;
      }
      const modifierMatch = line.match(/^\s*Modifier\s*=\s*([\s\S]+?),?\s*$/);
      if (modifierMatch) {
        currentStat.modifier = parseLuaValue(modifierMatch[1]);
        continue;
      }
      const valuesMatch = line.match(/^\s*Values\s*=\s*\{(.*)\}\s*[,]?\s*$/);
      if (valuesMatch) {
        const values = {};
        for (const pair of valuesMatch[1].matchAll(/(\w+)\s*=\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^,}\s]+)/g)) {
          values[pair[1]] = parseLuaValue(pair[2]);
        }
        currentStat.values = values;
        continue;
      }
      if (/^\s*\t\t\},?\s*$/.test(line)) {
        if (currentStat.label) statsByUniqueName[currentUniqueName].push(currentStat);
        currentStat = null;
        continue;
      }
    }
    if (/^\s*\t\},?\s*$/.test(line)) {
      currentUniqueName = null;
      currentStat = null;
    }
  }
  return statsByUniqueName;
}

const normalizeName = name => String(name).toLowerCase().replace(/\s+(prime|umbra)$/g, "").trim();
const statsKeyVariants = uniqueName => [
  uniqueName,
  uniqueName.replace(/\/Lotus\/Powersuits\/[^/]+\/Abilities\//, "/Lotus/Powersuits/PowersuitAbilities/"),
  uniqueName.replace(/\/Lotus\/Powersuits\/[^/]+\/Abilities\//, "/Lotus/Powersuits/PowersuitAbilities/").replace(/Ability$/, "Ability"),
];
const findOfficialStats = uniqueName => {
  for (const key of statsKeyVariants(uniqueName)) {
    if (Array.isArray(statsByUniqueName[key]) && statsByUniqueName[key].length) return statsByUniqueName[key];
  }
  return [];
};
const specialFallbacks = {
  "sevagoth prime's shadow": ["Embrace", "Consume", "Death's Harvest", "Reunite"],
  "sevagoth's shadow": ["Embrace", "Consume", "Death's Harvest", "Reunite"],
  stalker: ["Slash Dash", "Teleport", "Absorb", "Pull"],
};
const placeholderDescription = "Capacité native officielle — détails structurés à compléter.";

const data = readJson(datasetPath);
const sourceItems = (await loadJson(wfcdPath, wfcdUrl)).filter(item => item?.type === "Warframe" && Array.isArray(item.abilities) && item.abilities.length >= 4);
const statsByUniqueName = parseAbilityStats(await loadText(statsPath, statsUrl));
const exactSource = new Map(sourceItems.map(item => [String(item.name).toLowerCase(), item]));
const baseSource = new Map();
for (const item of sourceItems) {
  const key = normalizeName(item.name);
  const current = baseSource.get(key);
  if (!current || String(item.name).toLowerCase() === key) baseSource.set(key, item);
}

const normalizeAbility = (sourceAbility, existingAbility = null) => {
  const existing = existingAbility && typeof existingAbility === "object" ? existingAbility : {};
  const uniqueName = String(existing.uniqueName || sourceAbility.uniqueName || "");
  const officialStats = Array.isArray(existing.officialStats) && existing.officialStats.length ? existing.officialStats : findOfficialStats(uniqueName);
  return {
    ...existing,
    name: String(existing.name || sourceAbility.name),
    description: String(existing.description || sourceAbility.description || ""),
    ...(uniqueName ? { uniqueName } : {}),
    ...(sourceAbility.imageName ? { imageName: existing.imageName || String(sourceAbility.imageName) } : {}),
    ...(officialStats.length ? { officialStats } : {}),
  };
};

let enrichedFromWfcd = 0;
let enrichedExisting = 0;
let enrichedFromFallback = 0;
const unresolved = [];
for (const frame of data.warframes || []) {
  const existing = Array.isArray(frame.abilities) ? frame.abilities : [];
  const source = exactSource.get(String(frame.name).toLowerCase()) || baseSource.get(normalizeName(frame.name));
  if (source) {
    frame.abilities = source.abilities.slice(0, 4).map((ability, index) => normalizeAbility(ability, existing[index]));
    if (existing.length >= 4) enrichedExisting += 1;
    else enrichedFromWfcd += 1;
    continue;
  }
  if (existing.length >= 4) {
    frame.abilities = existing.map(ability => ({
      ...ability,
      ...(ability && typeof ability === "object" && ability.description === placeholderDescription ? { description: "" } : {}),
      officialStats: ability && typeof ability === "object" && Array.isArray(ability.officialStats) ? ability.officialStats : [],
    }));
    continue;
  }
  const fallback = specialFallbacks[String(frame.name).toLowerCase()];
  if (fallback) {
    frame.abilities = fallback.map(name => ({ name, description: "", officialStats: [] }));
    enrichedFromFallback += 1;
  } else {
    unresolved.push(frame.name);
  }
}

if (unresolved.length > 0) {
  throw new Error(`Capacités introuvables pour ${unresolved.length} Warframe(s): ${unresolved.join(", ")}`);
}

fs.writeFileSync(datasetPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({
  source: wfcdPath ? `file:${wfcdPath}` : wfcdUrl,
  statsSource: statsPath ? `file:${statsPath}` : statsUrl,
  warframes: data.warframes?.length || 0,
  enrichedFromWfcd,
  enrichedExisting,
  enrichedFromFallback,
  statEntries: Object.keys(statsByUniqueName).length,
  remainingWithoutFourAbilities: 0,
}, null, 2));
