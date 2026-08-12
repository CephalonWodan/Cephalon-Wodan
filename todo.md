# TODO — Polarités, capacités, statistiques compagnons et duplication

- [x] Auditer les champs de polarités, capacité et statistiques dans le catalogue Cephalon-Wodan.
- [x] Étendre le modèle d’équipement et `BuildSet` avec polarités, capacité et métadonnées de slots.
- [x] Calculer le coût des mods avec réduction lorsque la polarité correspond.
- [x] Afficher capacité utilisée/restante et état de surcharge dans chaque grille.
- [x] Calculer les statistiques détaillées du compagnon et les bonus de ses mods.
- [x] Ajouter un bouton de duplication pour les sets actifs et sauvegardés.
- [x] Ajouter un résumé exportable du build complet, lisible et contenant toutes les sections.
- [x] Vérifier TypeScript, build production, persistance, import/export et responsive.
- [ ] Créer le checkpoint final et livrer la mise à jour.

## Décisions

- Les valeurs disponibles dans le catalogue source seront prioritaires ; aucune statistique ne sera inventée.
- Les polarités seront représentées par des codes courts compatibles avec les données source.
- Le calcul de capacité sera explicite : coût du mod, réduction de polarité, capacité utilisée, capacité maximale et dépassement éventuel.
- Le résumé exportable contiendra l’équipement, les mods par catégorie, les Arcanes, les Éclats avec effets sélectionnés, les capacités et les statistiques finales.

## État

- Phase en cours : préparation du checkpoint final.
