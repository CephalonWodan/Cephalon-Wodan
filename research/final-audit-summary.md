# Rapport Final : Audit et Refonte du Moteur de Calcul Warframe

## 1. Introduction et Démarche
À la demande de l’utilisateur et en s’appuyant sur les pages officielles du Wiki Warframe (`Calculating Bonuses` [1], `Health` [2], `Shield` [3], `Abilities` [4], `Damage` [5], `Arcane Enhancement` [6], `Archon Shard` [7]), nous avons conduit un **audit complet du moteur de calcul** de l’application **WARFRAME Set Builder**. 

L’objectif était de remplacer les approximations empiriques par des modèles mathématiques rigoureux et conformes au comportement du jeu en jeu (Arsenal).

---

## 2. Synthèse des Évolutions Majeures du Moteur (`calculator.ts`)

### A. Statistiques de Survie (Santé, Boucliers, Armure)
- **Modèle de cumul additif officiel** : Les bonus de pourcentage des mods et des éclats s’additionnent avant d’être multipliés par la statistique de base au rang 30, tandis que les bonus plats s’ajoutent en fin de calcul.
- **Dissociation des boucliers et de l’armure** : Conformément à la page *Shield*, les boucliers bénéficient d’une réduction de dégâts inhérente de 50 % mais ne profitent pas de l’armure de la Warframe.
- **EHP (Effective Health Pool)** : Calcul de la résistance effective de la santé en appliquant la formule d’armure officielle :
$$\text{DR} = \frac{\text{Armure}}{\text{Armure} + 300}, \quad \text{EHP} = \frac{\text{Santé}}{1 - \text{DR}} = \text{Santé} \times \frac{\text{Armure} + 300}{300}$$

### B. Capacités et Efficacité Énergétique
- **Bornes d’efficacité** : Implémentation du plafond d’efficacité non canalisée officiel :
$$\text{Coût Final} = \text{Coût de Base} \times \max(200\% - \text{Efficacité}, 25\%)$$
- **Drain canalisé** : Intégration de la formule combinant durée et efficacité :
$$\text{Drain} = \text{Drain de Base} \times \max\left(\frac{200\% - \text{Efficacité}}{\text{Durée}}, 25\%\right)$$

### C. Dégâts des Armes, Critiques et Factions
- **Dégâts modulaires et éléments** : Calcul précis des dégâts de base moddés, majorés par les multiplicateurs de faction (Grineer, Corpus, Infestés) et le combo de mêlée (`1 + \text{combo} \times 0.5 + \text{stance}`).
- **Simulation Critique & Tirs à la Tête** : Calcul de la moyenne critique `Crit Average = Hit \times (1 + CC \times (CM - 1))` et du multiplicateur de tir à la tête (`x2.0` standard).

---

## 3. Améliorations de l’Interface et Transparence
- **Infobulles Interactives** : Chaque statistique affichée dans le HUD permet désormais de visualiser la formule exacte ainsi que la contribution de chaque mod, arcane ou éclat d’Archonte.
- **Comparateur de DPS** : Graphique en direct comparant les performances des armes principales, secondaires et de mêlée équipées.

---

## 4. Références Officielles du Wiki Warframe
1. [Calculating Bonuses](https://wiki.warframe.com/w/Calculating_Bonuses) [1]
2. [Health](https://wiki.warframe.com/w/Health) [2]
3. [Shield](https://wiki.warframe.com/w/Shield) [3]
4. [Abilities](https://wiki.warframe.com/w/Abilities) [4]
5. [Damage](https://wiki.warframe.com/w/Damage) [5]
6. [Arcane Enhancement](https://wiki.warframe.com/w/Arcane_Enhancement) [6]
7. [Archon Shard](https://wiki.warframe.com/w/Archon_Shard) [7]
