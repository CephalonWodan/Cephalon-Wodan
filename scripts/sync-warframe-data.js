// =============================================================================
// WARFRAME SET BUILDER — synchronisation Wiki contrôlée
// =============================================================================
// Les valeurs sont extraites du Wiki lorsqu'elles existent. Aucune statistique
// par défaut n'est fabriquée. Les champs absents restent absents et l'item est
// marqué review_required afin que la PR ne masque pas une donnée incomplète.

import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, "client", "public", "assets", "wiki");
const DATA_DIR = path.join(ROOT, "data");
const INPUT_PATH = path.join(DATA_DIR, "data-sync-input.json");
const STATE_PATH = path.join(DATA_DIR, "wiki-sync-state.json");
const ENRICHMENT_PATH = path.join(DATA_DIR, "wiki-enrichment.json");
const REPORT_PATH = path.join(ROOT, "data-sync-report.json");
const WIKI_API = "https://wiki.warframe.com/api.php";
const USER_AGENT = "WarframeSetBuilderBot/3.0 (+https://github.com/CephalonWodan/Cephalon-Wodan)";

fs.mkdirSync(ASSETS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

function get(url, binary = false) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "User-Agent": USER_AGENT, Accept: "*/*" } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        get(new URL(response.headers.location, url).href, binary).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(binary ? buffer : buffer.toString("utf8"));
      });
    });
    request.setTimeout(30000, () => request.destroy(new Error(`Timeout for ${url}`)));
    request.on("error", reject);
  });
}

function text(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function number(value) {
  const match = text(value).replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function percentage(value) {
  const parsed = number(value);
  if (parsed === null) return null;
  return text(value).includes("%") ? parsed / 100 : parsed > 1 ? parsed / 100 : parsed;
}

function fileSlug(value) {
  return text(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || "wiki-item";
}

function parseInfobox(wikitext) {
  const stats = {};
  const rows = [...String(wikitext).matchAll(/\|\s*([^=\n]+?)\s*=\s*([^\n|]+)/g)];
  const fields = [
    ["baseDamage", /damage|totaldamage|dégât|dégâts/i, number],
    ["critChance", /criticalchance|critchance|chancecritique/i, percentage],
    ["critMultiplier", /criticalmultiplier|critmultiplier|multiplicateurcritique/i, number],
    ["statusChance", /statuschance|chanceofstatus|chancedestatut/i, percentage],
    ["fireRate", /firerate|attackspeed|cadence|vitesseattaque/i, number],
    ["health", /health|santé|vie/i, number],
    ["shield", /shield|bouclier/i, number],
    ["armor", /armor|armour|armure/i, number],
    ["energy", /energy|énergie/i, number],
  ];
  for (const match of rows) {
    const key = match[1].replace(/[^a-zA-ZÀ-ÿ]/g, "");
    const value = text(match[2]);
    for (const [field, matcher, converter] of fields) {
      if (matcher.test(key) && stats[field] === undefined) {
        const parsed = converter(value);
        if (parsed !== null) stats[field] = parsed;
      }
    }
  }
  return stats;
}

function isImage(buffer) {
  const png = buffer?.subarray(0, 8)?.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = buffer?.[0] === 255 && buffer?.[1] === 216 && buffer?.[2] === 255;
  return Boolean(buffer && buffer.length > 64 && (png || jpg));
}

async function cacheImage(url, title) {
  if (!url) return { url: null, status: "missing" };
  const extension = /\.jpe?g(?:\?|$)/i.test(url) ? "jpg" : "png";
  const filename = `${fileSlug(title)}.${extension}`;
  const localPath = path.join(ASSETS_DIR, filename);
  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 64) return { url: `/assets/wiki/${filename}`, status: "cached" };
  try {
    const buffer = await get(url, true);
    if (!isImage(buffer)) return { url: null, status: "invalid" };
    fs.writeFileSync(localPath, buffer);
    return { url: `/assets/wiki/${filename}`, status: "downloaded" };
  } catch (error) {
    console.warn(`[ASSET] ${title}: ${error.message}`);
    return { url: null, status: "error" };
  }
}

async function validateImageWithVision(imageUrl, itemName, category) {
  const apiKey = process.env.IMAGE_VALIDATION_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || !imageUrl) return { status: "not_configured", confidence: null };
  const endpoint = `${(process.env.IMAGE_VALIDATION_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.IMAGE_VALIDATION_MODEL || "gpt-5-mini",
        messages: [{ role: "user", content: [
          { type: "text", text: `Classify this Warframe Wiki image for item "${itemName}" in category "${category}". Return JSON only with {"matchesItem": boolean, "confidence": number, "reason": string}. Do not infer stats.` },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        ] }],
        max_completion_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) return { status: "error", confidence: null };
    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    const result = typeof raw === "string" ? JSON.parse(raw) : {};
    const confidence = Number(result.confidence);
    if (result.matchesItem === true && Number.isFinite(confidence) && confidence >= 0.8) return { status: "validated", confidence };
    if (result.matchesItem === false) return { status: "rejected", confidence: Number.isFinite(confidence) ? confidence : null };
    return { status: "review_required", confidence: Number.isFinite(confidence) ? confidence : null };
  } catch (error) {
    console.warn(`[VISION] ${itemName}: ${error.message}`);
    return { status: "error", confidence: null };
  }
}

async function enrichFromWiki(name, category = "unknown") {
  const searchParams = new URLSearchParams({ action: "query", list: "search", srsearch: name, srnamespace: "0", srlimit: "5", format: "json", origin: "*" });
  const search = JSON.parse(await get(`${WIKI_API}?${searchParams}`));
  const hits = search?.query?.search || [];
  const hit = hits.find(item => item.title.toLowerCase() === name.toLowerCase()) || hits[0];
  if (!hit) return null;

  const pageParams = new URLSearchParams({
    action: "query", titles: hit.title, prop: "pageimages|extracts|revisions", rvprop: "content", rvslots: "main",
    exintro: "1", explaintext: "1", pithumbsize: "800", format: "json", origin: "*",
  });
  const response = JSON.parse(await get(`${WIKI_API}?${pageParams}`));
  const page = Object.values(response?.query?.pages || {})[0] || {};
  const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || "";
  const image = await cacheImage(page.thumbnail?.source || page.original?.source || null, hit.title);
  const vision = await validateImageWithVision(image.url, hit.title, category);
  return {
    title: hit.title,
    wikiUrl: `https://wiki.warframe.com/w/${encodeURIComponent(hit.title.replaceAll(" ", "_"))}`,
    description: page.extract || "",
    stats: parseInfobox(wikitext),
    imageUrl: image.url,
    imageStatus: image.status,
    fieldsFound: Object.keys(parseInfobox(wikitext)),
    validationStatus: vision.status === "validated" ? "validated" : vision.status === "rejected" ? "rejected" : "review_required",
    visionValidation: vision,
    source: "Warframe Wiki API",
  };
}

function inputItems() {
  if (!fs.existsSync(INPUT_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  const values = Array.isArray(raw) ? raw : Object.values(raw).flat();
  return values.map(item => typeof item === "string" ? { name: item } : item).filter(item => item?.name);
}

async function mapWithConcurrency(items, worker, concurrency = 8) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function consume() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => consume()));
  return results;
}

async function run() {
  const items = [...new Map(inputItems().map(item => [item.name.toLowerCase(), item])).values()];
  const results = await mapWithConcurrency(items, async item => {
    console.log(`[WIKI] Recherche : ${item.name}`);
    try {
      const enriched = await enrichFromWiki(item.name, item.category || "unknown");
      return { name: item.name, category: item.category || "unknown", ...(enriched || { validationStatus: "review_required", source: "not_found", fieldsFound: [], imageStatus: "missing" }) };
    } catch (error) {
      return { name: item.name, category: item.category || "unknown", validationStatus: "review_required", source: "wiki_request_failed", fieldsFound: [], imageStatus: "error", error: error.message };
    }
  }, Number(process.env.SYNC_CONCURRENCY || 8));
  fs.writeFileSync(ENRICHMENT_PATH, JSON.stringify(results, null, 2));
  fs.writeFileSync(STATE_PATH, JSON.stringify(Object.fromEntries(results.map(item => [item.name.toLowerCase(), item])), null, 2));
  const report = {
    timestamp: new Date().toISOString(), source: "Warframe Wiki API", status: "success", processedCount: results.length,
    validatedCount: results.filter(item => item.validationStatus === "validated").length,
    rejectedCount: results.filter(item => item.validationStatus === "rejected").length,
    reviewRequiredCount: results.filter(item => item.validationStatus === "review_required").length,
    visionValidatedCount: results.filter(item => item.visionValidation?.status === "validated").length,
    imagesDownloaded: results.filter(item => item.imageStatus === "downloaded").length,
    imagesCached: results.filter(item => item.imageStatus === "cached").length,
    itemsWithStats: results.filter(item => item.fieldsFound?.length).length, processedItems: results,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`[SYNC] ${results.length} items, ${report.itemsWithStats} fiches avec stats, ${report.imagesDownloaded} images téléchargées.`);
}

run().catch(error => { console.error("[SYNC] Échec fatal :", error); process.exitCode = 1; });

