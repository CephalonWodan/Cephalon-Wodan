# Diagnostic Vercel — 25 août 2026

Le log fourni pour le déploiement Vercel de `cephalon-wodan-f3oa` indique plusieurs erreurs HTTP 500 sur `/api/chat`.

Erreur exacte :

```text
TypeError [ERR_IMPORT_ATTRIBUTE_MISSING]: Module "file:///var/task/data/rag-index.json" needs an import attribute of "type: json"
code: ERR_IMPORT_ATTRIBUTE_MISSING
```

Cause : la fonction serverless Node.js traite le projet en ESM et l’import direct `import ragIndex from "../data/rag-index.json"` n’est pas accepté sans attribut JSON.

Correctif retenu : charger l’index avec `fs.readFileSync` et `path.resolve(process.cwd(), "data/rag-index.json")`, et inclure explicitement `data/rag-index.json` dans l’artefact de la fonction Vercel via `includeFiles`. Les statistiques du Builder restent séparées du retrieval RAG.

Source du diagnostic : logs Runtime Vercel fournis par l’utilisateur, déploiement `cephalon-wodan-f3oa`.
