# Rapport d’Audit Complet du Moteur de Calcul Warframe

## 1. Objectif de l’Audit
Conformément aux spécifications du Wiki Warframe, cet audit identifie les écarts entre les formules empiriques du builder et les règles officielles, puis pose les bases d’un moteur de calcul rigoureux et unifié.

## 2. Analyse des Écarts par Domaine

| Domaine | Règle Officielle Wiki | État Actuel dans le Builder | Écart / Correction Requise |
| :--- | :--- | :--- | :--- |
| **Santé & Armure** | `Total = Base × (1 + Σ mods) + plats`. Armure EHP : `Net Armor / (Net Armor + 300)`. | Addition simplifiée et parfois linéaire sans séparation claire des sources. | Séparer les bonus de mods additifs des bonus plats et appliquer la formule d’EHP d’armure exacte. |
| **Boucliers** | `Total = Base × (1 + Σ mods)`. Les boucliers ne bénéficient pas de l’armure mais ont 50 % de DR. | Calcul additif simple présent mais sans gestion explicite du shield gating ni des immunités toxiques. | Clarifier l’absence d’armure sur les boucliers et documenter le shield gating. |
| **Énergie & Canalisées** | Capacité moddée additive. Drain canalisé : `M = B × (2 − E) × (1 / D)`. | Capacité calculée par Flow, mais le drain canalisé ne tient pas compte du ratio E/D officiel. | Implémenter la formule exacte du drain canalisé avec l’efficacité réelle et la durée. |
| **Capacités** | Force, Durée, Portée, Efficacité avec plafonds (Efficacité non canalisée bornée entre 25 % et 175 %). | Facteurs appliqués globalement sans vérification des bornes d’efficacité ni des exceptions par pouvoir. | Appliquer les bornes officielles d’efficacité (`max(200% - Efficiency, 25%)`) dans le HUD. |
| **Armes & Dégâts** | Cumul additif des mods de dégâts de base (`Serration`, etc.), multiplicateurs critiques `Base × (1 + Mod)`. | Partiellement implémenté mais mélangé avec des estimations fixes de DPS et de faction. | Standardiser les multiplicateurs de faction (Grineer, Corpus, Infestés) et les paliers de combo (x1 à x12). |
| **Aris / Éclats** | Arcanes conditionnelles vs Éclats permanents (multiplicateur Tauforgé x1.5). | Géré globalement mais sans traçabilité des conditions d’activation des arcanes. | Séparer les arcanes actives/conditionnelles des éclats permanents dans les infobulles. |

## 3. Plan d’Action de Refonte
1. Créer un module de calcul unifié (`client/src/lib/calculator.ts`) implémentant strictement les fonctions mathématiques du Wiki.
2. Intégrer la traçabilité des contributions (chaque mod et éclats retourne sa valeur exacte et sa source).
3. Mettre à jour `SetBuilder.tsx` pour consommer ce moteur centralisé.
