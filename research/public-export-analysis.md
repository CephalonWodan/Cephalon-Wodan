# Analyse de l’Export Public Warframe et de index_fr

## Contexte
La page officielle [Warframe Wiki — Public Export](https://wiki.warframe.com/w/Public_Export) [1] documente les exports de données brutes fournis directement par Digital Extremes (les fichiers JSON utilisés par le jeu pour les textes, statistiques, équipements, mods et arcanes en français et autres langues). Le fichier `index_fr.txt.lzma` fourni représente le manifeste d’indexation de ces exports officiels en langue française.

## Contenu du Manifeste d’Export (`index_fr`)
Le manifeste répertorie les tables officielles exportées par DE :
- **`ExportWarframes_fr.json`** : Données officielles des Warframes et de leurs statistiques en français.
- **`ExportWeapons_fr.json`** : Données officielles des armes (principales, secondaires, corps à corps) avec leurs dégâts et attributs en français.
- **`ExportUpgrades_fr.json`** : Mods, arcanes et améliorations d’équipements.
- **`ExportRelicArcane_fr.json`** : Reliques du Néant, arcanes et récompenses associées.
- **`ExportSentinels_fr.json`** & **`ExportDrones_fr.json`** : Compagnons et sentinelles.
- **`ExportResources_fr.json`** & **`ExportRecipes_fr.json`** : Ressources et schémas de fabrication.

## Intérêt pour le WARFRAME Set Builder
1. **Source Officielle Absolue** : Contrairement aux scrapings communautaires, ces JSON proviennent directement des serveurs de DE, garantissant une exactitude parfaite des noms français, des descriptions de capacités et des identifiants internes.
2. **Localisation Française Native** : Permet de basculer ou d’enrichir les libellés en français (noms de mods, arcanes, armes et Warframes) avec la nomenclature exacte du jeu officiel.
3. **Automatisation par Pipeline** : Un script Node.js peut intégrer le téléchargement et le parsing de ces manifests dans le workflow GitHub Actions pour maintenir le dataset à jour lors des mises à jour majeures de Warframe.

## Références
[1] [Warframe Wiki — Public Export](https://wiki.warframe.com/w/Public_Export)
