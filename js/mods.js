console.log("mods.js chargé");

const warframe = JSON.parse(localStorage.getItem("selectedWarframe"));
if (!warframe) {
  alert("Aucune Warframe sélectionnée. Retour à l'accueil.");
  window.location.href = "index.html";
}

const nameElement = document.getElementById("warframe-name");
const descElement = document.getElementById("warframe-description");
if (nameElement) nameElement.textContent = warframe.name;
if (descElement) descElement.textContent = warframe.description || "";

const modContainer = document.getElementById("mod-list");
const arcane1 = document.getElementById("arcane-slot-1");
const arcane2 = document.getElementById("arcane-slot-2");
const searchInput = document.getElementById("mod-search");

let allWarframeMods = []; // stockera tous les mods pour la recherche

Promise.all([
  fetch("https://api.warframestat.us/mods").then(r => r.json()),
  fetch("data/arcanes.json").then(r => r.json())
])
.then(([mods, arcanes]) => {
  const warframeMods = mods.filter(mod => mod.compatName && mod.compatName.toUpperCase() === "WARFRAME");
  allWarframeMods = warframeMods; // stocker pour recherche

  const warframeArcanes = arcanes.filter(arc => arc.type === "Warframe Arcane");

  displayMods(warframeMods);
  displayArcanes(warframeArcanes);

  // Pré-remplir
  const savedMods = JSON.parse(localStorage.getItem("selectedMods") || "[]");
  const savedArcane1 = localStorage.getItem("selectedArcane1") || "";
  const savedArcane2 = localStorage.getItem("selectedArcane2") || "";

  savedMods.forEach(modName => {
    const checkbox = modContainer.querySelector(`input[type=checkbox][value="${modName}"]`);
    if (checkbox) checkbox.checked = true;
  });
  arcane1.value = savedArcane1;
  arcane2.value = savedArcane2;

})
.catch(err => {
  modContainer.innerText = "Erreur de chargement des mods/arcanes.";
  console.error("Erreur chargement:", err);
});

// Barre de recherche
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = allWarframeMods.filter(mod =>
    mod.name.toLowerCase().includes(query)
  );
  displayMods(filtered);
});

// Affichage des mods
function displayMods(mods) {
  modContainer.innerHTML = "";
  mods.forEach(mod => {
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
}

// Affichage des arcanes
function displayArcanes(arcanes) {
  [arcane1, arcane2].forEach(select => {
    select.innerHTML = "";
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
}

// Sauvegarde
const saveButton = document.getElementById("save-config");
if (saveButton) {
  saveButton.addEventListener("click", () => {
    const selectedMods = Array.from(document.querySelectorAll('input[name="mod"]:checked')).map(el => el.value);
    const selectedArcane1 = arcane1.value;
    const selectedArcane2 = arcane2.value;

    localStorage.setItem("selectedMods", JSON.stringify(selectedMods));
    localStorage.setItem("selectedArcane1", selectedArcane1);
    localStorage.setItem("selectedArcane2", selectedArcane2);

    alert("Configuration sauvegardée !");
  });
}

