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

Promise.all([
  fetch("https://api.warframestat.us/mods").then(r => r.json()),
  fetch("https://api.warframestat.us/arcanes").then(r => r.json())
])
.then(([mods, arcanes]) => {
  const warframeMods = mods.filter(mod =>
    mod.compatName === "Warframe" || mod.type === "Warframe"
  );
  const warframeArcanes = arcanes.filter(arc => arc.type === "Warframe Arcane");

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

  [arcane1, arcane2].forEach(select => {
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "-- Aucun --";
    select.appendChild(none);
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