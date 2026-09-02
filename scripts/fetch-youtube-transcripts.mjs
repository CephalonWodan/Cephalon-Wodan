// Fetch public subtitles for the recent-video manifest without downloading video files.
// Missing subtitles are explicitly retained as not_available; no transcript is invented.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const manifestPath = path.join(root, "data/youtube-videos.json");
const outputPath = path.join(root, "data/youtube-transcripts.json");
if (!fs.existsSync(manifestPath)) throw new Error("data/youtube-videos.json is missing; run youtube:collect first");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const tempDir = path.join(root, ".tmp-youtube-subs");
fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

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
function getTranscript(video) {
  const prefix = path.join(tempDir, video.id);
  try {
    execFileSync("yt-dlp", ["--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", "en.*,fr.*,vi.*", "--sub-format", "vtt", "--output", `${prefix}.%(ext)s`, video.url], { encoding: "utf8", timeout: 120000, stdio: "ignore" });
    const files = fs.readdirSync(tempDir).filter(file => file.startsWith(`${video.id}.`) && file.endsWith(".vtt"));
    const contents = files.map(file => cleanVtt(fs.readFileSync(path.join(tempDir, file), "utf8"))).filter(Boolean).sort((a, b) => b.length - a.length);
    return contents[0] ? { status: "available", languageFiles: files, text: contents[0].slice(0, 60000) } : { status: "not_available", text: "" };
  } catch { return { status: "not_available", text: "" }; }
}
const rows = [];
for (const video of manifest.videos || []) {
  const transcript = getTranscript(video);
  rows.push({ ...video, transcriptStatus: transcript.status, transcriptText: transcript.text, languageFiles: transcript.languageFiles || [] });
  console.log(`[YOUTUBE] ${video.creator} — ${video.title} — ${transcript.status}`);
}
fs.writeFileSync(outputPath, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), cutoff: manifest.cutoff, videoCount: rows.length, transcriptCount: rows.filter(row => row.transcriptStatus === "available").length, videos: rows }, null, 2));
fs.rmSync(tempDir, { recursive: true, force: true });
console.log(`[YOUTUBE] ${rows.filter(row => row.transcriptStatus === "available").length}/${rows.length} transcriptions disponibles.`);
