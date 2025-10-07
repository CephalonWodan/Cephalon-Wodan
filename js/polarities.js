// js/polarities.js
// Affiche les polarités avec TES SVG (img/polarities/*_Pol.svg)
// - Préfère les données fournies par l'événement "wf:card-rendered"
//   -> detail.wf = { name, auraPolarity, polarities: [...], exilus, exilusPolarity }
// - Sinon (pages Warframes), utilise l'API WarframeStat + overrides.
//
// Classes CSS attendues :
//   .pol-icon           (26x26 par défaut)
//   .pol-icon.aura      (style accentué)
//   .polarity-row[data-zone="aura"|"exilus"|"others"]
//
(function () {
  const API = "https://cephalon-wodan-production.up.railway.app/warframes";
  const OVERRIDES_URL = "data/polarity_overrides.json"; // optionnel
  const ICON_DIR = "img/polarities/";

  // Mapping exact de tes fichiers
  const FILES = {
    Madurai: "Madurai_Pol.svg",
    Vazarin: "Vazarin_Pol.svg",
    Naramon: "Naramon_Pol.svg",
    Zenurik: "Zenurik_Pol.svg",
    Unairu:  "Unairu_Pol.svg",
    Umbra:   "Umbra_Pol.svg",
    Penjaga: "Penjaga_Pol.svg",
    Exilus:  "Exilus_Pol.svg",
    Any:       "Any_Pol.svg",
    Universal: "Any_Pol.svg",
    Aura:      "Aura_Pol.svg" // fallback Aura
  };

  const CANON = Object.fromEntries(Object.keys(FILES).map(k => [k.toLowerCase(), k]));
  function canonPol(p) {
    if (!p) return null;
    const cleaned = String(p).trim();
    const k = cleaned.toLowerCase().replace(/[^a-z]/g, "");
    const alias = {
      universal: "Any", any: "Any", none: "Any", aura: "Any",
      v: "Madurai", d: "Vazarin", dash: "Naramon", bar: "Zenurik", u: "Umbra"
    };
    const ali = alias[k] || k;
    return CANON[ali] || cleaned;
  }

  const state = { apiIndex: null, overrides: {}, ready: false };
  const $ = (sel, root = document) => root.querySelector(sel);
  const norm = (s) => String(s || "").trim();

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

  // Fusionne API + override; renvoie aussi exilus & exilusPolarity
  function mergePolarities(apiRec, override) {
    const auraApi  = apiRec?.auraPolarity || apiRec?.aura || null;
    const slotsApi = Array.isArray(apiRec?.polarities) ? apiRec.polarities : [];
    const aura  = override?.aura  || auraApi  || null;
    const slots = (Array.isArray(override?.slots) && override.slots.length) ? override.slots : slotsApi;

    // Exilus : override prioritaire, sinon API (si fournie)
    const exilus = (override && typeof override.exilus !== "undefined")
      ? !!override.exilus
      : (typeof apiRec?.exilus === "boolean" ? apiRec.exilus : null);

    const exilusPolarity = (override && override.exilusPolarity)
      ? override.exilusPolarity
      : (apiRec?.exilusPolarity ?? null);

    return { aura, slots, exilus, exilusPolarity };
  }

  function fallbackIcon(polName, isAura=false) {
    const letter = (polName || "?").slice(0, 1);
    const span = document.createElement("span");
    span.className = "pol-icon" + (isAura ? " aura" : "");
    span.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">
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

    if (!file) return fallbackIcon(polName, isAura);

    const img = new Image();
    img.decoding = "async";
    img.loading = "lazy";
    img.alt = polName;
    img.width = 26;
    img.height = 26;
    img.src = ICON_DIR + file;
    img.onerror = () => wrap.replaceChildren(fallbackIcon(polName, isAura));

    wrap.appendChild(img);
    return wrap;
  }

  function renderRow(host, arr, isAura=false) {
    if (!host) return;
    host.innerHTML = "";
    const list = (arr || []).map(canonPol).filter(Boolean);

    if (!list.length) {
      // Fallbacks demandés :
      // - Aura vide -> Aura_Pol.svg
      // - Exilus vide -> Exilus_Pol.svg
      const zone = host.getAttribute("data-zone");
      if (isAura) {
        host.appendChild(iconFor("Aura", true));
      } else if (zone === "exilus") {
        host.appendChild(iconFor("Exilus", false));
      } else {
        host.innerHTML = `<span class="muted">—</span>`;
      }
      return;
    }

    list.forEach(p => host.appendChild(iconFor(p, isAura)));
  }

  async function onCardRendered(e) {
    try {
      const detail = e?.detail || {};
      const wf = detail.wf || {};
      const name = wf?.name || "";

      const card = document.getElementById("card");
      const $aura   = card?.querySelector('.polarity-row[data-zone="aura"]');
      const $exilus = card?.querySelector('.polarity-row[data-zone="exilus"]');
      const $others = card?.querySelector('.polarity-row[data-zone="others"]');

      // 1) Préférence: données déjà fournies par la carte/app.js
      const providedAura  = wf?.auraPolarity || detail.aura || null;
      let   providedSlots = Array.isArray(wf?.polarities) ? wf.polarities
                           : Array.isArray(detail.polarities) ? detail.polarities : null;
      const providedExilus    = (typeof wf?.exilus === "boolean") ? wf.exilus
                               : (typeof detail.exilus === "boolean" ? detail.exilus : null);
      const providedExilusPol = wf?.exilusPolarity ?? detail.exilusPolarity ?? null;

      if (providedAura || providedSlots || providedExilus !== null) {
        renderRow($aura,  providedAura ? [providedAura] : [], true);
        const exiRow = (providedExilus === true) ? [providedExilusPol || "Exilus"] : [];
        renderRow($exilus, exiRow, false);
        renderRow($others, providedSlots || [], false);
        return;
      }

      // 2) Sinon, logique Warframes (API + overrides locaux)
      if (!name) return;
      const idx = await ensureApiIndex();
      await ensureOverrides();

      let rec = null;
      for (const k of variantKeys(name)) { if (idx.has(k)) { rec = idx.get(k); break; } }
      const ovr = state.overrides[name] || null;

      const { aura, slots, exilus, exilusPolarity } = mergePolarities(rec, ovr);
      renderRow($aura,  aura ? [aura] : [], true);
      const exiRow = (exilus === true) ? [exilusPolarity || "Exilus"] : [];
      renderRow($exilus, exiRow, false);
      renderRow($others, slots, false);
    } catch (err) {
      console.error("[polarities] error:", err);
    }
  }

  document.addEventListener("wf:card-rendered", onCardRendered);
})();
