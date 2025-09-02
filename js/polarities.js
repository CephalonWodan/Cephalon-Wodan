// js/polarities.js
// Affichage des polarités (icônes SVG officielles) pour les Warframes
// Expose window.Polarities.attach(cardEl, wf)

(() => {
  // Fichiers SVG : place-les dans img/polarities/
  const POL_SVG = {
    Madurai: "Madurai_Pol.svg",
    Vazarin: "Vazarin_Pol.svg",
    Naramon: "Naramon_Pol.svg",
    Zenurik: "Zenurik_Pol.svg",
    Unairu: "Unairu_Pol.svg",
    Umbra:   "Umbra_Pol.svg",
    Penjaga: "Penjaga_Pol.svg",
    Exilus:  "Exilus_Pol.svg",
    Any:     "Any_Pol.svg",
  };

  // Alias acceptés (caractères, noms, variantes)
  const POL_ALIAS = {
    "V": "Madurai", "D": "Vazarin", "-": "Naramon", "/": "Zenurik", "Y": "Unairu", "U": "Umbra", "P": "Penjaga", "O": "Any",
    "MADURAI": "Madurai", "VAZARIN": "Vazarin", "NARAMON": "Naramon", "ZENURIK": "Zenurik",
    "UNAIRU": "Unairu", "UMBRA": "Umbra", "PENJAGA": "Penjaga", "ANY": "Any",
    "AURA": "Aura", "STANCE": "Stance", "EXILUS": "Exilus", "NONE": "None"
  };

  function normalizePol(p) {
    if (!p) return "None";
    const k = String(p).trim().toUpperCase();
    return POL_ALIAS[k] || p;
  }

  function polIconSrc(name) {
    return `img/polarities/${POL_SVG[name] || POL_SVG.Any}`;
  }

  function makePolarityBadge(name, kind = null) {
    const el = document.createElement("span");
    el.className = "polarity-badge";
    el.dataset.kind = kind || "";
    el.title = kind ? `${kind}: ${name}` : String(name);
    const img = document.createElement("img");
    img.alt = `${name} polarity`;
    img.width = 20;
    img.height = 20;
    img.src = polIconSrc(name);
    el.appendChild(img);
    return el;
  }

  /**
   * data = { slots: ["V","-","D",...], aura: "Madurai"|"Any"|null, exilus: "None"|"V"|null }
   */
  function renderPolarities(data) {
    const box = document.createElement("div");
    box.className = "polarity-row";

    if (data?.aura) {
      box.appendChild(makePolarityBadge(normalizePol(data.aura), "Aura"));
    }
    if (data?.exilus && data.exilus !== "None") {
      box.appendChild(makePolarityBadge(normalizePol(data.exilus), "Exilus"));
    }
    (data?.slots || [])
      .map(normalizePol)
      .forEach(p => box.appendChild(makePolarityBadge(p)));

    return box;
  }

  /**
   * Place la rangée d’icônes SOUS L’IMAGE de la Warframe.
   * Fallbacks : après <h2>, avant la description, ou en haut de la carte.
   */
  function attach(cardEl, wf) {
    // Normalisation des données passées par app.js
    const data = Array.isArray(wf.polarities)
      ? { slots: wf.polarities }
      : (wf.polarities || {
          slots: wf.slotPolarities || [],
          aura: wf.auraPolarity || null,
          exilus: wf.exilusPolarity || null,
        });

    const row = renderPolarities(data);

    // 1) Cible prioritaire : le conteneur image (parent direct <div> de <img alt="WF">)
    const img = cardEl.querySelector('img[alt="' + String(wf.name || "").replace(/"/g, '\\"') + '"]');
    const frameBox = img ? img.parentElement : null;
    if (frameBox) {
      const existing = cardEl.querySelector(".polarity-row");
      if (existing) existing.replaceWith(row);
      else frameBox.insertAdjacentElement("afterend", row); // juste sous l’image
      return;
    }

    // 2) Fallbacks : on garde une position logique
    const existing = cardEl.querySelector(".polarity-row");
    const h2 = cardEl.querySelector("h2");
    const desc = cardEl.querySelector("p");
    if (existing) existing.replaceWith(row);
    else if (h2) h2.insertAdjacentElement("afterend", row);
    else if (desc) desc.insertAdjacentElement("beforebegin", row);
    else cardEl.prepend(row);
  }

  window.Polarities = { attach };
})();
