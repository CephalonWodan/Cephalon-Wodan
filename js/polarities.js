// js/polarities.js
// Affiche sous l'image :
//  - "Aura polarity :" + icône + texte (ex: Madurai)
//  - "Polarities :"      + icônes des autres slots (+ Exilus si fourni)
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

  // Alias acceptés (symboles / noms)
  const POL_ALIAS = {
    "V":"Madurai","D":"Vazarin","-":"Naramon","/":"Zenurik","Y":"Unairu","U":"Umbra","P":"Penjaga","O":"Any",
    "MADURAI":"Madurai","VAZARIN":"Vazarin","NARAMON":"Naramon","ZENURIK":"Zenurik",
    "UNAIRU":"Unairu","UMBRA":"Umbra","PENJAGA":"Penjaga","ANY":"Any"
  };

  const truthy = (v) =>
    v === true || v === 1 || v === "1" ||
    String(v).toLowerCase() === "true" || String(v).toLowerCase() === "yes";

  const normalizePol = (p) => {
    if (!p && p !== 0) return null;
    const k = String(p).trim();
    return POL_ALIAS[k.toUpperCase()] || k;
  };

  const polIconSrc = (name) => `img/polarities/${POL_SVG[name] || POL_SVG.Any}`;

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

  // ---------- Aura (icône + texte)
  function renderAuraBlock(auraRaw) {
    const auraName = normalizePol(auraRaw); // "Madurai", "Any", etc. ou null
    const block = document.createElement("div");
    block.className = "aura-block";

    const label = document.createElement("div");
    label.className = "aura-label";
    label.textContent = "Aura polarity :";
    block.appendChild(label);

    const row = document.createElement("div");
    row.className = "aura-row";

    if (auraName) {
      row.appendChild(makePolarityBadge(auraName, "Aura"));

      const txt = document.createElement("span");
      txt.className = "aura-text";
      txt.textContent = auraName; // ex: "Madurai"
      row.appendChild(txt);
    } else {
      const none = document.createElement("span");
      none.className = "aura-text";
      none.textContent = "—";
      row.appendChild(none);
    }

    block.appendChild(row);
    return block;
  }

  // ---------- Autres polarités (slots + Exilus éventuel)
  function renderSlotsBlock(data) {
    const block = document.createElement("div");
    block.className = "polarity-block";

    const label = document.createElement("div");
    label.className = "polarity-label";
    label.textContent = "Polarity :";
    block.appendChild(label);

    const row = document.createElement("div");
    row.className = "polarity-row";

    // Exilus (si renseigné)
    if (data?.exilusPolarity) {
      row.appendChild(makePolarityBadge(normalizePol(data.exilusPolarity), "Exilus"));
    } else if (truthy(data?.exilus)) {
      row.appendChild(makePolarityBadge("Exilus", "Exilus"));
    }

    // Slots "classiques"
    (data?.slots || [])
      .map(normalizePol)
      .filter(Boolean)
      .forEach((p) => row.appendChild(makePolarityBadge(p)));

    block.appendChild(row);
    return block;
  }

  // ---------- Wrapper complet (Aura + Slots)
  function renderPolarityWrap(data) {
    const wrap = document.createElement("div");
    wrap.className = "polarity-wrap";
    wrap.appendChild(renderAuraBlock(data?.aura));
    wrap.appendChild(renderSlotsBlock(data));
    return wrap;
  }

  /**
   * Place le wrapper SOUS l'image (fallbacks si besoin).
   * Données acceptées :
   *  - wf.polarities = { slots:[], aura:"Madurai"|..., exilus:true|false|null, exilusPolarity:"V"|... }
   *  - ou schémas hérités (slotPolarities/auraPolarity/exilus/exilusPolarity)
   */
  function attach(cardEl, wf) {
    const pol = wf.polarities || {};
    const data = {
      slots: Array.isArray(pol) ? pol : (pol.slots ?? wf.slotPolarities ?? []),
      aura:  Array.isArray(pol) ? null : (pol.aura ?? wf.auraPolarity ?? null),
      exilus: Array.isArray(pol) ? null : (pol.exilus ?? wf.exilus ?? wf.hasExilus ?? null),
      exilusPolarity: Array.isArray(pol) ? null : (pol.exilusPolarity ?? wf.exilusPolarity ?? wf.exilus_polarity ?? null),
    };

    const wrap = renderPolarityWrap(data);

    // 1) priorité : sous l'image
    const img = cardEl.querySelector('img[alt="' + String(wf.name || "").replace(/"/g, '\\"') + '"]');
    const frameBox = img ? img.parentElement : null; // le div qui encadre l'image
    if (frameBox) {
      const existing = cardEl.querySelector(".polarity-wrap");
      if (existing) existing.replaceWith(wrap);
      else frameBox.insertAdjacentElement("afterend", wrap);
      return;
    }

    // 2) fallbacks
    const existing = cardEl.querySelector(".polarity-wrap");
    const h2 = cardEl.querySelector("h2");
    const desc = cardEl.querySelector("p");
    if (existing) existing.replaceWith(wrap);
    else if (h2) h2.insertAdjacentElement("afterend", wrap);
    else if (desc) desc.insertAdjacentElement("beforebegin", wrap);
    else cardEl.prepend(wrap);
  }

  window.Polarities = { attach };
})();
