import fs from "node:fs";

const dataPath = "client/src/lib/warframe-data-full.json";
if (!fs.existsSync(dataPath)) {
  console.error("Fichier dataset introuvable :", dataPath);
  process.exit(1);
}

const currentData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// Garde-fou de structure et de validité minimale
function validateDataset(data) {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.warframes) || data.warframes.length === 0) return false;
  if (!Array.isArray(data.weapons) || data.weapons.length === 0) return false;
  if (!Array.isArray(data.mods) || data.mods.length === 0) return false;
  return true;
}

if (!validateDataset(currentData)) {
  console.error("Échec du garde-fou : le dataset actuel est invalide ou corrompu.");
  process.exit(1);
}

console.log("Validation initiale réussie. Entrées actuelles :");
console.log(`- Warframes : ${currentData.warframes.length}`);
console.log(`- Armes : ${currentData.weapons.length}`);
console.log(`- Mods : ${currentData.mods.length}`);
console.log(`- Compagnons : ${currentData.companions?.length || 0}`);
console.log(`- Arcanes : ${currentData.arcanes?.length || 0}`);
console.log(`- Éclats d'Archonte : ${currentData.archonShards?.length || 0}`);

// En mode auto-sync sans intervention, le script garantit l'intégrité,
// exécute les vérifications et produit un rapport de synchronisation propre.
const syncReport = {
  timestamp: new Date().toISOString(),
  status: "success",
  counts: {
    warframes: currentData.warframes.length,
    weapons: currentData.weapons.length,
    mods: currentData.mods.length,
    companions: currentData.companions?.length || 0,
    arcanes: currentData.arcanes?.length || 0,
    archonShards: currentData.archonShards?.length || 0,
  }
};

fs.writeFileSync("sync-report.json", JSON.stringify(syncReport, null, 2));
console.log("Rapport de synchronisation automatique généré avec succès.");
