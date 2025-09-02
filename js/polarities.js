// js/polarities.js
// Affichage des polarités (icônes SVG officielles) pour les Warframes
// Place un bloc "Polarité :" + rangée d'icônes sous l'image de la Warframe.
// Expose window.Polarities.attach(cardEl, wf)

(() => {
  // Fichiers SVG : place-les dans img/polarities/
  const POL_SVG = {
    Madurai: "Madurai_Pol.svg",
    Vazarin: "Vazarin_Pol.svg",
    Naramon: "Naramon_Pol.svg",
    Zenurik: "Zenurik_Pol.svg",
    Unairu:  "Unairu_Pol.svg",
    Umbra:   "Umbra_Pol.svg",
    Penjaga: "Penjaga_Pol.svg",
    Exilus:  "Exilus_Pol.svg",
    Any:     "Any_Pol.svg",
  };

  // Alias acceptés (caractères, noms, variantes)
  const POL_ALIAS = {
    "V":"Madurai","D":"Vazarin","-":"Naramon","/":"Zenurik","Y":"Unairu","U":"Umbra","P":"Penjaga","O":"Any",
    "MADURAI":"Madurai","VAZARIN":"Vazarin","NARAMON":"Naramon","ZENURIK":"Zenurik",
    "UNAIRU":"Unairu","UMBRA":"Umbra","PENJAGA":"Penjaga","ANY":"Any",
    "AURA":"Aura","STANCE":"Stance","EXILUS":"Exilus","NONE":"None"
  };

  function normalizePol(p){
    if(!p) return "None";
    const k = String(p).trim().toUpperCase();
    return POL_ALIAS[k] || p;
  }

  function polIconSrc(name){
    return `img/polarities/${POL_SVG[name] || POL_SVG.Any}`;
  }

  function makePolarityBadge(name, kind=null){
    const el = document.createElement("span");
    el.className = "polarity-badge";
    el.dataset.kind = kind || "";
    el.title = kind ? `${kind}: ${name}` : String(name);
    const img = document.createElement("img");
    img.alt = `${name} polarity`;
    img.width = 20; img.height = 20;
    img.src = polIconSrc(name);
    el.appendChild(img);
    return el;
  }

  // Rend uniquement la rangée d'icônes
  function renderPolarityRow(data){
    const row = document.createElement("div");
    row.className = "polarity-row";

    if (data?.aura) {
      row.appendChild(makePolarityBadge(normalizePol(data.aura), "Aura"));
    }
    if (data?.exilus && data.exilus !== "None") {
      row.appendChild(makePolarityBadge(normalizePol(data.exilus), "Exilus"));
    }
    (data?.slots || [])
      .map(normalizePol)
      .forEach(p => row.appendChild(makePolarityBadge(p)));

    return row;
  }

  // Rend le bloc complet : libellé + rangée
  function renderPolarityBlock(data){
    const block = document.createElement("div");
    block.className = "polarity-block";

    const label = document.createElement("div");
    label.className = "polarity-label";
    label.textContent = "Polarity :";

    const row = renderPolarityRow(data);

    block.appendChild(label);
    block.appendChild(row);
    return block;
  }

  /**
   * Place la rangée sous l'image. Si déjà présent, on remplace.
   * Fallbacks : après <h2>, avant la description, ou en haut de la carte.
   */
  function attach(cardEl, wf){
    // Normalisation des données passées par app.js
    const data = Array.isArray(wf.polarities)
      ? { slots: wf.polarities }
      : (wf.polarities || {
          slots: wf.slotPolarities || [],
          aura: wf.auraPolarity || null,
          exilus: wf.exilusPolarity || null
        });

    const block = renderPolarityBlock(data);

    // 1) Cible prioritaire : juste SOUS le cadre image
    const img = cardEl.querySelector('img[alt="' + String(wf.name || "").replace(/"/g, '\\"') + '"]');
    const frameBox = img ? img.parentElement : null; // <div> qui entoure l'image
    if (frameBox) {
      const existingBlock = cardEl.querySelector(".polarity-block");
      if (existingBlock) existingBlock.replaceWith(block);
      else frameBox.insertAdjacentElement("afterend", block);
      return;
    }

    // 2) Fallbacks si on ne trouve pas le cadre
    const existing = cardEl.querySelector(".polarity-block");
    const h2 = cardEl.querySelector("h2");
    const desc = cardEl.querySelector("p");
    if (existing) existing.replaceWith(block);
    else if (h2) h2.insertAdjacentElement("afterend", block);
    else if (desc) desc.insertAdjacentElement("beforebegin", block);
    else cardEl.prepend(block);
  }

  window.Polarities = { attach };
})();
