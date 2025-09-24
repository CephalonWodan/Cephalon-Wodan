# Cephalon-Wodan (IA project)
source : me, https://github.com/WFCD, https://api.warframestat.us, https://wiki.warframe.com, [overframe.](https://overframe.gg/)

Base URL
--------
https://cephalon-wodan-production.up.railway.app

Général
-------
- Content-Type: application/json
- Cache-Control (réponses) : s-maxage=600, stale-while-revalidate=300
- Health check :  GET /healthz  -> { "ok": true }

========================
WARFRAMES / ENTITÉS
========================

GET /warframe
  - Renvoie le JSON fusionné brut (data/merged_warframe.json)

LISTES (filtrables + limit)
GET /warframes?search=<texte>&limit=<n>
GET /archwings?search=<texte>&limit=<n>
GET /necramechs?search=<texte>&limit=<n>

DÉTAIL (par nom exact, insensible à la casse)
GET /warframes/:name
GET /archwings/:name
GET /necramechs/:name

Exemples :
- /warframes?search=mesa
- /archwings/Itzal
- /necramechs/Bonewidow

========================
MODS
========================

LISTE (filtres disponibles)
GET /mods
  Query params :
    - search=<texte>       : recherche sur le nom
    - type=<str>           : ex. "Warframe Mod", "Rifle Mod", ...
    - compat=<str>         : ex. "Trinity", "Excalibur", "Rifle", ...
    - polarity=<str>       : ex. "madurai", "zenurik", ...
    - rarity=<str>         : ex. "Common", "Uncommon", "Rare", "Legendary"
    - augment=1|0          : uniquement les augments (1) ou pas (0)
    - tag=<str>            : filtre sur tags (si présents)
    - set=<str>            : filtre sur nom de set (si présent)
    - limit=<n>            : max résultats (<= 5000)

DÉTAIL
GET /mods/:slug
  - :slug peut être le slug ou l’id Overframe

Exemples :
- /mods?search=Streamline&rarity=Rare&type=Warframe%20Mod&limit=5
- /mods/abating-link

========================
RELICS
========================

LISTE (filtres disponibles)
GET /relics
  Query params :
    - era=<Lith|Meso|Neo|Axi|Requiem>
    - code=<lettre>        : ex. "A", "B", "C", ...
    - vaulted=1|0
    - requiem=1|0
    - refine=<Intact|Exceptional|Flawless|Radiant>
      (si fourni, la réponse ne contient que les rewards de ce niveau)
    - search=<texte>       : recherche sur le nom
    - limit=<n>            : max résultats (<= 5000)

DÉTAIL (par ère, ou ère+code)
GET /relics/:era
GET /relics/:era/:code

Exemples :
- /relics?era=Axi&vaulted=0&limit=50
- /relics/Neo
- /relics/Lith/A