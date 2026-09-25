import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const data = JSON.parse(await fs.readFile(path.join(root, "data", "raw", "official", "ExportWarframes.json"), "utf8"));
const rows = Array.isArray(data) ? data : data?.data || data?.items || Object.values(data || {});
const valid = rows.filter((item) => item && (item.name || item.uniqueName));
if (valid.length < 10) throw new Error(`Official Warframes export looks invalid: ${valid.length} entries`);
console.log(JSON.stringify({ warframes: valid.length, sample: valid.slice(0, 3).map((item) => item.name || item.uniqueName) }, null, 2));
