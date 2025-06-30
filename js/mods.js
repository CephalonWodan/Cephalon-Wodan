console.log("mods.js chargé");

// 1. Récupération de la Warframe sélectionnée
const warframe = JSON.parse(localStorage.getItem("selectedWarframe"));
if (!warframe) {
  alert("Aucune Warframe sélectionnée. Retour à l'accueil.");
  window.location.href = "index.html";
}

// 2. Insertion du nom et de la description de la Warframe
const nameElement = document.getElementById("warframe-name");
const descElement = document.getElementById("warframe-description");
if (nameElement) nameElement.textContent = warframe.name;
if (descElement) descElement.textContent = warframe.description || "";

// 3. Conteneurs HTML
const modContainer = document.getElementById("mod-list");
const arcane1 = document.getElementById("arcane-slot-1");
const arcane2 = document.getElementById("arcane-slot-2");

// Vérification que les éléments existent
if (!modContainer || !arcane1 || !arcane2) {
  console.error("Éléments DOM manquants");
  return;
}

// Données arcanes intégrées (basées sur vos données JSON)
const arcanes = [
  {
    "regex": "accélération",
    "name": "Arcane Acceleration",
    "effect": "Sur coup critique, 5% / 10% / 15% / 20% change de donner 15% / 30% / 45% / 60% Cadence de tir pour Fusils pour 1.5 / 3 / 4.5 / 6 secondes",
    "rarity": "Peu commun",
    "maxRank": 4
  },
  {
    "regex": "égide",
    "name": "Arcane Égide",
    "effect": "Sur réception de dégâts 1.5% / 3% / 4.5% / 6% de chance de donner 15 / 30 / 45 / 60 Régénération de bouclier par sec pour 5 / 10 / 15 / 20 Secondes",
    "rarity": "Rare",
    "maxRank": 4
  },
  {
    "regex": "agilité",
    "name": "Arcane Agility",
    "effect": "Sur réception de dégâts 3% / 6% / 9% / 16% de chance de donner 10% / 20% / 30% / 40% Vitesse de déplacement pour 2 / 4 / 6 / 8 Secondes",
    "rarity": "Peu commun",
    "maxRank": 4
  },
  {
    "regex": "vengeance",
    "name": "Arcane Vengeance",
    "effect": "Sur réception de dégâts 3.5% / 7% / 10.5% / 14% de chance de donner 7.5% / 15% / 22.5% / 30% Chance de critique additive pour 2 / 4 / 6 / 8 Secondes",
    "rarity": "Peu commun",
    "maxRank": 4
  },
  {
    "regex": "grâce",
    "name": "Arcane Grâce",
    "effect": "When damaged, 1.5% / 3% / 4.5% / 6% chance for 1% / 2% / 3% / 4% Health Regen/sec for 1.5 / 3 / 4.5 / 6 seconds",
    "rarity": "Rare",
    "maxRank": 4
  },
  {
    "regex": "gardien",
    "name": "Arcane Gardien",
    "effect": "When damaged, 5% / 10% / 15% / 20% chance to give 150 / 300 / 450 / 600 Armor for 5 / 10 / 15 / 20 seconds",
    "rarity": "Commun",
    "maxRank": 4
  },
  {
    "regex": "énergétique",
    "name": "Arcane Énergétique",
    "effect": "Sur énergie ramassée, 10% / 20% / 30% / 40% de chance de donner 25 / 50 / 75 / 100 d'énergie aux alliés proche à moins de 5 / 10 / 15 / 20 Mètres",
    "rarity": "Rare",
    "maxRank": 4
  }
  // Ajoutez d'autres arcanes selon vos besoins
];

// Fonction pour identifier la version du mod
function getModVersion(modName) {
  const name = modName.toLowerCase();
  if (name.includes("prime") || name.includes("primed")) return "Prime";
  if (name.includes("corrupted") || name.includes("défectueux")) return "Défectueux";
  if (name.includes("augmented") || name.includes("arconte")) return "Arconte";
  return "Normal";
}

// Fonction pour afficher les mods dans le container (avec filtre optionnel)
function displayMods(mods, filterText = "") {
  modContainer.innerHTML = ""; // vide avant affichage

  // Filtrer selon texte recherche (insensible à la casse)
  const filteredMods = mods.filter(mod => 
    mod.name.toLowerCase().includes(filterText.toLowerCase())
  );

  filteredMods.forEach(mod => {
    const version = getModVersion(mod.name);
    const div = document.createElement("div");
    div.className = "mod-item";
    div.innerHTML = `
      <label>
        <input type="checkbox" name="mod" value="${mod.name}">
        ${mod.name} <small>(${version})</small> (${mod.polarity || "–"})
      </label>
      <span class="tooltip-text">${mod.description || "Pas de description disponible."}</span>
    `;
    modContainer.appendChild(div);
  });
}

// Charger les mods via API et utiliser les arcanes intégrés
fetch("https://api.warframestat.us/mods")
.then(response => {
  if (!response.ok) {
    throw new Error(`Erreur HTTP: ${response.status}`);
  }
  return response.json();
})
.then(mods => {
  console.log("Mods chargés:", mods.length, "Arcanes disponibles:", arcanes.length);

  // Filtrer uniquement les mods de Warframe (CompatName en majuscule)
  let warframeMods = mods.filter(mod => mod.compatName === "WARFRAME");

  // Supprimer doublons sur le nom (ne garder que le premier)
  const uniqueModsMap = new Map();
  warframeMods.forEach(mod => {
    if (!uniqueModsMap.has(mod.name)) {
      uniqueModsMap.set(mod.name, mod);
    }
  });
  warframeMods = Array.from(uniqueModsMap.values());

  // Afficher initialement tous les mods
  displayMods(warframeMods);

  // Gestion barre recherche
  const modSearch = document.getElementById("mod-search");
  if (modSearch) {
    modSearch.addEventListener("input", () => {
      displayMods(warframeMods, modSearch.value);
    });
  }

  // Affichage des arcanes (filtrer seulement les arcanes Warframe)
  const warframeArcanes = arcanes.filter(arc => 
    arc.name.startsWith("Arcane") && !arc.name.includes("Magus") && !arc.name.includes("Virtuos") && !arc.name.includes("Exodia")
  );
  
  [arcane1, arcane2].forEach(select => {
    select.innerHTML = "";
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "-- Aucun --";
    select.appendChild(noneOption);

    warframeArcanes.forEach(arc => {
      const option = document.createElement("option");
      option.value = arc.name;
      option.textContent = `${arc.name} (rang max: ${arc.maxRank || 4})`;
      select.appendChild(option);
    });
  });

  // Pré-remplissage depuis localStorage
  const savedMods = JSON.parse(localStorage.getItem("selectedMods") || "[]");
  savedMods.forEach(modName => {
    const checkbox = modContainer.querySelector(`input[type=checkbox][value="${modName}"]`);
    if (checkbox) checkbox.checked = true;
  });
  arcane1.value = localStorage.getItem("selectedArcane1") || "";
  arcane2.value = localStorage.getItem("selectedArcane2") || "";
})
.catch(err => {
  modContainer.innerText = "Erreur de chargement des mods. Vérifiez votre connexion.";
  console.error("Erreur chargement:", err);
});

// Sauvegarde configuration
const saveButton = document.getElementById("save-config");
if (saveButton) {
  saveButton.addEventListener("click", () => {
    const selectedMods = Array.from(document.querySelectorAll('input[name="mod"]:checked'))
      .map(el => el.value);
    const selectedArcane1 = arcane1.value;
    const selectedArcane2 = arcane2.value;

    localStorage.setItem("selectedMods", JSON.stringify(selectedMods));
    localStorage.setItem("selectedArcane1", selectedArcane1);
    localStorage.setItem("selectedArcane2", selectedArcane2);

    alert("Configuration sauvegardée !");
  });
}
