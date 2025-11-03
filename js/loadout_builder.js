/* 
  Warframe Loadout Builder – Vanilla JS (API Railway, sans CSS inline)
  -------------------------------------------------------------------
  - Monte une UI dans <div id="app"></div>
  - Consomme votre API Railway:
      /warframes, /mods, /arcanes, /archonshards
  - Fonctionnalités:
      • Sélection Warframe + Rang 0–30 + Réacteur
      • Capacité (drain, bonus Aura), Exilus, polarités, Forma par slot
      • 8 slots de mods + Aura + Exilus
      • 2 Arcanes
      • 5 Archon Shards via modal (plus de prompt())
      • Filtres catalogue (server-side quand possible)
      • Autosave localStorage + partage par URL (?s=base64url)
*/

(() => {
  // ----------------------------
  // Helpers
  // ----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) node.setAttribute(k, v);
    });
    for (const c of children) node.append(c && c.nodeType ? c : document.createTextNode(String(c ?? "")));
    return node;
  };

  const b64urlEncode = (obj) => {
    try {
      const json = JSON.stringify(obj);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      return b64.replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
    } catch { return ""; }
  };
  const b64urlDecode = (str) => {
    try {
      const b64 = str.replaceAll("-", "+").replaceAll("_", "/");
      const json = decodeURIComponent(escape(atob(b64)));
      return JSON.parse(json);
    } catch { return null; }
  };

  const debounce = (fn, ms = 200) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString() : "-";

  // ----------------------------
  // API endpoints (absolute -> peut être hébergé n'importe où)
  // ----------------------------
  const API_BASE = "https://cephalon-wodan-production.up.railway.app";
  const API = {
    warframes: `${API_BASE}/warframes`,
    mods: `${API_BASE}/mods`,
    arcanes: `${API_BASE}/arcanes`,
    shards: `${API_BASE}/archonshards`,
  };

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${url}`);
    return res.json();
  }

  // ----------------------------
  // State
  // ----------------------------
  const initial = () => ({
    title: "Mon Loadout",
    notes: "",
    warframeId: null,
    rank: 30,
    reactor: true,
    aura: null,         // { id, polarity }
    exilus: null,       // { id, polarity }
    slots: Array.from({ length: 8 }, () => ({ mod: null, polarity: null })),
    arcanes: [null, null], // two arcane ids
    shards: [null, null, null, null, null], // {color, upgrade}
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const STATE = loadFromURL() || JSON.parse(localStorage.getItem("wf-loadout-draft") || "null") || initial();

  function saveDraft() {
    STATE.updatedAt = new Date().toISOString();
    localStorage.setItem("wf-loadout-draft", JSON.stringify(STATE));
    updateShareURL();
  }

  function updateShareURL() {
    const url = new URL(location.href);
    url.searchParams.set("s", b64urlEncode(STATE));
    history.replaceState(null, "", url.toString());
  }

  function loadFromURL() {
    const url = new URL(location.href);
    const s = url.searchParams.get("s");
    if (!s) return null;
    return b64urlDecode(s);
  }

  // ----------------------------
  // Data caches
  // ----------------------------
  const DB = { warframes: [], mods: [], arcanes: [], shards: {} };

  // ----------------------------
  // Capacity & drain rules
  // ----------------------------
  function frameCapacity(rank, reactor) {
    const base = rank;
    return reactor ? base * 2 : base;
  }

  function modDrain(mod, level = 0) {
    const base = Number(mod?.drain ?? mod?.baseDrain ?? 0);
    return Math.max(0, base + (level || 0));
  }

  function effectiveDrain(mod, slotPolarity, isAura) {
    if (!mod) return 0;
    if (isAura) return 0; // aura ajoute de la capacité
    let drain = modDrain(mod, mod.level || 0);
    const modPol = (mod.polarity || "").toLowerCase();
    const slotPol = (slotPolarity || "").toLowerCase();
    if (slotPol && modPol) {
      if (slotPol === modPol) drain = Math.ceil(drain / 2);
      else drain = Math.ceil(drain * 1.25);
    }
    return drain;
  }

  function auraBonusCapacity(auraMod, slotPolarity) {
    if (!auraMod) return 0;
    const base = modDrain(auraMod, auraMod.level || 0);
    const modPol = (auraMod.polarity || "").toLowerCase();
    const slotPol = (slotPolarity || "").toLowerCase();
    return (slotPol && modPol && slotPol === modPol) ? base * 2 : base;
  }

  function capacitySummary() {
    const cap = frameCapacity(STATE.rank, STATE.reactor);
    const auraBonus = auraBonusCapacity(STATE.aura?.mod || null, STATE.aura?.polarity || null);
    let used = 0;
    for (const s of STATE.slots) used += effectiveDrain(s.mod, s.polarity, false);
    used += effectiveDrain(STATE.exilus?.mod || null, STATE.exilus?.polarity || null, false);
    const remain = cap + auraBonus - used;
    return { cap, auraBonus, used, remain };
  }

  // ----------------------------
  // Fetching
  // ----------------------------
  async function loadData() {
    const [wfs, arcs, shards] = await Promise.all([
      getJSON(API.warframes),
      getJSON(API.arcanes),
      getJSON(API.shards),
    ]);
    DB.warframes = Array.isArray(wfs) ? wfs : [];

    // Normalise les arcanes -> id/name présents
    DB.arcanes = Array.isArray(arcs) ? arcs.map(a => {
      const id = a.id || a.uniqueName || a.InternalName || a.Name;
      const uniqueName = a.uniqueName || a.InternalName || id;
      const name = a.name || a.displayName || a.Name || id;
      return { ...a, id, uniqueName, name, displayName: a.displayName || name };
    }) : [];

    // Convertit shards en { Color: { upgrades: [...] } }
    DB.shards = {};
    if (shards && typeof shards === "object") {
      Object.values(shards).forEach(entry => {
        const color = entry.value || entry.color;
        const upgrades = [];
        const uo = entry.upgradeTypes || {};
        for (const k in uo) {
          const u = uo[k];
          if (u && typeof u.value === "string") upgrades.push(u.value);
        }
        if (color) DB.shards[color] = { upgrades };
      });
    } else {
      DB.shards = shards;
    }

    await fetchAndRenderMods();
  }

  async function fetchAndRenderMods(extra = {}) {
    const url = new URL(API.mods, location.origin);
    url.searchParams.set("type", "WARFRAME");
    url.searchParams.set("compat", "WARFRAME");
    if (extra.polarity) url.searchParams.set("polarity", String(extra.polarity));
    if (extra.rarity) url.searchParams.set("rarity", String(extra.rarity));
    if (extra.search) url.searchParams.set("search", String(extra.search));
    url.searchParams.set("limit", "2000");

    const list = await getJSON(url.toString());
    DB.mods = Array.isArray(list) ? list : (list?.items || []);
    renderCatalog();
  }

  // ----------------------------
  // Rendering – container
  // ----------------------------
  const root = el("div", { class: "wf-builder" },
    headerView(),
    gridView()
  );

  function mount() {
    let container = document.getElementById("app");
    if (!container) {
      container = document.body.appendChild(el("div", { id: "app" }));
    }
    container.innerHTML = "";
    container.appendChild(root);
  }

  // ----------------------------
  // Header (title + share)
  // ----------------------------
  function headerView() {
    const title = el("input", { class: "wf-input", value: STATE.title, placeholder: "Titre du build" });
    title.addEventListener("input", () => { STATE.title = title.value; saveDraft(); });

    const shareBtn = el("button", { class: "wf-btn" }, "Partager (URL)");
    shareBtn.addEventListener("click", () => {
      updateShareURL();
      navigator.clipboard?.writeText(location.href);
      toast("Lien copié dans le presse-papiers ✨");
    });

    const notes = el("textarea", { class: "wf-notes", placeholder: "Notes…" }, STATE.notes);
    notes.addEventListener("input", () => { STATE.notes = notes.value; saveDraft(); });

    return el("div", { class: "wf-header" },
      el("div", { class: "wf-titlebar" }, title, shareBtn),
      notes
    );
  }

  // ----------------------------
  // Main Grid (left: controls; middle: slots; right: catalog)
  // ----------------------------
  function gridView() {
    const left = controlsView();
    const mid  = slotsView();
    const right = catalogView();

    const wrap = el("div", { class: "wf-grid" }, left, mid, right);
    return wrap;
  }

  // ----------------------------
  // Left: Controls (WF, rank, reactor, capacity, arcanes, shards)
  // ----------------------------
  function controlsView() {
    const wfSelect = el("select", { class: "wf-select" });
    wfSelect.appendChild(el("option", { value: "" }, "— Warframe —"));

    for (const wf of DB.warframes)
      wfSelect.appendChild(el("option", { value: wf.uniqueName || wf.id }, wf.name || wf.type || w
