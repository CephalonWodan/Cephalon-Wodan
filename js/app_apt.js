// js/app_apt.js — page Aptitudes
(function(){
  const { txt } = window.WFApp;

  function pill(label, value) {
    return `
      <div class="pill">
        <div class="text-[10px] uppercase tracking-wide muted">${label}</div>
        <div class="mt-1 font-medium">${value == null ? "—" : String(value)}</div>
      </div>`;
  }
  function statBox(label, value) {
    return `
      <div class="stat">
        <div class="text-[10px] uppercase tracking-wide text-slate-200">${label}</div>
        <div class="text-lg font-semibold">${value == null ? "—" : String(value)}</div>
      </div>`;
  }

  function renderAptPage(ctx){
    const { current, abilitiesForFrame } = ctx;
    const card = document.getElementById("card");

    const abilities = abilitiesForFrame(current.name) || [];
    let iAbility = 0;
    const a = abilities[iAbility] || {};
    const s = a.summary || {};

    const tabsApt = abilities.map((ab, i) =>
      `<button class="btn-tab ${i===iAbility?"active":""}" data-abi="${i}">
         ${ab.slot ?? i+1}. ${ab.name || "—"}
       </button>`).join(" ");

    const affected = (s.affectedBy || [])
      .map((k) => `<span class="chip orn" style="border-color:#D4AF37;color:#D4AF37;background:rgba(212,175,55,.06)">${k}</span>`)
      .join(" ");

    const rowsHtml = (a.rows || []).map((r) => {
      const label = r.filledLabel || r.label || "";
      const main  = r.mainNumeric != null ? r.mainNumeric : "";
      return `
        <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
          <div class="text-sm">${label}</div>
          <div class="font-medium">${txt(main)}</div>
        </div>`;
    }).join("");

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

          <div class="grid grid-cols-5 gap-3">
            ${statBox("HP", current.stats.health)}
            ${statBox("SHIELD", current.stats.shield)}
            ${statBox("ARMOR", current.stats.armor)}
            ${statBox("ENERGY", current.stats.energy)}
            ${statBox("SPRINT", current.stats.sprintSpeed)}
          </div>

          ${abilities.length ? `<div class="flex flex-wrap gap-2 mb-3">${tabsApt}</div>` : ""}

          <div class="card p-4 orn">
            <div class="font-semibold">${a.name || "—"}</div>
            <p class="mt-1 text-[var(--muted)]">${(a.description || "").replace(/\r?\n/g, " ")}</p>

            <div class="pill-grid grid grid-cols-4 gap-3 mt-4">
              ${pill("Coût", s.costEnergy)}
              ${pill("Puissance", s.strength)}
              ${pill("Durée", s.duration)}
              ${pill("Portée", s.range)}
            </div>

            ${ (s.affectedBy && s.affectedBy.length)
                ? `<div class="mt-4 text-sm">
                     <div class="mb-1 muted">Affecté par :</div>
                     <div class="flex flex-wrap gap-2">${affected}</div>
                   </div>`
                : "" }

            ${ rowsHtml
                ? `<div class="mt-5">
                     <div class="text-sm muted mb-2">Détails</div>
                     <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
                       ${rowsHtml}
                     </div>
                   </div>`
                : "" }
          </div>
        </div>
      </div>
    `;

    // Polarités sous l'image
    if (window.Polarities?.attach) {
      Polarities.attach(card, current);
    }

    // Switch aptitude
    card.querySelectorAll("[data-abi]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.abi, 10);
        // re-render cette page localement sans changer d’URL (plus fluide)
        const newCtx = { ...ctx };
        const ab = abilities[i]; if (!ab) return;
        const s = ab.summary || {};
        const tabsApt = abilities.map((ab2, j) =>
          `<button class="btn-tab ${j===i?"active":""}" data-abi="${j}">
             ${ab2.slot ?? j+1}. ${ab2.name || "—"}
           </button>`).join(" ");

        const affected = (s.affectedBy || [])
          .map((k) => `<span class="chip orn" style="border-color:#D4AF37;color:#D4AF37;background:rgba(212,175,55,.06)">${k}</span>`)
          .join(" ");

        const rowsHtml = (ab.rows || []).map((r) => {
          const label = r.filledLabel || r.label || "";
          const main  = r.mainNumeric != null ? r.mainNumeric : "";
          return `
            <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
              <div class="text-sm">${label}</div>
              <div class="font-medium">${txt(main)}</div>
            </div>`;
        }).join("");

        const block = card.querySelector(".card.p-4.orn");
        if (block) {
          const tabsEl = card.querySelector(".flex.flex-wrap.gap-2.mb-3");
          if (tabsEl) tabsEl.innerHTML = tabsApt;
          block.innerHTML = `
            <div class="font-semibold">${ab.name || "—"}</div>
            <p class="mt-1 text-[var(--muted)]">${(ab.description || "").replace(/\r?\n/g, " ")}</p>

            <div class="pill-grid grid grid-cols-4 gap-3 mt-4">
              ${pill("Coût", s.costEnergy)}
              ${pill("Puissance", s.strength)}
              ${pill("Durée", s.duration)}
              ${pill("Portée", s.range)}
            </div>

            ${ (s.affectedBy && s.affectedBy.length)
                ? `<div class="mt-4 text-sm">
                     <div class="mb-1 muted">Affecté par :</div>
                     <div class="flex flex-wrap gap-2">${affected}</div>
                   </div>`
                : "" }

            ${ rowsHtml
                ? `<div class="mt-5">
                     <div class="text-sm muted mb-2">Détails</div>
                     <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
                       ${rowsHtml}
                     </div>
                   </div>`
                : "" }
          `;
          // réattache les listeners sur les tabs apt
          card.querySelectorAll("[data-abi]").forEach((b) => b.addEventListener("click", () => b.click()));
        }
      });
    });
  }

  window.WFApp.init("apt", renderAptPage);
})();
