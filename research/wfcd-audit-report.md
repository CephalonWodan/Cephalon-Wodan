# Rapport d’audit des ressources WFCD et feuille de route d’enrichissement

L’analyse des principaux dépôts de l’organisation **WFCD (Warframe Community Developers)** sur GitHub permet d’identifier plusieurs ressources majeures pour enrichir, automatiser et perfectionner le **WARFRAME Set Builder**.

---

## 1. Dépôts clés de l’organisation WFCD

| Dépôt GitHub | Finalité principale | Utilité pour le Set Builder |
|---|---|---|
| [`WFCD/warframe-items`](https://github.com/WFCD/warframe-items) [1] | Extraction centralisée des objets de l’API mobile de Warframe (`content.warframe.com`) | Source automatisée pour les nouvelles armes, warframes, mods, images et métadonnées sans scraping du Wiki. |
| [`WFCD/warframe-drop-data`](https://github.com/WFCD/warframe-drop-data) [2] | Données de largage (drop tables) structurées et faciles à parser (par ennemi, par objet) | Permet d’afficher les sources de farm et les taux de drop directement dans les fiches d’équipement du builder. |
| [`WFCD/warframe-relic-data`](https://github.com/WFCD/warframe-relic-data) [3] | Données structurées sur les Reliques du Néant (`Relics.json`) | Permet d’ajouter un module de recherche de reliques et de récompenses Prime associées aux sets. |
| [`WFCD/warframe-worldstate-data`](https://github.com/WFCD/warframe-worldstate-data) [4] | Données d’état du monde (nœuds, types d’opérations, syndicats, cycles) | Utile pour afficher des bannières d’événements en direct, les alertes et les statuts du monde (Plains/Vallis/Cambion). |
| [`WFCD/warframe.py`](https://github.com/WFCD/warframe.py) [5] | Wrapper Python asypnchrone typé pour l’API Warframestat et warframe.market | Inspiration pour interroger des services tiers ou intégrer des prix de marché (Platines) en arrière-plan. |

---

## 2. Feuille de route d’enrichissement priorisée

### Étape 1 : Intégration de `warframe-drop-data` pour le farm des composants
- **Objectif** : Ajouter un onglet ou un bloc « Sources & Drop » dans les fiches détaillées des Warframes et des Armes.
- **Bénéfice** : L’utilisateur n’a plus besoin de quitter le builder pour savoir où farmer les schémas et composants.

### Étape 2 : Ajout du module Reliques Prime (`warframe-relic-data`)
- **Objectif** : Permettre de filtrer les composants Prime par ère de relique (Lith, Meso, Neo, Axi) et par statut (Radieux, Intact).
- **Bénéfice** : Optimisation de la recherche de pièces pour compléter les sets Prime.

### Étape 3 : Widget État du Monde et Alertes en direct (`warframe-worldstate-data`)
- **Objectif** : Intégrer un encart HUD « Worldstate » dans la page d’accueil ou le header affichant les fissures du Néant actives, les invasions et les cycles en cours.
- **Bénéfice** : Renforce l’immersion dans le style « Tenno Codex » et connecte le builder aux activités en jeu.

### Étape 4 : Automatisation de la récupération via le pipeline WFCD
- **Objectif** : Remplacer l’audit statique actuel par un script qui interroge régulièrement les JSON bruts de `warframe-items`, les normalise selon le schéma local et ouvre automatiquement la Pull Request.

---

## Références

- [1]: [WFCD/warframe-items — GitHub](https://github.com/WFCD/warframe-items)
- [2]: [WFCD/warframe-drop-data — GitHub](https://github.com/WFCD/warframe-drop-data)
- [3]: [WFCD/warframe-relic-data — GitHub](https://github.com/WFCD/warframe-relic-data)
- [4]: [WFCD/warframe-worldstate-data — GitHub](https://github.com/WFCD/warframe-worldstate-data)
- [5]: [WFCD/warframe.py — GitHub](https://github.com/WFCD/warframe.py)
