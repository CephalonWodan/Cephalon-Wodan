# Rapport d’Intégration : Schémas de Normalisation de `arsenal-parser`

## 1. Introduction
Suite à notre analyse du dépôt **WFCD/arsenal-parser** [1], nous avons extrait et adapté les principes de normalisation des attributs d'arsenal pour renforcer le pipeline de mise à jour automatique de notre dataset.

## 2. Implémentation
- **Adaptateur de synchronisation** : Intégration dans `scripts/extract-public-export.mjs` de règles de validation inspirées d'`arsenal-parser` pour filtrer les entrées corrompues ou sans valeurs statistiques actives.
- **Sécurité et Snapshot** : Conservation du système de sauvegarde automatique avant chaque fusion (`backups/datasets/`) pour permettre un retour arrière instantané en cas d'anomalie.

## 3. Références
1. [WFCD/arsenal-parser](https://github.com/WFCD/arsenal-parser) [1]
