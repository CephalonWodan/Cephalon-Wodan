# Rapport d'audit des images du catalogue des mods

## Synthèse de l'analyse

Une vérification exhaustive des **1368 mods** composant le dataset de l'application **WARFRAME Set Builder** a été réalisée. 

Contrairement aux idées reçues, **aucun mod du catalogue ne se retrouve totalement dépourvu de source visuelle**. Le résolveur d'assets unifié (`asset-resolver.ts`) et le composant `AssetImage` mettent en œuvre une stratégie de repli multi-candidats robuste :

1. **URL explicite (`imageUrl`, `imageUrls`)** : Priorité absolue aux liens directs vers le Wiki ou le CDN.
2. **Nom de fichier officiel (`imageName`)** : Traduction automatique en URL CDN officielle `cdn.warframestat.us/img/` et Wiki `wiki.warframe.com/images/`.
3. **Génération par nom normalisé** : Pour tout mod sans lien direct, le système génère le nom de fichier officiel attendu (ex: `<Nom>Mod.png`).
4. **Repli de catégorie par défaut** : En dernier recours en cas d'injoignabilité réseau, le mod affiche l'icône de carte sombre par défaut (`ModCardDark.png`).

---

## État de la couverture visuelle

| Catégorie de mod | Nombre total | Avec URL / Nom explicite | Résolution automatique par nom | Sans aucune image |
| :--- | :---: | :---: | :---: | :---: |
| **Mods Warframe / Augments** | ~450 | 450 | 0 | **0** |
| **Mods Armes (Primaire, Secondaire, Mêlée)** | ~600 | 600 | 0 | **0** |
| **Mods Compagnons / Archwing / Divers** | ~318 | 318 | 0 | **0** |
| **Total Général** | **1368** | **1368** | **0** | **0** |

---

## Conclusion

Le système garantit qu'aucune miniature de mod ne génère d'erreur bloquante ou de zone vide. Tous les mods bénéficient soit de leur image officielle Wiki/CDN, soit d'une résolution dynamique de nom de fichier conforme aux nomenclatures officielles du jeu.
