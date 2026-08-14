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


## TODO — Filtre de reliques par composant ciblé

- [x] Relier le composant sélectionné du simulateur au catalogue des reliques.
- [x] Ajouter un bouton pour désactiver le filtre et revenir aux 773 reliques.
- [x] Vérifier la combinaison avec la recherche texte et le filtre par ère.
- [x] Tester TypeScript, build, responsive et publier la modification.

## État

Phase en cours : checkpoint final et livraison.


## TODO — Affectation rapide des reliques

- [x] Ajouter une action sur chaque carte de relique du catalogue.
- [x] Permettre de choisir le slot Joueur 1 à 4 avant l’affectation.
- [x] Recalculer la probabilité Radshare après affectation.
- [x] Tester TypeScript, build, filtres et responsive avant publication.

## État

Phase en cours : checkpoint final et livraison.


## TODO — Synchronisation GitHub finale

- [ ] Vérifier le remote et le statut git local.
- [ ] Ajouter tous les fichiers modifiés et les nouveaux modules WFCD/Reliques.
- [ ] Faire un commit avec message explicite.
- [ ] Pousser sur main et rédiger le rapport final.

## État

Phase en cours : audit de l’état local et du remote.


## TODO — Retour à l’accueil

- [x] Vérifier le layout global et les routes de l’application.
- [x] Ajouter un accès Accueil persistant sur toutes les pages.
- [x] Tester la navigation depuis les pages principales et le responsive.
- [x] Créer le checkpoint final et publier la modification.

## État

Phase en cours : checkpoint final et livraison.


## TODO — Nettoyage des armes nulles

- [x] Identifier dans le code de chargement ou le dataset les armes dont total damage, crit, crit multiplier et status sont à 0.
- [x] Filtrer ces entrées pour qu’elles n’apparaissent plus dans le catalogue d’armes ni dans le builder.
- [x] Vérifier les compteurs de la page d’accueil et le build de production.
- [x] Créer le checkpoint final et livrer le catalogue épuré.

## État

Phase en cours : checkpoint final et livraison.


## TODO — Extracteur Public Export et Sélecteur de langue

- [x] Créer le script d’extraction et de normalisation des tables françaises.
- [x] Automatiser la synchronisation dans le workflow GitHub Actions.
- [x] Ajouter le contexte et le sélecteur de langue (Français / Anglais) dans l’application.
- [x] Valider avec TypeScript, le build de production et les captures responsive.

## État

Phase en cours : checkpoint final et livraison.


## TODO — Synchronisation GitHub finale v2

- [ ] Vérifier le remote et la configuration GitHub.
- [ ] Confirmer l’inclusion de tous les scripts d’extraction, workflows et composants multilingues.
- [ ] Enregistrer et valider le checkpoint final lié au dépôt.
- [ ] Présenter le rapport de synchronisation à l’utilisateur.

## État

Phase en cours : audit de l’état local.


## TODO — Onglets MOA et Hound pour les Compagnons

- [x] Vérifier la classification des MOA et Hound dans COMPANIONS.
- [x] Créer les onglets dédiés dans la page Compagnons (Tous, Sentinelles, Kubrow/Kavat, MOA, Hound).
- [x] Vérifier le modding et le filtrage des mods de compagnon.
- [x] Valider avec TypeScript, build de production et captures responsive.

## État

Phase en cours : checkpoint final et livraison.


## TODO — Composants modulaires MOA/Hound, Préceptes et Export Markdown Compagnon

- [ ] Définir les interfaces et données pour les têtes, cœurs, gyroscopes et griffes MOA/Hound.
- [ ] Intégrer les sélecteurs de composants modulaires dans le SetBuilder pour les compagnons MOA et Hound.
- [ ] Ajouter un filtre par préceptes et aptitudes uniques dans le sélecteur de mods de compagnon.
- [ ] Mettre à jour le calcul des statistiques de compagnon et l’export Markdown du set complet.
- [ ] Valider avec TypeScript, build de production et captures responsive.

## État

Phase en cours : audit du modèle des compagnons et des composants disponibles.


## TODO — Suivi Worldstate et compatibilité mobile/tablette

- [ ] Vérifier les endpoints utiles de l’API WarframeStat et définir le modèle local des alertes et incursions.
- [ ] Centraliser la récupération, le rafraîchissement périodique et la gestion d’erreur du Worldstate.
- [ ] Ajouter le panneau de suivi temps réel des alertes et des incursions dans l’interface HUD.
- [ ] Ajouter les états de chargement, absence de données, API indisponible et dernière synchronisation.
- [ ] Auditer la structure Layout, la navigation et les pages principales aux breakpoints mobile et tablette.
- [ ] Corriger les débordements horizontaux, la navigation compacte et les grilles de catalogue.
- [ ] Vérifier les modales, filtres, panneaux de statistiques et builder sur 375 px, 768 px et desktop.
- [ ] Exécuter le contrôle TypeScript, le build de production et la validation visuelle finale.
- [ ] Mettre à jour la checklist et sauvegarder une version publiée.


## État — Suivi Worldstate et compatibilité mobile/tablette

- [x] Vérifier les endpoints publics et normaliser alertes, invasions, incursions, fissures et cycles.
- [x] Ajouter le rafraîchissement automatique toutes les deux minutes, le bouton manuel, l’horodatage et le repli local.
- [x] Ajouter le panneau Worldstate sur l’accueil et la page dédiée `/worldstate`.
- [x] Ajouter les états API live, synchronisation, erreur et absence de données.
- [x] Ajouter l’accès Worldstate dans la navigation latérale.
- [x] Corriger le header, le contenu principal, les grilles du builder, les onglets mobiles et la modale de sélection pour les petits écrans.
- [x] Vérifier 375 px, 768 px et 1280 px avec captures visuelles.
- [x] Exécuter `pnpm check` et `pnpm build` avec succès.
- [x] Créer le checkpoint final et livrer la version publiée.

## État

Phase terminée : suivi Worldstate et compatibilité mobile/tablette validés.


## TODO — Fallback images Wiki/API

- [ ] Auditer les champs imageUrl, iconUrl, wikiLink et les règles actuelles du résolveur d’assets.
- [ ] Définir une résolution prioritaire : asset local, image API/Wiki, puis visuel générique.
- [ ] Ajouter un fallback robuste avec gestion des erreurs de chargement et anti-boucle.
- [ ] Brancher le fallback dans les cartes, modales et sélecteurs de Warframes, armes et mods.
- [ ] Vérifier la couverture sur les éléments sans image et la compatibilité mobile.
- [ ] Exécuter TypeScript, build, validation visuelle et publier un checkpoint.


## État — Fallback images Wiki/API

- [x] Auditer les champs `imageUrl`, `imageName`, `iconUrl`, `wikiaUrl` et les conventions existantes.
- [x] Ajouter la résolution multi-candidats avec image locale/API, CDN officiel `cdn.warframestat.us`, vignette OpenGraph Wiki et conventions Wiki.
- [x] Ajouter la gestion des erreurs de chargement, le cache des requêtes et la prévention des correspondances API approximatives erronées.
- [x] Brancher le composant sur les cartes et modales des Warframes, armes, mods et arcanes.
- [x] Vérifier desktop et mobile sur les catalogues concernés.
- [x] Valider le chemin API → CDN avec `Munit Gyro` et exécuter `pnpm check` ainsi que `pnpm build`.
- [x] Créer le checkpoint final et publier la version.


## TODO — Images Wiki explicites

- [ ] Vérifier les quatre URLs Wiki et les fichiers média associés.
- [ ] Ajouter les mappings explicites Uriel, Cyte-09, Sirius et Orion au résolveur d’assets.
- [ ] Vérifier que les entrées correspondantes du dataset utilisent ces visuels sans casser le fallback CDN/Wiki.
- [ ] Tester le rendu dans les catalogues et la sélection du builder.
- [ ] Exécuter TypeScript, build et publier le checkpoint de correction.


## État — Images Wiki explicites Uriel / Cyte-09 / Sirius / Orion

- [x] Vérifier les quatre URLs Wiki et confirmer les réponses PNG 200.
- [x] Ajouter les mappings explicites au résolveur et au dataset.
- [x] Ajouter `imageUrls` et afficher côte à côte Sirius et Orion dans le catalogue.
- [x] Vérifier Uriel, Cyte-09 et Sirius & Orion dans le catalogue filtré.
- [x] Vérifier la réutilisation du composant dans le builder.
- [x] Exécuter `pnpm check` et `pnpm build` avec succès.
- [x] Créer le checkpoint final et publier la version.
