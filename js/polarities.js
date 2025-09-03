// js/polarities.js
// Polarités (Aura + autres) avec TES SVG: img/polarities/*_Pol.svg
// → styles dans CSS (plus de styles inline), classes .pol-icon et .pol-icon.aura
// Sources: WarframeStat (EN) + data/polarity_overrides.json (optionnel)
// Écoute l'événement "wf:card-rendered" émis par app.js.

(function () {
  const API = "https://api.warframestat.us/warframes/?language=en";
  const OVERRIDES_URL = "data/polarity_overrides.json"; // optionnel
  const ICON_DIR = "img/polarities/"; // ton dossier exact

  // Mapping exact fichiers présents dans ton repo
  const FILES = {
    Madurai: "Madurai_Pol.svg",
    Vazarin: "Vazarin_Pol.svg",
    Naramon: "Naramon_Pol.svg",
    Zenurik: "Zenurik_Pol.svg",
    Unairu:  "Unairu_Pol.svg",
    Umbra:   "Umbra_Pol.svg",
    Penjaga: "Penjaga_Pol.svg", // laisse si présent, sinon retire
    Exilus:  "Exilus_Pol.svg",
    Any:     "Any_Pol.svg",
    Universal: "Any_Pol.svg",
    None:      "Any_Pol.svg"
  };

  // Canonicalisation (tolère casse/variantes)
  const CANON = Object.fromEntries(Object.keys(FILES).map(k => [k.toLowerCase(), k]));
  function canonPol(p) {
    if (!p) return null;
    const k = String(p).toLowerCase().replace(/[^a-z]/g, "");
    const alias = { universal: "Any", any: "Any", none: "Any" };
    const ali = alias[k] || k;
    const key = CANON[ali] || CANON[k];
    return key ? key : (p[0].toUpperCase() + p.slice(1));
  }

  const state = { apiIndex: null, overrides: {}, ready: false };
  const $ = (sel, root = document) => root.querySelector(sel);
  const norm = (s) => String(s || "").trim();

  // Variantes nom Warframe (Prime/Umbra → base)
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

  // Fallback discret si un fichier manque (rare)
  function fallbackIcon(polName, isAura=false) {
    const letter = (polName || "?").slice(0, 1);
    const span = document.createElement("span");
    span.className = "pol-icon" + (isAura ? " aura" : "");
    span.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,.06)"/>
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(212,175,55,.8)" stroke-width="1.5"/>
        <text x="12" y="16" text-anchor="middle" font-size="11" fill="#D4AF37"
              font-family="system-ui,Segoe UI,Roboto,Arial">${letter}</text>
      </svg>`;
    return span;
  }

  function iconFor(polName, isAura=false) {
    const file = FILES[polName];
    const wrap = document.createElement("span");
    wrap.className = "pol-icon" + (isAura ? " aura" : "");
    wrap.setAttribute("title", polName);

    if (!file) {
      console.warn("[polarities] Aucun fichier mappé pour :", polName);
      return fallbackIcon(polName, isAura);
    }

    const img = new Image();
    img.decoding = "async";
    img.loading = "lazy";
    img.alt = polName;
    img.width = 26;
    img.height = 26;
    img.src = ICON_DIR + file;

    img.onerror = () => {
      console.warn("[polarities] 404 icône :", img.src);
      wrap.replaceChildren(fallbackIcon(polName, isAura));
    };

    wrap.appendChild(img);
    return wrap;
  }

  function renderRow(host, arr, isAura=false) {
    if (!host) return;
    host.innerHTML = "";
    const list = (arr || []).map(canonPol).filter(Boolean);
    if (!list.length) { host.innerHTML = `<span class="muted">—</span>`; return; }
    list.forEach(p => host.appendChild(iconFor(p, isAura)));
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
      renderRow(card?.querySelector('.polarity-row[data-zone="aura"]'),  aura ? [aura] : [], true);
      renderRow(card?.querySelector('.polarity-row[data-zone="others"]'), slots, false);
    } catch (err) {
      console.error("[polarities] error:", err);
    }
  }

  document.addEventListener("wf:card-rendered", onCardRendered);
})();
