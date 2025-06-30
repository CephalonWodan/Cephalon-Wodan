console.log("mods.js chargé");

// Références DOM
const modContainer = document.getElementById("mod-list");
const arcane1 = document.getElementById("arcane-slot-1");
const arcane2 = document.getElementById("arcane-slot-2");
const searchInput = document.getElementById("mod-search");

let warframeMods = []; // Mods filtrés par type Warframe

// Fonction d'affichage des mods avec filtre par recherche
function displayFilteredMods(filter = "") {
  modContainer.innerHTML = "";

  warframeMods
    .filter(mod => mod.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach(mod => {
      const div = document.createElement("div");
      div.className = "mod-item";
      div.innerHTML = `
        <label>
          <input type="checkbox" name="mod" value="${mod.name}">
          ${mod.name} (${mod.polarity || "–"})
        </label>
      `;
      modContainer.appendChild(div);
    });

  // Réappliquer les mods cochés si déjà sauvegardés
  const savedMods = JSON.parse(localStorage.getItem("selectedMods") || "[]");
  savedMods.forEach(modName => {
    const checkbox = modContainer.querySelector(`input[type=checkbox][value="${modName}"]`);
    if (checkbox) checkbox.checked = true;
  });
}

// Barre de recherche active
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    displayFilteredMods(e.target.value);
  });
}

// Récupération Warframe sélectionnée
const warframe = JSON.parse(localStorage.getItem("selectedWarframe"));
if (!warframe) {
  alert("Aucune Warframe sélectionnée. Retour à l'accueil.");
  window.location.href = "index.html";
}

// Affichage nom + description
document.getElementById("warframe-name").textContent = warframe.name;
document.getElementById("warframe-description").textContent = warframe.description || "";

// Chargement données mods + arcanes
Promise.all([
  fetch("https://api.warframestat.us/mods").then(r => r.json()),
  fetch("data/arcanes.json").then(r => r.json())
])
.then(([mods, arcanes]) => {
  // Filtrage des mods de type Warframe
  warframeMods = mods.filter(mod =>
    mod.type === "Warframe" || mod.compatName === "Warframe"
  );

  displayFilteredMods(); // Affichage initial

  // Arcanes pour Warframes
  const warframeArcanes = arcanes.filter(arc => arc.type === "Warframe Arcane");

  [arcane1, arcane2].forEach(select => {
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

  // Préchargement config sauvegardée
  arcane1.value = localStorage.getItem("selectedArcane1") || "";
  arcane2.value = localStorage.getItem("selectedArcane2") || "";

})
.catch(err => {
  modContainer.textContent = "Erreur de chargement des mods/arcanes.";
  console.error("Erreur chargement:", err);
});

// Sauvegarde bouton
const saveButton = document.getElementById("save-config");
if (saveButton) {
  saveButton.addEventListener("click", () => {
    const selectedMods = Array.from(document.querySelectorAll('input[name="mod"]:checked')).map(el => el.value);
    localStorage.setItem("selectedMods", JSON.stringify(selectedMods));
    localStorage.setItem("selectedArcane1", arcane1.value);
    localStorage.setItem("selectedArcane2", arcane2.value);
    alert("Configuration sauvegardée !");
  });
}
