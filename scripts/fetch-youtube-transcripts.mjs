// Fetch public subtitles and lightweight metadata for the recent-video manifest without downloading video files.
// Missing subtitles are explicitly retained as not_available; no transcript is invented.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const manifestPath = path.join(root, "data/youtube-videos.json");
const outputPath = path.join(root, "data/youtube-transcripts.json");
if (!fs.existsSync(manifestPath)) throw new Error("data/youtube-videos.json is missing; run youtube:collect first");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const previousPath = outputPath;
let previousById = new Map();
try {
  if (fs.existsSync(previousPath)) {
    const previous = JSON.parse(fs.readFileSync(previousPath, "utf8"));
    previousById = new Map((previous.videos || []).filter(video => video.id).map(video => [video.id, video]));
  }
} catch { /* a corrupt previous transcript file must not stop the sync */ }

const tempDir = path.join(root, ".tmp-youtube-subs");
fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });
const YTDLP_COMMON = ["--js-runtimes", "deno", "--remote-components", "ejs:npm"];

function cleanVtt(value) {
  return String(value || "")
    .replace(/^WEBVTT[\s\S]*?\n\n/m, "")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> [^\n]+\n/g, "")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !/^\d+$/.test(line) && !/^NOTE/.test(line))
    .filter((line, index, lines) => line !== lines[index - 1])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
function getMetadata(video) {
  try {
    const raw = execFileSync("yt-dlp", [...YTDLP_COMMON, "--skip-download", "--no-playlist", "--dump-single-json", video.url], { encoding: "utf8", timeout: 120000, maxBuffer: 10 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    const data = JSON.parse(raw);
    return { description: String(data.description || "").slice(0, 30000), chapters: Array.isArray(data.chapters) ? data.chapters.slice(0, 100).map(item => ({ start: item.start_time, end: item.end_time, title: item.title })) : [], duration: Number(data.duration || 0), uploader: data.uploader || "" };
  } catch { return { description: "", chapters: [], duration: 0, uploader: "" }; }
}
function getTranscript(video) {
  const prefix = path.join(tempDir, video.id);
  try {
    execFileSync("yt-dlp", [...YTDLP_COMMON, "--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", "en.*,fr.*,vi.*", "--sub-format", "vtt", "--output", `${prefix}.%(ext)s`, "--no-playlist", "--ignore-errors", video.url], { encoding: "utf8", timeout: 120000, stdio: "ignore" });
    const files = fs.readdirSync(tempDir).filter(file => file.startsWith(`${video.id}.`) && file.endsWith(".vtt"));
    const contents = files.map(file => cleanVtt(fs.readFileSync(path.join(tempDir, file), "utf8"))).filter(Boolean).sort((a, b) => b.length - a.length);
    return contents[0] ? { status: "available", languageFiles: files, text: contents[0].slice(0, 60000) } : { status: "not_available", text: "" };
  } catch { return { status: "not_available", text: "" }; }
}
const rows = [];
for (const video of manifest.videos || []) {
  const metadata = getMetadata(video);
  const transcript = getTranscript(video);
  const previous = previousById.get(video.id);
  const retainedTranscript = transcript.status === "available" ? transcript : (previous?.transcriptStatus === "available" && previous.transcriptText ? { status: "available", languageFiles: previous.languageFiles || [], text: previous.transcriptText } : transcript);
  rows.push({ ...video, description: metadata.description || previous?.description || "", chapters: metadata.chapters.length ? metadata.chapters : (previous?.chapters || []), duration: metadata.duration || previous?.duration || 0, uploader: metadata.uploader || previous?.uploader || "", transcriptStatus: retainedTranscript.status, transcriptText: retainedTranscript.text, languageFiles: retainedTranscript.languageFiles || [] });
  console.log(`[YOUTUBE] ${video.creator} — ${video.title} — ${retainedTranscript.status}`);
}
fs.writeFileSync(outputPath, JSON.stringify({ schemaVersion: 3, generatedAt: new Date().toISOString(), cutoff: manifest.cutoff, videoCount: rows.length, transcriptCount: rows.filter(row => row.transcriptStatus === "available").length, videos: rows }, null, 2));
fs.rmSync(tempDir, { recursive: true, force: true });
console.log(`[YOUTUBE] ${rows.filter(row => row.transcriptStatus === "available").length}/${rows.length} transcriptions disponibles.`);
