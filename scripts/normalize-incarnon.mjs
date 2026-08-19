import fs from "node:fs";
import path from "node:path";

const sourcePath = "/home/ubuntu/upload/incarnon_long_complete_patched_v4_nulls.jsonl";
const outputPath = "/home/ubuntu/warframe-set-builder/client/src/lib/incarnon-data.json";

const rows = fs.readFileSync(sourcePath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Ligne JSONL invalide ${index + 1}: ${error.message}`); }
  });

const byWeapon = new Map();
for (const row of rows) {
  const key = String(row.weapon || row.variant || "").trim();
  if (!key) continue;
  if (!byWeapon.has(key)) {
    byWeapon.set(key, {
      weapon: key,
      variant: row.variant || key,
      slot: row.slot || "unknown",
      family: row.family || "incarnon genesis",
      evolutionsCount: Number(row.evolutions_count) || 4,
      evolutions: [],
    });
  }
  const entry = byWeapon.get(key);
  const tier = Number(row.evolution) || 1;
  let evolution = entry.evolutions.find((item) => item.tier === tier);
  if (!evolution) {
    evolution = { tier, unlockChallenges: [], activation: null, perks: [] };
    entry.evolutions.push(evolution);
  }
  if (row.row_type === "unlock" && row.unlock_challenge && !evolution.unlockChallenges.includes(row.unlock_challenge)) {
    evolution.unlockChallenges.push(row.unlock_challenge);
  }
  if (row.row_type === "activation" && row.activation) evolution.activation = row.activation;
  if (row.row_type === "perk" && row.perk_name && row.perk_text) {
    const perkKey = `${row.perk_name}::${row.perk_text}`;
    if (!evolution.perks.some((perk) => `${perk.name}::${perk.text}` === perkKey)) {
      evolution.perks.push({ name: row.perk_name, text: row.perk_text });
    }
  }
}

const output = [...byWeapon.values()]
  .map((entry) => ({
    ...entry,
    evolutions: entry.evolutions.sort((a, b) => a.tier - b.tier),
  }))
  .sort((a, b) => a.weapon.localeCompare(b.weapon));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Incarnon normalisées : ${output.length} armes, ${rows.length} lignes source.`);
console.log(`Sortie : ${outputPath}`);
