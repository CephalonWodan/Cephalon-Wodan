# Diagnostic Forge et solution de secours du Cephalon Codex

## Test Node.js local

Le script `scripts/diagnose-llm-endpoint.mjs` teste séparément la configuration, `/v1/models` et `/v1/chat/completions`. Il masque la clé dans la sortie et n’imprime jamais sa valeur.

Depuis un terminal local où la clé est autorisée, exécuter :

```bash
BUILT_IN_FORGE_API_URL='https://forge.manus.ai' \
BUILT_IN_FORGE_API_KEY='VOTRE_CLE_SAISIE_LOCALEMENT' \
node scripts/diagnose-llm-endpoint.mjs
```

Pour éviter de laisser la clé dans l’historique du terminal :

```bash
read -rsp 'Forge API key: ' BUILT_IN_FORGE_API_KEY
printf '\\n'
export BUILT_IN_FORGE_API_KEY
export BUILT_IN_FORGE_API_URL='https://forge.manus.ai'
node scripts/diagnose-llm-endpoint.mjs
unset BUILT_IN_FORGE_API_KEY BUILT_IN_FORGE_API_URL
```

| Résultat | Interprétation |
|---|---|
| `DIAGNOSIS=UPSTREAM_CHAT_OK` | URL, clé, chemin et modèle fonctionnent depuis cet environnement. |
| `DIAGNOSIS=KEY_INVALID_OR_UNAUTHORIZED` | La clé est absente, invalide, expirée ou non autorisée. |
| `DIAGNOSIS=BASE_URL_OR_ROUTE_IS_WRONG` | Le serveur est joignable, mais le chemin utilisé n’existe pas. |
| `networkError` ou `TIMEOUT` | Problème DNS, réseau, TLS ou restriction de sortie. |
| `/v1/models` en 200 mais chat en 404 | L’authentification est probablement acceptée, mais le chemin de chat ou le modèle n’est pas disponible. |

Un résultat local positif avec un résultat Vercel en 404 pointerait vers une différence de clé, d’environnement Production ou une restriction d’accès depuis Vercel. Un 404 dans les deux environnements pointerait vers l’URL ou le chemin Forge.

## Alternative de secours si Vercel est bloqué

La clé doit rester côté serveur. Il ne faut pas appeler le fournisseur LLM depuis React et il ne faut jamais utiliser une variable `VITE_*` pour une clé secrète.

### Option A — héberger uniquement l’API chatbot dans un serveur autorisé

Conserver le frontend statique sur Vercel, mais déplacer `/api/chat` vers un environnement serveur qui autorise l’accès au proxy Forge, par exemple l’environnement Manus si le support confirme cette possibilité. Le navigateur continue d’appeler une URL publique `/api/chat`; cette API récupère le contexte du Builder, exécute le RAG et appelle Forge côté serveur.

Variables serveur :

```text
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=<clé secrète autorisée>
```

Le frontend doit utiliser une variable publique contenant uniquement l’URL de l’API applicative, par exemple `VITE_CHAT_API_URL=https://api.example.tld/api/chat`. Cette variable ne doit jamais contenir la clé ni l’URL Forge privée.

### Option B — utiliser un fournisseur LLM compatible OpenAI depuis Vercel

Si Manus confirme que Forge n’est pas accessible depuis Vercel, remplacer uniquement l’adaptateur amont par un fournisseur explicitement compatible avec les requêtes OpenAI Chat Completions. Le Builder, le RAG et le contrat `/api/chat` peuvent rester inchangés.

Variables recommandées :

```text
LLM_API_URL=<URL de base officielle du fournisseur>
LLM_API_KEY=<clé créée dans le compte du fournisseur>
LLM_MODEL=<modèle réellement disponible>
```

Le handler utilise alors :

```text
${LLM_API_URL}/v1/chat/completions
```

Le code doit conserver la validation de la réponse, la limite de taille du contexte et le fallback bilingue existant. La clé reste une variable Secret Vercel en Production et Preview.

### Option C — mode de secours sans LLM

En attendant une autorisation fournisseur, `/api/chat` peut répondre avec les données structurées du RAG et du Builder : sources retrouvées, statistiques, règles de calcul et recommandations déterministes. Ce mode ne prétend pas être une réponse générée par IA. Il permet de conserver une interface utile et bilingue sans exposer de clé ni inventer de recommandations.

## Ordre de décision

1. Exécuter le diagnostic local et conserver seulement les statuts, jamais la clé.
2. Transmettre au support Manus la comparaison local/Vercel.
3. Si Forge est autorisé hors de Manus, conserver l’architecture actuelle et remplacer la clé Vercel par une clé officiellement autorisée.
4. Si Forge est restreint à Manus, déplacer l’API chatbot vers un serveur autorisé.
5. Si l’accès externe n’est pas prévu, utiliser un fournisseur compatible OpenAI avec ses propres variables secrètes.
6. En dernier recours, activer le mode RAG déterministe jusqu’à la confirmation du fournisseur.

La solution de secours ne doit pas modifier les calculs du Builder : le LLM formule des conseils, tandis que les statistiques, la capacité de modding, les dégâts et le DPS restent calculés par l’application.
