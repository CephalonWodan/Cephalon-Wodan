// js/app.js
// =====================================================
// Aperçu Warframes — données API personnalisée
// - Utilise le JSON enrichi via l'API custom au lieu de warframestat.us
// - Rendu identique (icônes, styles) en se basant sur merged_warframe.json
// =====================================================

const CFG = {
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
  s = s.replace(/\r\n?|\r/g, "\n")
       .replace(/<\s*br\s*\/?>/gi, "\n")
       .replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n");
  s = s.replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
  s = s.replace(/\s*(?:&lt;|<)\s*(DT_[A-Z_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
    const file = DT_ICONS[key];
    if (!file) return "";
    const src = ICON_BASE + file;
    return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
  });
  s = s.replace(/\s*(?:&lt;|<)\s*([A-Z0-9_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
    const file = EXTRA_ICONS[key];
    if (!file) return "";
    const src = ICON_BASE + file;
    return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
  });
  s = s.replace(/&lt;\/?[A-Z0-9_]+\/?&gt;/g, "");
  return s.replace(/\n/g, "<br>").trim();
}

/* ---------------- utils ---------------- */
const $  = (sel) => document.querySelector(sel);
const txt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (s) => String(s || "").trim();
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])
  );
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");

// --------- helper fetchJson ----------
async function fetchJson(url, what = "fetch") {
  const r = await fetch(url, { headers: { "accept": "application/json" } });
  if (!r.ok) throw new Error(`${what} — HTTP ${r.status} @ ${url}`);
  return r.json();
}
/* ------------------------------------ */

/* ====== Polarités : rendu via img/polarities/*.svg (sans onerror inline) ====== */
const POL_ICON_BASE = new URL("img/polarities/", document.baseURI).href;
function normPolKey(x){
  return String(x||"").toLowerCase().replace(/\s+|[_-]+/g, "");
}
const POL_FILE = {
  madurai: "Madurai_Pol.svg",
  naramon: "Naramon_Pol.svg",
  vazarin: "Vazarin_Pol.svg",
  zenurik: "Zenurik_Pol.svg",
  unairu:  "Unairu_Pol.svg",
  umbra:   "Umbra_Pol.svg",
  penjaga: "Penjaga_Pol.svg",
  exilus:  "Exilus_Pol.svg",
  any:     "Any_Pol.svg,
  aura:    null,
  none:    null
};

function polImgHtml(key, title){
  const k = normPolKey(key);
  const file = POL_FILE[k];
  const t = escapeHtml(title || key || "—");
  if (!file) return `<span class="chip">${t}</span>`;
  const src = POL_ICON_BASE + file;
  return `<img class="pol-img" src="${src}" alt="${t}" title="${t}" data-title="${t}" style="width:22px;height:22px;object-fit:contain;vertical-align:middle">`;
}

function renderAuraAndPolarities(wf) {
  const cardEl = $("#card");
  if (!cardEl) return;
  const auraZone  = cardEl.querySelector('.polarity-row[data-zone="aura"]');
  const otherZone = cardEl.querySelector('.polarity-row[data-zone="others"]');
  const exilusZone= cardEl.querySelector('.polarity-row[data-zone="exilus"]');
  if (!auraZone || !otherZone) return;

  // Aura depuis l’API (si "aura" placeholder → chip texte)
  const auraRaw = String(wf.aura ?? "").trim();
  auraZone.innerHTML = auraRaw ? polImgHtml(auraRaw, `Aura: ${auraRaw}`) : `<span class="chip muted">—</span>`;

  // Slots
  const list = Array.isArray(wf.polarities) ? wf.polarities : [];
  otherZone.innerHTML = list.length
    ? list.map(p => polImgHtml(p, p)).join(" ")
    : `<span class="chip muted">—</span>`;

  // Exilus
  if (exilusZone) {
    if (wf.exilus) {
      const exKey = (typeof wf.exilus === "string" && wf.exilus) ? wf.exilus : "exilus";
      exilusZone.innerHTML = polImgHtml(exKey, exKey);
    } else {
      exilusZone.innerHTML = `<span class="chip muted">—</span>`;
    }
  }

  // → attache les fallbacks d’images après injection
  attachPolarityImgFallbacks(cardEl);
}

function attachPolarityImgFallbacks(root){
  root.querySelectorAll("img.pol-img").forEach(img => {
    img.addEventListener("error", () => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = img.getAttribute("data-title") || "—";
      img.replaceWith(chip);
    }, { once: true });
  });
}
/* ======================================================== */

/* --------- Fallback data loader ---------- */
async function getWarframesData() {
  try {
    const data = await fetchJson(CFG.WARFRAMES_URL, "Warframes API");
    const arr = Array.isArray(data) ? data : (Array.isArray(data?.entities) ? data.entities : []);
    if (arr.length) return arr;
    throw new Error("Empty payload from remote");
  } catch (e) {
    console.warn("[app] Remote API failed or empty, trying local file…", e);
  }
  try {
    const local = await fetchJson("data/merged_warframe.json", "Local merged_warframe.json");
    return Array.isArray(local) ? local : (Array.isArray(local?.entities) ? local.entities : []);
  } catch (e2) {
    console.error("[app] Local fallback failed:", e2);
    return [];
  }
}
/* ---------------------------------------- */

/* ---------- UI helpers (déclarées AVANT usage) ---------- */
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
// rows templating
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
/* ------------------------------------------------------- */

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
        const name = (rec.name || "").replace(/<[^>]+>/g, "").trim();
        const imageName = name.replace(/\s+/g, "");
        const image = `img/warframes/${imageName}.png`;

        const description = rec.description || "";
        const stats = {
          health: rec.baseStats?.health ?? "—",
          shield: rec.baseStats?.shields ?? "—",
          armor: rec.baseStats?.armor ?? "—",
          energy: rec.baseStats?.energy ?? "—",
          sprintSpeed: rec.baseStats?.sprintSpeed ?? "—"
        };
        const aura = rec.aura ?? null;
        const polarities = Array.isArray(rec.polarities) ? rec.polarities.slice() : [];
        const exilus = rec.exilus ?? null;

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

        return { name, description, image, stats, aura, polarities, exilus, abilities };
      })
      .sort(byName);

    if (!list.length) {
      setStatus("No Warframes to display.", false);
      console.warn("[app] liste Warframes vide", { list });
      return;
    }
    setStatus(`Dataset loaded : ${list.length} Warframes`);
    renderPicker(list);
    renderCard(list[0], 0);

    // Changement sélection
    $("#picker").addEventListener("change", (e) => {
      const idx = parseInt(e.target.value, 10);
