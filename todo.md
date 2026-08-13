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


## TODO — Aperçu des effets d’Arcanes

- [x] Afficher la description complète d’un Arcane dans le sélecteur avant validation.
- [x] Afficher le rang maximal et les métadonnées utiles de l’Arcane dans l’aperçu.
- [x] Vérifier la sélection finale, le responsive, TypeScript et le build.
- [ ] Créer le checkpoint final et livrer la mise à jour.

## État

Phase en cours : checkpoint final et livraison.

## Décision de conception

L’aperçu est intégré directement dans chaque carte Arcane du sélecteur, avec un bloc « APERÇU DE L’EFFET » et le rang maximal. La sélection reste une action séparée : consulter l’effet ne modifie pas le build ; seul le clic de la carte applique l’Arcane.


## TODO — Ajout de Sirius & Orion et Uriel

- [x] Vérifier les données officielles et les noms canoniques des nouvelles Warframes.
- [x] Ajouter Sirius & Orion comme entrée unique conformément à leur occupation d’un seul slot de Warframe.
- [x] Ajouter Uriel avec ses statistiques, capacités, rôle et polarité d’aura.
- [x] Vérifier compteurs, filtres, cartes catalogue et sélection dans le builder.
- [ ] Créer le checkpoint final et publier la mise à jour.

## État

Phase en cours : checkpoint final et livraison.


## TODO — Workflow GitHub Actions hebdomadaire

- [x] Définir la structure du script d’audit et du rapport JSON.
- [x] Créer le fichier `.github/workflows/data-audit.yml` (exécution chaque lundi à 8h00 UTC).
- [x] Valider localement l’exécution du script d’audit et le build de production.
- [ ] Publier le workflow et le script sur GitHub.


## TODO — Recherche Prime et Radshare

- [x] Ajouter la recherche de reliques par composant Prime.
- [x] Ajouter un simulateur Radshare à quatre joueurs avec choix de relique et de raffinage.
- [x] Vérifier la formule de probabilité, TypeScript, build et responsive.
- [ ] Créer le checkpoint final et publier les fonctionnalités.

## État

Phase en cours : checkpoint final et livraison.


## TODO — Recherche du composant Radshare

- [x] Remplacer la liste du composant ciblé par une barre de recherche.
- [x] Ajouter des suggestions filtrées de composants Prime.
- [x] Vérifier le calcul Radshare, TypeScript et le rendu responsive.
- [ ] Créer le checkpoint final et publier la modification.

## État

Phase en cours : checkpoint final et livraison.
