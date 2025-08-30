// js/tooltip-smart.js
console.log("[tooltip] smart tooltip chargé");

(function () {
  // Un seul élément flottant pour toutes les cartes
  const floatTip = document.createElement("div");
  floatTip.className = "tooltip-text";     // stylée par ton CSS fourni
  floatTip.style.display = "none";         // contrôlé en JS
  floatTip.setAttribute("role", "tooltip");
  floatTip.setAttribute("aria-hidden", "true");
  document.body.appendChild(floatTip);

  let currentHost = null; // .mod-item actuellement survolé/focus

  const PADDING = 8;   // marge écran
  const OFFSET  = 14;  // décalage curseur/élément

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function positionAtMouse(ev) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // position candidate
    let x = ev.clientX + OFFSET;
    let y = ev.clientY + OFFSET;

    // mesurer la tooltip
    floatTip.style.left = "0px";
    floatTip.style.top  = "0px";
    floatTip.style.display = "block";
    const w = floatTip.offsetWidth;
    const h = floatTip.offsetHeight;

    // si ça dépasse à droite, on met à gauche du curseur
    if (x + w + PADDING > vw) x = ev.clientX - w - OFFSET;
    // si ça dépasse en bas, on met au-dessus du curseur
    if (y + h + PADDING > vh) y = ev.clientY - h - OFFSET;

    // clamp aux bords
    x = clamp(x, PADDING, vw - w - PADDING);
    y = clamp(y, PADDING, vh - h - PADDING);

    floatTip.style.left = x + "px";
    floatTip.style.top  = y + "px";
  }

  function positionNearRect(hostEl) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = hostEl.getBoundingClientRect();

    floatTip.style.display = "block";
    const w = floatTip.offsetWidth;
    const h = floatTip.offsetHeight;

    // par défaut, à droite de l’élément
    let x = r.right + OFFSET;
    let y = r.top + (r.height - h) / 2;

    // fallback si pas de place à droite
    if (x + w + PADDING > vw) x = r.left - w - OFFSET;

    // clamp vertical
    y = clamp(y, PADDING, vh - h - PADDING);

    floatTip.style.left = clamp(x, PADDING, vw - w - PADDING) + "px";
    floatTip.style.top  = y + "px";
  }

  function showFromHost(hostEl) {
    currentHost = hostEl;
    // on prend le HTML depuis .tooltip-template (ou .tooltip-text si tu n’as pas encore renommé)
    const tpl = hostEl.querySelector(".tooltip-template, .tooltip-text");
    if (!tpl) return;
    floatTip.innerHTML = tpl.innerHTML;
    floatTip.style.display = "block";
    floatTip.setAttribute("aria-hidden", "false");
  }

  function hideTip() {
    currentHost = null;
    floatTip.style.display = "none";
    floatTip.setAttribute("aria-hidden", "true");
  }

  // Délégation: fonctionne même si la liste change dynamiquement
  const lists = [
    document.getElementById("warframe-list"),
    document.getElementById("mod-list"),
  ].filter(Boolean);

  lists.forEach(list => {
    list.addEventListener("mouseover", (e) => {
      const host = e.target.closest(".mod-item");
      if (!host || !list.contains(host)) return;
      showFromHost(host);
      positionAtMouse(e);
    });

    list.addEventListener("mousemove", (e) => {
      if (!currentHost) return;
      positionAtMouse(e);
    });

    list.addEventListener("mouseleave", () => {
      hideTip();
    });

    // Accessibilité clavier
    list.addEventListener("focusin", (e) => {
      const host = e.target.closest(".mod-item");
      if (!host) return;
      showFromHost(host);
      // s’assure que l’item est focalisable
      if (host.tabIndex < 0) host.tabIndex = 0;
      positionNearRect(host);
    });

    list.addEventListener("focusout", (e) => {
      const host = e.target.closest(".mod-item");
      if (host === currentHost) hideTip();
    });
  });

  // Si clic/touch en dehors -> on masque
  document.addEventListener("scroll", () => { if (currentHost) hideTip(); }, true);
  window.addEventListener("resize", () => { if (currentHost) hideTip(); });
})();
