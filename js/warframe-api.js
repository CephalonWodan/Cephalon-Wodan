console.log("Chargement de warframe-api.js");

const warframeList = document.getElementById("warframe-list");
const warframeSearch = document.getElementById("warframe-search");

let allWarframes = [];

function displayWarframes(filterText = "") {
  warframeList.innerHTML = "";
  const filtered = allWarframes.filter(wf => 
    wf.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    warframeList.textContent = "Aucune Warframe trouvée.";
    return;
  }

  filtered.forEach(wf => {
    const div = document.createElement("div");
    div.className = "mod-item";
    div.textContent = wf.name;
    div.title = wf.description || "Pas de description disponible";

    div.addEventListener("click", () => {
      localStorage.setItem("selectedWarframe", JSON.stringify(wf));
      alert(`Warframe sélectionnée : ${wf.name}`);
      // Optionnel : rediriger vers config mod
      // window.location.href = "mods.html";
    });

    warframeList.appendChild(div);
  });
}

fetch("https://api.warframestat.us/warframes")
  .then(response => response.json())
  .then(warframes => {
    allWarframes = warframes;
    displayWarframes();
  })
  .catch(err => {
    warframeList.textContent = "Erreur lors du chargement des Warframes.";
    console.error(err);
  });

warframeSearch.addEventListener("input", () => {
  displayWarframes(warframeSearch.value);
});
