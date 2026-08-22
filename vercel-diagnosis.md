# Diagnostic Vercel — 19 août 2026

L’URL fournie `https://vercel.com/cephalon-wodans-projects` redirige vers la connexion puis affiche **Not Found / 404** après authentification. La page confirme que le compte est connecté, mais ce slug d’équipe n’est pas accessible ou n’existe pas.

En ouvrant `https://vercel.com/dashboard`, Vercel redirige vers l’espace personnel `https://vercel.com/wodan49s-projects`. La navigation affiche le tableau de bord Vercel avec les options Projects, Deployments, Import et Deploy. Aucun projet Warframe Set Builder n’a été confirmé dans le contenu extrait.

Conclusion provisoire : le 404 vient probablement du slug d’espace erroné (`cephalon-wodans-projects`) ou d’une équipe Vercel différente/non accessible, pas du code du dépôt. Le projet GitHub `CephalonWodan/Cephalon-Wodan` est synchronisé sur le commit `b00b4db7de31c038e8cb9acbda8cc98da703863f`.

L’URL de projet Vercel n’est pas encore connue. La prochaine action non destructive consiste à ouvrir l’espace personnel `wodan49s-projects` et vérifier la liste des projets. La création/import d’un projet ou le déploiement sur Vercel nécessitera une confirmation explicite de l’utilisateur avant soumission.

## Blocage d’import

Dans l’espace `wodan49s-projects`, la page Vercel propose l’import d’un dépôt GitHub. Après saisie de `https://github.com/CephalonWodan/Cephalon-Wodan`, Vercel affiche : **Could not access the repository. Please ensure you have access to it.**

Le compte Vercel est donc connecté, mais la connexion GitHub de Vercel n’a pas encore accès à ce dépôt. La page propose `Continue with GitHub` et `Manage Login Connections`. Une autorisation GitHub interactive par l’utilisateur est nécessaire avant de pouvoir lancer l’import ou le déploiement.

## Vérification de la connexion

Après l’autorisation supposée, le flux `/new` continue d’afficher **Could not access the repository** pour `https://github.com/CephalonWodan/Cephalon-Wodan`. Le bouton `Continue with GitHub` n’a pas ouvert de sélection de dépôt dans la session automatisée.

La page `/account/settings/authentication` concerne l’authentification du compte Vercel (passkeys, connexion Vercel et SAML) et ne montre pas de connexion GitHub exploitable. Il faut probablement utiliser le bouton GitHub du flux **New Project** ou installer/autoriser l’application Vercel GitHub depuis les paramètres GitHub du compte, avec accès au dépôt sélectionné.

## Configuration GitHub observée

La page GitHub de l’installation Vercel (`/settings/installations/58597628`) est accessible. L’application Vercel est installée depuis le 19 décembre 2024 et dispose d’autorisations de lecture/écriture sur le code, déploiements, hooks, checks et workflows.

La section **Repository access** propose `All repositories` ou `Only select repositories`, mais l’état précis du bouton radio n’a pas encore été confirmé dans la vue textuelle. Le flux Vercel `/new` ne liste toujours que `ayaproject`, pas `Cephalon-Wodan`; il faut donc vérifier/choisir l’option d’accès adaptée puis enregistrer avec le bouton `Save` sur GitHub. Cette modification nécessite une action de l’utilisateur.

## Cause exacte identifiée

Le dépôt `CephalonWodan/Cephalon-Wodan` est **public**, mais son propriétaire GitHub est un **compte personnel** `CephalonWodan`, tandis que la session Vercel/GitHub active correspond à `wodan49`. L’API GitHub confirme que `wodan49` dispose de droits administrateur/collaborateur sur le dépôt, mais n’en est pas le propriétaire.

La documentation Vercel indique qu’un dépôt personnel ne peut pas être importé ou connecté par un simple collaborateur, même avec des droits élevés ; le compte connecté doit être le propriétaire. Cela explique pourquoi l’espace Vercel Hobby ne liste que `ayaproject` et refuse le dépôt avec `Could not access the repository`.

Solutions possibles : se connecter à Vercel avec le compte GitHub propriétaire `CephalonWodan`, ou transférer le dépôt vers le compte `wodan49` avant l’import. Le transfert de propriété est une opération sensible et ne doit pas être lancé sans confirmation explicite.

## Diagnostic du 22 août 2026 — URL cephalon-wodan-f3oa.vercel.app

L’URL de production renvoie HTTP 200 mais avec `Content-Type: application/javascript` et un corps de 788 octets contenant le bundle compilé de `server/index.ts`. Elle ne sert donc pas `dist/public/index.html`. Le dépôt GitHub `main` ne contient pas encore `vercel.json`. Le commit de tête de la PR #3 est `4e62334e2251c56a532abed9949f8f4bdce4fc62`, contient désormais `vercel.json` et le script `build:static`, et les deux vérifications Vercel de la PR sont passées avec succès. L’URL fournie reste toutefois sur l’ancien déploiement/branche tant que ce commit n’est pas celui de la branche de production Vercel.
