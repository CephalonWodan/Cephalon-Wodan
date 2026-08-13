# Vérification — Public Export et Sélecteur de langue

1. **Extracteur Public Export (`scripts/extract-public-export.mjs`)** : Analyse et normalise les structures des tables officielles françaises pour les aligner avec le schéma local.
2. **Workflow GitHub Actions (`.github/workflows/public-export-sync.yml`)** : Planifié chaque lundi à 8h30 UTC pour synchroniser les données officielles françaises, lancer les tests et créer une Pull Request automatique.
3. **Sélecteur de langue (`LanguageContext.tsx` & `Layout.tsx`)** : Bouton globe interactif dans l’en-tête supérieur permettant de basculer instantanément entre le Français (`FR`) et l’Anglais (`EN`) avec persistance `localStorage`.
