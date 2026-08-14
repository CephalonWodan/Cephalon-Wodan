# Évaluation — WFCD/warframe-items

Source : [WFCD/warframe-items](https://github.com/WFCD/warframe-items)

Le dépôt se présente comme une collection d’objets Warframe récupérés directement depuis l’API du jeu, sans scraping du Wiki. Le dossier `data/json` contient les données JSON distribuées par le projet. Le dépôt possède un pipeline de build, des utilitaires de chargement et un historique de mises à jour automatisées ; la page GitHub affiche un dépôt actif avec des commits récents et de nombreuses releases.

Intérêt pour le Set Builder : source complémentaire potentiellement meilleure pour automatiser les ajouts et mises à jour d’objets, notamment les statistiques, noms, catégories, variantes et informations de codex. Elle ne remplace pas nécessairement Cephalon-Wodan pour les champs spécifiques déjà normalisés dans l’application, comme les descriptions enrichies, les effets d’Arcanes, les choix d’Éclats d’Archonte ou la compatibilité exacte des mods.

Approche recommandée : utiliser WFCD/warframe-items comme source de détection et de validation hebdomadaire, comparer ses JSON à `client/src/lib/warframe-data-full.json`, normaliser uniquement les champs compatibles, puis ouvrir une Pull Request avec les différences. Les champs non mappés doivent être signalés dans le rapport plutôt que supprimés ou écrasés automatiquement.
