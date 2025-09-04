// js/app.js
// =====================================================
// Aperçu Warframes — données API + 3 JSON locaux
// abilities.json, abilities_by_warframe.json, warframe_abilities.json
// - Pas de dépendance à #vtabs
// - Pas de fetch des fichiers *_by_warframe.json absents
// - Failover API EN -> FR + messages d'erreur clairs
// - Rendu des <DT_..._COLOR> + <LINE_SEPARATOR> (badges + icônes locales)
// =====================================================

const CFG = {
  WF_URLS: [
    "https://api.warframestat.us/warframes/?language=en",
    "https://api.warframestat.us/warframes/?language=fr",
  ],
  ABILITIES_VALUES_URL: "data/abilities.json",
  ABILITIES_BY_WF_URL: "data/abilities_by_warframe.json", // optionnel
  ABILITIES_META_URL: "data/warframe_abilities.json",
};

/* ---------------- Text Icons (DT_* + LINE_SEPARATOR) ---------------- */
const ICON_BASE = new URL("img/symbol/", document.baseURI).href; // ton dossier
const USE_ICONS = true;

const DT = {
  // Physiques
  DT_IMPACT_COLOR:     { label: "Impact",     color: "#6aa4e0", icon: "ImpactSymbol.png" },
  DT_PUNCTURE_COLOR:   { label: "Puncture",   color: "#c6b07f", icon: "PunctureSymbol.png" },
  DT_SLASH_COLOR:      { label: "Slash",      color: "#d46a6a", icon: "SlashSymbol.png" },

  // Élémentaires
  DT_FIRE_COLOR:        { label: "Heat",        color: "#ff8a47", icon: "HeatSymbol.png" },
  DT_FREEZE_COLOR:      { label: "Cold",        color: "#7dd3fc", icon: "ColdSymbol.png" },
  DT_ELECTRICITY_COLOR: { label: "Electricity", color: "#f6d05e", icon: "ElectricitySymbol.png" },
  DT_POISON_COLOR:      { label: "Toxin",       color: "#32d296", icon: "ToxinSymbol.png" },
  DT_TOXIN_COLOR:       { alias: "DT_POISON_COLOR" },

  // Combinés
  DT_GAS_COLOR:        { label: "Gas",        color: "#7fd4c1", icon: "GasSymbol.png" },
  DT_MAGNETIC_COLOR:   { label: "Magnetic",   color: "#9bb8ff", icon: "MagneticSymbol.png" },
  DT_RADIATION_COLOR:  { label: "Radiation",  color: "#f5d76e", icon: "RadiationSymbol.png" },
  DT_VIRAL_COLOR:      { label: "Viral",      color: "#d16ba5", icon: "ViralSymbol.png" },
  DT_CORROSIVE_COLOR:  { label: "Corrosive",  color: "#a3d977", icon: "CorrosiveSymbol.png" },
  DT_BLAST_COLOR:      { label: "Blast",      color: "#ffb26b", icon: "BlastSymbol.png" },
  DT_EXPLOSION_COLOR:  { alias: "DT_BLAST_COLOR" },

  // Divers
  DT_RADIANT_COLOR:    { label: "Void",       color: "#c9b6ff", icon: "VoidSymbol.png" },
  DT_SENTIENT_COLOR:   { label: "Sentient",   color: "#b0a6ff", icon: "SentientSymbol.png" },
  DT_RESIST_COLOR:     { label: "Resist",     color: "#9aa0a6", icon: "ResistSymbol.png" },
  DT_POSITIVE_COLOR:   { label: "Positive",   color: "#66d17e", icon: "PositiveSymbol.png" },
  DT_NEGATIVE_COLOR:   { label: "Negative",   color: "#e57373", icon: "NegativeSymbol.png" },
};
function resolveDT(key){
  const v = DT[String(key || "").toUpperCase()];
  return v?.alias ? resolveDT(v.alias) : v || null;
}
function renderTextIcons(input){
  let s = String(input ?? "");

  // Normalise les séparateurs (on garde les \n puis on convertira en <br>)
  s = s.replace(/\r\n|\r/g, "\n").replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n").replace(/\n{2,}/g, "\n");

  // Échappe d'abord tout le HTML
  s = s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  // Remplace les balises DT_* (acceptées brutes <TAG> ou encodées &lt;TAG&gt;)
  s = s.replace(/(?:&lt;|<)\s*(DT_[A-Z_]+)\s*(?:&gt;|>)/g, (_, key) => {
    const def = resolveDT(key);
    if (!def) return "";
    const { label, color, icon } = def;
    if (USE_ICONS && icon) {
      const src = ICON_BASE + icon;
      return `<span class="dt-chip" style="color:${color}">
        <img class="dt-ico" alt="${label}" title="${label}" src="${src}">${label}
      </span>`;
    }
    return `<span class="dt-chip" style="color:${color}" title="${label}">${label}</span>`;
  });

  // Retours à la ligne → <br>
  return s.replace(/\n/g, "<br>");
}

/* ---------------- utils ---------------- */
const $  = (sel) => document.querySelector(sel);
const txt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (s) => String(s || "").trim();
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
const bySlot = (a, b) => (a.SlotKey ?? 99) - (b.SlotKey ?? 99);

function variantFallbacks(name) {
  if (!name) return [];
  const base = name.replace(/\s+(Prime|Umbra)\b/i, "").trim();
  const list = [];
  if (name !== base) list.push(base);
  if (/^Excalibur Umbra$/i.test(name)) list.push("Excalibur");
  return list;
}

async function fetchJson(url, what) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${what} — HTTP ${r.status} @ ${url}`);
  return r.json();
}

async function fetchWarframesWithFailover() {
  const errors = [];
  for (const url of CFG.WF_URLS) {
    try {
      const data = await fetchJson(url, "Warframes API");
      if (Array.isArray(data) && data.length) {
        console.info(`[app] Warframes chargées via ${url} (${data.length})`);
        return data;
      }
      errors.push(`Réponse vide @ ${url}`);
    } catch (e) {
      console.error(e);
      errors.push(e.message || String(e));
    }
  }
  throw new Error(`Impossible de charger la liste des Warframes.\n${errors.join("\n")}`);
}

/* ---------------- boot ---------------- */
(async function boot() {
  const status = $("#status");
  try {
    if (status) {
      status.textContent = "Chargement des données…";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";
    }

    // Charge en parallèle (with graceful fallback pour abilities_by_warframe.json)
    const [wfRaw, valsRaw, byWfRaw, metaRaw] = await Promise.all([
      fetchWarframesWithFailover(),
      fetchJson(CFG.ABILITIES_VALUES_URL, "abilities.json"),
      fetch(CFG.ABILITIES_BY_WF_URL).then(r => r.ok ? r.json() : (console.warn("[app] abilities_by_warframe.json absent (OK)"), {})).catch(()=> ({})),
      fetchJson(CFG.ABILITIES_META_URL, "warframe_abilities.json"),
    ]);

    // ---- index values (helper)
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

    // ---- fallback liste noms par Warframe
    const namesByFrame = byWfRaw || {};

    // ---- normalise la liste Warframes
    const list = (wfRaw || [])
      .filter((wf) => wf && wf.type === "Warframe" && !["Bonewidow", "Voidrig"].includes(wf.name))
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

    function abilitiesForFrame(frameName) {
      let meta = metaByFrame[frameName];
      if (!meta || !meta.length) {
        for (const alt of variantFallbacks(frameName)) {
          if (metaByFrame[alt]?.length) { meta = metaByFrame[alt]; break; }
        }
      }
      let out = [];
      if (meta && meta.length) {
        out = meta.map((m) => {
          const values = findValuesForInternal(m.InternalName) || null;
          const sum = (values && values.summary) || {};
          const summary = {
            costEnergy: m.Cost ?? sum.costEnergy ?? null,
            strength:   sum.strength ?? null,
            duration:   sum.duration ?? null,
            range:      sum.range ?? null,
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

    // Attache abilities à chaque wf
    list.forEach((wf) => { wf.abilities = abilitiesForFrame(wf.name); });

    // ---------- UI
    const card = $("#card");

    const pill = (label, value) => `
      <div class="pill">
        <div class="text-[10px] uppercase tracking-wide muted">${escapeHtml(label)}</div>
        <div class="mt-1 font-medium">${escapeHtml(txt(value))}</div>
      </div>`;

    const statBox = (label, value) => `
      <div class="stat">
        <div class="text-[10px] uppercase tracking-wide text-slate-200">${escapeHtml(label)}</div>
        <div class="text-lg font-semibold">${escapeHtml(txt(value))}</div>
      </div>`;

    function renderCard(wf, iAbility = 0) {
      const wfName = escapeHtml(wf.name);
      const wfDesc = escapeHtml(wf.description || "");
      const abilities = wf.abilities || [];
      const a = abilities[iAbility] || {};
      const s = a.summary || {};

      const tabs = abilities.map((ab, i) =>
        `<button class="btn-tab ${i === iAbility ? "active" : ""}" data-abi="${i}">
          ${escapeHtml(String(ab.slot ?? i + 1))}. ${escapeHtml(ab.name || "—")}
        </button>`
      ).join(" ");

      const affected = (s.affectedBy || [])
        .map((k) => `<span class="chip orn" style="border-color:#D4AF37;color:#D4AF37;background:rgba(212,175,55,.06)">${escapeHtml(k)}</span>`)
        .join(" ");

      const rowsHtml = (a.rows || []).map((r) => {
        const label = r.filledLabel || r.label || "";
        const main = r.mainNumeric != null ? r.mainNumeric : "";
        return `
          <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
            <div class="text-sm">${escapeHtml(label)}</div>
            <div class="font-medium">${escapeHtml(txt(main))}</div>
          </div>`;
      }).join("");

      card.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6">
          <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
            <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
              ${
                wf.image
                  ? `<img src="${wf.image}" alt="${wfName}" class="w-full h-full object-contain">`
                  : `<div class="muted">Aucune image</div>`
              }
            </div>

            <!-- Polarités sous l'image -->
            <div class="w-full">
              <div class="aura-label">Aura polarity</div>
              <div class="polarity-row" data-zone="aura"></div>
              <div class="polarity-label mt-3">Polarities</div>
              <div class="polarity-row" data-zone="others"></div>
            </div>
          </div>

          <div class="flex-1 flex flex-col gap-4">
            <div class="flex items-start gap-4">
              <div class="min-w-0 flex-1">
                <h2 class="text-xl font-semibold">${wfName}</h2>
                <p class="mt-2 text-[var(--muted)]">${wfDesc}</p>
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
                <div class="font-semibold">${escapeHtml(a.name || "—")}</div>
                <p class="mt-1 text-[var(--muted)]">${renderTextIcons((a.description || "").replace(/\r?\n/g, "\n"))}</p>

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
              </div>
            </div>
          </div>
        </div>
      `;

      // Changement d'ability
      card.querySelectorAll("[data-abi]").forEach((btn) => {
        btn.addEventListener("click", () => renderCard(wf, parseInt(btn.dataset.abi, 10)));
      });

      // Notifier polarities.js qu'une carte est prête
      document.dispatchEvent(new CustomEvent("wf:card-rendered", { detail: { wf } }));
    }

    function renderPicker(arr) {
      const picker = $("#picker");
      picker.innerHTML = "";
      arr.forEach((wf, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = wf.name;
        picker.appendChild(opt);
      });
      picker.value = "0";
    }

    const setStatus = (msg, ok = true) => {
      if (!status) return;
      status.textContent = msg;
      if (!ok) {
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      } else {
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      }
    };

    if (!list.length) {
      setStatus("Aucune Warframe chargée (API vide). Regarde la console pour le détail.", false);
      console.warn("[app] wfRaw vide", { wfRaw });
      return;
    }

    setStatus(`Dataset chargé : ${list.length} Warframes`);
    renderPicker(list);
    renderCard(list[0], 0);

    $("#picker").addEventListener("change", (e) => {
      const idx = parseInt(e.target.value, 10);
      const q = norm($("#search").value).toLowerCase();
      const filtered = !q ? list : list.filter((x) => x.name.toLowerCase().includes(q));
      if (!filtered.length) return;
      renderCard(filtered[Math.min(idx, filtered.length - 1)], 0);
    });

    $("#search").addEventListener("input", () => {
      const q = norm($("#search").value).toLowerCase();
      const filtered = !q ? list : list.filter((x) => x.name.toLowerCase().includes(q));
      renderPicker(filtered);
      if (filtered.length) renderCard(filtered[0], 0);
      setStatus(`Affichage : ${filtered.length} résultat(s)`);
    });
  } catch (e) {
    console.error("[app] ERREUR BOOT :", e);
    if (status) {
      status.textContent = `Erreur de chargement : ${e.message || e}`;
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  }
})();
