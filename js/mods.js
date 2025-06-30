let warframeMods = []; // Sera rempli après chargement
let modContainer = document.getElementById("mod-list");
const searchInput = document.getElementById("mod-search");

// Fonction d'affichage filtré des mods
function displayFilteredMods(filter = "") {
  modContainer.innerHTML = ""; // Vider les anciens résultats

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

  // Rétablir les mods cochés s'ils ont été sélectionnés
  const savedMods = JSON.parse(localStorage.getItem("selectedMods") || "[]");
  savedMods.forEach(modName => {
    const checkbox = modContainer.querySelector(`input[type=checkbox][value="${modName}"]`);
    if (checkbox) checkbox.checked = true;
  });
}

// Gestion du champ de recherche
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    displayFilteredMods(e.target.value);
  });
}

// Charger les données
Promise.all([
  fetch("https://api.warframestat.us/mods").then(r => r.json()),
  fetch("data/arcanes.json").then(r => r.json())
])
.then(([mods, arcanes]) => {
  warframeMods = mods.filter(mod =>
    mod.type === "Warframe" || mod.compatName === "Warframe"
  );

  displayFilteredMods(); // Affiche tous les mods au départ

  // Affichage arcanes
  [arcane1, arcane2].forEach(select => {
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "-- Aucun --";
    select.appendChild(noneOption);

    arcanes.forEach(arc => {
      const option = document.createElement("option");
      option.value = arc.name;
      option.textContent = `${arc.name} (rang max: ${arc.maxRank || "?"})`;
      select.appendChild(option);
    });
  });

  arcane1.value = localStorage.getItem("selectedArcane1") || "";
  arcane2.value = localStorage.getItem("selectedArcane2") || "";
})
.catch(err => {
  modContainer.innerText = "Erreur de chargement des mods/arcanes.";
  console.error("Erreur chargement:", err);
});
