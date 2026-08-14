# Règles de Calcul Officielles Warframe (Wiki)

## 1. Principe général de cumul (Additive vs Multiplicative Stacking)
- **Stacking Additif (`STACKING_MULTIPLY`)** : Les bonus en pourcentage du même type (ex: +% Santé, +% Dégâts de base, +% Force de pouvoir) s'additionnent entre eux avant d'être appliqués à la statistique de base.
  - Formule : `Stat Finale = Base × (1 + Somme des Bonus)`
  - Exemple : Un Warframe avec 300 PV de base et Vitalité (+440%) + Vitalité Archonte (+100%) aura :
    `300 × (1 + 4.4 + 1.0) = 300 × 6.4 = 1920 PV`.
- **Valeurs Fixes (`ADD`)** : Les bonus plats (ex: +50 PV, +25 Armure) s'ajoutent à la fin après les multiplicateurs en pourcentage.
  - Formule : `Stat Finale = [Base × (1 + Somme des pourcentages)] + Somme des bonus plats`.
- **Ordre des mods** : L'ordre d'installation des mods n'affecte pas le résultat final (sauf pour les ordres de combinaison élémentaire des armes).

## 2. Éclats d'Archonte et Variantes Tauforgées
- Les éclats d'Archonte standard appliquent leur bonus nominal.
- Les variantes **Tauforgées** appliquent un multiplicateur de **1.5x** sur l'effet nominal de l'éclat (ex: +15% Force de pouvoir devient +22.5%).

## 3. Armes et Dégâts
- Dégâts de base moddés : `Dégâts Totaux = Dégâts de Base × (1 + Somme des mods de dégâts de base) + Dégâts Élémentaires`
- Les dégâts élémentaires se calculent en pourcentage des dégâts de base (avant modificateurs de dégâts ou en multiplicateur additif selon le type).
