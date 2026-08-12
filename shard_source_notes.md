# Audit des Éclats d’Archonte

La source prioritaire est `/tmp/Cephalon-Wodan/data/archonshards.json`, complétée par la logique de `/tmp/Cephalon-Wodan/js/shards.js`. La page du site charge d’abord `https://cephalon-wodan-production.up.railway.app/archonshards`, puis `https://api.warframestat.us/archonShards?language=en`.

La source expose douze entrées : Azure, Crimson, Amber, Topaz, Violet, Emerald et leurs six variantes Tauforgées. Azure, Crimson et Amber proposent cinq effets chacun ; Topaz, Violet et Emerald en proposent quatre ; le total est donc de 54 choix d’effets pour les douze entrées.

Le catalogue actuel de l’application contient également douze entrées avec 54 effets. L’écart constaté n’est pas un nombre d’effets absent, mais une normalisation incomplète : les clés `ACC_*`, les identifiants `ArchonCrystalUpgrade*` et les valeurs `upgradeTypes` de la source ne sont pas conservés dans `ArchonShard`. La source API peut aussi différer du fichier local sur certains libellés (`+150% Health` contre `+150 Health`, `Sheild`), donc la prochaine correction doit conserver les métadonnées source sans dégrader les règles de calcul.

Objectif de correction : préserver chaque effet dans l’ordre source, ajouter les identifiants source à chaque effet, rendre le compteur total visible dans le catalogue et le builder, et empêcher toute normalisation qui supprimerait une entrée ou un effet.
