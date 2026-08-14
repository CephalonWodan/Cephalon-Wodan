import fs from "node:fs";
import path from "node:path";

const dataPath = "client/src/lib/warframe-data-full.json";
const backupDir = "backups/datasets";

if (!fs.existsSync(dataPath)) {
  console.error("Fichier dataset introuvable :", dataPath);
  process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0] || "backup";

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

if (command === "backup") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `warframe-data-${timestamp}.json`);
  fs.copyFileSync(dataPath, backupPath);
  console.log(`Sauvegarde automatique créée avec succès : ${backupPath}`);

  // Nettoyage : conserver uniquement les 10 dernières sauvegardes
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith("warframe-data-") && f.endsWith(".json"))
    .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (backups.length > 10) {
    const toDelete = backups.slice(10);
    for (const old of toDelete) {
      const oldPath = path.join(backupDir, old.name);
      fs.unlinkSync(oldPath);
      console.log(`Ancienne sauvegarde supprimée (rétention) : ${oldPath}`);
    }
  }
} else if (command === "restore") {
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith("warframe-data-") && f.endsWith(".json"))
    .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (backups.length === 0) {
    console.error("Aucune sauvegarde disponible pour la restauration.");
    process.exit(1);
  }

  const latestBackup = path.join(backupDir, backups[0].name);
  fs.copyFileSync(latestBackup, dataPath);
  console.log(`Restauration instantanée réussie depuis : ${latestBackup}`);
} else {
  console.error("Commande inconnue. Utilisez 'backup' ou 'restore'.");
  process.exit(1);
}
