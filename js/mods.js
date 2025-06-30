document.addEventListener("DOMContentLoaded", () => {
  console.log("mods.js chargé");

  const warframe = JSON.parse(localStorage.getItem("selectedWarframe"));
  if (!warframe) {
    alert("Aucune Warframe sélectionnée. Retour à l'accueil.");
    window.location.href = "index.html";
  }

  const nameElement = document.getElementById("warframe-name");
  const descElement = document.getElementById("warframe-description");
  const modContainer = document.getElementById("mod-list");
  const arcane1 = document.getElementById("arcane-slot-1");
  const arcane2 = document.getElementById("arcane-slot-2");
  const searchInput = document.getElementById("mod-search");

  if (nameElement) nameElement.textContent = warframe.name;
  if (descElement) descElement.textContent = warframe.description || "";

  // Charger les mods via API et les arcanes localement
  Promise.all([
    fetch("https://api.warframestat.us/mods").then(r => r.json()),
    fetch("data/arcanes.json").then(r => r.json())
  ])
  .then(([allMods, arcanes]) => {
    const warframeMods = allMods.filter(mod =>
      mod.CompatName?.toUpperCase() === "WARFRAME" ||
      mod.Type?.toUpperCase() === "WARFRAME"
    );

    const warframeArcanes = arcanes.filter(arc => arc.type === "Warframe Arcane");

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

      // Rétablir les mods cochés si déjà sauvegardés
      const savedMods = JSON.parse(localStorage.getItem("selectedMods") || "[]");
      savedMods.forEach(modName => {
        const checkbox = modContainer.querySelector(`input[type=checkbox][value="${modName}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    displayMods(warframeMods);

    // Recherche dynamique
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      const filtered = warframeMods.filter(mod =>
        mod.name.toLowerCase().includes(query)
      );
      displayMods(filtered);
    });

    // Chargement des arcanes
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

    // Rechargement de la sélection
    arcane1.value = localStorage.getItem("selectedArcane1") || "";
    arcane2.value = localStorage.getItem("selectedArcane2") || "";
  })
  .catch(err => {
    modContainer.innerText = "Erreur de chargement des mods/arcanes.";
    console.error("Erreur chargement:", err);
  });

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
});
