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

## Références Wiki explicites vérifiées

La page Uriel expose le fichier `Uriel.png` via la miniature `/images/thumb/Uriel.png/300px-Uriel.png?1982c`. La page Cyte-09 expose `Cyte09.png` et son image originale `https://wiki.warframe.com/images/Cyte09.png?f7d72`. Ces références seront ajoutées comme mappings directs afin de ne pas dépendre d’une recherche par nom ou d’un ancien `imageUrl`.

Sources vérifiées : [Uriel](https://wiki.warframe.com/w/Uriel#/media/File:Uriel.png) et [Cyte-09](https://wiki.warframe.com/w/Cyte-09#/media/File:Cyte09.png).

Les pages Sirius & Orion exposent les originaux `S&O-Sirius.png` et `S&O-Orion.png` sous le chemin Wiki `/images/S%26O-Sirius.png?b2f2a` et `/images/S%26O-Orion.png?b2f2a`. Les deux noms contiennent une esperluette : les URLs doivent être encodées et conservées telles quelles dans les mappings.

Sources vérifiées : [Sirius](https://wiki.warframe.com/w/Sirius_%26_Orion#/media/File:S&O-Sirius.png) et [Orion](https://wiki.warframe.com/w/Sirius_%26_Orion#/media/File:S&O-Orion.png).

## Vérification dans l’application

Le catalogue `/warframes` filtré sur `Uriel` affiche bien une seule entrée et son HTML référence directement `https://wiki.warframe.com/images/Uriel.png?1982c`. Le mapping explicite est donc pris en compte par l’interface, et le visuel ne dépend plus de l’ancien fichier `UrielLargePortrait.png`.

Le catalogue filtré confirme également les deux autres entrées : `Cyte-09` référence `https://wiki.warframe.com/images/Cyte09.png?f7d72`, et `Sirius & Orion` référence `https://wiki.warframe.com/images/S%26O-Sirius.png?b2f2a`. Le rendu visuel des deux cartes est présent dans l’interface.

La page `/warframes` filtrée sur `Sirius & Orion` rend maintenant deux images dans la même carte, avec les libellés accessibles `Sirius` et `Orion`, en utilisant respectivement les deux fichiers Wiki. La page `/builder` est également accessible après cette modification ; la sélection réutilise le composant AssetImage et les mappings explicites.

## Références Wiki Bane vérifiées

La page Bane of Grineer expose le fichier original `BaneofGrineerMod.png` sous `https://wiki.warframe.com/images/BaneofGrineerMod.png?e027b`. La page Bane of Corpus confirme le fichier `BaneofCorpusMod.png` et la page média correspondante ; les deux fichiers suivent la même convention d’image originale Wiki.

Sources : [Bane of Grineer](https://wiki.warframe.com/w/Bane_of_Grineer#/media/File:BaneofGrineerMod.png) et [Bane of Corpus](https://wiki.warframe.com/w/Bane_of_Corpus#/media/File:BaneofCorpusMod.png).

Les pages Bane of Orokin et Bane of Infested confirment les fichiers `BaneofOrokinMod.png` et `BaneofInfestedMod.png`. L’original Infested est exposé sous `https://wiki.warframe.com/images/BaneofInfestedMod.png?e443f`; Orokin suit la même convention de fichier original Wiki.

Sources : [Bane of Orokin](https://wiki.warframe.com/w/Bane_of_Orokin#/media/File:BaneofOrokinMod.png) et [Bane of Infested](https://wiki.warframe.com/w/Bane_of_Infested#/media/File:BaneofInfestedMod.png).

Le test réseau local confirme les quatre fichiers Bane en HTTP 200 avec `content-type: image/png`. La première ouverture du catalogue Mods n’a pas fourni de snapshot interactif stable et le navigateur a ensuite basculé sur une page vide ; la validation visuelle sera reprise après réouverture du catalogue.

## Vérification dans le catalogue Mods

Le catalogue filtré sur `Bane` affiche les quatre mods demandés avec leurs URLs Wiki originales : `BaneofCorpusMod.png`, `BaneofGrineerMod.png`, `BaneofInfestedMod.png` et `BaneofOrokinMod.png`. Les quatre entrées sont visibles dans la grille et leurs cartes de mod sont chargées correctement. Les variantes Primed restent inchangées et conservent leurs propres images.
