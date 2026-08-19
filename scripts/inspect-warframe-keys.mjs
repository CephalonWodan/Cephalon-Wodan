import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("client/src/lib/warframe-data-full.json", "utf8"));
for (const target of ["Citrine", "Cyte-09", "Saryn", "Dante"]) {
  const item = data.warframes.find((wf) => String(wf.name).toLowerCase() === target.toLowerCase());
  if (!item) continue;
  console.log(`=== ${item.name} ===`);
  console.log(Object.keys(item));
  console.log(JSON.stringify(item, null, 2).slice(0, 6000));
}
