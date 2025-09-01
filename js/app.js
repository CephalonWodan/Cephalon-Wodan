// js/app.js
// =====================================================
// Aperçu Warframes — alimente la UI avec 3 JSON locaux
// abilities.json, abilities_by_warframe.json, warframe_abilities.json
// + la liste Warframes de l’API officielle
// =====================================================

const CFG = {
  WF_URL: "https://api.warframestat.us/warframes",
  ABILITIES_VALUES_URL: "data/abilities.json",            // valeurs (cost/strength/duration/range + rows)
  ABILITIES_BY_WF_URL: "data/abilities_by_warframe.json", // noms par Warframe (fallback/ordre)
  ABILITIES_META_URL: "data/warframe_abilities.json",     // meta (Name, SlotKey, InternalName, Cost, Description…)
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

    const [wfRaw, valsRaw, byWfRaw, metaRaw] = await Promise.all([
      fetch(CFG.WF_URL).then((r) => r.json()),
      fetch(CFG.ABILITIES_VALUES_URL).then((r) => r.json()),
      fetch(CFG.ABILITIES_BY_WF_URL).then((r) => r.json()).catch(() => ({})),
      fetch(CFG.ABILITIES_META_URL).then((r) => r.json()),
    ]);

    // ---- index pour abilities.json (par path)
    const valuesByPath = new Map(valsRaw.map((x) => [x.path, x]));

    // aide: retrouver la meilleure entrée values pour un InternalName
    function findValuesForInternal(internalName) {
      const cands = valsRaw.filter((v) => v.path.startsWith(internalName));
      if (!cands.length) return null;
      // on prend la plus spécifique (path le plus long)
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

    // ---- normalisation de la liste warframes (filtrage)
    const list = wfRaw
      .filter((wf) => wf.type === "Warframe" && !["Bonewidow", "Voidrig"].includes(wf.name))
      .map((rec) => {
        const img = rec.imageName ? `https://cdn.warframestat.us/img/${rec.imageName}` : null;
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
        };
      })
      .sort(byName);

    // ---- injecter les pouvoirs (onglets) par frame : on part de META; fallback sur namesByFrame
    function abilitiesForFrame(frameName) {
      // 1) meta → InternalName → values
      let meta = metaByFrame[frameName];
      if (!meta || !meta.length) {
        // variante (Prime → base, Umbra → Excalibur)
        for (const alt of variantFallbacks(frameName)) {
          if (metaByFrame[alt]?.length) {
            meta = metaByFrame[alt];
            break;
          }
        }
      }
      // Construire la liste
      let out = [];
      if (meta && meta.length) {
        out = meta.map((m) => {
          const values = findValuesForInternal(m.InternalName) || null;
          // summary “fallback” si manquant
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
            rows: (values && values.rows) || [], // lignes “Damage/Radius/…”
          };
        });
      } else {
        // 2) fallback : juste les noms (pas d’internal → on ne pourra pas lier aux valeurs)
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

      // cas Umbra : si meta “Umbra” existe on l’utilise (il contient déjà Radial Howl, etc.)
      // sinon rien à faire : on a déjà le fallback prime/base plus haut si besoin
      return out.sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
    }

    // attache la liste d’abilities à chaque wf
    list.forEach((wf) => {
      wf.abilities = abilitiesForFrame(wf.name);
    });

    // ---------- UI
    const card = document.getElementById("card");
    const search = document.getElementById("search");
    const picker = document.getElementById("picker");

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

    function renderCard(wf, iAbility = 0) {
      const abilities = wf.abilities || [];
      const a = abilities[iAbility] || {};
      const s = a.summary || {};

      const tabs = abilities
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

      card.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6">
          <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
            <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
              ${
                wf.image
                  ? `<img src="${wf.image}" alt="${wf.name}" class="w-full h-full object-contain">`
                  : `<div class="muted">Aucune image</div>`
              }
            </div>
          </div>

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

            <div class="mt-2">
              ${abilities.length ? `<div class="flex flex-wrap gap-2 mb-3">${tabs}</div>` : ""}

              <div class="card p-4 orn">
                <div class="font-semibold">${a.name || "—"}</div>
                <p class="mt-1 text-[var(--muted)]">${(a.description || "").replace(/\r?\n/g, " ")}</p>

                <div class="grid grid-cols-4 gap-3 mt-4">
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
              </div>
            </div>
          </div>
        </div>
      `;

      card.querySelectorAll("[data-abi]").forEach((btn) => {
        btn.addEventListener("click", () => renderCard(wf, parseInt(btn.dataset.abi, 10)));
      });
    }

    function renderPicker(arr) {
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
        status.className =
          "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    };

    setStatus(`Dataset chargé : ${list.length} Warframes`);

    renderPicker(list);
    if (list.length) renderCard(list[0], 0);

    picker.addEventListener("change", (e) => {
      const idx = parseInt(e.target.value, 10);
      const q = norm(search.value).toLowerCase();
      const filtered = !q ? list : list.filter((x) => x.name.toLowerCase().includes(q));
      if (!filtered.length) return;
      renderCard(filtered[Math.min(idx, filtered.length - 1)], 0);
    });

    search.addEventListener("input", () => {
      const q = norm(search.value).toLowerCase();
      const filtered = !q ? list : list.filter((x) => x.name.toLowerCase().includes(q));
      renderPicker(filtered);
      if (filtered.length) renderCard(filtered[0], 0);
      setStatus(`Affichage : ${filtered.length} résultat(s)`);
    });
  } catch (e) {
    console.error(e);
    const status = document.getElementById("status");
    status.textContent = "Erreur de chargement.";
    status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
