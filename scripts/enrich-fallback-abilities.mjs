// Enrichissement officiel des capacités sans officialStats.
// Source : infoboxes des pages Ability du Wiki Warframe.
// Le script est idempotent : il ne remplace pas une statistique déjà structurée.

import fs from "node:fs";
import path from "node:path";

const datasetPath = path.resolve("client/src/lib/warframe-data-full.json");
const wikiBase = "https://wiki.warframe.com";
const requestDelayMs = 120;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const stripMarkup = value => String(value || "")
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\{\{[^{}]*\}\}/g, "")
  .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
  .replace(/'{2,}/g, "")
  .replace(/&nbsp;/gi, " ")
  .replace(/&ndash;|&mdash;/gi, "-")
  .replace(/&amp;/gi, "&")
  .replace(/\s+/g, " ")
  .trim();

const toTitle = name => String(name).trim().replace(/\s+/g, "_");
const titleVariants = title => {
  const raw = String(title).trim();
  const variants = [raw, raw.replace(/\b(Of|On|The|And|In|To)\b/g, word => word.toLowerCase())];
  return [...new Set(variants)];
};
const numericPattern = /-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+(?:\.\d+)?)+|-?\d+(?:\.\d+)?/g;
const numberFrom = value => {
  const matches = String(value || "").match(numericPattern);
  if (!matches?.length) return null;
  const last = matches[matches.length - 1].match(/-?\d+(?:\.\d+)?$/)?.[0];
  const parsed = Number(last);
  return Number.isFinite(parsed) ? parsed : null;
};
const labelCase = text => String(text || "")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/^./, char => char.toUpperCase());

function parseParams(raw) {
  const params = {};
  const regex = /^\|\s*([a-zA-Z][\w]*)\s*=\s*([\s\S]*?)(?=^\|\s*[a-zA-Z][\w]*\s*=|^\}\})/gm;
  for (const match of raw.matchAll(regex)) params[match[1].toLowerCase()] = match[2].trim();
  return params;
}

function makeLabel(clean, field, numericMatch) {
  const before = clean.slice(0, numericMatch.index).trim();
  const after = clean.slice(numericMatch.index + numericMatch[0].length).trim();
  const suffix = after.replace(/^[/\s-]+/, "").trim();
  if (before) return `${labelCase(before)}: |val1|${suffix && !/^([a-z%]|m|s|x)\b/i.test(suffix) ? ` ${suffix}` : suffix}`;
  if (suffix) return `${labelCase(suffix)}: |val1|`;
  return `${field}: |val1|`;
}

function rowsFromField(field, rawValue) {
  const cleanField = field.toLowerCase();
  const modifier = cleanField === "strength" ? "AVATAR_ABILITY_STRENGTH"
    : cleanField === "duration" ? "AVATAR_ABILITY_DURATION"
      : cleanField === "range" ? "AVATAR_ABILITY_RANGE"
        : ["energy", "cost", "efficiency"].includes(cleanField) ? "AVATAR_ABILITY_EFFICIENCY"
          : null;
  const segments = stripMarkup(rawValue).split(/\s{2,}|;|\s+-\s+/).map(s => s.trim()).filter(Boolean);
  const rows = [];
  for (const segment of segments) {
    const match = numericPattern.exec(segment);
    numericPattern.lastIndex = 0;
    if (!match) continue;
    const value = numberFrom(segment);
    if (value === null) continue;
    let label = makeLabel(segment, field, match);
    if (cleanField === "energy" || cleanField === "cost") label = "Energy Cost: |val1|";
    if (cleanField === "efficiency") label = "Efficiency: |val1|";
    rows.push({ label, modifier, values: { Val1: value } });
  }
  return rows;
}

function rowsFromMisc(rawValue) {
  const clean = stripMarkup(rawValue);
  const segments = clean.split(/;|\s{2,}/).map(s => s.trim()).filter(Boolean);
  const rows = [];
  for (const segment of segments) {
    const match = numericPattern.exec(segment);
    numericPattern.lastIndex = 0;
    if (!match) continue;
    const value = numberFrom(segment);
    if (value === null) continue;
    const after = segment.slice(match.index + match[0].length).trim();
    const before = segment.slice(0, match.index).trim();
    const label = before ? `${labelCase(before)}: |val1|${after.match(/^(%|m|s|x)\b/i)?.[1] || ""}`
      : `${labelCase(after.replace(/^(of|on|per)\s+/i, ""))}: |val1|`;
    rows.push({ label, modifier: null, values: { Val1: value } });
  }
  return rows;
}

function parseOfficialStats(raw) {
  const params = parseParams(raw);
  const rows = [];
  for (const field of ["energy", "cost", "efficiency", "strength", "duration", "range"]) {
    if (params[field]) rows.push(...rowsFromField(field, params[field]));
  }
  if (params.misc) rows.push(...rowsFromMisc(params.misc));
  const unique = new Map(rows.map(row => [`${row.label}|${row.modifier}|${row.values.Val1}`, row]));
  return [...unique.values()].slice(0, 12);
}

async function fetchRaw(title) {
  let last = { title, url: "", raw: "", status: 404 };
  for (const variant of titleVariants(title)) {
    const url = `${wikiBase}/w/${encodeURIComponent(toTitle(variant))}?action=raw`;
    const response = await fetch(url, { headers: { accept: "text/plain" } });
    const raw = response.ok ? await response.text() : "";
    last = { title: variant, url, raw, status: response.status };
    if (raw) return last;
  }
  return last;
}

async function searchTitle(name) {
  const url = `${wikiBase}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=5`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) return null;
  const data = await response.json();
  const titles = data?.query?.search?.map(item => item.title) || [];
  return titles.find(title => title.toLowerCase() === name.toLowerCase()) || titles.find(title => title.toLowerCase().includes(name.toLowerCase())) || null;
}

const data = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const report = { updated: [], unresolved: [], skipped: [] };
for (const frame of data.warframes || []) {
  for (const ability of Array.isArray(frame.abilities) ? frame.abilities : []) {
    if (!ability || typeof ability !== "object" || (Array.isArray(ability.officialStats) && ability.officialStats.length)) {
      continue;
    }
    const name = String(ability.name || "").trim();
    if (!name) continue;
    await sleep(requestDelayMs);
    let page = await fetchRaw(name);
    if (!page.raw || !/AbilityU|\|\s*(strength|duration|range|energy|cost)\s*=/i.test(page.raw)) {
      const alternate = await searchTitle(name);
      if (alternate) {
        await sleep(requestDelayMs);
        page = await fetchRaw(alternate);
      }
    }
    const officialStats = parseOfficialStats(page.raw);
    if (officialStats.length) {
      ability.officialStats = officialStats;
      ability.officialStatsSource = page.url;
      report.updated.push({ warframe: frame.name, ability: name, source: page.url, rows: officialStats.length });
    } else {
      report.unresolved.push({ warframe: frame.name, ability: name, source: page.url, status: page.status });
    }
  }
}
fs.writeFileSync(datasetPath, `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync(path.resolve("notes/fallback-ability-enrichment-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ updated: report.updated.length, unresolved: report.unresolved.length, updatedItems: report.updated, unresolvedItems: report.unresolved }, null, 2));
if (report.unresolved.length) process.exitCode = 2;
