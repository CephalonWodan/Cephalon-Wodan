import fs from "node:fs";

const filePath = "client/src/lib/warframe-data-full.json";
if (!fs.existsSync(filePath)) {
  console.error("Fichier de données introuvable :", filePath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
const report = {
  timestamp: new Date().toISOString(),
  counts: {
    warframes: data.warframes?.length || 0,
    weapons: data.weapons?.length || 0,
    mods: data.mods?.length || 0,
    companions: data.companions?.length || 0,
    arcanes: data.arcanes?.length || 0,
    archonShards: data.archonShards?.length || 0,
  },
  recentEntries: {
    warframes: (data.warframes || []).slice(-3).map(w => ({ id: w.id, name: w.name, role: w.role })),
    weapons: (data.weapons || []).slice(-3).map(w => ({ id: w.id, name: w.name, type: w.type })),
    arcanes: (data.arcanes || []).slice(-3).map(a => ({ id: a.id, name: a.name, type: a.type })),
  }
};

const reportPath = "update-report.json";
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log("Rapport de vérification généré avec succès :", JSON.stringify(report, null, 2));
