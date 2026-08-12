# TODO — Mods uniques, arcanes uniques et mods de compagnons

- [x] Auditer les modèles de `BuildSet`, les catégories de mods et les handlers de sélection.
- [x] Définir une validation anti-doublon par catégorie de mods, sans bloquer le même nom dans une autre catégorie compatible.
- [x] Empêcher la sélection d’un même Arcane plus d’une fois dans l’ensemble de ses emplacements applicables.
- [x] Ajouter les emplacements de mods dédiés au compagnon sélectionné.
- [x] Filtrer les mods de compagnon selon la compatibilité et la catégorie compagnon.
- [x] Afficher les doublons comme indisponibles avec un message explicite dans le sélecteur.
- [x] Préserver les nouveaux slots dans `localStorage`, l’export JSON et l’import JSON.
- [x] Vérifier TypeScript, build, persistance, responsive et flux de sélection.
- [ ] Créer le checkpoint final et livrer la mise à jour.

## Décisions

Les règles anti-doublon doivent être appliquées à la sélection et à la normalisation des builds importés afin qu’un JSON ancien ou modifié ne puisse pas réintroduire de doublons. Les mods de compagnon resteront distincts des mods Warframe, primaire, secondaire et mêlée. Le nombre de slots compagnon sera défini par le modèle du builder et restera compatible avec les sets déjà sauvegardés.

## État

Phase en cours : préparation du checkpoint final.
