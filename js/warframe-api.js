console.log("warframe-api.js chargé");

const warframeListDiv = document.getElementById("warframe-list");
const warframeSearchInput = document.getElementById("warframe-search");

fetch("https://api.warframestat.us/warframes")
  .then(response => response.json())
  .then(data => {
    // Filtrage : ne garder que les Warframes standards (pas d'Archwing/Necramech)
    let warframes = data.filter(wf => 
      wf.type === "Warframe" && 
      !["Bonewidow", "Voidrig"].includes(wf.name)
    );

    // Affichage initial
    displayWarframes(warframes);

    // Recherche dynamique
    warframeSearchInput.addEventListener("input", () => {
      const query = warframeSearchInput.value.toLowerCase();
      const filtered = warframes.filter(wf => wf.name.toLowerCase().includes(query));
      displayWarframes(filtered);
    });
  })
  .catch(err => {
    warframeListDiv.innerText = "Erreur de chargement des Warframes.";
    console.error(err);
  });

function displayWarframes(warframes) {
  const warframeListDiv = document.getElementById("warframe-list");
  warframeListDiv.innerHTML = "";

  warframes
    .filter(wf => wf.name !== "Bonewidow" && wf.name !== "Voidrig" && wf.type !== "ARCHWING") // ⚠️ exclusion des Necramechs et archwings
    .forEach(wf => {
      const card = document.createElement("div");
      card.className = "mod-item";
      card.textContent = wf.name;

      // 🔍 Création de la tooltip avec infos complètes
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip-text";

      const imgURL = `https://cdn.warframestat.us/img/${encodeURIComponent(wf.name)}.png`;

      tooltip.innerHTML = `
        <strong>${wf.name}</strong><br>
        <em>${wf.description || "Pas de description disponible."}</em><br><br>
        <img src="${imgURL}" alt="${wf.name}" style="width:100px; float:right; margin-left:10px; border-radius:8px;" onerror="this.style.display='none'">
        <ul style="padding-left: 1em; list-style-type: disc;">
          <li><strong>Armure:</strong> ${wf.armor}</li>
          <li><strong>Énergie:</strong> ${wf.power}</li>
          <li><strong>Vie:</strong> ${wf.health}</li>
          <li><strong>Bouclier:</strong> ${wf.shield}</li>
          <li><strong>Vitesse:</strong> ${wf.sprintSpeed}</li>
        </ul>
      `;

      card.appendChild(tooltip);

      card.addEventListener("click", () => {
        if (confirm(`Configurer ${wf.name} ?`)) {
          localStorage.setItem("selectedWarframe", JSON.stringify(wf));
          window.location.href = "mods.html";
        }
      });

      warframeListDiv.appendChild(card);
    });
}
