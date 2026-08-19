
## Validation visuelle du Builder

Après sélection d’Ash Prime dans `/builder`, le panneau Helminth affiche bien les noms réels : **Shuriken**, **Smoke Screen**, **Teleport** et **Blade Storm**, sans « Compétence 1 ». Les statistiques issues de `Module:Ability/data/stats` sont également visibles sous les capacités, par exemple `Energy Cost: 25`, `Slash Damage On Hit: 500`, `Range: 10m` et `Duration: 8s`. Les options de remplacement utilisent aussi le nom réel dans leur libellé.

## Reproduction du chemin persisté

Après rechargement du Builder, le build persisté s’est réhydraté avec Ash Prime et le panneau Helminth affichait toujours les quatre noms réels (`Shuriken`, `Smoke Screen`, `Teleport`, `Blade Storm`). Le clic sur le slot a ensuite réinitialisé l’équipement dans la session de test ; le cas utilisateur n’est donc pas reproduit avec Ash Prime dans cette session et doit être validé sur la Warframe exacte concernée.

## Test contrôlé du localStorage legacy

Le localStorage de la session contenait un build sans Warframe après le clic de réinitialisation. Un build de test a ensuite été injecté avec `warframe: { name: "Ash Prime", abilities: ["Compétence 1", …] }`, sans identifiant. Ce cas vérifie la résolution par nom lors du prochain rechargement.

## Résultat du test legacy

Après rechargement avec le build injecté contenant `Compétence 1–4`, le Builder a réhydraté Ash Prime depuis le catalogue. Le contrôle DOM confirme : `hasGenericSlotLabel: false`, `hasGenericDescription: false`, et présence de `Shuriken`, `Smoke Screen`, `Teleport` et `Blade Storm`.
