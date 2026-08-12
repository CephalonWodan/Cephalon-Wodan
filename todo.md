# TODO — Rang spécifique des mods

- [x] Auditer le modèle `Mod`, les tableaux de mods équipés et le calcul de coût existant.
- [x] Ajouter un modèle de mod équipé avec un rang persistant et compatible avec les anciens imports.
- [x] Ajouter un sélecteur de rang 0 à `maxRank` dans chaque slot occupé.
- [x] Recalculer le coût selon le rang sélectionné et la polarité du slot.
- [x] Mettre à jour capacité, surcharge, résumé Markdown et export JSON.
- [x] Vérifier localStorage, import/export, TypeScript, build et responsive.
- [ ] Créer le checkpoint final et livrer la mise à jour.

## Décisions

Le rang par défaut d’un mod nouvellement ajouté sera `maxRank`, afin de préserver le comportement actuel. Les anciens builds contenant directement un objet `Mod` seront normalisés vers un mod équipé au rang maximal. Le coût sera calculé comme `2 + rang`, puis réduit de moitié avec arrondi supérieur lorsque la polarité du slot correspond.

## État

Phase en cours : checkpoint final et livraison.
