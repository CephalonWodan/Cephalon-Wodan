// js/app_mods.js — page Mods
(function(){
  function renderModsList(mods) {
    if (!mods || !mods.length) {
      return `<div class="muted">Aucun mod défini pour cette Warframe. Ajoute <code>data/mods_by_warframe.json</code>.</div>`;
    }
    const items = mods.map((m) => {
      if (typeof m === "string") return `<li class="py-1">${m}</li>`;
      const pol = m.polarity ? `<span class="chip orn" style="border-color:#D4AF37;color:#D4AF37;background:rgba(212,175,55,.06)">${m.polarity}</span>` : "";
      const rank = (m.rank != null) ? ` <span class="muted">R${m.rank}</span>` : "";
      const note = m.note ? `<div class="text-[var(--muted)] text-sm">${m.note}</div>` : "";
      return `<li class="py-1"><div class="flex items-center justify-between"><div class="font-medium">${m.name || "Mod"}</div><div class="flex gap-2 items-center">${pol}${rank}</div></div>${note}</li>`;
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
            <div class="font-semibold">Mods</div>
            <div class="mt-2">
              ${renderModsList(current.mods)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  WFApp.init("mods", renderPage);
})();
