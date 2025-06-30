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

// 4. Charger les données JSON locales
Promise.all([
  fetch("data/mods.json").then(r => r.json()),
  fetch("data/arcanes.json").then(r => r.json())
])
.then(([mods, arcanes]) => {
  console.log("Mods chargés:", mods.length, "Arcanes chargés:", arcanes.length);

  // 5. Filtrage pour la Warframe
  const warframeMods = mods.filter(mod =>
    mod.compatName === "Warframe" || mod.type === "Warframe"
  );
  const warframeArcanes = arcanes.filter(arc => arc.type === "Warframe Arcane");

  // 6. Affichage des mods (checkbox)
  warframeMods.forEach(mod => {
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

  // 7. Affichage des arcanes (select)
  [arcane1, arcane2].forEach(select => {
    // Option par défaut vide
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

  // 8. Optionnel : pré-remplir la sélection si sauvegardée
  const savedMods = JSON.parse(localStorage.getItem("selectedMods") || "[]");
  const savedArcane1 = localStorage.getItem("selectedArcane1") || "";
  const savedArcane2 = localStorage.getItem("selectedArcane2") || "";

  // Cocher les mods sauvegardés
  savedMods.forEach(modName => {
    const checkbox = modContainer.querySelector(`input[type=checkbox][value="${modName}"]`);
    if (checkbox) checkbox.checked = true;
  });
  // Sélectionner les arcanes sauvegardés
  arcane1.value = savedArcane1;
  arcane2.value = savedArcane2;

})
.catch(err => {
  modContainer.innerText = "Erreur de chargement des mods/arcanes.";
  console.error("Erreur chargement:", err);
});

// 9. Sauvegarde configuration (bouton à ajouter dans ton HTML)
const saveButton = document.getElementById("save-config");
if (saveButton) {
  saveButton.addEventListener("click", () => {
    // Récupérer mods cochés
    const selectedMods = Array.from(document.querySelectorAll('input[name="mod"]:checked')).map(el => el.value);
    // Récupérer arcanes sélectionnés
    const selectedArcane1 = arcane1.value;
    const selectedArcane2 = arcane2.value;

    // Sauvegarder dans localStorage
    localStorage.setItem("selectedMods", JSON.stringify(selectedMods));
    localStorage.setItem("selectedArcane1", selectedArcane1);
    localStorage.setItem("selectedArcane2", selectedArcane2);

    alert("Configuration sauvegardée !");
  });
}

