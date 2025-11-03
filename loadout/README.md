# Loadout Builder React app

Ce dossier `loadout/` contient une application React pour composer des builds
Warframe. Elle utilise l'API enrichie de Cephalon‑Wodan pour récupérer les
données (Warframes, armes, mods, arcanes, shards) et propose un fallback
automatique vers Supabase si l'API est indisponible.

## Usage en local

```
cd loadout
npm install
npm run dev
```

Par défaut, l'application consulte l'API à l'adresse
`https://cephalon-wodan-production.up.railway.app`. Vous pouvez remplacer
l'URL via le fichier `.env` :

```
# .env
VITE_CEPHALON_API_BASE=https://cephalon-wodan-production.up.railway.app
# Ces variables sont optionnelles et seulement utilisées comme repli
# lorsque l'API échoue.
VITE_SUPABASE_URL=...            # URL Supabase
VITE_SUPABASE_ANON_KEY=...       # Clé anonyme Supabase
```

## Déploiement GitHub Pages

Le fichier `.github/workflows/deploy-loadout.yml` configure la compilation et
le déploiement de cette application dans un sous-répertoire `/loadout/` de
votre dépôt GitHub. Assurez-vous de modifier la variable `BASE_PATH` dans la
workflow pour l’adapter au nom exact de votre dépôt (par défaut
`/Cephalon-Wodan/loadout/`).

Après un push sur la branche `main`, la GitHub Action construit
l'application et la publie automatiquement sur GitHub Pages. L'URL de votre
application ressemblera à :

```
https://<votre-utilisateur>.github.io/<nom-du-repo>/loadout/
```

## Sauvegarde des builds

Pour sauvegarder vos builds, vous devez fournir les variables
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (et possiblement
`VITE_SUPABASE_SERVICE_ROLE` pour la synchronisation). Sans ces variables,
l'application fonctionnera mais vous ne pourrez pas persister les builds.