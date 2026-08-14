# Règles Wiki vérifiées — Arcanes et Éclats d’Archonte

## Arcane Enhancement

La page officielle décrit les arcanes comme des améliorations conditionnelles : leur effet est déclenché par une condition de mission et peut avoir une chance d’activation, une durée et un rafraîchissement. Une Warframe peut normalement équiper deux arcanes ; une arme peut en équiper une. Le calculateur doit donc distinguer les bonus statiques des effets conditionnels et ne pas présenter automatiquement un bonus conditionnel comme permanent.

Source : [Arcane Enhancement](https://wiki.warframe.com/w/Arcane_Enhancement).

## Archon Shard

Les éclats sont des améliorations permanentes installées via le Helminth. La page distingue les couleurs d’éclat, les variantes Tauforgées et les effets associés ; elle documente également la fusion coalescente et les buff d’éclat. Le moteur doit conserver la distinction entre valeur nominale et valeur Tauforgée, tout en signalant les interactions non documentées ou incertaines au lieu de les inventer.

Source : [Archon Shard](https://wiki.warframe.com/w/Archon_Shard).

## Implication pour le builder

Les effets sélectionnés doivent être représentés avec leur source, leur condition d’activation et leur statut permanent ou conditionnel. Les futurs calculs de santé, d’énergie, de puissance, de critique et de dégâts doivent exploiter ces métadonnées plutôt qu’un simple texte libre.

## Attributes

La page des attributs regroupe les statistiques essentielles : santé, boucliers, armure, vitesse de sprint, capacité d’énergie et modificateurs de capacité (force, durée, portée, efficacité). Elle confirme que le HUD doit traiter ces valeurs comme des familles distinctes et afficher leurs contributions séparément.

Source : [Attributes](https://wiki.warframe.com/w/Attributes).

## Armor

La réduction de dégâts Tenno est calculée selon `Net Armor / (Net Armor + 300)`. L’EHP doit donc être dérivée de la santé effective et de la réduction d’armure, et non d’un simple ajout linéaire d’armure. Cette règle est également nécessaire pour le sélecteur de faction et l’affichage des dégâts effectifs contre les cibles blindées.

Source : [Armor](https://wiki.warframe.com/w/Armor).

## Energy Capacity

La capacité d’énergie dépend du rang de la Warframe et peut être augmentée par des mods ou des buffs. La page confirme que Flow, Primed Flow et Archon Flow sont des mods de capacité d’énergie distincts et incompatibles entre eux. Le calculateur doit donc éviter de cumuler ces trois mods et doit distinguer capacité maximale, énergie de départ et capacité effective de lancement.

Source : [Energy Capacity](https://wiki.warframe.com/w/Energy).

## Shield

Les boucliers se régénèrent automatiquement, bénéficient d’une réduction de dégâts de 50 % pour les Warframes et ne bénéficient pas de l’armure. Les dégâts de Toxine ignorent les boucliers normaux et les dégâts Magnétiques les affectent davantage. La formule de boucliers moddés est additive sur le multiplicateur : `Total Shields = Base Shields × (1 + bonus de mods + bonus de capacités)`. Le calculateur doit donc séparer les boucliers de l’EHP de santé et représenter les effets de shield gating comme une mécanique distincte.

Source : [Shield](https://wiki.warframe.com/w/Shield).

## Sprint Speed

La vitesse de sprint est un attribut distinct de la vitesse de déplacement. Le sprint ajoute 25 % à la vitesse de marche de base, tandis que les bonus de vitesse de déplacement et de vitesse de sprint n’ont pas toujours les mêmes interactions avec les capacités qui empêchent de sprinter. Le HUD doit donc afficher séparément la valeur de sprint et les bonus de mouvement.

Source : [Sprint Speed](https://wiki.warframe.com/w/Sprint_Speed).

## Warframe Augment Mods

Un mod d’augmentation modifie une capacité ou un passif précis et ne peut être équipé que sur la Warframe qui possède cette capacité. Un seul augment d’une même capacité peut être équipé à la fois. Le moteur doit valider la compatibilité Warframe/capacité et ne doit pas traiter un augment comme un bonus générique de dégâts ou de force.

Source : [Warframe Augment Mods](https://wiki.warframe.com/w/Warframe_Augment_Mods).

## Casting Speed

La vitesse d’incantation agit sur la durée d’animation d’une capacité selon `temps d’animation de base / (1 + bonus de vitesse)`. Elle doit être modélisée séparément de la durée de capacité, de l’efficacité et de la force.

Source : [Abilities — Casting Speed](https://wiki.warframe.com/w/Casting_Speed).

## Helminth — Ability Replacement

Helminth permet de remplacer certaines capacités d’une Warframe par une capacité subsumée ou une capacité Helminth. Les remplacements sont liés à une configuration de mod et une capacité ne doit pas être traitée comme un simple bonus universel : la capacité active, ses statistiques et ses interactions doivent rester identifiables. Les passifs ne sont pas subsumables selon la page consultée.

Source : [Helminth — Ability Replacement](https://wiki.warframe.com/w/Helminth#Ability_Replacement).

## Passives

Les passifs sont des effets propres à une Warframe ou une arme, actifs sans consommation d’énergie et parfois soumis à des conditions. Ils doivent être calculés comme une source séparée des mods, arcanes et capacités. La page illustre aussi que les bonus de dégâts de statut peuvent avoir leur propre règle de cumul.

Source : [Passives](https://wiki.warframe.com/w/Passives).

## Ability Duration

La durée de capacité de base est de 100 %. La formule générale est `durée finale = durée de base × bonus de durée`. Pour les capacités canalisées, le drain d’énergie par seconde suit `M = B × (2 − E) × (1 / D)`, avec l’efficacité réelle avant plafond et la durée en valeur décimale. Le builder doit donc éviter de confondre durée, efficacité et coût de canalisation.

Source : [Ability Duration](https://wiki.warframe.com/w/Ability_Duration).

## Ability Efficiency

L’efficacité de base est de 100 %. Le coût final d’une capacité non canalisée suit `coût final = coût de base × max(200 % − efficacité, 25 %)`. Le coût effectif ne peut donc pas descendre sous 25 % ni dépasser 175 % du coût de base pour les capacités non canalisées. Pour les capacités canalisées, la durée intervient aussi dans le drain et l’efficacité réelle peut dépasser 175 % dans certaines situations de durée négative.

Source : [Ability Efficiency](https://wiki.warframe.com/w/Ability_Efficiency).

## Ability Range

La portée modifie le rayon et la distance de ciblage des capacités, mais certaines capacités comme la portée d’affinité suivent leurs propres règles. Le moteur doit donc conserver une valeur de portée générique et permettre des exceptions par capacité au lieu d’appliquer aveuglément le même multiplicateur partout.

Source : [Ability Range](https://wiki.warframe.com/w/Ability_Range).

## Ability Strength

La force de capacité modifie les dégâts et la puissance de nombreuses capacités, mais son effet exact dépend de la capacité concernée. Les pouvoirs possèdent quatre emplacements distincts et leurs statistiques doivent être affichées par capacité lorsque les données sont disponibles. La page signale également que certaines notes de maximisation anciennes ne sont plus fiables depuis l’arrivée des éclats et mods Archonte ; le builder doit donc privilégier les valeurs et effets courants du dataset.

Source : [Abilities — Ability Strength](https://wiki.warframe.com/w/Ability_Strength).

## Références consultées

Arcane Enhancement, Archon Shard, Attributes, Armor, Energy, Health, Shield, Sprint Speed, Warframe Augment Mods, Casting Speed, Helminth — Ability Replacement, Passives, Ability Duration, Ability Efficiency, Ability Range et Ability Strength ont été consultées et synthétisées dans ce fichier.
