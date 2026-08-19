# Warframes utilisant encore un fallback de statistiques de capacités

## Méthode

L’audit a été exécuté sur `client/src/lib/warframe-data-full.json`. Une capacité est considérée comme couverte par les statistiques Wiki si son objet contient un tableau `officialStats` non vide. Une capacité sans ce tableau utilise le fallback du Builder pour son nom et sa description, mais ne bénéficie pas encore de lignes chiffrées issues de `Module:Ability/data/stats`.

> Correction importante : le précédent total de 95 Warframes correspondait aux entrées possédant **au moins une** capacité avec des statistiques officielles. Le contrôle détaillé montre que 91 Warframes sont complètes, 4 sont partielles et 22 n’ont aucune capacité avec `officialStats`.

## Résumé

| Catégorie | Nombre |
|---|---:|
| Warframes entièrement couvertes (4/4 capacités) | 91 |
| Warframes partiellement couvertes | 4 |
| Warframes sans statistique structurée (0/4) | 22 |
| Warframes utilisant au moins un fallback | 26 |

## Couverture partielle

| Warframe | Capacité(s) en fallback | Capacités avec statistiques officielles |
|---|---|---|
| Hydroid Prime | Plunder | Tempest Barrage, Tidal Surge, Tentacle Swarm |
| Inaros Prime | Scarab Shell | Desiccation, Sandstorm, Scarab Swarm |
| Hydroid | Plunder | Tempest Barrage, Tidal Surge, Tentacle Swarm |
| Inaros | Scarab Shell | Desiccation, Sandstorm, Scarab Swarm |

## Warframes entièrement en fallback

| Warframe | Capacités concernées |
|---|---|
| Caliban Prime | Razor Gyre; Sentient Wrath; Lethal Progeny; Fusion Strike |
| Excalibur Umbra Prime | Slash Dash; Radial Blind; Radial Javelin; Exalted Blade |
| Sevagoth Prime’s Shadow | Embrace; Consume; Death’s Harvest; Reunite |
| Caliban | Razor Gyre; Sentient Wrath; Lethal Progeny; Fusion Strike |
| Citrine | Fractured Blast; Preserving Shell; Prismatic Gem; Crystallize |
| Cyte-09 | Seek; Resupply; Evade; Neutralize |
| Dagath | Wyrd Scythes; Doom; Grave Spirit; Rakhali’s Cavalry |
| Dante | Noctua; Light Verse; Dark Verse; Final Verse |
| Gyre | Arcsphere; Coil Horizon; Cathode Grace; Rotorswell |
| Jade | Light’s Judgment; Symphony Of Mercy; Ophanim Eyes; Glory On High |
| Koumei | Kumihimo; Omikuji; Omamori; Bunraku |
| Kullervo | Wrathful Advance; Recompense; Collective Curse; Storm Of Ukko |
| Nokko | Stinkbrain; Brightbonnet; Reroot; Sporespring |
| Oraxia | Mercy’s Kiss; Webbed Embrace; Widow’s Brood; Silken Stride |
| Qorvex | Chyrinka Pillar; Containment Wall; Disometric Guard; Crucible Blast |
| Sevagoth’s Shadow | Embrace; Consume; Death’s Harvest; Reunite |
| Stalker | Slash Dash; Teleport; Absorb; Pull |
| Styanax | Axios Javelin; Tharros Strike; Rally Point; Final Stand |
| Temple | Pyrotechnics; Overdrive; Ripper’s Wail; Exalted Solo |
| Voruna | Shroud Of Dynar; Fangs Of Raksh; Lycath’s Hunt; Ulfrun’s Descent |
| Sirius & Orion | Coronal Ejection; Jade Stars; Light’s Sanctuary; Celestial Clash |
| Uriel | Infernalis; Remedium; Demonium; Brimstone |

## Conclusion

Les noms des 117 Warframes et de leurs quatre capacités sont présents. En revanche, le niveau de couverture des statistiques chiffrées est inférieur au niveau précédemment annoncé : **91 Warframes sont complètes**, **4 sont partielles** et **22 restent entièrement dépendantes des fallbacks** pour les statistiques de capacités. Les fallbacks empêchent l’absence de nom dans l’interface, mais leurs valeurs ne peuvent pas encore être mises à l’échelle précisément par Force, Durée, Portée et Efficacité tant que leurs entrées Wiki structurées ne sont pas ajoutées.
