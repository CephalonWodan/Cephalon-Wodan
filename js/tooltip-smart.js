console.log("tooltip-smart.js chargé");

(function(){
  const OFFSET = 14;                 // espace curseur → tooltip
  const MARGIN = 8;                  // marge min aux bords

  // élément unique pour toutes les tooltips
  const tip = document.createElement("div");
  tip.className = "tooltip-text";
  document.body.appendChild(tip);

  let currentCard = null;
  let moveHandler = null;
  let leaveHandler = null;

  function showFor(card, evt){
    currentCard = card;

    // copie le HTML du modèle
    const tpl = card.querySelector(".tooltip-template");
    tip.innerHTML = tpl ? tpl.innerHTML : "<em class='muted'>Aucune info</em>";
    tip.style.display = "block";

    // si on a un mount de pouvoirs → render via abilities.js
    const frameName = card.dataset.frameName;
    const mount = tip.querySelector(".abilities-mount");
    if (mount && window.ABILITIES){
      // rendu immédiat (+ maj quand JSON prêt)
      window.ABILITIES.renderInto(mount, frameName);
      window.ABILITIES.ready?.then(()=> window.ABILITIES.renderInto(mount, frameName));
    }

    position(evt);

    // binder les handlers
    moveHandler = (e) => position(e);
    leaveHandler = () => hide();
    card.addEventListener("mousemove", moveHandler);
    card.addEventListener("mouseleave", leaveHandler);
    window.addEventListener("scroll", hide, { once:true });
  }

  function hide(){
    tip.style.display = "none";
    tip.innerHTML = "";
    if (currentCard && moveHandler) currentCard.removeEventListener("mousemove", moveHandler);
    if (currentCard && leaveHandler) currentCard.removeEventListener("mouseleave", leaveHandler);
    currentCard = null; moveHandler = null; leaveHandler = null;
  }

  function position(e){
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // taille actuelle de la tooltip
    tip.style.left = "0px";
    tip.style.top  = "0px";
    const rect = tip.getBoundingClientRect();

    let x = e.clientX + OFFSET;
    let y = e.clientY + OFFSET;

    // évite débordement droit
    if (x + rect.width + MARGIN > vw) {
      x = e.clientX - rect.width - OFFSET;
    }
    // évite débordement bas
    if (y + rect.height + MARGIN > vh) {
      y = e.clientY - rect.height - OFFSET;
    }
    // garde une marge mini
    x = Math.max(MARGIN, Math.min(x, vw - rect.width - MARGIN));
    y = Math.max(MARGIN, Math.min(y, vh - rect.height - MARGIN));

    tip.style.left = x + "px";
    tip.style.top  = y + "px";
  }

  // délégation: survol d'une carte .mod-item
  document.addEventListener("mouseenter", (e) => {
    const card = e.target.closest(".mod-item");
    if (!card) return;
    showFor(card, e);
  }, true);

  // touche Échap pour cacher
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });
})();
