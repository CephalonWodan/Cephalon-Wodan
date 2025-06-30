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

// Charger les mods et arcanes via API
Promise.all([
  fetch("https://api.warframestat.us/mods").then(r => r.json()),
  fetch("data/arcanes.json").then(r => r.json())
])
.then(([mods, arcanes]) => {
  console.log("Mods chargés:", mods.length, "Arcanes chargés:", arcanes.length);

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
  modSearch.addEventListener("input", () => {
    displayMods(warframeMods, modSearch.value);
  });

  // Affichage des arcanes
  const warframeArcanes = arcanes.filter(arc => arc.type === "Warframe Arcane");
  [arcane1, arcane2].forEach(select => {
    select.innerHTML = "";
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "-- Aucun --";
    select.appendChild(noneOption);

    warframeArcanes.forEach(arc => {
      const option = document.createElement("option");
      option.value = arc.name;
      option.textContent = `${arc.name} (rang max: ${arc.maxRank || "?"})`;
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
  modContainer.innerText = "Erreur de chargement des mods/arcanes.";
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
