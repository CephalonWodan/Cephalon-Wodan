// js/app_mods.js — Page MODs (source : https://api.warframestat.us/mods/)
(function(){
  function chip(txt) {
    return `<span class="chip orn" style="border-color:#D4AF37;color:#D4AF37;background:rgba(212,175,55,.06)">${txt}</span>`;
  }
  function itemRow(m) {
    const right = [
      m.polarity ? chip(m.polarity) : "",
      m.rarity ? `<span class="muted">${m.rarity}</span>` : "",
      (m.fusionLimit!=null) ? `<span class="muted">R${m.fusionLimit}</span>` : ""
    ].filter(Boolean).join(" ");
    return `
      <li class="py-2">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-medium">${m.name || "Mod"}</div>
            ${m.description ? `<div class="text-[var(--muted)] text-sm max-w-prose">${m.description}</div>` : ""}
          </div>
          <div class="flex items-center gap-2 shrink-0">${right}</div>
        </div>
      </li>`;
  }
  function listBlock(title, arr) {
    if (!arr || !arr.length) {
      return `<div class="card p-4 orn"><div class="font-semibold">${title}</div><div class="mt-2 muted">Aucun élément.</div></div>`;
    }
    return `
      <div class="card p-4 orn">
        <div class="font-semibold">${title}</div>
        <ul class="divide-y divide-[rgba(255,255,255,.06)] mt-2">${arr.map(itemRow).join("")}</ul>
      </div>`;
  }

  function renderPage(ctx){
    const { current, modsForFrame } = ctx;
    const card = document.getElementById("card");

    const { augments, auras, exilus, generals } = modsForFrame(current.name);

    card.innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Image -->
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            ${ current.image
                ? `<img src="${current.image}" alt="${current.name}" class="w-full h-full object-contain">`
                : `<div class="muted">Aucune image</div>` }
          </div>
        </div>

        <!-- Contenu -->
        <div class="flex-1 flex flex-col gap-4">
          <div class="min-w-0">
            <h2 class="text-xl font-semibold">${current.name}</h2>
            <p class="mt-2 text-[var(--muted)]">${current.description || ""}</p>
          </div>

          ${listBlock("Augments spécifiques", augments)}
          ${listBlock("Auras (toutes Warframes)", auras)}
          ${listBlock("Exilus (Warframe)", exilus)}
          ${listBlock("Mods généraux (Warframe)", generals)}
        </div>
      </div>
    `;

    // Polarités sous l’image (si tu utilises toujours polarities.js)
    if (window.Polarities?.attach) {
      Polarities.attach(card, current);
    }
  }

  WFApp.init("mods", renderPage);
})();
