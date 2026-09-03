// Collect public community guides from curated Warframe expert sites.
// Pages are indexed as community references, never as official game data.
import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const root = process.cwd();
const outputPath = path.join(root, "data/community-guides.json");
const sources = [
  { id: "wfpedia", name: "WFPedia", indexUrl: "https://www.wfpedia.com/blog-home/", host: "www.wfpedia.com", category: "community_guide" },
  { id: "pandaahh", name: "Pandaahh", indexUrl: "https://warframe.pandaahh.fr/fr/guides", host: "warframe.pandaahh.fr", category: "community_guide" },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "WarframeCodexBot/1.0", Accept: "text/html,application/xhtml+xml" } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return get(new URL(response.headers.location, url).href).then(resolve, reject);
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => response.statusCode === 200 ? resolve(body) : reject(new Error(`HTTP ${response.statusCode}`)));
    }).on("error", reject);
  });
}

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'");
}

function stripHtml(value) {
  return decode(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function absoluteUrl(href, base) {
  try { return new URL(decode(href), base).href; } catch { return null; }
}

function linksFrom(html, source) {
  const links = [];
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const url = absoluteUrl(match[1], source.indexUrl);
    if (!url || new URL(url).hostname !== source.host) continue;
    const pathname = new URL(url).pathname;
    if (url === source.indexUrl || pathname.includes("/changelog") || pathname.includes("/contact") || pathname.includes("/privacy")) continue;
    if (source.id === "wfpedia" && !pathname.includes("/")) continue;
    links.push(url.split("#")[0]);
  }
  return [...new Set(links)].slice(0, 80);
}

function titleFrom(html, fallback) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return stripHtml(h1 || title || fallback).replace(/\s+/g, " ").trim();
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
  return decode(html.match(re)?.[1] || "");
}

async function collectSource(source) {
  const index = await get(source.indexUrl);
  const urls = linksFrom(index, source);
  const rows = [];
  for (const url of urls) {
    try {
      const html = await get(url);
      const text = stripHtml(html);
      if (text.length < 300) continue;
      rows.push({
        id: `${source.id}:${Buffer.from(url).toString("base64url").slice(0, 32)}`,
        name: titleFrom(html, url),
        text: `Type: community_guide\nSource: ${source.name}\nURL: ${url}\nDescription: ${extractMeta(html, "description")}\nContenu: ${text.slice(0, 50000)}`,
        source: `Guide communautaire — ${source.name}`,
        sourceUrl: url,
        sourceType: "community_guide",
        expertCategory: "community_guide",
        validationStatus: "community_reference",
        publishedAt: extractMeta(html, "article:published_time") || undefined,
      });
    } catch (error) {
      console.warn(`[GUIDES] ${source.name}: ${url} — ${error.message}`);
    }
  }
  return rows;
}

async function main() {
  const documents = [];
  for (const source of sources) {
    try { documents.push(...await collectSource(source)); }
    catch (error) { console.warn(`[GUIDES] ${source.name}: ${error.message}`); }
  }
  const unique = [...new Map(documents.map(item => [item.sourceUrl, item])).values()];
  const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), sourceCount: sources.length, documentCount: unique.length, documents: unique };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`[GUIDES] ${unique.length} guides communautaires collectés.`);
}

main().catch(error => { console.error("[GUIDES] Échec :", error); process.exitCode = 1; });
