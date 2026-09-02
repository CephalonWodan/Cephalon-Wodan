// Collect recent public YouTube metadata for the community creators used by Cephalon Codex.
// The collector never downloads video files. It prefers yt-dlp for complete channel
// enumeration and falls back to public RSS feeds when yt-dlp is unavailable.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import https from "node:https";

const root = process.cwd();
const outputPath = path.join(root, "data/youtube-videos.json");
const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
const creators = [
  { id: "UCWT_Apn0qHyy_f_RFYYOGdQ", name: "MHBlacky", language: "en" },
  { id: "UCpkUJykYfhMR1v1tzhl3C0w", name: "PANDAAHH", language: "fr" },
  { id: "UCiED7CqmvQSsSHUiQ42EWbw", name: "TheKengineer", language: "en" },
  { id: "UCjzqAWqDggE2AddNzrJkBbg", name: "Unified Codex", language: "en" },
  { id: "UCaoFi-n8n2932vNrVCloZuA", name: "Endryx_ow", language: "en" },
  { id: "UC8zxYO4cpw3I0yVuGScH9Qw", name: "Lau 5040", language: "en" },
  { id: "UCI_G2b84QSBB4yF5KlFctpQ", name: "vu.thang205", language: "vi" },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "WarframeSetBuilderBot/3.0" } }, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => response.statusCode === 200 ? resolve(body) : reject(new Error(`HTTP ${response.statusCode}`)));
    }).on("error", reject);
  });
}
function xml(value) { return String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(); }
function dateOnly(value) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? null : date.toISOString(); }
function fromRss(creator, body) {
  return Array.from(body.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).map(match => {
    const entry = match[1];
    const value = tag => xml(entry.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]);
    const id = value("yt:videoId");
    const publishedAt = dateOnly(value("published"));
    return id && publishedAt ? { id, creator: creator.name, channelId: creator.id, title: value("title"), publishedAt, url: `https://www.youtube.com/watch?v=${id}`, language: creator.language, description: value("media:description") || value("description"), sourceType: "community_video", transcriptStatus: "not_requested" } : null;
  }).filter(Boolean);
}
function fromYtDlp(creator) {
  try {
    const raw = execFileSync("yt-dlp", ["--flat-playlist", "--dump-single-json", "--dateafter", cutoff.toISOString().slice(0, 10).replaceAll("-", ""), `https://www.youtube.com/channel/${creator.id}/videos`], { encoding: "utf8", timeout: 180000, maxBuffer: 20 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    const playlist = JSON.parse(raw);
    return (playlist.entries || []).map(entry => {
      const publishedAt = entry.upload_date ? dateOnly(`${entry.upload_date.slice(0, 4)}-${entry.upload_date.slice(4, 6)}-${entry.upload_date.slice(6, 8)}`) : null;
      if (!entry.id || !publishedAt) return null;
      return { id: entry.id, creator: creator.name, channelId: creator.id, title: entry.title || "", publishedAt, url: `https://www.youtube.com/watch?v=${entry.id}`, language: creator.language, description: entry.description || "", sourceType: "community_video", transcriptStatus: "not_requested" };
    }).filter(Boolean);
  } catch { return null; }
}
async function main() {
  const collected = [];
  let completeEnumeration = false;
  for (const creator of creators) {
    const complete = fromYtDlp(creator);
    if (complete?.length) { collected.push(...complete); completeEnumeration = true; continue; }
    try { collected.push(...fromRss(creator, await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${creator.id}`))); }
    catch (error) { console.warn(`[YOUTUBE] ${creator.name}: ${error.message}`); }
  }
  const unique = Array.from(new Map(collected.filter(video => new Date(video.publishedAt) >= cutoff).map(video => [video.id, video])).values()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), cutoff: cutoff.toISOString(), enumeration: completeEnumeration ? "yt-dlp" : "rss-latest-window", creatorCount: creators.length, videoCount: unique.length, videos: unique };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`[YOUTUBE] ${unique.length} vidéos récentes collectées pour ${creators.length} créateurs (${output.enumeration}).`);
}
main().catch(error => { console.error("[YOUTUBE] Échec :", error); process.exitCode = 1; });
