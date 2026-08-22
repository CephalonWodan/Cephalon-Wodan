# WARFRAME Set Builder — Design Ideas

## Approches stylisées

### Approche 1 — Tenno Codex (choisie)
Interface inspirée du Codex in-game de Warframe : fond sombre métallique, accents cyan/bleu électrique, typographie technique et militaire. Évoque l'interface holographique du Lotus.
Probabilité : 0.07

### Approche 2 — Orokin Archive
Esthétique dorée et ancienne, inspirée des tours Orokin : fond noir profond, accents or/ambre, motifs géométriques complexes, typographie serif élégante.
Probabilité : 0.02

### Approche 3 — Grineer Industrial
Interface brute et industrielle, inspirée des vaisseaux Grineer : tons rouille/orange, textures métalliques usées, typographie condensée et bold.
Probabilité : 0.01

---

## Design Choisi : Tenno Codex

**Design Movement** : Sci-fi holographique militaire — interface de terminal futuriste inspirée du HUD de Warframe

**Core Principles** :
1. Fond sombre profond avec des accents lumineux cyan/bleu pour la lisibilité maximale
2. Grille structurée avec des séparateurs fins et des bordures lumineuses
3. Iconographie et typographie technique, sans serif condensée
4. Micro-animations fluides pour les interactions (hover, sélection, transitions)

**Color Philosophy** :
- Fond principal : #0a0e14 (noir bleuté très sombre)
- Fond secondaire : #0f1923 (bleu nuit)
- Accent primaire : #4fc3f7 (cyan clair — couleur signature)
- Accent secondaire : #00b4d8 (cyan moyen)
- Texte principal : #e8f4f8 (blanc bleuté)
- Texte secondaire : #7fb3c8 (bleu gris)
- Bordures : #1e3a4a (bleu sombre)
- Highlight : #ff6b35 (orange — pour les éléments importants)

**Layout Paradigm** :
- Sidebar gauche fixe avec navigation (style wiki Warframe)
- Zone centrale scrollable pour le contenu principal
- Sidebar droite pour les détails/stats du set en cours
- Header compact avec logo + recherche + actions

**Signature Elements** :
1. Bordures avec effet "scan line" et coins angulaires (style HUD)
2. Badges de rareté colorés (Commun/Peu commun/Rare/Légendaire)
3. Cartes d'équipement avec image + stats en overlay

**Interaction Philosophy** :
- Hover : légère lueur cyan sur les éléments interactifs
- Sélection : bordure lumineuse + fond légèrement plus clair
- Transitions : 150-200ms ease-out pour les changements d'état

**Animation** :
- Entrée des cartes : fade-in + slide-up (50ms stagger)
- Hover sur cartes : scale(1.02) + box-shadow cyan
- Chargement : skeleton avec animation pulse

**Typography System** :
- Titres : Rajdhani (condensé, tech) — Google Fonts
- Corps : Inter (lisible, neutre)
- Monospace : JetBrains Mono (stats, codes)
- Hiérarchie : 32px titre page / 20px section / 16px corps / 12px labels

**Brand Essence** : L'outil de référence pour les Tennos qui veulent optimiser leurs builds — précis, exhaustif, visuel.
Personnalité : Technique, Fiable, Immersif

**Brand Voice** : Direct et informatif, vocabulaire Warframe natif. Ex : "Forge ton Arsenal" / "Optimise ton Build"

**Wordmark & Logo** : Symbole géométrique angulaire inspiré du logo Warframe (losange avec lignes internes), couleur cyan sur fond sombre

**Signature Brand Color** : #4fc3f7 (Tenno Cyan)

## Style Decisions
- Utiliser Rajdhani pour tous les titres et labels de navigation
- Fond #0a0e14 comme base universelle
- Toutes les cartes ont un border-radius de 4px (angulaire, pas arrondi)
- Les accents orange #ff6b35 réservés aux éléments "Prime" et aux alertes
- Iconographie : utiliser Lucide React (Shield, Sword, Star, Users, etc.) — jamais d'emoji
- Tenno Cyan #4fc3f7 est la seule couleur d'action dominante
- Chaque panneau majeur inclut au moins un détail HUD (coins angulaires, scan-line, règle holographique)
- Les couleurs de rareté sont des classifications HUD contrôlées, pas de la décoration
- Le builder doit ressembler à un terminal de configuration d'arsenal actif


## Style Decisions — Amendements du review HUD

- Le widget Cephalon doit conserver une hiérarchie militaire terminale : un titre d’état dominant, des métadonnées plus discrètes et une ligne de télémétrie lisible.
- Le Tenno Cyan `#4fc3f7` reste la couleur de toutes les actions principales, du sélecteur de mission, de la Warframe active et des états sélectionnés ; les couleurs orange/jaune restent réservées aux classifications et alertes.
- Les contrôles du chatbot affichent le contexte opérationnel courant — Warframe active, mission choisie, statut IA — au moyen de pastilles et de séparateurs HUD plutôt que de panneaux décoratifs supplémentaires.
