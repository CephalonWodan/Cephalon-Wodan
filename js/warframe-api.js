console.log("warframe-api.js chargé");

const listEl = document.getElementById("warframe-list");
const searchEl = document.getElementById("warframe-search");

// charge les Warframes (API publique)
fetch("https://api.warframestat.us/warframes")
  .then(r => r.json())
  .then(data => {
    // filtre: uniquement Warframes (sans Archwings/Necramechs)
    const warframes = data.filter(wf =>
      String(wf.type || "").toLowerCase() === "warframe" &&
      !["Bonewidow","Voidrig"].includes(wf.name)
    );

    render(warframes);

    // recherche live
    searchEl.addEventListener("input", () => {
      const q = searchEl.value.toLowerCase();
      const filtered = warframes.filter(w => w.name.toLowerCase().includes(q));
      render(filtered);
    });
  })
  .catch(err => {
    listEl.textContent = "Erreur de chargement des Warframes.";
    console.error(err);
  });

function render(items){
  listEl.innerHTML = "";
  const frag = document.createDocumentFragment();

  items.forEach((wf) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "mod-item";
    card.setAttribute("aria-label", `Configurer ${wf.name}`);
    card.tabIndex = 0;
    card.textContent = wf.name;
    card.dataset.frameName = wf.name; // pour tooltip-smart

    // === Modèle de contenu de tooltip (caché dans la carte)
    const tpl = document.createElement("div");
    tpl.className = "tooltip-template";

    const imgURL = wf.imageName
      ? `https://cdn.warframestat.us/img/${wf.imageName}`
      : null;

    tpl.innerHTML = `
      <strong style="display:block;margin-bottom:.25em">${wf.name}</strong>
      <em>${wf.description || "Pas de description disponible."}</em><br><br>

      ${imgURL
        ? `<img src="${imgURL}" alt="${wf.name}"
               onerror="this.style.display='none'">`
        : `<div class="muted">Aucune image</div>`}

      <ul>
        <li><strong>Armure:</strong> ${wf.armor ?? "—"}</li>
        <li><strong>Énergie:</strong> ${wf.power ?? "—"}</li>
        <li><strong>Vie:</strong> ${wf.health ?? "—"}</li>
        <li><strong>Bouclier:</strong> ${wf.shield ?? "—"}</li>
        <li><strong>Vitesse:</strong> ${wf.sprintSpeed ?? "—"}</li>
      </ul>

      <div class="abilities-mount" style="margin-top:.6em;"></div>
    `;

    card.appendChild(tpl);

    // navigation (facultatif)
    card.addEventListener("click", () => {
      if (confirm(`Configurer ${wf.name} ?`)) {
        localStorage.setItem("selectedWarframe", JSON.stringify(wf));
        // à adapter si tu as une page mods.html
        // window.location.href = "mods.html";
      }
    });

    frag.appendChild(card);
  });

  listEl.appendChild(frag);
}
