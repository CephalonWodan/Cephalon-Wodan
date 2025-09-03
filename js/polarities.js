// js/polarities.js
// Injecte les polarités (Aura + slots) dans les conteneurs .polarity-row
// Sources : API WarframeStat (EN) + data/polarity_overrides.json (optionnel)
//
// Prérequis markup dans la carte (déjà dans app.js que je t’ai fourni) :
//   <div class="muted text-xs mb-1">Aura polarity</div>
//   <div class="polarity-row" data-zone="aura"></div>
//   <div class="muted text-xs mt-3 mb-1">Polarities</div>
//   <div class="polarity-row" data-zone="others"></div>

(function () {
  const API = "https://api.warframestat.us/warframes/?language=en";
  const OVERRIDES_URL = "data/polarity_overrides.json"; // généré par ton script build_from_json_warframe.mjs

  const state = {
    apiIndex: null,          // Map name -> api record
    overrides: {},           // { "FrameName": { aura: "Madurai", slots: ["Vazarin", ...] } }
    ready: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const norm = (s) => String(s || "").trim();
  const title = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  // ---------- Utils noms / variantes
  function variantKeys(name) {
    const n = norm(name);
    if (!n) return [];
    const base = n.replace(/\s+Prime\b/i, "").replace(/\s+Dex\b/i, "").trim();
    const out = [n, base];
    if (/Umbra$/i.test(n)) out.push(n.replace(/\s+Umbra$/i, "").trim());
    return Array.from(new Set(out.map(x => x.toLowerCase())));
  }

  // ---------- Chargement API (cache)
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

  // ---------- Chargement overrides (optionnel)
  async function ensureOverrides() {
    if (state.ready) return state.overrides;
    try {
      const r = await fetch(OVERRIDES_URL);
      if (r.ok) state.overrides = await r.json();
    } catch (_) { /* ignore 404 */ }
    state.ready = true;
    return state.overrides;
  }

  // ---------- Canonicalisation & icônes
  const POL_CANON = {
    madurai: "Madurai",
    vazarin: "Vazarin",
    naramon: "Naramon",
    zenurik: "Zenurik",
    unairu: "Unairu",
    umbra: "Umbra",
    penjaga: "Penjaga", // au cas où
    universal: "Universal"
  };
  function canonPol(p) {
    if (!p) return null;
    const k = String(p).toLowerCase().replace(/[^a-z]/g, "");
    return POL_CANON[k] || title(p);
  }

  // Icône minimaliste inline (fallback universel) — tu peux remplacer par tes SVG “officiels” si tu veux
  function iconSVG(pol) {
    const label = (pol || "?").slice(0, 1);
    return `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,.06)"></circle>
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(212,175,55,.8)" stroke-width="1.5"></circle>
        <text x="12" y="16" text-anchor="middle" font-size="11" fill="#D4AF37" font-family="system-ui,Segoe UI,Roboto" >
          ${label}
        </text>
      </svg>`;
  }

  function polChip(pol) {
    const p = canonPol(pol);
    return `
      <span class="pol-icon" data-pol="${p || ""}" title="${p || ""}"
            style="display:inline-flex;align-items:center;justify-content:center;
                   width:28px;height:28px;border-radius:8px;
                   border:1px solid rgba(212,175,55,.55);
                   background:rgba(212,175,55,.06);">
        ${iconSVG(p)}
      </span>`;
  }

  function renderRow(host, arr) {
    if (!host) return;
    const list = (arr || []).map(canonPol).filter(Boolean);
    host.innerHTML = list.length ? list.map(polChip).join("") : `<span class="muted">—</span>`;
  }

  // ---------- Merge API + overrides
  function mergePolarities(frameName, apiRec, override) {
    // API
    const auraApi = apiRec?.auraPolarity || apiRec?.aura || null;
    const slotsApi = Array.isArray(apiRec?.polarities) ? apiRec.polarities : [];

    // Overrides: si présents, ils PRIMENT (sinon on complète)
    const aura = override?.aura || auraApi || null;
    const slots = Array.isArray(override?.slots) && override.slots.length
      ? override.slots
      : slotsApi;

    return { aura, slots };
  }

  // ---------- Handler principal
  async function onCardRendered(e) {
    try {
      const wf = e?.detail?.wf || {};
      const name = wf?.name || "";
      if (!name) return;

      const idx = await ensureApiIndex();
      await ensureOverrides();

      // record API par variantes
      let rec = null;
      for (const k of variantKeys(name)) {
        if (idx.has(k)) { rec = idx.get(k); break; }
      }

      // overrides exacts (clé sensible à la casse telle qu’écrite par ton script)
      const ovr = state.overrides[name] || null;

      const { aura, slots } = mergePolarities(name, rec, ovr);

      // Insère dans la carte courante (#card)
      const card = document.getElementById("card");
      if (!card) return;

      const auraHost = card.querySelector('.polarity-row[data-zone="aura"]');
      const othersHost = card.querySelector('.polarity-row[data-zone="others"]');

      renderRow(auraHost, aura ? [aura] : []);
      renderRow(othersHost, slots);

      // Debug utile en console
      // console.debug("[polarities] filled for", name, { aura, slots, apiName: rec?.name, override: !!ovr });
    } catch (err) {
      console.error("[polarities] error:", err);
    }
  }

  // Écoute l’évènement émis par app.js après chaque renderCard(...)
  document.addEventListener("wf:card-rendered", onCardRendered);
})();
