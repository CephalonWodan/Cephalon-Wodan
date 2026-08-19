import fs from "node:fs";
const source = fs.readFileSync("/home/ubuntu/upload/wiki.warframe.com_w_Helminth_Subsumable_Ability_Checklist_1787165617644.md", "utf8");
const start = source.indexOf("### Subsumable Ability Checklist");
const end = source.indexOf("#### Power Scaling", start);
const section = source.slice(start, end);
const lines = section.split(/\r?\n/).filter(line => line.startsWith("|"));
console.log({ lines: lines.length, candidateRows: lines.filter(line => /^\|\s*[A-ZÀ-Ž][^|]+\|/.test(line)).length });
for (const line of lines.slice(0, 25)) console.log(JSON.stringify(line.slice(0, 180)));
