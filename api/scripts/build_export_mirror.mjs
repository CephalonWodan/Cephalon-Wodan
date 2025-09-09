//build_export_mirror.mjs

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const SRC  = path.join(ROOT, "data");
const OUT  = path.join(ROOT, "api", "v1", "export");

async function sha1(file) {
  const buf = await fs.readFile(file);
  return crypto.createHash("sha1").update(buf).digest("hex");
}

function isExportFile(name) {
  // miroir 1:1 : tout ce qui commence par Export + le manifest
  return /^Export.*\.json$/i.test(name) || name === "ExportManifest.json";
}

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

async function main() {
  await ensureDir(OUT);

  const names = (await fs.readdir(SRC)).filter(isExportFile).sort();
  const index = [];

  for (const name of names) {
    const src = path.join(SRC, name);
    const dst = path.join(OUT, name);

    const stat = await fs.stat(src);
    const content = await fs.readFile(src);

    // copie brute
    await fs.writeFile(dst, content);

    index.push({
      file: name,
      url: `/api/v1/export/${encodeURIComponent(name)}`,
      bytes: stat.size,
      modified: stat.mtime.toISOString(),
      sha1: crypto.createHash("sha1").update(content).digest("hex")
    });
  }

  // petit index pratique
  const meta = {
    updated: new Date().toISOString(),
    count: index.length,
    files: index
  };
  await fs.writeFile(path.join(OUT, "index.json"), JSON.stringify(meta, null, 2));
  console.log(`[export] Mirrored ${index.length} files -> /api/v1/export`);
}

main().catch(e => { console.error(e); process.exit(1); });
