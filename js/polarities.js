// js/polarities.js
// Injecte les polarités (Aura + slots) en utilisant les SVG officiels du repo : img/polarities/*.svg
// Sources : API WarframeStat (EN) + data/polarity_overrides.json (optionnel)
// S'accroche à l'évènement "wf:card-rendered" émis par app.js.

(function () {
  const API = "https://api.warframestat.us/warframes/?language=en";
  const OVERRIDES_URL = "data/polarity_overrides.json"; // optionnel, généré par ton script
  const ICON_BASE = "img/polarities";                   // dossier d'icônes dans ton repo

  const state = {
    apiIndex: null,   // Map nameVariant(lower) -> api record
    overrides: {},    // { "FrameName": { aura: "Madurai", slots: ["Vazarin", ...] } }
    ready: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const norm = (s) => String(s || "").trim();

  // ---------- Variantes de nom (Prime/Umbra -> base)
  function variantKeys(name) {
    const n = norm(name);
    if (!n) return [];
    const base = n.replace(/\s+Prime\b/i, "").replace(/\s+Dex\b/i, "").trim();
    const out = [n, base];
    if (/Umbra$/i.test(n)) out.push(n.replace(/\s+Umbra$/i, "").trim());
    return Array.from(new Set(out.map(x => x.toLowerCase())));
  }

  // ---------- Chargement API + overrides (avec cache)
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

  // ---------- Canonicalisation + mapping fichier
  // Noms canoniques -> fichier SVG attendu. Si tes fichiers ont d’autres noms, adapte ce mapping.
  const FILE_MAP = {
    Madurai: "madurai.svg",
    Vazarin: "vazarin.svg",
    Naramon: "naramon.svg",
    Zenurik: "zenurik.svg",
    Unairu: "unairu.svg",
    Umbra: "umbra.svg",
    Penjaga: "penjaga.svg",
    Universal: "universal.svg" // si présent dans ton dossier
  };
  const POL_CANON = Object.fromEntries(Object.keys(FILE_MAP).map(k => [k.toLowerCase(), k]));

  function canonPol(p) {
    if (!p) return null;
    const k = String(p).toLowerCase().replace(/[^a-z]/g, "");
    return POL_CANON[k] || (p[0].toUpperCase() + p.slice(1));
  }
  function iconPath(polName) {
    const file = FILE_MAP[polName] || `${polName.toLowerCase()}.svg`;
    return `${ICON_BASE}/${file}`;
  }

  // ---------- Merge API + overrides
  function mergePolarities(apiRec, override) {
    const auraApi = apiRec?.auraPolarity || apiRec?.aura || null;
    const slotsApi = Array.isArray(apiRec?.polarities) ? apiRec.polarities : [];
    const aura = override?.aura || auraApi || null;
    const slots = (Array.isArray(override?.slots) && override.slots.length) ? override.slots : slotsApi;
    return { aura, slots };
  }

  // ---------- Rendu DOM (utilise <img> sur les SVG du repo)
  // style inline “doré” pour rester cohérent, au cas où ta CSS ne le cible pas
  const WRAP_STYLE = "display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;border:1px solid rgba(212,175,55,.55);background:rgba(212,175,55,.06);";
  function fallbackSVG(pol) {
    // Fallback minimal si une icône manque (rare) : pastille dorée avec initiale
    const letter = (pol || "?").slice(0, 1);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,.06)"></circle>
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(212,175,55,.8)" stroke-width="1.5"></circle>
        <text x="12" y="16" text-anchor="middle" font-size="11" fill="#D4AF37" font-family="system-ui,Segoe UI,Roboto">${letter}</text>
      </svg>`;
    const wrap = document.createElement("span");
    wrap.setAttribute("style", WRAP_STYLE);
    wrap.innerHTML = svg;
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
    img.src = iconPath(polName);

    img.addEventListener("error", () => {
      // Remplace par un fallback discret si le fichier est introuvable
      wrap.replaceChildren(fallbackSVG(polName));
    });

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

  // ---------- Handler principal
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

      // Injecte dans la carte affichée
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
