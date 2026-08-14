# Rapport d’Audit des Dépôts Externes : arsenal-parser et LotusLib

## 1. Introduction
Pour renforcer la robustesse, l’extensibilité et la fidélité de notre **WARFRAME Set Builder**, nous avons cloné et analysé deux dépôts de référence de la communauté :
- **WFCD/arsenal-parser** [1] : Spécialisé dans l’analyse et la normalisation des données d’arsenal issues des exportations publiques de Warframe.
- **Puxtril/LotusLib** [2] : Bibliothèque utilitaire pour l’ingénierie des données et le traitement des structures de Warframe.

---

## 2. Analyse et Comparaison

| Dépôt | Objectif Principal | Apport Potentiel pour le Set Builder | Décision d’Intégration |
| :--- | :--- | :--- | :--- |
| **WFCD/arsenal-parser** [1] | Normaliser les statistiques d’armes, warframes et mods depuis les fichiers de données brutes. | Fournir des structures de normalisation des types de dégâts et des attributs de modding. | Adopté conceptuellement pour structurer nos adaptateurs de données (`warframe-data.ts`). |
| **Puxtril/LotusLib** [2] | Fournir des helpers de calcul et des structures utilitaires pour les objets et entités Warframe. | Modèles de classes utilitaires pour l’évaluation des attributs et des modificateurs. | Intégré sous forme de fonctions utilitaires pures dans notre moteur de calcul (`calculator.ts`). |

---

## 3. Conclusion et Statut
Les structures de normalisation et les conventions issues de ces deux dépôts ont été recoupées avec notre moteur centralisé. Le projet respecte l’ensemble des standards de l’écosystème WFCD tout en restant une application web statique haute performance.

## 4. Références
1. [WFCD/arsenal-parser](https://github.com/WFCD/arsenal-parser) [1]
2. [Puxtril/LotusLib](https://github.com/Puxtril/LotusLib) [2]
