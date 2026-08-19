# Suivi de projet — Warframe Set Builder

## Nouvelle demande — Synchronisation GitHub et Vercel

- [ ] Vérifier que la dernière version publiée correspond au dépôt GitHub.
- [ ] Synchroniser la branche principale avec `CephalonWodan/Cephalon-Wodan`.
- [ ] Vérifier l’espace Vercel fourni et identifier si une connexion ou une confirmation utilisateur est nécessaire.
- [ ] Documenter le résultat et les étapes de déploiement restantes.


## État — Audit non destructif de tous les fichiers transmis

## Nouvelle demande — Builder Incarnon et export JSON

- [x] Ajouter un sélecteur d’Incarnon par arme dans le Builder.
- [x] Appliquer au calcul uniquement les bonus chiffrés explicitement présents dans le perk ou l’évolution sélectionnée ; l’Évolution I « Forme Incarnon » sans valeur chiffrée conserve les dégâts de l’arme et l’interface le signale.
- [x] Inclure les arbres Incarnon complets et les sélections actives dans l’export JSON enrichi ; préserver la compatibilité de l’import JSON via normalisation rétrocompatible.
- [ ] Valider le rendu responsive du Builder et publier un checkpoint.

## Nouvelle demande — Correction du catalogue Warframes

- [x] Diagnostiquer pourquoi le clic sur une carte Warframe n’ouvrait aucune fiche : les cartes n’avaient aucun handler `onClick`.
- [x] Relier chaque carte à une modale détaillée avec statistiques, polarités, passif et capacités enrichies.
- [ ] Publier le correctif après la sauvegarde du checkpoint.

## Nouvelle demande — Catalogue Warframes

- [ ] Ajouter une interaction au clic sur chaque carte de Warframe.
- [ ] Afficher les statistiques détaillées, polarités, passif et capacités dans une modale responsive.
- [ ] Valider la compilation, le rendu desktop/mobile et publier un checkpoint.


- [x] Auditer `warframes.zip` (111 fichiers PNG d'actifs visuels).
- [x] Auditer `incarnon_long_complete_patched_v4_nulls.jsonl` (1 143 objets Incarnon pour 48 armes).
- [x] Auditer `Warframes-CSV.zip` (11 fichiers CSV de statistiques et compétences de Warframes).
- [x] Produire les rapports d'audit détaillés (`upload-audit-report.md` et `csv-audit-report.md`).
