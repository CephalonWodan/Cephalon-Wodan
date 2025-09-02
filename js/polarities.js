(() => {
  const POL_SVG = {
    Madurai:"Madurai_Pol.svg", Vazarin:"Vazarin_Pol.svg", Naramon:"Naramon_Pol.svg",
    Zenurik:"Zenurik_Pol.svg", Unairu:"Unairu_Pol.svg", Umbra:"Umbra_Pol.svg",
    Penjaga:"Penjaga_Pol.svg", Exilus:"Exilus_Pol.svg", Any:"Any_Pol.svg"
  };
  const POL_ALIAS = {
    "V":"Madurai","D":"Vazarin","-":"Naramon","/":"Zenurik","Y":"Unairu","U":"Umbra","P":"Penjaga","O":"Any",
    "MADURAI":"Madurai","VAZARIN":"Vazarin","NARAMON":"Naramon","ZENURIK":"Zenurik","UNAIRU":"Unairu",
    "UMBRA":"Umbra","PENJAGA":"Penjaga","ANY":"Any","AURA":"Aura","EXILUS":"Exilus","NONE":"None"
  };

  function normalizePol(p){ if(!p) return "None"; const k=String(p).trim().toUpperCase(); return POL_ALIAS[k]||p; }
  function polIconSrc(name){ return `img/polarities/${POL_SVG[name]||POL_SVG.Any}`; }

  function makePolarityBadge(name, kind=null){
    const el = document.createElement("span");
    el.className = "polarity-badge";
    el.dataset.kind = kind || "";
    el.title = kind ? `${kind}: ${name}` : name;
    const img = document.createElement("img");
    img.alt = name + " polarity"; img.width=20; img.height=20;
    img.src = polIconSrc(name);
    el.appendChild(img);
    return el;
  }

  function renderPolarities(data){
    const box = document.createElement("div");
    box.className = "polarity-row";
    if (data?.aura){ box.appendChild(makePolarityBadge(normalizePol(data.aura), "Aura")); }
    if (data?.exilus){ box.appendChild(makePolarityBadge(normalizePol(data.exilus), "Exilus")); }
    (data?.slots || []).map(normalizePol).forEach(p => box.appendChild(makePolarityBadge(p)));
    return box;
  }

  // API publique : window.Polarities.attach(cardEl, warframeObj)
  function attach(cardEl, wf){
    const data = Array.isArray(wf.polarities)
      ? { slots: wf.polarities }
      : (wf.polarities || {
          slots: wf.slotPolarities || [],
          aura: wf.auraPolarity || null,
          exilus: wf.exilusPolarity || null
        });
    const row = renderPolarities(data);
    const old = cardEl.querySelector(".polarity-row");
    old ? old.replaceWith(row) : cardEl.appendChild(row);
  }

  window.Polarities = { attach };
})();
