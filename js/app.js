// js/app.js
// =====================================================
// Aperçu Warframes — alimente la UI avec 3 JSON locaux
// abilities.json, abilities_by_warframe.json, warframe_abilities.json
// + la liste Warframes de l’API officielle WFCD
// + barre d’onglets VERTICALE (à gauche du grand encadré) :
//   Aptitudes / MOD / Arcanes / Archon Shards / Weapons
// =====================================================

const CFG = {
  WF_URL: "https://api.warframestat.us/warframes",
  ABILITIES_VALUES_URL: "data/abilities.json",
  ABILITIES_BY_WF_URL: "data/abilities_by_warframe.json",
  ABILITIES_META_URL: "data/warframe_abilities.json",

  // Données optionnelles (si absentes → message dans l’onglet)
  MODS_BY_WF_URL: "data/mods_by_warframe.json",
  ARCANES_BY_WF_URL: "data/arcanes_by_warframe.json",
  SHARDS_BY_WF_URL: "data/archon_shards_by_warframe.json",
  WEAPONS_BY_WF_URL: "data/weapons_by_warframe.json",
};

// ---------- utils
const txt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (s) => String(s || "").trim();
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
const bySlot = (a, b) => (a.SlotKey ?? 99) - (b.SlotKey ?? 99);

function variantFallbacks(name) {
  if (!name) return [];
  const base = name.replace(/\s+Prime\b/i, "").trim();
  const list = [];
  if (name !== base) list.push(base);
  if (name === "Excalibur Umbra") list.push("Excalibur");
  return list;
}

// ---------- boot
(async function boot() {
  const status = document.getElementById("status");
  try {
    status.textContent = "Chargement des données…";

    const [
      wfRaw,
      valsRaw,
      byWfRaw,
      metaRaw,
      modsRaw,
      arcanesRaw,
      shardsRaw,
      weaponsRaw
    ] = await Promise.all([
      fetch(CFG.WF_URL).then((r) => r.json()),
      fetch(CFG.ABILITIES_VALUES_URL).then((r) => r.json()),
      fetch(CFG.ABILITIES_BY_WF_URL).then((r) => r.json()).catch(() => ({})),
      fetch(CFG.ABILITIES_META_URL).then((r) => r.json()),
      fetch(CFG.MODS_BY_WF_URL).then((r)=>r.json()).catch(()=> ({})),
      fetch(CFG.ARCANES_BY_WF_URL).then((r)=>r.json()).catch(()=> ({})),
      fetch(CFG.SHARDS_BY_WF_URL).then((r)=>r.json()).catch(()=> ({})),
      fetch(CFG.WEAPONS_BY_WF_URL).then((r)=>r.json()).catch(()=> ({})),
    ]);

    // ---- index pour abilities.json (par path)
    const valuesByPath = new Map(valsRaw.map((x) => [x.path, x]));

    // aide: retrouver la meilleure entrée values pour un InternalName
    function findValuesForInternal(internalName) {
      const cands = valsRaw.filter((v) => v.path.startsWith(internalName));
      if (!cands.length) return null;
      cands.sort((a, b) => b.path.length - a.path.length);
      return cands[0];
    }

    // ---- index META par Warframe
    const metaByFrame = metaRaw.reduce((acc, m) => {
      const k = norm(m.Powersuit);
      if (!k) return acc;
      (acc[k] ??= []).push(m);
      return acc;
    }, {});
    for (const k in metaByFrame) metaByFrame[k].sort(bySlot);

    // ---- fallback liste noms par Warframe (si jamais une frame manque dans meta)
    const namesByFrame = byWfRaw || {};

    // ---- données facultatives par Warframe
    const modsByFrame = modsRaw || {};
    const arcanesByFrame = arcanesRaw || {};
    const shardsByFrame = shardsRaw || {};
    const weaponsByFrame = weaponsRaw || {};

    // ---- normalisation de la liste warframes (filtrage)
    const list = wfRaw
      .filter((wf) => wf.type === "Warframe" && !["Bonewidow", "Voidrig"].includes(wf.name))
      .map((rec) => {
        const img = rec.imageName ? `https://cdn.warframestat.us/img/${rec.imageName}` : null;

        // Polarités (API) — si "Prime" on préfère prime_*
        const isPrime = /\bPrime\b/i.test(rec.name || "");
        const slots = isPrime ? (rec.prime_polarities ?? rec.polarities ?? []) : (rec.polarities ?? []);
        const aura  = isPrime ? (rec.prime_aura ?? rec.aura ?? null) : (rec.aura ?? null);

        // Exilus côté API : pas de polarité ; tu peux le compléter via données locales
        const exilus = rec.exilus ?? null;
        const exilusPolarity = rec.exilusPolarity ?? rec.exilus_polarity ?? null;

        return {
          name: rec.name || "",
          description: rec.description || "",
          image: img,
          stats: {
            health: rec.health ?? "—",
            shield: rec.shield ?? "—",
            armor: rec.armor ?? "—",
            energy: rec.power ?? rec.energy ?? "—",
            sprintSpeed: rec.sprintSpeed ?? "—",
          },
          polarities: { slots, aura, exilus, exilusPolarity },

          // sections (facultatives)
          mods: modsByFrame[rec.name] || [],
          arcanes: arcanesByFrame[rec.name] || [],
          shards: shardsByFrame[rec.name] || [],
          weapons: weaponsByFrame[rec.name] || []
        };
      })
      .sort(byName);

    // ---- aptitudes par frame : on part de META; fallback sur namesByFrame
    function abilitiesForFrame(frameName) {
      let meta = metaByFrame[frameName];
      if (!meta || !meta.length) {
        for (const alt of variantFallbacks(frameName)) {
          if (metaByFrame[alt]?.length) {
            meta = metaByFrame[alt];
            break;
          }
        }
      }
      let out = [];
      if (meta && meta.length) {
        out = meta.map((m) => {
          const values = findValuesForInternal(m.InternalName) || null;
          const sum = (values && values.summary) || {};
          const summary = {
            costEnergy: m.Cost ?? sum.costEnergy ?? null,
            strength: sum.strength ?? null,
            duration: sum.duration ?? null,
            range: sum.range ?? null,
            affectedBy: Array.isArray(sum.affectedBy) ? sum.affectedBy : [],
          };
          return {
            slot: m.SlotKey ?? null,
            name: m.Name || m.AbilityKey || "—",
            description: m.Description || "",
            internal: m.InternalName,
            summary,
            rows: (values && values.rows) || [],
          };
        });
      } else {
        const names = namesByFrame[frameName] || [];
        out = names.map((n, i) => ({
          slot: i + 1,
          name: n,
          description: "",
          internal: null,
          summary: { costEnergy: null, strength: null, duration: null, range: null, affectedBy: [] },
          rows: [],
        }));
      }
      return out.sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
    }

    // attache les aptitudes à chaque wf
    list.forEach((wf) => {
      wf.abilities = abilitiesForFrame(wf.name);
    });

    // ---------- UI helpers
    const card = document.getElementById("card");
    const search = document.getElementById("search");
    const picker = document.getElementById("picker");

    // barre latérale (onglets)
    const sectionTabs = [
      { key: "apt",     label: "Aptitudes" },
      { key: "mods",    label: "MOD" },
      { key: "arcanes", label: "Arcanes" },
      { key: "shards",  label: "Archon Shards" },
      { key: "weapons", label: "Weapons" },
    ];

    function pill(label, value) {
      return `
        <div class="pill">
          <div class="text-[10px] uppercase tracking-wide muted">${label}</div>
          <div class="mt-1 font-medium">${txt(value)}</div>
        </div>`;
    }
    function statBox(label, value) {
      return `
        <div class="stat">
          <div class="text-[10px] uppercase tracking-wide text-slate-200">${label}</div>
          <div class="text-lg font-semibold">${txt(value)}</div>
        </div>`;
    }

    // Rendu sections secondaires (Mods / Arcanes / Shards / Weapons)
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

    function renderWeaponsList(weps) {
      if (!weps || !weps.length) {
        return `<div class="muted">Aucune arme liée. Ajoute <code>data/weapons_by_warframe.json</code>.</div>`;
      }
      const items = weps.map((w) => {
        if (typeof w === "string") return `<li class="py-1">${w}</li>`;
        const type = w.type ? `<span class="muted">(${w.type})</span>` : "";
        const note = w.note ? `<div class="text-[var(--muted)] text-sm">${w.note}</div>` : "";
        return `<li class="py-1"><div class="font-medium">${w.name || "Weapon"} ${type}</div>${note}</li>`;
      }).join("");
      return `<ul class="divide-y divide-[rgba(255,255,255,.06)]">${items}</ul>`;
    }

    function renderSectionSidebar(activeKey) {
      // colonne verticale : boutons plein-largeur, alignés à gauche
      return `
        <div class="hidden md:block w-[180px] shrink-0">
          <div class="flex flex-col gap-2">
            ${sectionTabs.map(t =>
              `<button class="btn-tab ${t.key === activeKey ? "active" : ""} block w-full text-left" data-top="${t.key}">
                ${t.label}
              </button>`
            ).join("")}
          </div>
        </div>

        <!-- Sur mobile, on affiche une rangée horizontale au-dessus du contenu -->
        <div class="md:hidden">
          <div class="flex flex-wrap gap-2 mb-2">
            ${sectionTabs.map(t =>
              `<button class="btn-tab ${t.key === activeKey ? "active" : ""}" data-top="${t.key}">${t.label}</button>`
            ).join("")}
          </div>
        </div>
      `;
    }

    // ---------- Rendu d'une Warframe
    function renderCard(wf, iAbility = 0, activeTop = "apt") {
      const abilities = wf.abilities || [];
      const a = abilities[iAbility] || {};
      const s = a.summary || {};

      const tabsApt = abilities
        .map(
          (ab, i) =>
            `<button class="btn-tab ${i === iAbility ? "active" : ""}" data-abi="${i}">${ab.slot ?? i + 1}. ${
              ab.name || "—"
            }</button>`
        )
        .join(" ");

      const affected = (s.affectedBy || [])
        .map((k) => `<span class="chip orn" style="border-color:#D4AF37;color:#D4AF37;background:rgba(212,175,55,.06)">${k}</span>`)
        .join(" ");

      const rowsHtml = (a.rows || [])
        .map((r) => {
          const label = r.filledLabel || r.label || "";
          const main = r.mainNumeric != null ? r.mainNumeric : "";
          return `
            <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
              <div class="text-sm">${label}</div>
              <div class="font-medium">${txt(main)}</div>
            </div>`;
        })
        .join("");

      // ----- contenu principal selon l'onglet
      let mainContent = "";
      if (activeTop === "apt") {
        mainContent = `
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

            ${
              (s.affectedBy && s.affectedBy.length)
                ? `<div class="mt-4 text-sm">
                    <div class="mb-1 muted">Affecté par :</div>
                    <div class="flex flex-wrap gap-2">${affected}</div>
                  </div>`
                : ""
            }

            ${
              rowsHtml
                ? `<div class="mt-5">
                    <div class="text-sm muted mb-2">Détails</div>
                    <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
                      ${rowsHtml}
                    </div>
                  </div>`
                : ""
            }
          </div>`;
      } else if (activeTop === "mods") {
        mainContent = `
          <div class="card p-4 orn">
            <div class="font-semibold">Mods</div>
            <div class="mt-2">${renderModsList(wf.mods)}</div>
          </div>`;
      } else if (activeTop === "arcanes") {
        mainContent = `
          <div class="card p-4 orn">
            <div class="font-semibold">Arcanes</div>
            <div class="mt-2">${renderArcanesList(wf.arcanes)}</div>
          </div>`;
      } else if (activeTop === "weapons") {
        mainContent = `
          <div class="card p-4 orn">
            <div class="font-semibold">Weapons</div>
            <div class="mt-2">${renderWeaponsList(wf.weapons)}</div>
          </div>`;
      } else {
        mainContent = `
          <div class="card p-4 orn">
            <div class="font-semibold">Archon Shards</div>
            <div class="mt-2">${renderShardsGrid(wf.shards)}</div>
          </div>`;
      }

      card.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Colonne image + polarités -->
          <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
            <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
              ${
                wf.image
                  ? `<img src="${wf.image}" alt="${wf.name}" class="w-full h-full object-contain">`
                  : `<div class="muted">Aucune image</div>`
              }
            </div>
          </div>

          <!-- Colonne contenu -->
          <div class="flex-1 flex flex-col gap-4">
            <div class="flex items-start gap-4">
              <div class="min-w-0 flex-1">
                <h2 class="text-xl font-semibold">${wf.name}</h2>
                <p class="mt-2 text-[var(--muted)]">${wf.description || ""}</p>
              </div>
            </div>

            <div class="grid grid-cols-5 gap-3">
              ${statBox("HP", wf.stats.health)}
              ${statBox("SHIELD", wf.stats.shield)}
              ${statBox("ARMOR", wf.stats.armor)}
              ${statBox("ENERGY", wf.stats.energy)}
              ${statBox("SPRINT", wf.stats.sprintSpeed)}
            </div>

            <!-- Zone principale : barre latérale à gauche + contenu -->
            <div class="flex gap-4">
              ${renderSectionSidebar(activeTop)}
              <div class="flex-1">
                ${mainContent}
              </div>
            </div>
          </div>
        </div>
      `;

      // Icônes de polarités (placées sous l'image par js/polarities.js)
      if (window.Polarities?.attach) {
        Polarities.attach(card, wf);
      }

      // Listeners — switch section
      card.querySelectorAll("[data-top]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = String(btn.dataset.top);
          renderCard(wf, 0, key); // reset sur la 1ère aptitude lors d’un changement de section
        });
      });

      // Listeners — switch aptitude (si section "apt")
      if (activeTop === "apt") {
        card.querySelectorAll("[data-abi]").forEach((btn) => {
          btn.addEventListener("click", () => renderCard(wf, parseInt(btn.dataset.abi, 10), "apt"));
        });
      }
    }

    // ---------- Picker & recherche
    function renderPicker(arr) {
      const picker = document.getElementById("picker");
      picker.innerHTML = "";
      arr.forEach((wf, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = wf.name;
        picker.appendChild(opt);
      });
      picker.value = "0";
    }

    // init UI
    const setStatus = (msg, ok = true) => {
      status.textContent = msg;
      if (!ok) {
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    };

    setStatus(`Dataset chargé : ${list.length} Warframes`);
    renderPicker(list);
    if (list.length) renderCard(list[0], 0, "apt");

    document.getElementById("picker").addEventListener("change", (e) => {
      const idx = parseInt(e.target.value, 10);
      const q = norm(document.getElementById("search").value).toLowerCase();
      const filtered = !q ? list : list.filter((x) => x.name.toLowerCase().includes(q));
      if (!filtered.length) return;
      renderCard(filtered[Math.min(idx, filtered.length - 1)], 0, "apt");
    });

    document.getElementById("search").addEventListener("input", () => {
      const q = norm(document.getElementById("search").value).toLowerCase();
      const filtered = !q ? list : list.filter((x) => x.name.toLowerCase().includes(q));
      renderPicker(filtered);
      if (filtered.length) renderCard(filtered[0], 0, "apt");
      setStatus(`Affichage : ${filtered.length} résultat(s)`);
    });
  } catch (e) {
    console.error(e);
    status.textContent = "Erreur de chargement.";
    status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
