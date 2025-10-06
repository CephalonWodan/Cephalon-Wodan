// js/app.js
// =====================================================
// Aperçu Warframes — données API personnalisée
// - Utilise le JSON enrichi via l'API custom au lieu de warframestat.us
// - Rendu identique (icônes, styles) en se basant sur merged_warframe.json
// =====================================================

const CFG = {
  // URL de l'API custom fournissant merged_warframe.json
  WARFRAMES_URL: "https://cephalon-wodan-production.up.railway.app/warframes"
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
  DT_NEGATIVE_COLOR: "NegativeSymbol.png"
};
const EXTRA_ICONS = { ENERGY: "EnergySymbol.png" };

function renderTextIcons(input) {
  let s = String(input ?? "");

  // normalise les retours à la ligne
  s = s.replace(/\r\n?|\r/g, "\n")
       .replace(/<\s*br\s*\/?>/gi, "\n")
       .replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n");

  // échappe le HTML
  s = s.replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );

  // Remplace DT_* par icônes inline (avec style)
  s = s.replace(/\s*(?:&lt;|<)\s*(DT_[A-Z_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
    const file = DT_ICONS[key];
    if (!file) return "";
    const src = ICON_BASE + file;
    return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
  });

  // Remplace tags simples (ex: <ENERGY>)
  s = s.replace(/\s*(?:&lt;|<)\s*([A-Z0-9_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
    const file = EXTRA_ICONS[key];
    if (!file) return "";
    const src = ICON_BASE + file;
    return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
  });

  // Supprime les balises techniques restantes
  s = s.replace(/&lt;\/?[A-Z0-9_]+\/?&gt;/g, "");

  return s.replace(/\n/g, "<br>").trim();
}

/* ---------------- utils ---------------- */
const $  = (sel) => document.querySelector(sel);
const txt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (s) => String(s || "").trim();
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&":"&amp;","<":"&lt;","&gt;":">&gt;","\"":"&quot;","'":"&#39;" }[c])
  );
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");

// --------- helper fetchJson ----------
async function fetchJson(url, what = "fetch") {
  const r = await fetch(url, { headers: { "accept": "application/json" } });
  if (!r.ok) throw new Error(`${what} — HTTP ${r.status} @ ${url}`);
  return r.json();
}
/* ------------------------------------ */

/* ====== PATCH: fallback de rendu des polarités (définis AVANT boot) ====== */
const POL_ICON_BASE = new URL("img/polarity/", document.baseURI).href;
const KNOWN_POLARITIES = new Set(["Madurai","Naramon","Vazarin","Zenurik","Unairu","Penjaga","Umbra"]);

function renderPolarityImg(name, title) {
  const safeTitle = escapeHtml(title || name);
  const src = POL_ICON_BASE + encodeURIComponent(name) + ".png";
  // si l'image manque, on remplace par un chip texte
  return `<img src="${src}" alt="${safeTitle}" title="${safeTitle}"
            style="width:22px;height:22px;object-fit:contain"
            onerror="this.onerror=null;this.replaceWith(document.createElement('span'));this?.insertAdjacentHTML?.('afterend','<span class=&quot;chip&quot;>${safeTitle}</span>')">`;
}

function renderAuraAndPolarities(wf) {
  const cardEl = $("#card");
  if (!cardEl) return;
  const auraZone  = cardEl.querySelector('.polarity-row[data-zone="aura"]');
  const otherZone = cardEl.querySelector('.polarity-row[data-zone="others"]');
  if (!auraZone || !otherZone) return;

  auraZone.innerHTML = "";
  otherZone.innerHTML = "";

  // Aura: certains dumps mettent juste "aura" => on n’affiche pas d’icône
  const auraName = (wf.aura && wf.aura.toLowerCase() !== "aura") ? wf.aura : null;
  if (auraName && KNOWN_POLARITIES.has(auraName)) {
    auraZone.innerHTML = renderPolarityImg(auraName, `Aura: ${auraName}`);
  } else if (auraName) {
    auraZone.innerHTML = `<span class="chip">${escapeHtml(auraName)}</span>`;
  } else {
    auraZone.innerHTML = `<span class="chip muted">—</span>`;
  }

  const list = Array.isArray(wf.polarities) ? wf.polarities : [];
  if (!list.length) {
    otherZone.innerHTML = `<span class="chip muted">—</span>`;
  } else {
    otherZone.innerHTML = list.map(p => {
      const nm = String(p||"").trim();
      return KNOWN_POLARITIES.has(nm)
        ? renderPolarityImg(nm, nm)
        : `<span class="chip">${escapeHtml(nm || "—")}</span>`;
    }).join(" ");
  }
}
/* ======================================================================== */

/* --------- Fallback data loader ---------- */
async function getWarframesData() {
  // 1) essaie l’API distante
  try {
    const data = await fetchJson(CFG.WARFRAMES_URL, "Warframes API");
    const arr = Array.isArray(data) ? data : (Array.isArray(data?.entities) ? data.entities : []);
    if (arr.length) return arr;
    throw new Error("Empty payload from remote");
  } catch (e) {
    console.warn("[app] Remote API failed or empty, trying local file…", e);
  }
  // 2) fallback local (placer /data/merged_warframe.json côté site)
  try {
    const local = await fetchJson("data/merged_warframe.json", "Local merged_warframe.json");
    return Array.isArray(local) ? local : (Array.isArray(local?.entities) ? local.entities : []);
  } catch (e2) {
    console.error("[app] Local fallback failed:", e2);
    return [];
  }
}
/* ---------------------------------------- */

/* ---------------- boot ---------------- */
(async function boot() {
  const status = $("#status");
  const card = $("#card"); // défini avant tout usage

  try {
    if (status) {
      status.textContent = "Loading Data…";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";
    }

    // Récupère le JSON des warframes via l'API custom (avec fallback local)
    const wfRaw = await getWarframesData();
    
    if (!wfRaw.length) {
      setStatus("No Warframes data loaded.", false);
      console.warn("[app] wfRaw vide ou introuvable", { wfRaw });
      return;
    }

    // Construire la liste des Warframes à afficher
    const list = wfRaw
      .filter((wf) => wf && wf.type && wf.type.toLowerCase() === "warframe")
      .map((rec) => {
        // Nettoyer le nom (retirer les balises éventuelles comme <ARCHWING>)
        const name = (rec.name || "").replace(/<[^>]+>/g, "").trim();

        // Image locale : "Ash Prime" -> "img/warframes/AshPrime.png"
        const imageName = name.replace(/\s+/g, "");
        const image = `img/warframes/${imageName}.png`;

        // Description
        const description = rec.description || "";

        // Stats de base
        const stats = {
          health: rec.baseStats?.health ?? "—",
          shield: rec.baseStats?.shields ?? "—",
          armor: rec.baseStats?.armor ?? "—",
          energy: rec.baseStats?.energy ?? "—",
          sprintSpeed: rec.baseStats?.sprintSpeed ?? "—"
        };
        // Polarités et aura
        const aura = rec.aura
          ? (rec.aura.charAt(0).toUpperCase() + rec.aura.slice(1).toLowerCase())
          : null;
        const polarities = (rec.polarities || []).map(p =>
          p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
        );
        // Capacités
        const abilities = (rec.abilities || []).map((ab, i) => {
          const sum = ab.summary || {};
          return {
            slot: i + 1,
            name: ab.name || "—",
            description: ab.description || "",
            internal: null,
            summary: {
              costEnergy: sum.costEnergy ?? null,
              strength:   sum.strength ?? null,
              duration:   sum.duration ?? null,
              range:      sum.range ?? null,
              affectedBy: Array.isArray(sum.affectedBy) ? sum.affectedBy : []
            },
            rows: Array.isArray(ab.rows) ? ab.rows : []
          };
        });
        return { name, description, image, stats, aura, polarities, abilities };
      })
      .sort(byName);

    // Crée le picker et la carte initiale
    if (!list.length) {
      setStatus("No Warframes to display.", false);
      console.warn("[app] liste Warframes vide", { list });
      return;
    }
    setStatus(`Dataset loaded : ${list.length} Warframes`);
    renderPicker(list);
    renderCard(list[0], 0);

    // Gestion du changement de sélection
    $("#picker").addEventListener("change", (e) => {
      const idx = parseInt(e.target.value, 10);
      const q = norm($("#search").value).toLowerCase();
      const filtered = !q ? list : list.filter((x) =>
        x.name.toLowerCase().includes(q)
      );
      if (!filtered.length) return;
      renderCard(filtered[Math.min(idx, filtered.length - 1)], 0);
    });

    // Recherche interactive
    $("#search").addEventListener("input", () => {
      const q = norm($("#search").value).toLowerCase();
      const filtered = !q ? list : list.filter((x) =>
        x.name.toLowerCase().includes(q)
      );
      renderPicker(filtered);
      if (filtered.length) renderCard(filtered[0], 0);
      setStatus(`Affichage : ${filtered.length} résultat(s)`);
    });

  } catch (e) {
    console.error("[app] ERREUR BOOT :", e);
    if (status) {
      status.textContent = `Loading error : ${e.message || e}`;
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  }

  /* ---------- UI Rendering Functions ---------- */

  function splitFilledLabel(filled) {
    const m = String(filled || "").match(/^(.+?):\s*(.+)$/);
    return m ? { label: m[1], value: m[2] } : { label: filled || "", value: "" };
  }
  function buildTokenMap(row) {
    const map = Object.create(null);
    for (const k in row) {
      if (/^val\d+$/i.test(k) && isFinite(Number(row[k]))) {
        map[k.toLowerCase()] = row[k];
      }
    }
    if (row.values && typeof row.values === "object") {
      for (const k in row.values) {
        if (/^val\d+$/i.test(k) && isFinite(Number(row.values[k]))) {
          map[k.toLowerCase()] = row.values[k];
        }
      }
    }
    if (Array.isArray(row.numerics)) {
      row.numerics.forEach((n, i) => {
        if (isFinite(Number(n)) && map["val"+(i+1)] == null) {
          map["val"+(i+1)] = n;
        }
      });
    }
    if (map.val1 == null && isFinite(Number(row.mainNumeric))) {
      map.val1 = row.mainNumeric;
    }
    return map;
  }
  function fillTokens(template, tokenMap) {
    return String(template || "").replace(/\|val(\d+)\|/gi, (_, n) => {
      const key = ("val" + n).toLowerCase();
      const v = tokenMap[key];
      return v == null ? "" : String(v);
    });
  }
  function fromTemplateToLabelValue(template, tokenMap) {
    const filled = fillTokens(template, tokenMap).trim();
    const m = filled.match(/^(.+?):\s*(.*)$/);
    if (m) return { label: m[1], value: m[2] };
    return { label: filled, value: "" };
  }
  function makeDetailRows(rows) {
    return (rows || []).map(r => {
      const mapTok = buildTokenMap(r);
      const hasTokLabel = /\|val\d+\|/i.test(r.label || "");
      const hasTokFilled = /\|val\d+\|/i.test(r.filledLabel || "");
      if (hasTokLabel)  return fromTemplateToLabelValue(r.label, mapTok);
      if (hasTokFilled) return fromTemplateToLabelValue(r.filledLabel, mapTok);
      if (r.filledLabel) {
        const p = splitFilledLabel(r.filledLabel);
        return { label: p.label.trim(), value: p.value.trim() };
      }
      if ((r.label || "").trim()) {
        const label = r.label.replace(/\s*:\s*$/, "");
        if (r.mainNumeric != null && r.mainNumeric !== "") {
          return { label, value: String(r.mainNumeric) };
        }
        return { label, value: "" };
      }
      return null;
    }).filter(Boolean);
  }

  // hoisted helpers
  function pill(label, value) {
    return `
    <div class="pill">
      <div class="text-[10px] uppercase tracking-wide muted">${escapeHtml(label)}</div>
      <div class="mt-1 font-medium">${escapeHtml(txt(value))}</div>
    </div>`;
  }

  function statBox(label, value) {
    return `
    <div class="stat">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${escapeHtml(label)}</div>
      <div class="text-lg font-semibold">${escapeHtml(txt(value))}</div>
    </div>`;
  }

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
      .map((k) =>
        `<span class="chip orn" style="border-color:#D4AF37;color:#D4AF37;background:rgba(212,175,55,.06)">${escapeHtml(k)}</span>`
      ).join(" ");
    const detailRows = makeDetailRows(a.rows || []);
    const rowsHtml = detailRows.map(({label, value}) => `
      <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
        <div class="text-sm">${escapeHtml(label)}</div>
        <div class="font-medium">${escapeHtml(value || "—")}</div>
      </div>`).join("");
    const pillsHtml = !detailRows.length ? `
      <div class="pill-grid grid grid-cols-4 gap-3 mt-4">
        ${pill("Cost", s.costEnergy)}
        ${pill("Strength", s.strength)}
        ${pill("Duration", s.duration)}
        ${pill("Range", s.range)}
      </div>` : "";
    const detailsBlock = rowsHtml ? `
      <div class="mt-5">
        <div class="text-sm muted mb-2">Details</div>
        <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
          ${rowsHtml}
        </div>
      </div>` : "";

    const imgHtml = wf.image
      ? `<img src="${wf.image}" alt="${wfName}" class="w-full h-full object-contain"
              onerror="this.onerror=null;this.src='img/warframes/_placeholder.png'">`
      : `<div class="muted">No Pictures</div>`;

    card.innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            ${imgHtml}
          </div>
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
              <p class="mt-1 text-[var(--muted)]">${renderTextIcons(normalizeDesc(a.description))}</p>
              ${pillsHtml}
              ${ (s.affectedBy && s.affectedBy.length) ? `
                <div class="mt-4 text-sm">
                  <div class="mb-1 muted">Affected by :</div>
                  <div class="flex flex-wrap gap-2">${affected}</div>
                </div>` : "" }
              ${detailsBlock}
            </div>
          </div>
        </div>
      </div>
    `;

    // Rendu immédiat de l’aura et des polarités (fallback)
    renderAuraAndPolarities(wf);

    // Boutons onglets d'aptitudes
    card.querySelectorAll("[data-abi]").forEach((btn) => {
      btn.addEventListener("click", () => renderCard(wf, parseInt(btn.dataset.abi, 10)));
    });

    // Notifier polarities.js (si présent)
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

  function setStatus(msg, ok = true) {
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
  }
  
})();
