// js/app.js
// =====================================================
// Aperçu Warframes — données API + 3 JSON locaux
// abilities.json, abilities_by_warframe.json, warframe_abilities.json
// - Pas de dépendance à #vtabs
// - Pas de fetch des fichiers *_by_warframe.json absents
// - Failover API EN -> FR + messages d'erreur clairs
// - Rendu des <DT_..._COLOR> + <LINE_SEPARATOR> (icônes locales inline)
// =====================================================

const CFG = {
  // Utilise ton endpoint (on conserve WF_URLS pour ne rien casser ailleurs)
  WF_URLS: ["https://cephalon-wodan-production.up.railway.app/warframes"],
  ABILITIES_VALUES_URL: "data/abilities.json",
  ABILITIES_BY_WF_URL: "data/abilities_by_warframe.json", // optionnel
  ABILITIES_META_URL: "data/warframe_abilities.json",
};

// --- Text Icons (DT_* + <br>) -> <img> inline (icônes locales)
const ICON_BASE = new URL("img/symbol/", document.baseURI).href;

const DT_ICONS = {
  DT_IMPACT_COLOR: "ImpactSymbol.png",
  DT_PUNCTURE_COLOR: "PunctureSymbol.png",
  DT_SLASH_COLOR: "SlashSymbol.png",
  DT_FIRE_COLOR: "HeatSymbol.png",
  DT_FREEZE_COLOR: "ColdSymbol.png",
  DT_ELECTRICITY_COLOR: "ElectricitySymbol.png",
  DT_POISON_COLOR: "ToxinSymbol.png",
  DT_TOXIN_COLOR: "ToxinSymbol.png",
  DT_GAS_COLOR: "GasSymbol.png",
  DT_MAGNETIC_COLOR: "MagneticSymbol.png",
  DT_RADIATION_COLOR: "RadiationSymbol.png",
  DT_VIRAL_COLOR: "ViralSymbol.png",
  DT_CORROSIVE_COLOR: "CorrosiveSymbol.png",
  DT_BLAST_COLOR: "BlastSymbol.png",
  DT_EXPLOSION_COLOR: "BlastSymbol.png",
  DT_RADIANT_COLOR: "VoidSymbol.png",
  DT_SENTIENT_COLOR: "SentientSymbol.png",
  DT_RESIST_COLOR: "ResistSymbol.png",
  DT_POSITIVE_COLOR: "PositiveSymbol.png",
  DT_NEGATIVE_COLOR: "NegativeSymbol.png",
};

const EXTRA_ICONS = { ENERGY: "EnergySymbol.png" };

function renderTextIcons(input) {
  let s = String(input ?? "");

  // normalise
  s = s.replace(/\r\n?|\r/g, "\n")
       .replace(/<\s*br\s*\/?>/gi, "\n")
       .replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n");

  // échappe le HTML
  s = s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // DT_* (forme brute ou encodée) – avale les blancs autour
  s = s.replace(/\s*(?:&lt;|<)\s*(DT_[A-Z_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
    const file = DT_ICONS[key]; if (!file) return "";
    const src = ICON_BASE + file;
    return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
  });

  // tags simples (ex: <ENERGY>)
  s = s.replace(/\s*(?:&lt;|<)\s*([A-Z0-9_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
    const file = EXTRA_ICONS[key]; if (!file) return "";
    const src = ICON_BASE + file;
    return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
  });

  // supprime les balises techniques restantes
  s = s.replace(/&lt;\/?[A-Z0-9_]+\/?&gt;/g, "");

  return s.replace(/\n/g, "<br>").trim();
}

/* ---------------- utils ---------------- */
const $  = (sel) => document.querySelector(sel);
const txt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (s) => String(s || "").trim();
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
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
      const arr = Array.isArray(data?.entities) ? data.entities : (Array.isArray(data) ? data : null);
      if (arr && arr.length) {
        console.info(`[app] Warframes chargées via ${url} (${arr.length})`);
        return arr;
      }
      errors.push(`Réponse vide @ ${url}`);
    } catch (e) {
      console.error(e);
      errors.push(e.message || String(e));
    }
  }
  throw new Error(`Unable to load Warframe list.\n${errors.join("\n")}`);
}

/* ---------------- boot ---------------- */
(async function boot() {
  const status = $("#status");
  try {
    if (status) {
      status.textContent = "Loading Data…";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";
    }

    const [wfRaw, valsRaw, byWfRaw, metaRaw] = await Promise.all([
      fetchWarframesWithFailover(),
      fetchJson(CFG.ABILITIES_VALUES_URL, "abilities.json"),
      fetch(CFG.ABILITIES_BY_WF_URL).then(r => r.ok ? r.json() : (console.warn("[app] abilities_by_warframe.json absent (OK)"), {})).catch(()=> ({})),
      fetchJson(CFG.ABILITIES_META_URL, "warframe_abilities.json"),
    ]);

    function findValuesForInternal(internalName) {
      const cands = valsRaw.filter((v) => v.path.startsWith(internalName));
      if (!cands.length) return null;
      cands.sort((a, b) => b.path.length - a.path.length);
      return cands[0];
    }

    const metaByFrame = metaRaw.reduce((acc, m) => {
      const k = norm(m.Powersuit);
      if (!k) return acc;
      (acc[k] ??= []).push(m);
      return acc;
    }, {});
    for (const k in metaByFrame) metaByFrame[k].sort(bySlot);
    const namesByFrame = byWfRaw || {};

    const list = (wfRaw || [])
      .filter((wf) => wf && String(wf.type || "").toLowerCase() === "warframe")
      .map((rec) => {
        const bs = rec.baseStats || {};
        const fileName = `${String(rec.name || "").replace(/\s+/g, "")}.png`;
        const img = `img/warframes/${fileName}`;
        return {
          name: rec.name || "",
          description: rec.description || "",
          image: img,
          polarities: Array.isArray(rec.polarities) ? rec.polarities : [],
          auraPolarity: rec.aura ?? null,
          exilus: (rec.exilus === true) ? true : (rec.exilus === false ? false : null),
          exilusPolarity: rec.exilusPolarity ?? null,
          stats: {
            health: bs.health ?? "—",
            shield: bs.shields ?? bs.shield ?? "—",
            armor:  bs.armor  ?? "—",
            energy: bs.energy ?? bs.power ?? "—",
            sprintSpeed: bs.sprintSpeed ?? "—",
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

    list.forEach((wf) => { wf.abilities = abilitiesForFrame(wf.name); });

    const card = $("#card");

    function normalizeDesc(text) {
      let s = String(text ?? "");
      s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
      s = s.replace(/\r\n?/g, "\n");
      s = s.replace(/\n{2,}/g, "\n");
      return s;
    }

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

      const detailRows = a.rows ? a.rows.map(r => r) : [];
      const pillsHtml = "";
      const detailsBlock = "";

      card.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6">
          <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
            <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
              ${wf.image ? `<img src="${wf.image}" alt="${wfName}" class="w-full h-full object-contain">`
                         : `<div class="muted">No Pictures</div>`}
            </div>

            <!-- Polarités sous l'image -->
            <div class="w-full">
              <div class="aura-label">Aura polarity</div>
              <div class="polarity-row" data-zone="aura"></div>
              <div class="polarity-label mt-3">Exilus</div>
              <div class="polarity-row" data-zone="exilus"></div>
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
              ${["HP","SHIELD","ARMOR","ENERGY","SPRINT"].map((k,i)=>`
                <div class="stat">
                  <div class="text-[10px] uppercase tracking-wide text-slate-200">${k}</div>
                  <div class="text-lg font-semibold">${
                    escapeHtml(txt(Object.values(wf.stats)[i]))
                  }</div>
                </div>`).join("")}
            </div>

            <div class="mt-2">
              ${abilities.length ? `<div class="flex flex-wrap gap-2 mb-3">${tabs}</div>` : ""}
              <div class="card p-4 orn">
                <div class="font-semibold">${escapeHtml(a.name || "—")}</div>
                <p class="mt-1 text-[var(--muted)]">${renderTextIcons(normalizeDesc(a.description))}</p>
              </div>
            </div>
          </div>
        </div>
      `;

      card.querySelectorAll("[data-abi]").forEach((btn) => {
        btn.addEventListener("click", () => renderCard(wf, parseInt(btn.dataset.abi, 10)));
      });

      document.dispatchEvent(new CustomEvent("wf:card-rendered", { detail: { wf } }));
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

    setStatus(`Dataset loaded : ${list.length} Warframes`);
    renderCard(list[0], 0);
  } catch (e) {
    console.error("[app] ERREUR BOOT :", e);
  }
})();
