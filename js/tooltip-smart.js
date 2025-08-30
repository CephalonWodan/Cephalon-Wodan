function attachSmartTooltip(card, tip){
  const PAD = 14;

  function show(e){
    tip.style.display = "block";
    tip.style.visibility = "hidden";
    requestAnimationFrame(() => { position(e); tip.style.visibility = "visible"; });
  }
  function position(e){
    const vw = window.innerWidth, vh = window.innerHeight;
    const w  = tip.offsetWidth,   h  = tip.offsetHeight;

    let x = e.clientX + PAD;      // par défaut: à droite / en dessous
    let y = e.clientY + PAD;

    if (x + w > vw - PAD) x = e.clientX - w - PAD; // flip à gauche si besoin
    if (x < PAD)          x = PAD;                 // clamp gauche
    if (y + h > vh - PAD) y = vh - h - PAD;        // clamp bas
    if (y < PAD)          y = PAD;                 // clamp haut

    tip.style.left = x + "px";
    tip.style.top  = y + "px";
  }
  function hide(){ tip.style.display = "none"; }

  card.addEventListener("mouseenter", show);
  card.addEventListener("mousemove", position);
  card.addEventListener("mouseleave", hide);

  // accessibilité clavier
  card.setAttribute("tabindex", "0");
  card.addEventListener("focus",  (e) => { const r = card.getBoundingClientRect(); show({clientX:r.right, clientY:r.top}); });
  card.addEventListener("blur", hide);
}
