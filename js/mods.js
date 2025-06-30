console.log("mods.js chargé");

let arcanes = []; // Variable globale pour stocker les arcanes

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
  modContainer.innerHTML = "";

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

// Fonction pour remplir les selects d’arcanes
function populateArcaneSelects() {
  const warframeArcanes = arcanes.filter(arc =>
    arc.name.startsWith("Arcane") &&
    !arc.name.includes("Magus") &&
    !arc.name.includes("Virtuos") &&
    !arc.name.includes("Exodia")
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
      option.textContent = `${arc.name} (rarité: ${arc.rarity})`;
      select.appendChild(option);
    });

    // Remplissage depuis localStorage
    const savedValue = localStorage.getItem(select.id === "arcane-slot-1" ? "selectedArcane1" : "selectedArcane2");
    select.value = savedValue || "";
  });
}

// 4. Charger les arcanes depuis JSON
fetch("data/arcanes.json")
  .then(response => {
    if (!response.ok) throw new Error("Erreur chargement arcanes");
    return response.json();
  })
  .then(data => {
    arcanes = data;
    console.log("Arcanes chargés :", arcanes.length);
    populateArcaneSelects();
  })
  .catch(err => {
    console.error("Erreur chargement arcanes :", err);
  });

// 5. Charger les mods depuis l’API
fetch("https://api.warframestat.us/mods")
  .then(response => {
    if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
    return response.json();
  })
  .then(mods => {
    console.log("Mods chargés :", mods.length);

    // Filtrage mods Warframe
    let warframeMods = mods.filter(mod => mod.compatName === "WARFRAME");

    // Éliminer les doublons par nom
    const uniqueModsMap = new Map();
    warframeMods.forEach(mod => {
      if (!uniqueModsMap.has(mod.name)) {
        uniqueModsMap.set(mod.name, mod);
      }
    });
    warframeMods = Array.from(uniqueModsMap.values());

    // Affichage initial des mods
    displayMods(warframeMods);

    // Barre de recherche
    const modSearch = document.getElementById("mod-search");
    if (modSearch) {
      modSearch.addEventListener("input", () => {
        displayMods(warframeMods, modSearch.value);
      });
    }

    // Rétablir mods sélectionnés
    const savedMods = JSON.parse(localStorage.getItem("selectedMods") || "[]");
    savedMods.forEach(modName => {
      const checkbox = modContainer.querySelector(`input[type=checkbox][value="${modName}"]`);
      if (checkbox) checkbox.checked = true;
    });
  })
  .catch(err => {
    modContainer.innerText = "Erreur de chargement des mods. Vérifiez votre connexion.";
    console.error("Erreur chargement mods :", err);
