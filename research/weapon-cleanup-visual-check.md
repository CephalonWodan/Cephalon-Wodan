# Vérification visuelle — Nettoyage du catalogue d’armes

Le catalogue affiche 566 armes conservées sur 566 résultats après filtrage, contre 746 entrées brutes. Les cartes visibles présentent toutes au moins une valeur de combat non nulle parmi les dégâts, la critique, le multiplicateur critique ou le statut. La page d’accueil conserve la navigation et les compteurs dynamiques ; le bouton Accueil reste visible sur la page Armes.

L’audit du JSON brut a identifié 180 entrées entièrement nulles. Le fichier source reste intact ; le filtre est appliqué dans l’adaptateur TypeScript afin que le catalogue, les compteurs et le builder utilisent tous la liste nettoyée.
