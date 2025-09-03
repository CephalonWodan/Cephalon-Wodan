// js/polarities.js
// Injecte les polarités (Aura + autres) avec TES SVG locaux : img/polarities/*_Pol.svg
// Sources : WarframeStat (EN) + data/polarity_overrides.json (optionnel)
// S'accroche à l'événement "wf:card-rendered" émis par app.js.

(function () {
  const API = "https://api.warframestat.us/warframes/?language=en";
  const OVERRIDES_URL = "data/polarity_overrides.json"; // optionnel
  const ICON_DIR = "img/polarities/"; // chemin exact fourni par toi

  // Mapping canon -> nom de fichier EXACT présent dans ton dossier
  // Ajoute/retire si besoin en fonction du contenu réel de /img/polarities/
  const FILES = {
    Madurai: "Madurai_Pol.svg",
    Vazarin: "Vazarin_Pol.svg",
    Naramon: "Naramon_Pol.svg",
    Zenurik: "Zenurik_Pol.svg",
    Unairu:  "Unairu_Pol.svg",
    Umbra:   "Umbra_Pol.svg",
    Penjaga: "Penjaga_Pol.svg", // si tu l'as
    Exilus:  "Exilus_Pol.svg",
    Any:     "Any_Pol.svg",      // “Universal/None” → Any
    Universal: "Any_Pol.svg",
    None:      "Any_Pol.svg"
  };

  // Canonicalisation : tolère casse/espaces/accents → clé de FILES
  const CANON = Object.fromEntries(Object.keys(FILES).map(k => [k.toLowerCase(), k]));
  function canonPol(p) {
    if (!p) return null;
    const k = String(p).toLowerCase().replace(/[^a-z]/g, "");
    // quelques alias fréquents
    const alias = { universal: "Any", any: "Any", none: "Any" };
    const ali = alias[k] || k;
    const key = CANON[ali] || CANON[k];
    return key ? key : (p[0].toUpperCase() + p.slice(1));
  }

  const state = { apiIndex: null, overrides: {}, ready: false };
  const $ = (sel, root = document) => root.querySelector(sel);
  const norm = (s) => String(s || "").trim();

  // Variantes de nom pour retrouver la frame côté API (Prime/Umbra → base)
  function variantKeys(name) {
    const n = norm(name); if (!n) return [];
    const base = n.replace(/\s+Prime\b/i, "").replace(/\s+Dex\b/i, "").trim();
    const out = [n, base];
    if (/Umbra$/i.test(n)) out.push(n.replace(/\s+Umbra$/i, "").trim());
    return Array.from(new Set(out.map(x => x.toLowerCase())));
  }

  async function ensureApiIndex() {
    if (state.apiIndex) return state.apiIndex;
    const data = await fetch(API).then(r => r.json()).catch(() => []);
    const idx = new Map();
    (Array.isArray(data) ? data : []).forEach(rec => {
      const keys = variantKeys(rec.name || "");
      keys.forEach(k => { if (!idx.has(k)) idx.set(k, rec); });
    });
    state.apiIndex = idx;
    return idx;
  }
  async function ensureOverrides() {
    if (state.ready) return state.overrides;
    try {
      const r = await fetch(OVERRIDES_URL);
      if (r.ok) state.overrides = await r.json();
    } catch (_) {}
    state.ready = true;
    return state.overrides;
  }

  function mergePolarities(apiRec, override) {
    const auraApi  = apiRec?.auraPolarity || apiRec?.aura || null;
    const slotsApi = Array.isArray(apiRec?.polarities) ? apiRec.polarities : [];
    const aura  = override?.aura  || auraApi  || null;
    const slots = (Array.isArray(override?.slots) && override.slots.length) ? override.slots : slotsApi;
    return { aura, slots };
  }

  // Rendu : <img src="img/polarities/<FICHIER>.svg">
  const WRAP_STYLE =
    "display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;border:1px solid rgba(212,175,55,.55);background:rgba(212,175,55,.06);";

  function fallbackIcon(polName) {
    const letter = (polName || "?").slice(0, 1);
    const span = document.createElement("span");
    span.setAttribute("style", WRAP_STYLE);
    span.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,.06)"/>
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(212,175,55,.8)" stroke-width="1.5"/>
        <text x="12" y="16" text-anchor="middle" font-size="11" fill="#D4AF37" font-family="system-ui,Segoe UI,Roboto">${letter}</text>
      </svg>`;
    return span;
  }

  function iconFor(polName) {
    const file = FILES[polName];
    const wrap = document.createElement("span");
    wrap.className = "pol-icon";
    wrap.setAttribute("title", polName);
    wrap.setAttribute("style", WRAP_STYLE);

    if (!file) {
      console.warn("[polarities] Aucun fichier mappé pour :", polName);
      return fallbackIcon(polName);
    }
    const img = new Image();
    img.decoding = "async";
    img.loading = "lazy";
    img.width = 22;
    img.height = 22;
    img.alt = polName;
    img.src = ICON_DIR + file;
    img.onerror = () => {
      console.warn("[polarities] 404 icône :", img.src);
      wrap.replaceChildren(fallbackIcon(polName));
    };
    wrap.appendChild(img);
    return wrap;
  }

  function renderRow(host, arr) {
    if (!host) return;
    host.innerHTML = "";
    const list = (arr || []).map(canonPol).filter(Boolean);
    if (!list.length) { host.innerHTML = `<span class="muted">—</span>`; return; }
    list.forEach(p => host.appendChild(iconFor(p)));
  }

  async function onCardRendered(e) {
    try {
      const wf = e?.detail?.wf || {};
      const name = wf?.name || "";
      if (!name) return;

      const idx = await ensureApiIndex();
      await ensureOverrides();

      let rec = null;
      for (const k of variantKeys(name)) { if (idx.has(k)) { rec = idx.get(k); break; } }
      const ovr = state.overrides[name] || null;

      const { aura, slots } = mergePolarities(rec, ovr);

      const card = document.getElementById("card");
      renderRow(card?.querySelector('.polarity-row[data-zone="aura"]'),  aura ? [aura] : []);
      renderRow(card?.querySelector('.polarity-row[data-zone="others"]'), slots);
    } catch (err) {
      console.error("[polarities] error:", err);
    }
  }

  document.addEventListener("wf:card-rendered", onCardRendered);
})();
