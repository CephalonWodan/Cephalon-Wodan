console.log("Chargement de warframe-api.js");

const warframeList = document.getElementById("warframe-list");

fetch("https://api.warframestat.us/warframes")
  .then(response => response.json())
  .then(warframes => {
    warframeList.innerHTML = ""; // vide le message "Chargement..."

    warframes.forEach(wf => {
      const div = document.createElement("div");
      div.className = "mod-item"; // réutilise le style des mods
      div.textContent = wf.name;
      div.title = wf.description || "Pas de description disponible";

      // Par exemple, on peut cliquer sur un warframe pour la sélectionner
      div.addEventListener("click", () => {
        localStorage.setItem("selectedWarframe", JSON.stringify(wf));
        alert(`Warframe sélectionnée : ${wf.name}`);
        // Ou rediriger vers la page de config mod : 
        // window.location.href = "mods.html";
      });

      warframeList.appendChild(div);
    });
  })
  .catch(err => {
    warframeList.textContent = "Erreur lors du chargement des Warframes.";
    console.error(err);
  });
