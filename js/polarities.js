// js/polarities.js
// Injecte les polarités (Aura + slots) avec tes icônes locales: img/polarities/*.{svg,png,webp}
// Sources: WarframeStat (EN) + data/polarity_overrides.json (optionnel)
// S'accroche à l'évènement "wf:card-rendered" émis par app.js.

(function () {
  const API = "https://api.warframestat.us/warframes/?language=en";
  const OVERRIDES_URL = "data/polarity_overrides.json"; // optionnel
  // Base absolue vers le dossier d'icônes (OK sur GitHub Pages)
  const ICON_BASE = new URL("img/polarities/", document.baseURI).href;

  // (optionnel) Permettre un mapping externe: window.POL_ICON_MAP = { "Zenurik": "zenurik_icon.svg", ... }
  const EXTERNAL_MAP = (typeof window !== "undefined" && window.POL_ICON_MAP) ? window.POL_ICON_MAP : null;
  // (optionnel) debug console
  const DEBUG = (typeof window !== "undefined" && window.POL_DEBUG) ? true : false;

  const state = {
    apiIndex: null,   // Map nameVariant(lower) -> api record
    overrides: {},
    ready: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const norm = (s) => String(s || "").trim();

  /* -------- Variantes de nom de Warframe -------- */
  function variantKeys(name) {
    const n = norm(name);
    if (!n) return [];
    const base = n.replace(/\s+Prime\b/i, "").replace(/\s+Dex\b/i, "").trim();
    const out = [n, base];
    if (/Umbra$/i.test(n)) out.push(n.replace(/\s+Umbra$/i, "").trim());
    return Array.from(new Set(out.map(x => x.toLowerCase())));
  }

  /* -------- API & overrides -------- */
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
    } catch (_) {} // 404 ok
    state.ready = true;
    return state.overrides;
  }

  /* -------- Canonicalisation des polarités -------- */
  const CANON = {
    madurai: "Madurai",
    vazarin: "Vazarin",
    naramon: "Naramon",
    zenurik: "Zenurik",
    unairu:  "Unairu",
    umbra:   "Umbra",
    penjaga: "Penjaga",
    universal: "Universal"
  };
  function canonPol(p) {
    if (!p) return null;
    const k = String(p).toLowerCase().replace(/[^a-z]/g, "");
    return CANON[k] || (p[0].toUpperCase() + p.slice(1));
  }

  /* -------- Résolution du fichier d’icône -------- */
  // Extensions testées
  const EXTS = [".svg", ".png", ".webp"];

  // Génère des variantes de nom de fichier pour être tolérant (casse / préfixes usuels)
  function nameVariants(base) {
    const lower = base.toLowerCase();
    const cap   = base[0].toUpperCase() + base.slice(1).toLowerCase();
    const upper = base.toUpperCase();

    // quelques patterns vus fréquemment
    const stems = [
      lower, cap, upper,
      `polarity-${lower}`, `${lower}-polarity`,
      `icon-${lower}`, `${lower}-icon`,
      `wf-${lower}`, `slot-${lower}`
    ];

    // si EXTERNAL_MAP fournit un nom exact, on le met en tête
    if (EXTERNAL_MAP && EXTERNAL_MAP[base]) {
      const forced = String(EXTERNAL_MAP[base]).replace(/^\/+/, "");
      return [forced];
    }
    return Array.from(new Set(stems));
  }

  function iconUrlCandidates(polName) {
    const bases = nameVariants(polName);
    const list = [];
    for (const b of bases) {
      for (const ext of EXTS) list.push(ICON_BASE + b + ext);
    }
    return list;
  }

  /* -------- Merge API + overrides -------- */
  function mergePolarities(apiRec, override) {
    const auraApi  = apiRec?.auraPolarity || apiRec?.aura || null;
    const slotsApi = Array.isArray(apiRec?.polarities) ? apiRec.polarities : [];
    const aura  = override?.aura  || auraApi  || null;
    const slots = (Array.isArray(override?.slots) && override.slots.length) ? override.slots : slotsApi;
    return { aura, slots };
  }

  /* -------- Création d'icône (multi-essais) -------- */
  const WRAP_STYLE = "display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;border:1px solid rgba(212,175,55,.55);background:rgba(212,175,55,.06);";

  function fallbackSVG(pol) {
    const letter = (pol || "?").slice(0, 1);
    const wrap = document.createElement("span");
    wrap.setAttribute("style", WRAP_STYLE);
    wrap.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,.06)"></circle>
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(212,175,55,.8)" stroke-width="1.5"></circle>
        <text x="12" y="16" text-anchor="middle" font-size="11" fill="#D4AF37" font-family="system-ui,Segoe UI,Roboto">${letter}</text>
      </svg>`;
    return wrap;
  }

  function createIcon(polName) {
    const wrap = document.createElement("span");
    wrap.className = "pol-icon";
    wrap.setAttribute("title", polName);
    wrap.setAttribute("style", WRAP_STYLE);

    const img = new Image();
    img.decoding = "async";
    img.loading = "lazy";
    img.width = 22;
    img.height = 22;
    img.alt = polName;

    const tries = iconUrlCandidates(polName);
    let i = 0;

    function tryNext() {
      if (i >= tries.length) {
        if (DEBUG) console.warn(`[polarities] Icon not found for "${polName}"`, tries);
        wrap.replaceChildren(fallbackSVG(polName));
        return;
      }
      const url = tries[i++];
      img.src = url;
      if (DEBUG) console.debug("[polarities] try", polName, url);
    }

    img.addEventListener("error", tryNext, { once: false });
    img.addEventListener("load", () => { /* ok */ }, { once: true });

    tryNext();
    wrap.appendChild(img);
    return wrap;
  }

  function renderRow(host, arr) {
    if (!host) return;
    host.innerHTML = "";
    const list = (arr || []).map(canonPol).filter(Boolean);
    if (!list.length) { host.innerHTML = `<span class="muted">—</span>`; return; }
    list.forEach(p => host.appendChild(createIcon(p)));
  }

  /* -------- Handler principal -------- */
  async function onCardRendered(e) {
    try {
      const wf = e?.detail?.wf || {};
      const name = wf?.name || "";
      if (!name) return;

      const idx = await ensureApiIndex();
      await ensureOverrides();

      let rec = null;
      for (const k of variantKeys(name)) {
        if (idx.has(k)) { rec = idx.get(k); break; }
      }
      const ovr = state.overrides[name] || null;
      const { aura, slots } = mergePolarities(rec, ovr);

      const card = document.getElementById("card");
      if (!card) return;
      renderRow(card.querySelector('.polarity-row[data-zone="aura"]'), aura ? [aura] : []);
      renderRow(card.querySelector('.polarity-row[data-zone="others"]'), slots);
    } catch (err) {
      console.error("[polarities] error:", err);
    }
  }

  document.addEventListener("wf:card-rendered", onCardRendered);
})();
