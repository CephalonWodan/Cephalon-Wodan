function setupTabs(){
  // On cherche #vtabs ; si absent, on en crée un petit fallback au-dessus de #card.
  let host = $("#vtabs");
  if (!host) {
    const panel = $("#panel-wrapper") || document.body;
    const div = document.createElement("div");
    div.id = "vtabs";
    // style simple si pas d'aside prévu
    div.className = "mb-3 flex gap-2";
    panel.insertBefore(div, panel.firstChild || null);
    host = div;
  }

  host.innerHTML = `
    <div class="flex flex-col md:flex-col gap-2 w-full">
      <button data-mode="companions" class="w-full text-left px-3 py-2 rounded-lg">Companions</button>
      <button data-mode="moa" class="w-full text-left px-3 py-2 rounded-lg">MOA</button>
      <button data-mode="hound" class="w-full text-left px-3 py-2 rounded-lg">Hound</button>
    </div>
  `;

  host.querySelectorAll("button[data-mode]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      STATE.mode = btn.getAttribute("data-mode");
      applyMode();
    });
  });
}

function applyMode(){
  const showComp = STATE.mode === "companions";

  // toggle search/picker si présents
  const search = $("#search");
  const picker = $("#picker");
  if (search && search.parentElement) search.parentElement.style.display = showComp ? "" : "none";
  if (picker) picker.style.display = showComp ? "" : "none";

  // contenu principal
  if (STATE.mode === "companions") {
    if (STATE.list.length) renderCard(STATE.list[0]);
  } else if (STATE.mode === "moa") {
    renderModularBuilder(STATE.modular, "moa");
  } else if (STATE.mode === "hound") {
    renderModularBuilder(STATE.modular, "hound");
  }

  // stylage des onglets SI #vtabs existe
  const tabs = $("#vtabs");
  if (tabs) {
    tabs.querySelectorAll("button[data-mode]").forEach(b=>{
      const on = b.getAttribute("data-mode") === STATE.mode;
      b.className = "w-full text-left px-3 py-2 rounded-lg " +
        (on ? "bg-[var(--panel-2)] border" : "hover:bg-[var(--panel-2)]/60");
    });
  }
}
