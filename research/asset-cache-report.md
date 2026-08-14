# Rapport : Automatisation et Cache Local des Assets Visuels

## 1. Introduction
Pour répondre à l’objectif de robustesse et éviter toute dépendance directe à des URL externes instables, nous avons conçu un système de gestion, de téléchargement et de cache local des assets visuels (mods, arcanes, warframes et armes).

## 2. Architecture du Cache Local
- **Dossier de stockage** : `client/public/assets/cache/`
- **Script de synchronisation** : `scripts/asset-cache-sync.mjs`
- **Sécurité et intégrité** : Le système vérifie l’existence des fichiers locaux et gère les fallbacks automatiques pour garantir qu’aucune image ne soit manquante dans l’interface.

## 3. Conclusion
Le cache visuel est pleinement intégré à l’infrastructure de l’application, garantissant une disponibilité constante des illustrations de l’arsenal Tenno.
