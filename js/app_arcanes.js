// js/app_arcanes.js — page Arcanes
(function(){
  function renderArcanesList(arcs) {
    if (!arcs || !arcs.length) {
      return `<div class="muted">Aucun arcane défini. Ajoute <code>data/arcanes_by_warframe.json</code>.</div>`;
    }
    const items = arcs.map((a) => {
      const rank = (a.rank != null) ? ` <span class="muted">R${a.rank}</span>` : "";
      return `<li class="py-1">
        <div class="font-medium">${a.name || "Arcane"}${rank}</div>
        ${a.description ? `<div class="text-[var(--muted)] text-sm">${a.description}</div>` : ""}
      </li>`;
    }).join("");
    return `<ul class="divide-y divide-[rgba(255,255,255,.06)]">${items}</ul>`;
  }

  function renderPage(ctx){
    const { current } = ctx;
    const card = document.getElementById("card");
    card.innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            ${ current.image
                ? `<img src="${current.image}" alt="${current.name}" class="w-full h-full object-contain">`
                : `<div class="muted">Aucune image</div>` }
          </div>
        </div>

        <div class="flex-1 flex flex-col gap-4">
          <div class="min-w-0">
            <h2 class="text-xl font-semibold">${current.name}</h2>
            <p class="mt-2 text-[var(--muted)]">${current.description || ""}</p>
          </div>

          <div class="card p-4 orn">
            <div class="font-semibold">Arcanes</div>
            <div class="mt-2">
              ${renderArcanesList(current.arcanes)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  WFApp.init("arcanes", renderPage);
})();
