# Règles de dégâts élémentaires — Set Builder

## Décision d’implémentation

Le calculateur distingue les quatre éléments primaires — **Feu**, **Glace**, **Électricité** et **Toxine** — puis combine chaque paire selon les règles officielles du Wiki Warframe : **Feu + Glace = Explosion**, **Feu + Toxine = Gaz**, **Feu + Électricité = Radiation**, **Glace + Électricité = Magnétique**, **Glace + Toxine = Viral**, et **Électricité + Toxine = Corrosif**.

La résolution suit l’ordre des sources élémentaires présentes dans les mods équipés. Les éléments primaires sont accumulés, puis les paires sont fusionnées de façon déterministe. Une source secondaire déjà combinée — par exemple un mod ou un dégât inné de type Viral — reste séparée et n’est pas déconstruite pour être recombinée.

Lorsqu’une description de mod indique explicitement que **tous les dégâts/types élémentaires sont convertis** vers un type cible, la conversion prend priorité sur la fusion normale. Le résumé affiche alors une seule ligne de type `CONVERSION`, avec la cible et les types concernés, sans afficher une fusion artificielle des éléments sources.

## Référence

[1] [Damage — WARFRAME Wiki](https://wiki.warframe.com/w/Damage), sections « Elemental Damage » et « Possible Combinations ».

[2] [Blast Damage — WARFRAME Wiki](https://wiki.warframe.com/w/Damage/Blast_Damage), description de la combinaison Feu + Glace.
