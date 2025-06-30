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
  warframeListDiv.innerHTML = "";
  warframes.forEach(wf => {
    const card = document.createElement("div");
    card.className = "mod-item"; // réutilise le style mod-item
    card.textContent = wf.name;
    card.addEventListener("click", () => {
      if (confirm(`Configurer ${wf.name} ?`)) {
        localStorage.setItem("selectedWarframe", JSON.stringify(wf));
        window.location.href = "mods.html";
      }
    });
    warframeListDiv.appendChild(card);
  });
}
