# TODO — Effets d’éclats, persistance et bonus de build

- [x] Ajouter un effet sélectionné à chaque emplacement d’Éclat d’Archonte.
- [x] Préserver l’effet choisi dans le modèle `BuildSet` et dans les données exportées.
- [x] Ajouter la persistance `localStorage` des builds actifs et sauvegardés.
- [x] Ajouter l’export JSON d’un set complet et l’import JSON avec validation.
- [x] Définir les règles de calcul des bonus d’Arcanes et d’Éclats à partir des descriptions disponibles.
- [x] Afficher les bonus détectés dans le panneau de statistiques finales.
- [x] Vérifier TypeScript, build production, responsive et flux de stockage/import/export.
- [ ] Créer le checkpoint final et livrer la version améliorée.

## Décisions

- Un emplacement d’Éclat conserve l’éclat choisi et l’index de son effet sélectionné.
- Les données source restent celles du dépôt Cephalon-Wodan ; le calcul applique uniquement les effets explicitement sélectionnés.
- L’import JSON accepte uniquement un format de build compatible et ignore les entrées invalides avec un message utilisateur.
- Le calcul des bonus reste transparent : les effets reconnus sont affichés avec leur source, les autres restent visibles comme effets sélectionnés non agrégés.

## État

- Phase en cours : préparation du checkpoint final.
