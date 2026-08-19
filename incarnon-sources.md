# Sources Incarnon vérifiées

## Source structurée importée
Le fichier source local `/home/ubuntu/upload/incarnon_long_complete_patched_v4_nulls.jsonl` contient 1 143 lignes pour 48 profils Incarnon. Son schéma expose le nom de l’arme, le slot, le nombre d’évolutions, les défis, les activations et les perks textuels. Le script `scripts/normalize-incarnon.mjs` le convertit en `client/src/lib/incarnon-data.json`.

## Wiki officiel
La page officielle [Incarnon — WARFRAME Wiki](https://wiki.warframe.com/w/Incarnon) confirme que les Incarnons augmentent la létalité et ajoutent une forme alternative activée par une jauge ou une condition de combo selon l’arme. Elle précise que les Genèses Incarnon ont quatre évolutions, que l’installation de l’adaptateur constitue le premier défi, puis que les défis restants concernent notamment la mission solo, les éliminations en forme Incarnon et les conditions propres à l’arme.

La même page documente les bonus de mouvement de certaines armes de mêlée lors de la transformation Incarnon, par exemple vitesse de sprint et vélocité de parkour. Elle indique également que l’Évolution I est souvent l’activation de la forme Incarnon, et non un choix de perk chiffré. Le Builder n’invente donc pas de bonus de dégâts lorsqu’aucune valeur chiffrée n’est présente dans la source importée.

## Conséquence pour le moteur
Le sélecteur conserve l’arbre complet, l’état actif/inactif, l’évolution et le perk sélectionné. Le calcul extrait uniquement les valeurs explicitement écrites dans le texte du perk : dégâts, chance critique, multiplicateur critique et chance de statut. Si l’Évolution I ne contient qu’une activation, les dégâts restent inchangés et l’interface le signale explicitement.
