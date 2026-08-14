# Recherche — fallback d’images Wiki/API

La documentation publique de WarframeStat.us est disponible à l’adresse https://docs.warframestat.us/ et décrit une API d’objets issue de la communauté WFCD. Le dataset actuel de l’application utilise déjà des URLs de la forme `https://wiki.warframe.com/images/...`, mais l’audit du résolveur montre que `resolveAssetUrl()` n’est appelé par aucun composant et qu’il ne sait pas exploiter un éventuel champ `wikiLink` ou `wikiUrl` fourni par une API.

Le dataset local contient actuellement une propriété `imageUrl` pour 117 Warframes, 746 armes, 1368 mods et 148 arcanes. La présence de la chaîne ne garantit pas que l’image existe : certaines URLs Wiki peuvent être obsolètes, mal nommées ou pointer vers une variante différente. La stratégie à implémenter doit donc conserver l’image fournie par l’API en premier choix, essayer le lien Wiki ou sa page image en second choix, puis afficher un fallback générique contrôlé après échec du chargement.

Source principale : [WarframeStat.us API documentation](https://docs.warframestat.us/).
Source Wiki utilisée par les données : [Warframe Wiki](https://wiki.warframe.com/).

## Convention CDN vérifiée

La documentation de `WFCD/warframe-items` précise que les images provenant de `item.imageName` doivent être chargées via `https://cdn.warframestat.us/img/${item.imageName}`. Le fichier Wiki `https://wiki.warframe.com/images/${imageName}` n’est donc pas fiable pour les images issues de l’API Public Export. Le fallback doit essayer en priorité l’URL CDN WarframeStat dérivée de `imageName`, puis la vignette `og:image` de `wikiaUrl` quand elle existe, avant les conventions Wiki par nom.

Source vérifiée : [WFCD/warframe-items — README](https://github.com/WFCD/warframe-items).

## Validation visuelle

Les captures desktop et mobile des pages `/warframes`, `/weapons` et `/mods` montrent que les cartes conservent une image lisible et leurs badges HUD. Les images de Warframes et d’armes utilisent les silhouettes officielles visibles dans le catalogue ; les cartes de mods affichent bien leurs cartes haute résolution. Les grilles restent en une colonne sur 375 px sans débordement horizontal.
