# Suivi de projet — Warframe Set Builder

## Nouvelle demande — Compagnons à 10 emplacements de mods

- [x] Passer le nombre d’emplacements de mods compagnon de 8 à 10 dans les types et la fabrique de set.
- [x] Mettre à jour la normalisation, les polarités et les grilles de mods compagnon.
- [x] Valider TypeScript, build, persistance et export.


## Nouvelle demande — Emplacements Aura/Exilus et UX inspirée d’Overframe

- [x] Ajouter les emplacements dédiés Aura et Exilus avec leurs règles de capacité et polarité spécifiques.
- [x] Réorganiser la grille de modding et les statistiques du Builder dans un esprit ergonomique inspiré d’Overframe tout en préservant l’identité Tenno Codex.
- [x] Valider l’import/export JSON, la persistance, TypeScript et le build.


## Nouvelle demande — Protection de la branche main GitHub

- [x] Activer les règles de protection sur `main` via l’API GitHub.
- [x] Empêcher les force-push et la suppression de branche.
- [x] Valider et tester l’application des règles.


## Nouvelle demande — Pastilles d’icônes sans texte visible

- [x] Retirer les noms visibles des pastilles (`Slash`, `Viral`, `Heat`, etc.).
- [x] Conserver `alt`, `title` et une infobulle accessible pour chaque icône.
- [x] Vérifier le rendu, compiler et publier.


## Nouvelle demande — Correction des icônes miniatures Wiki dans les capacités

- [x] Tester les URLs Wiki réelles pour SlashSymbol.png et autres types de dégâts.
- [x] Mettre à jour les URLs du résolveur avec les fichiers Wiki valides confirmés en HTTP 200.
- [x] Compiler, valider et publier le correctif.


## Nouvelle demande — Balises orphelines et icônes Wiki manquantes

- [x] Auditer toutes les balises et identifier celles sans correspondance dans le résolveur.
- [x] Rechercher les icônes officielles sur le Wiki (SlashSymbol.png, ImpactSymbol.png, PunctureSymbol.png, etc.).
- [x] Mettre à jour le résolveur dans SetBuilder.tsx et valider.


## Nouvelle demande — Descriptions complètes des capacités Warframe

- [x] Supprimer la troncature automatique des descriptions de capacités.
- [x] Ajouter un affichage complet avec hauteur adaptative et défilement interne si nécessaire.
- [x] Vérifier le rendu desktop/mobile, compiler et publier.


## Nouvelle demande — Balises Wiki de dégâts et d’effets (<DT_...>)

- [x] Identifier toutes les balises `<DT_...>`, `<SE_...>` ou similaires dans les descriptions de capacités.
- [x] Créer une table de correspondance vers les icônes officielles du Wiki Warframe (ex: Viral, Heat, Toxin, etc.).
- [x] Rendre les balises sous forme de miniatures dans le Builder et les exports, puis valider.


## Nouvelle demande — Enrichissement officiel des 22 Warframes en fallback

- [x] Recenser les 22 Warframes et leurs capacités sans `officialStats`.
- [x] Extraire les statistiques officielles depuis les modules Wiki Ability.
- [x] Intégrer les données, vérifier la couverture 117/117 et publier le résultat.


## Rapport d’audit — Capacités dynamiques des 117 Warframes

- [x] Vérifier la couverture des 4 capacités pour les 117 Warframes (100% validé, 0 échec).
- [x] Valider le calcul en direct de la Force, Durée, Portée et Efficacité.
- [x] Valider les indicateurs colorés (vert/rouge avec sens des coûts et effets).
- [x] Intégrer les statistiques modifiées dans le résumé Markdown exportable.
- [x] Synchroniser l’ensemble sur le dépôt GitHub `CephalonWodan/Cephalon-Wodan`.


## Nouvelle demande — Mise à l’échelle dynamique des capacités (Force, Durée, Portée, Efficacité)

- [x] Structurer les lignes de statistiques des capacités selon le format d’exemple (`summary` et `rows` avec modificateurs `AVATAR_ABILITY_STRENGTH`, etc.).
- [x] Calculer dynamiquement les valeurs affichées en fonction des facteurs de puissance de la Warframe active.
- [x] Afficher les valeurs modifiées dans les cartes de capacités du panneau Helminth et de la Warframe.
- [x] Valider avec des mods de Force, Durée, Portée et Efficacité, compiler et publier.


## Nouvelle demande — Les capacités génériques restent visibles

- [x] Reproduire le cas exact dans le Builder et identifier la Warframe concernée.
- [x] Tracer la donnée réellement reçue par `wfAbilities`, y compris les builds persistés.
- [x] Corriger l’affichage à la source et valider le cas signalé avec un build legacy injecté.


## Nouvelle demande — Modules Wiki Ability officiels

- [x] Auditer `Module:Ability/infobox` et `Module:Ability/data/stats` comme sources structurées.
- [x] Adapter l’enrichisseur pour récupérer les noms, descriptions et statistiques réelles des capacités.
- [x] Valider le rendu Helminth et supprimer les fallbacks génériques restants.


## Nouvelle demande — Capacités natives non résolues dans le panneau Helminth

- [ ] Auditer les structures de capacités Warframe réellement chargées par le Builder.
- [ ] Résoudre les noms depuis les tableaux de chaînes, objets structurés et fallbacks officiels sans libellé générique.
- [ ] Tester plusieurs Warframes, compiler et valider le rendu Helminth.


## Nouvelle demande — Noms des capacités natives dans le panneau Helminth

- [x] Remplacer les libellés « Capacité 1–4 » par les noms réels des capacités de la Warframe sélectionnée.
- [x] Conserver un affichage explicite de la capacité native remplacée lorsqu’une substitution Helminth est active.
- [x] Vérifier TypeScript, le build et le rendu du Builder.


## Nouvelle demande — Correctif Helminth après dysfonctionnement signalé

- [ ] Reproduire le problème après sélection d’une Warframe dans le Builder.
- [ ] Corriger l’affichage des capacités natives, le choix du slot et la sélection de l’aptitude Helminth.
- [ ] Vérifier le blocage des buffs de dégâts incompatibles, la persistance et l’import/export.
- [ ] Compiler, tester visuellement et publier uniquement après validation du flux réel.

## Nouvelle demande — Helminth complet (checklist officielle, compétences natives et restrictions)

- [x] Enrichir `helminth-data.ts` pour couvrir l’intégralité des aptitudes subsumables officielles (plus de 40 capacités).
- [x] Afficher clairement les quatre compétences originales de la Warframe active et permettre de cibler précisément celle à remplacer.
- [x] Implémenter les restrictions officielles de buffs de dégâts (Eclipse, Roar, Xata’s Whisper) selon les règles du Wiki.
- [x] Valider TypeScript, le build de production et le rendu responsive.
- [ ] Sauvegarder le checkpoint et publier la mise à jour.

## Nouvelle demande — Helminth dynamique et sélecteur avancé

- [x] Auditer les statistiques d’aptitudes et les contributions de mods de la Warframe.
- [x] Ajouter une barre de recherche et des filtres par catégorie au sélecteur Helminth : dégâts, contrôle, buff, utilitaire et défensif.
- [x] Calculer dynamiquement Force, Durée, Portée, Efficacité et coût énergétique des aptitudes sélectionnées à partir des mods, arcanes et éclats actifs.
- [x] Afficher les valeurs calculées dans le Builder et le résumé Markdown ; TypeScript, build production et responsive desktop/mobile validés.
- [ ] Sauvegarder le checkpoint et publier la mise à jour.

## Nouvelle demande — Intégration Helminth dans le Builder

- [x] Auditer les capacités subsumables Helminth de référence et concevoir le module de remplacement par slot.
- [x] Créer le fichier `helminth-data.ts` regroupant les capacités subsumées officielles (Roar, Eclipse, Nourish, Pillage, Gloom, Ensnare, Dispenser, etc.).
- [x] Ajouter les sélections Helminth aux types de builds et à la normalisation import/export.
- [x] Intégrer le panneau de substitution Helminth dans le cockpit du Builder, compiler et valider le build de production.
- [ ] Sauvegarder le checkpoint et publier la mise à jour.

## Nouvelle demande — Validation stricte de capacité des mods

- [x] Auditer les flux d’ajout, de rang et de polarité des mods.
- [x] Bloquer l’ajout d’un mod si la capacité disponible est dépassée.
- [x] Bloquer les changements de rang ou de polarité qui dépassent la capacité.
- [x] Ajouter un retour visuel explicite, compiler et valider le build.
- [ ] Sauvegarder le checkpoint et publier la mise à jour.

## Nouvelle demande — Polarités Umbra et mods sacrificiels

- [x] Auditer les types de polarités, les slots et le calcul de capacité existants.
- [x] Ajouter la sélection de polarité Umbra pour les slots de Warframes, armes et compagnons.
- [x] Rendre Sacrificial Steel et Sacrificial Pressure compatibles avec la polarité Umbra via leur polarité `umbra` déjà présente dans le dataset ; le coût et la capacité se recalculent immédiatement.
- [x] Valider TypeScript, le build de production et le rendu responsive desktop/mobile.
- [ ] Sauvegarder le checkpoint et publier la mise à jour.

## Nouvelle demande — Excalibur Umbra Prime

- [ ] Inspecter la fiche actuelle d’Excalibur Umbra Prime dans le dataset.
- [ ] Extraire les statistiques officielles, compétences, passif et image Wiki (`https://wiki.warframe.com/images/ExcaliburUmbraPrime.png?9f21a`).
- [ ] Mettre à jour `warframe-data-full.json` et enrichir le résolveur d’assets.
- [ ] Valider le build, les types et synchroniser avec GitHub.

## Nouvelle demande — Diagnostic 404 Vercel

- [ ] Vérifier l’état de l’URL Vercel après connexion.
- [ ] Distinguer une URL d’équipe invalide d’un projet non déployé ou d’un routage incorrect.
- [ ] Confirmer la configuration requise avant toute action de déploiement externe.

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


## Nouvelle demande — Fusion des éléments dans le résumé des dégâts

- [ ] Auditer le moteur de dégâts et les effets de mods élémentaires existants.
- [ ] Définir les combinaisons élémentaires Warframe et leurs libellés/couleurs d’affichage.
- [ ] Détecter les mods qui convertissent tous les types élémentaires vers un type unique et exclure ces cas de la fusion normale.
- [ ] Implémenter la fusion élémentaire et le regroupement des dégâts dans le calculateur.
- [ ] Afficher les éléments combinés et leur composition dans le résumé des dégâts.
- [ ] Tester Feu + Glace, autres combinaisons, plusieurs sources du même élément et conversions.
- [ ] Compiler, vérifier la console et enregistrer un checkpoint publiable.

## Rappel de style UI

- [ ] Préserver l’esthétique HUD Tenno Codex : contrastes cyan/orange, densité lisible, bordures angulaires et animations discrètes.


## Référence Wisp Défense, Créateurs Communautaires et Recommandations IA

- [x] Analyser la capture de build Wisp Défense (Don de Puissance, Fusion des Réservoirs, Colère Aveugle, Intensité/Allonge Archonte, etc.).
- [x] Intégrer cette configuration de référence et les 5 éclats rouges Tauforged (+75 %) dans les consignes du Cephalon pour les missions de Défense.
- [x] Intégrer les orientations et méthodes des créateurs reconnus (MHBlacky, PANDAAHH, TheKengineer, Unified Codex, Endryx_ow, Lau 5040, vu.thang205) comme sources secondaires d'optimisation.
- [x] Valider TypeScript, build de production et tests API réels.

## Nouvelle demande — Recommandations IA par mission et Warframe

- [x] Lire la persistance du build actif et récupérer la Warframe sélectionnée.
- [x] Définir les catégories d’objectifs de mission et les règles de contexte du prompt.
- [x] Transmettre la Warframe, les armes et le type de mission à l’API IA.
- [x] Ajouter un sélecteur de mission dans le widget Cephalon Codex.
- [x] Afficher une recommandation structurée : mods, arcanes, éclats, armes et priorités de gameplay.
- [x] Tester les scénarios avec et sans Warframe sélectionnée, puis compiler et publier.


## Nouvelle demande — Cinq éclats rouges tauforgés pour Wisp Défense

- [x] Vérifier la structure des éclats rouges tauforgés et le calcul de Puissance des capacités.
- [x] Mettre à jour la référence Wisp Défense avec cinq éclats configurés à +15 % chacun.
- [x] Faire apparaître le cumul de +75 % dans le contexte et les recommandations IA.
- [x] Tester la configuration, compiler et publier le checkpoint.


## Nouvelle demande — Optimisation IA haut niveau et statistiques en jeu

- [ ] Définir la hiérarchie entre statistiques finales observées en jeu, Wiki et dataset local.
- [ ] Ajouter les paramètres faction, niveau ennemi, solo/escouade et priorité d’optimisation.
- [ ] Renforcer le prompt pour comparer les archétypes dégâts, survie, soutien et endurance.
- [ ] Afficher les paramètres actifs dans le widget HUD et les transmettre à l’API.
- [ ] Valider une recommandation haut niveau avec Wisp Défense, cinq éclats rouges Tauforged et faction Grineer.
- [ ] Compiler, capturer les routes principales et publier un checkpoint.


## Nouvelle demande — Bibliothèque de presets communautaires

- [x] Recenser les archétypes inspirés de TheKengineer, MHBlacky et PANDAAHH sans présenter ces presets comme des endorsements officiels.
- [x] Valider tous les noms de Warframes, armes, mods et Arcanes contre le catalogue local.
- [x] Ajouter une bibliothèque filtrable dans le Builder avec prévisualisation et mission cible.
- [x] Permettre de charger un preset dans le set actif ou de le dupliquer comme variante.
- [x] Conserver les contrôles de capacité, les rangs, les polarités et les éclats Tauforged.
- [x] Tester chaque preset, compiler et publier un checkpoint.


## Nouvelle demande — Partage par lien URL compressé

- [x] Concevoir un sérialiseur/désérialiseur compact pour encoder le build actif et les variantes du comparateur.
- [x] Ajouter un bouton de génération et de copie rapide de lien partageable dans le cockpit du Builder.
- [x] Gérer l’analyse des paramètres d’URL au chargement de l’application pour restaurer instantanément le set.
- [x] Valider la compatibilité des identifiants et tester les liens générés avec un build complet.
- [x] Compiler, tester le build de production et publier un checkpoint.


## Nouvelle demande — Internationalisation complète Français / Anglais

- [ ] Créer un dictionnaire de traduction centralisé `client/src/lib/i18n.ts` couvrant l'ensemble de l'interface, des boutons, des messages et des sections.
- [ ] Connecter le sélecteur de langue existant à un état global persistant.
- [ ] Mettre à jour l'accueil, les catalogues (Warframes, Armes, Compagnons, Mods, Arcanes, Éclats), le Set Builder, le Worldstate, l'assistant IA et les exports Markdown/JSON.
- [ ] Valider le basculement dynamique entre le français et l'anglais, exécuter le build de production et enregistrer un checkpoint.
