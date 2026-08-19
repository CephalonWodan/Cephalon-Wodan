import fs from "node:fs";

const source = fs.readFileSync("/home/ubuntu/upload/wiki.warframe.com_w_Helminth_Subsumable_Ability_Checklist_1787165617644.md", "utf8");
const start = source.indexOf("### Subsumable Ability Checklist");
const end = source.indexOf("### Power Scaling", start);
const section = source.slice(start, end > start ? end : start + 20000);
const rows = [];
for (const line of section.split(/\r?\n/)) {
  const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
  if (!match || match[1].trim() === "Warframe" || match[1].includes("---")) continue;
  const warframe = match[1].trim();
  const abilities = match[2].trim();
  if (warframe && abilities) rows.push({ warframe, abilities });
}
console.log(JSON.stringify({ count: rows.length, rows }, null, 2));
