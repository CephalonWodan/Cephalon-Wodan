# Migration du Cephalon vers Manus API v2

Le handler conserve Forge comme fournisseur historique et ajoute un fournisseur Manus API v2 sélectionnable côté serveur. Le choix s’effectue avec `LLM_PROVIDER` : `manus` force Manus API v2 ; `forge` active explicitement Forge. Si `LLM_PROVIDER` est omis, le handler utilise désormais Manus API v2 par défaut.

## Variables Vercel

| Variable | Valeur | Portée | Sensibilité |
| --- | --- | --- | --- |
| `LLM_PROVIDER` | `manus` | Production, et Preview si nécessaire | Config |
| `MANUS_API_KEY` | clé créée depuis les paramètres Manus API | Production | Secret |
| `MANUS_API_URL` | `https://api.manus.ai` | Production | Config |
| `MANUS_AGENT_PROFILE` | `manus-1.6-lite` ou `manus-1.6` | Production | Config |
| `MANUS_PROJECT_ID` | facultatif, identifiant d’un projet Manus | Production | Config |

La clé doit rester uniquement dans une variable Secret. Elle n’est jamais envoyée au navigateur, au dépôt Git ou aux journaux. La documentation officielle indique que l’authentification directe utilise l’en-tête `x-manus-api-key` et que la base d’API est `https://api.manus.ai`.

## Flux d’une requête

Pour un premier message, le handler appelle `POST /v2/task.create` avec le contexte RAG, le snapshot du Builder et l’historique compacté dans `message.content`. Il récupère le `task_id`, puis interroge `GET /v2/task.listMessages` jusqu’à obtenir un événement `assistant_message` ou un état d’erreur. Pour un tour suivant, le frontend renvoie `manusTaskId` et le handler appelle `POST /v2/task.sendMessage`. Le task ID retourné par le backend est conservé dans l’état du widget.

Le contexte RAG reste construit localement avant l’appel Manus. Les données de langue, mission, faction, niveau ennemi, priorité d’optimisation, Warframe active, équipement et recommandations d’éclats restent donc disponibles. Le format frontend reste `{ reply: string }`, avec en plus `manusTaskId` lorsque le fournisseur Manus est utilisé.

## Activation prudente

Dans Vercel, ajouter d’abord `MANUS_API_KEY` comme Secret pour Production, puis `LLM_PROVIDER=manus` et éventuellement `MANUS_API_URL`. Après sauvegarde, effectuer un nouveau déploiement : les variables d’environnement ne sont injectées dans les fonctions qu’au déploiement. `BUILT_IN_FORGE_API_URL` peut rester présente pour le mode de secours, mais elle est ignorée lorsque `LLM_PROVIDER=manus` ou lorsque la variable est omise. Tester ensuite `POST /api/chat` avec un message court. Une réponse générée par Manus confirme le chemin complet ; le message « L’API Manus n’est pas configurée » signifie que la clé n’est pas disponible dans l’environnement de la fonction ; une erreur d’authentification Manus indique une clé invalide ou révoquée.

Le handler ne bascule pas automatiquement de Manus vers Forge après une erreur d’authentification, afin d’éviter de masquer un mauvais paramétrage et de multiplier les appels. Forge peut être réactivé en remplaçant `LLM_PROVIDER` par `forge` après diagnostic.

## Références officielles

[1]: https://open.manus.ai/docs/v2/authentication
[2]: https://open.manus.ai/docs/v2/task.create
[3]: https://open.manus.ai/docs/v2/task.sendMessage
[4]: https://open.manus.ai/docs/v2/task.listMessages
