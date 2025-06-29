// Chargement de la liste des Warframes depuis l'API
fetch("https://api.warframestat.us/warframes")
  .then(response => response.json())
  .then(data => {
    const container = document.getElementById("warframe-list");
    container.innerHTML = "";
    data.forEach(wf => {
      const div = document.createElement("div");
      div.className = "warframe";
      div.innerHTML = `<strong>${wf.name}</strong><br>${wf.description || ''}`;
      div.style.cursor = "pointer";
      div.onclick = () => {
        localStorage.setItem("selectedWarframe", JSON.stringify(wf));
        window.location.href = "mods.html";
      };
      container.appendChild(div);
    });
  })
  .catch(error => {
    document.getElementById("warframe-list").innerText = "Erreur de chargement des Warframes.";
    console.error(error);
  });