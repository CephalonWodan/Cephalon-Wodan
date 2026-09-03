// Collect recent public YouTube metadata for the expert community sources used by Cephalon Codex.
// The collector never downloads video files. yt-dlp enumerates the whitelisted channels;
// RSS remains a fallback for channels with a known channel id.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import https from "node:https";

const root = process.cwd();
const outputPath = path.join(root, "data/youtube-videos.json");
const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

// Curated expert sources. Pandaahh intentionally has two separate YouTube channels.
const creators = [
  { id: "MHBlacky", name: "MHBlacky", channelUrl: "https://www.youtube.com/@MHBlacky_ENG/videos", language: "en", category: "builds" },
  { id: "PANDAAHH-main", name: "PANDAAHH", channelUrl: "https://www.youtube.com/@pandaahhhhh/videos", language: "fr", category: "builds", channelLabel: "main" },
  { id: "PANDAAHH-chronicles", name: "PANDAAHH", channelUrl: "https://www.youtube.com/@pandaahh2/videos", language: "fr", category: "builds", channelLabel: "warframe_chronicles" },
  { id: "TheKengineer", name: "TheKengineer", channelUrl: "https://www.youtube.com/@TheKengineer/videos", language: "en", category: "mechanics" },
  { id: "MasterElmo", name: "Master Elmo", channelUrl: "https://www.youtube.com/@MasterElmo/videos", language: "en", category: "mechanics" },
  { id: "Endryx_ow", name: "Endryx_ow", channelUrl: "https://www.youtube.com/@Endryx_ow/videos", language: "en", category: "mechanics" },
  { id: "VuThang", name: "Vu Thang", channelUrl: "https://www.youtube.com/@vu.thang205/videos", language: "vi", category: "builds" },
  { id: "Leamxp", name: "Leamxp", channelUrl: "https://www.youtube.com/@Leamxp/videos", language: "en", category: "builds" },
  { id: "LeyzarGamingViews", name: "LeyzarGamingViews", channelUrl: "https://www.youtube.com/@LeyzarGamingViews/videos", language: "en", category: "weapons" },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "WarframeCodexBot/1.0" } }, response => {
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
    return id && publishedAt ? { id, creator: creator.name, channelId: creator.id, channelLabel: creator.channelLabel, title: value("title"), publishedAt, url: `https://www.youtube.com/watch?v=${id}`, language: creator.language, expertCategory: creator.category, sourceType: "community_video", transcriptStatus: "not_requested" } : null;
  }).filter(Boolean);
}
function fromYtDlp(creator) {
  try {
    // Do not use --dateafter here: flat-playlist enumeration does not reliably expose
    // upload_date for every entry, which can make a valid channel appear to contain 0 videos.
    // We enumerate first, then apply the cutoff ourselves from upload_date when available.
    const raw = execFileSync("yt-dlp", ["--flat-playlist", "--dump-single-json", "--playlist-end", "100", creator.channelUrl], { encoding: "utf8", timeout: 180000, maxBuffer: 30 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    const playlist = JSON.parse(raw);
    const channelId = playlist.channel_id || playlist.id || creator.id;
    return (playlist.entries || []).map(entry => {
      const publishedAt = entry.upload_date ? dateOnly(`${entry.upload_date.slice(0, 4)}-${entry.upload_date.slice(4, 6)}-${entry.upload_date.slice(6, 8)}`) : null;
      if (!entry.id || !publishedAt || publishedAt < cutoff.toISOString()) return null;
      return { id: entry.id, creator: creator.name, channelId, channelLabel: creator.channelLabel, title: entry.title || "", publishedAt, url: `https://www.youtube.com/watch?v=${entry.id}`, language: creator.language, expertCategory: creator.category, sourceType: "community_video", transcriptStatus: "not_requested" };
    }).filter(Boolean);
  } catch (error) {
    const detail = error?.stderr?.toString?.().trim().split("\n").slice(-2).join(" | ") || error?.message || "unknown error";
    console.warn(`[YOUTUBE] ${creator.name}${creator.channelLabel ? ` (${creator.channelLabel})` : ""}: yt-dlp failed: ${detail}`);
    return null;
  }
}
async function main() {
  const collected = [];
  const channelResults = [];
  for (const creator of creators) {
    const complete = fromYtDlp(creator);
    if (complete?.length) {
      collected.push(...complete);
      channelResults.push({ id: creator.id, creator: creator.name, channelLabel: creator.channelLabel || "main", status: "yt-dlp", videoCount: complete.length });
      continue;
    }
    // RSS fallback is only possible when a real channel id is configured.
    if (creator.rssChannelId) {
      try {
        const rss = fromRss({ ...creator, id: creator.rssChannelId }, await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${creator.rssChannelId}`));
        const recent = rss.filter(video => new Date(video.publishedAt) >= cutoff);
        collected.push(...recent);
        channelResults.push({ id: creator.id, creator: creator.name, channelLabel: creator.channelLabel || "main", status: "rss", videoCount: recent.length });
      } catch (error) {
        console.warn(`[YOUTUBE] ${creator.name}: ${error.message}`);
        channelResults.push({ id: creator.id, creator: creator.name, channelLabel: creator.channelLabel || "main", status: "failed", videoCount: 0 });
      }
    } else {
      channelResults.push({ id: creator.id, creator: creator.name, channelLabel: creator.channelLabel || "main", status: "failed", videoCount: 0 });
    }
  }
  const unique = Array.from(new Map(collected.filter(video => new Date(video.publishedAt) >= cutoff).map(video => [video.id, video])).values()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const output = { schemaVersion: 2, generatedAt: new Date().toISOString(), cutoff: cutoff.toISOString(), enumeration: channelResults.every(item => item.status === "yt-dlp") ? "yt-dlp" : "mixed", creatorCount: new Set(creators.map(item => item.name)).size, channelCount: creators.length, channelResults, videoCount: unique.length, videos: unique };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`[YOUTUBE] ${unique.length} vidéos récentes collectées pour ${creators.length} chaînes et ${output.creatorCount} créateurs.`);
}
main().catch(error => { console.error("[YOUTUBE] Échec :", error); process.exitCode = 1; });
