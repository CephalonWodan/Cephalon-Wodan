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

// 3. Récupération des conteneurs HTML
const modContainer = document.getElementById("mod-list");
const arcane1 = document.getElementById("arcane-slot-1");
const arcane2 = document.getElementById("arcane-slot-2");

// 4. Récupération des données depuis l'API
Promise.all([
  fetch("https://api.warframestat.us/mods").then(r => r.json()),
  fetch("data/arcanes.json").then(r => r.json())
])
.then(([mods, arcanes]) => {
  console.log("API mods renvoyé", mods.length, "et arcanes", arcanes.length);

  // 5. Filtrage des mods et arcanes spécifiques à la Warframe
  const warframeMods = mods.filter(mod =>
    mod.compatName === "Warframe" || mod.type === "Warframe"
  );

  const warframeArcanes = arcanes.filter(arc =>
    arc.type === "Warframe Arcane"
  );

  // 6. Affichage des mods
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

  // 7. Affichage des arcanes dans les deux menus déroulants
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
})
.catch(err => {
  modContainer.innerText = "Erreur de chargement des mods/arcanes.";
  console.error("Erreur chargement:", err);
});
