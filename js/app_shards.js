// js/app_shards.js — page Archon Shards
(function(){
  function renderShardsGrid(shards) {
    if (!shards || !shards.length) {
      return `<div class="muted">Aucun Archon Shard défini. Ajoute <code>data/archon_shards_by_warframe.json</code>.</div>`;
    }
    const items = shards.map((s) => {
      const color = s.color || "Shard";
      const bonus = s.bonus || s.effect || "";
      return `<div class="rounded-xl border border-[rgba(255,255,255,.08)] p-3 bg-[var(--panel-2)]">
        <div class="font-medium">${color}</div>
        ${bonus ? `<div class="text-[var(--muted)] text-sm mt-1">${bonus}</div>` : ""}
      </div>`;
    }).join("");
    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${items}</div>`;
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
            <div class="font-semibold">Archon Shards</div>
            <div class="mt-2">
              ${renderShardsGrid(current.shards)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  WFApp.init("shards", renderPage);
})();
