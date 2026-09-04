// Collect recent public YouTube metadata for the expert community sources used by Cephalon Codex.
// Prefer the YouTube Data API when YOUTUBE_API_KEY is configured; RSS and yt-dlp remain fallbacks.
// The previous manifest is retained as a resilience fallback when YouTube blocks extraction.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import https from "node:https";

const root = process.cwd();
const outputPath = path.join(root, "data/youtube-videos.json");
const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim() || "";

const creators = [
  { id: "MHBlacky", name: "MHBlacky", channelUrl: "https://www.youtube.com/@MHBlacky_ENG/videos", channelId: "UCWT_Apn0qHyy_f_RFYYOGdQ", language: "en", category: "builds" },
  { id: "PANDAAHH-main", name: "PANDAAHH", channelUrl: "https://www.youtube.com/@pandaahhhhh/videos", channelId: "UCpkUJykYfhMR1v1tzhl3C0w", language: "fr", category: "builds", channelLabel: "main" },
  { id: "PANDAAHH-chronicles", name: "PANDAAHH", channelUrl: "https://www.youtube.com/@pandaahh2/videos", channelId: "UCpkUJykYfhMR1v1tzhl3C0w", language: "fr", category: "builds", channelLabel: "warframe_chronicles" },
  { id: "TheKengineer", name: "TheKengineer", channelUrl: "https://www.youtube.com/@TheKengineer/videos", channelId: "UCiED7CqmvQSsSHUiQ42EWbw", language: "en", category: "mechanics" },
  { id: "MasterElmo", name: "Master Elmo", channelUrl: "https://www.youtube.com/@MasterElmo/videos", language: "en", category: "mechanics" },
  { id: "Endryx_ow", name: "Endryx_ow", channelUrl: "https://www.youtube.com/@Endryx_ow/videos", channelId: "UCaoFi-n8n2932vNrVCloZuA", language: "en", category: "mechanics" },
  { id: "VuThang", name: "Vu Thang", channelUrl: "https://www.youtube.com/@vu.thang205/videos", channelId: "UCI_G2b84QSBB4yF5KlFctpQ", language: "vi", category: "builds" },
  { id: "Leamxp", name: "Leamxp", channelUrl: "https://www.youtube.com/@Leamxp/videos", language: "en", category: "builds" },
  { id: "LeyzarGamingViews", name: "LeyzarGamingViews", channelUrl: "https://www.youtube.com/@LeyzarGamingViews/videos", channelId: "UCXeubDV2dwI-V9FO9oiDu3A", language: "en", category: "weapons" },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CephalonCodex/1.0)" } }, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => response.statusCode === 200 ? resolve(body) : reject(new Error(`HTTP ${response.statusCode}`)));
    }).on("error", reject);
  });
}
function xml(value) { return String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(); }
function dateOnly(value) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? null : date.toISOString(); }
function apiGet(endpoint, params) {
  const query = new URLSearchParams({ ...params, key: youtubeApiKey });
  return get(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`)
    .then(body => JSON.parse(body));
}
function makeVideo(creator, item) {
  const snippet = item.snippet || {};
  const publishedAt = dateOnly(snippet.publishedAt);
  const id = item.contentDetails?.videoId || item.id?.videoId || item.id;
  if (!id || !publishedAt || new Date(publishedAt) < cutoff) return null;
  return { id, creator: creator.name, channelId: creator.channelId || snippet.channelId || creator.id, channelLabel: creator.channelLabel, title: snippet.title || "", description: snippet.description || "", publishedAt, url: `https://www.youtube.com/watch?v=${id}`, language: creator.language, expertCategory: creator.category, sourceType: "community_video", transcriptStatus: "not_requested" };
}
async function fromDataApi(creator) {
  if (!youtubeApiKey || !creator.channelId) return null;
  const channel = await apiGet("channels", { part: "contentDetails", id: creator.channelId, maxResults: "1" });
  const uploadsPlaylistId = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error("uploads playlist introuvable");
  const videos = [];
  let pageToken = "";
  for (let page = 0; page < 5; page += 1) {
    const response = await apiGet("playlistItems", { part: "snippet,contentDetails", playlistId: uploadsPlaylistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) });
    for (const item of response.items || []) {
      const video = makeVideo(creator, item);
      if (video) videos.push(video);
    }
    if (!response.nextPageToken) break;
    pageToken = response.nextPageToken;
    if ((response.items || []).some(item => new Date(item.snippet?.publishedAt || 0) < cutoff)) break;
  }
  return videos;
}
function fromRss(creator, body) {
  return Array.from(body.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).map(match => {
    const entry = match[1];
    const value = tag => xml(entry.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]);
    const id = value("yt:videoId");
    const publishedAt = dateOnly(value("published"));
    return id && publishedAt ? { id, creator: creator.name, channelId: creator.channelId || creator.id, channelLabel: creator.channelLabel, title: value("title"), publishedAt, url: `https://www.youtube.com/watch?v=${id}`, language: creator.language, expertCategory: creator.category, sourceType: "community_video", transcriptStatus: "not_requested" } : null;
  }).filter(Boolean);
}
function fromYtDlp(creator) {
  try {
    const args = ["--flat-playlist", "--dump-single-json", "--playlist-end", "100", "--js-runtimes", "deno", "--remote-components", "ejs:npm", creator.channelUrl];
    const raw = execFileSync("yt-dlp", args, { encoding: "utf8", timeout: 180000, maxBuffer: 30 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    const playlist = JSON.parse(raw);
    const channelId = playlist.channel_id || playlist.id || creator.channelId || creator.id;
    const entries = Array.isArray(playlist.entries) ? playlist.entries : [];
    return entries.map(entry => {
      const publishedAt = entry.upload_date ? dateOnly(`${entry.upload_date.slice(0, 4)}-${entry.upload_date.slice(4, 6)}-${entry.upload_date.slice(6, 8)}`) : null;
      if (!entry.id || !publishedAt || publishedAt < cutoff.toISOString()) return null;
      return { id: entry.id, creator: creator.name, channelId, channelLabel: creator.channelLabel, title: entry.title || "", publishedAt, url: `https://www.youtube.com/watch?v=${entry.id}`, language: creator.language, expertCategory: creator.category, sourceType: "community_video", transcriptStatus: "not_requested" };
    }).filter(Boolean);
  } catch (error) {
    const detail = error?.stderr?.toString?.().trim().split("\n").slice(-3).join(" | ") || error?.message || "unknown error";
    console.warn(`[YOUTUBE] ${creator.name}${creator.channelLabel ? ` (${creator.channelLabel})` : ""}: yt-dlp failed: ${detail}`);
    return null;
  }
}
function loadPrevious() {
  try {
    if (!fs.existsSync(outputPath)) return [];
    const previous = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    return Array.isArray(previous.videos) ? previous.videos.filter(video => video.id && video.url && new Date(video.publishedAt) >= cutoff) : [];
  } catch (error) {
    console.warn(`[YOUTUBE] Impossible de charger le manifeste précédent: ${error.message}`);
    return [];
  }
}
async function collectCreator(creator) {
  if (youtubeApiKey && creator.channelId) {
    try {
      const videos = await fromDataApi(creator);
      if (videos?.length) return { videos, status: "data-api" };
    } catch (error) {
      console.warn(`[YOUTUBE] ${creator.name}${creator.channelLabel ? ` (${creator.channelLabel})` : ""}: Data API failed: ${error.message}`);
    }
  }
  if (creator.channelId) {
    try {
      const rss = fromRss(creator, await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${creator.channelId}`));
      const recent = rss.filter(video => new Date(video.publishedAt) >= cutoff);
      if (recent.length) return { videos: recent, status: "rss" };
    } catch (error) {
      console.warn(`[YOUTUBE] ${creator.name}${creator.channelLabel ? ` (${creator.channelLabel})` : ""}: RSS failed: ${error.message}`);
    }
  }
  const complete = fromYtDlp(creator);
  if (complete?.length) return { videos: complete, status: "yt-dlp" };
  return { videos: [], status: "failed" };
}
async function resolveChannelId(creator) {
  if (creator.channelId) return creator.channelId;
  try {
    const body = await get(creator.channelUrl.replace(/\/videos\/?$/, ""));
    const match = body.match(/"channelId":"(UC[^"]+)"/) || body.match(/channel_id=([^&"']+)/);
    return match?.[1] || null;
  } catch (error) {
    console.warn(`[YOUTUBE] ${creator.name}: impossible de résoudre le channel ID: ${error.message}`);
    return null;
  }
}
async function main() {
  const collected = [];
  const previous = loadPrevious();
  const channelResults = [];
  for (const creator of creators) {
    if (!creator.channelId) creator.channelId = await resolveChannelId(creator);
    const result = await collectCreator(creator);
    collected.push(...result.videos);
    channelResults.push({ id: creator.id, creator: creator.name, channelLabel: creator.channelLabel || "main", channelId: creator.channelId || null, status: result.status, videoCount: result.videos.length });
  }
  const liveIds = new Set(collected.map(video => video.id));
  const merged = [...collected, ...previous.filter(video => !liveIds.has(video.id))];
  const unique = Array.from(new Map(merged.filter(video => new Date(video.publishedAt) >= cutoff).map(video => [video.id, video])).values()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const liveCreatorCount = new Set(collected.map(item => item.creator)).size;
  const fallbackUsed = previous.length > 0 && previous.some(video => !liveIds.has(video.id));
  const output = {
    schemaVersion: 4,
    generatedAt: new Date().toISOString(),
    cutoff: cutoff.toISOString(),
    enumeration: channelResults.every(item => item.status === "data-api") ? "data-api" : channelResults.some(item => ["data-api", "rss", "yt-dlp"].includes(item.status)) ? "mixed" : "fallback",
    fallbackUsed,
    apiEnabled: Boolean(youtubeApiKey),
    liveVideoCount: collected.length,
    liveCreatorCount,
    creatorCount: new Set(unique.map(item => item.creator)).size,
    channelCount: creators.length,
    channelResults,
    videoCount: unique.length,
    videos: unique,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`[YOUTUBE] ${unique.length} vidéos récentes disponibles (${collected.length} nouvelles, ${previous.length} conservées) pour ${creators.length} chaînes. Data API: ${youtubeApiKey ? "enabled" : "disabled"}.`);
}
main().catch(error => { console.error("[YOUTUBE] Échec :", error); process.exitCode = 1; });
