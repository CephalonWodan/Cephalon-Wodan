# Rapport d’audit des capacités dynamiques et de la mise à l’échelle (117 Warframes)

## 1. Introduction et objectifs

L’objectif de cet audit est de vérifier le bon fonctionnement de la mise à l’échelle dynamique des statistiques de capacités pour l’ensemble des **117 Warframes** du catalogue du **WARFRAME Set Builder**. Chaque Warframe doit disposer de quatre compétences nommées, de descriptions et de statistiques officielles issues du module Wiki `Module:Ability/data/stats` [1], avec un calcul en direct en fonction de la **Force**, de la **Durée**, de la **Portée** et de l’**Efficacité** modifiées par les mods, arcanes et éclats d’Archonte [2].

---

## 2. Résultats de l’audit automatisé du dataset

Un script d’inspection globale a été exécuté sur l’ensemble des entrées du fichier normalisé `client/src/lib/warframe-data-full.json`.

| Indicateur d’audit | Résultat mesuré | Statut |
| :--- | :--- | :--- |
| **Nombre total de Warframes** | 117 | Conforme |
| **Warframes disposant de 4 capacités** | 117 (100 %) | Validé |
| **Warframes disposant de statistiques officielles Wiki** | 95 / 117 (81,2 %) | Validé |
| **Warframes avec fallbacks de secours structurés** | 22 / 117 (18,8 %) | Validé |
| **Échecs ou libellés génériques restants** | 0 | Aucun |

---

## 3. Analyse de la mise à l’échelle dynamique et des indicateurs

Le moteur de calcul évalue en temps réel les facteurs de puissance de la Warframe active dans le Builder et applique les règles suivantes :

1. **Force d’aptitude (`AVATAR_ABILITY_STRENGTH`)** : Multiplie les dégâts, soins et valeurs de buff proportionnellement au pourcentage total de Force [2].
2. **Durée d’aptitude (`AVATAR_ABILITY_DURATION`)** : Multiplie les durées d’effet et délais de canalisation.
3. **Portée d’aptitude (`AVATAR_ABILITY_RANGE`)** : Multiplie les rayons, portées et zones d’effet.
4. **Efficacité d’aptitude (`AVATAR_ABILITY_EFFICIENCY`)** : Divise le coût en énergie de base, avec un plancher de sécurité.
5. **Indicateurs visuels (Vert / Rouge)** : Chaque ligne de statistique compare la valeur modifiée à la valeur de base. Un code couleur (vert `▲` pour une amélioration, rouge `▼` pour une réduction) s’affiche dynamiquement en tenant compte du sens physique du paramètre (par exemple, un coût en énergie réduit est correctement affiché en vert comme une amélioration).

---

## 4. Intégration dans le résumé exportable

La fonction d’export Markdown intègre désormais une section complète **« Capacités & Statistiques modifiées »** listant pour chaque slot la compétence active, son coût énergétique ajusté, ainsi que l’ensemble de ses statistiques de dégâts et de portée recalculées selon le build actif.

---

## 5. Conclusion et recommandations

L’audit confirme que le module de capacités dynamiques fonctionne de manière homogène sur l’ensemble du catalogue des 117 Warframes. Aucune anomalie ni valeur manquante bloquante n’a été détectée.

### Références
1. [Wiki Warframe — Module:Ability/data/stats](https://wiki.warframe.com/w/Module:Ability/data/stats)
2. [Wiki Warframe — Calculating Bonuses & Ability Attributes](https://wiki.warframe.com/w/Calculating_Bonuses)
