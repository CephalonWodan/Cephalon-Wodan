// Extract visible on-screen text from a small, deterministic sample of expert YouTube videos.
// The video files and frames are temporary; only OCR text is committed into the RAG data.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const inputPath = path.join(root, "data/youtube-transcripts.json");
const outputPath = path.join(root, "data/youtube-ocr.json");
const tempDir = path.join(root, ".tmp-youtube-ocr");
const limit = Number(process.env.OCR_VIDEO_LIMIT || 24);
const interval = Number(process.env.OCR_INTERVAL_SECONDS || 8);

if (!fs.existsSync(inputPath)) throw new Error("data/youtube-transcripts.json is missing; run youtube:transcripts first");
const manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));
fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", timeout: options.timeout || 300000, maxBuffer: 20 * 1024 * 1024, stdio: options.stdio || ["ignore", "pipe", "ignore"] });
}
function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function normalize(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9àâçéèêëîïôùûüÿñæœ+#.%'-]+/gi, " ").trim();
}
function ocrVideo(video) {
  const work = path.join(tempDir, video.id);
  const videoPath = `${work}.mp4`;
  const framesDir = `${work}-frames`;
  fs.mkdirSync(framesDir, { recursive: true });
  try {
    run("yt-dlp", ["--no-playlist", "--format", "worst[height>=360]/worst", "--merge-output-format", "mp4", "--output", videoPath, video.url], { timeout: 300000 });
    run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", videoPath, "-vf", `fps=1/${interval},scale=1280:-2`, "-q:v", "4", path.join(framesDir, "%06d.jpg")], { timeout: 300000 });
    const frames = fs.readdirSync(framesDir).filter(file => file.endsWith(".jpg")).sort();
    const seen = new Set();
    const chunks = [];
    for (const frame of frames) {
      const framePath = path.join(framesDir, frame);
      let raw = "";
      try {
        raw = run("tesseract", [framePath, "stdout", "-l", "eng+fra+vie", "--psm", "11"], { timeout: 30000 });
      } catch { continue; }
      const text = clean(raw);
      const key = normalize(text);
      if (key.length < 8 || seen.has(key)) continue;
      seen.add(key);
      chunks.push(text);
    }
    return { status: chunks.length ? "available" : "empty", frameCount: frames.length, text: chunks.join("\n").slice(0, 50000) };
  } catch (error) {
    return { status: "failed", frameCount: 0, text: "", error: error instanceof Error ? error.message.slice(0, 300) : "unknown error" };
  } finally {
    fs.rmSync(videoPath, { force: true });
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

const videos = Array.isArray(manifest.videos) ? [...manifest.videos].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))) : [];
const selected = videos.slice(0, limit);
const rows = [];
for (const video of selected) {
  const result = ocrVideo(video);
  rows.push({ id: video.id, creator: video.creator, title: video.title, url: video.url, publishedAt: video.publishedAt, expertCategory: video.expertCategory, ocrStatus: result.status, frameCount: result.frameCount, ocrText: result.text });
  console.log(`[OCR] ${video.creator} — ${video.title} — ${result.status} (${result.frameCount} frames)`);
}

fs.writeFileSync(outputPath, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), intervalSeconds: interval, selectedVideoCount: selected.length, videoCount: videos.length, ocrCount: rows.filter(row => row.ocrStatus === "available").length, videos: rows }, null, 2));
fs.rmSync(tempDir, { recursive: true, force: true });
console.log(`[OCR] ${rows.filter(row => row.ocrStatus === "available").length}/${rows.length} vidéos analysées avec OCR.`);
