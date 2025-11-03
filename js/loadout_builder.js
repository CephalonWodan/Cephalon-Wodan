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
      wfSelect.appendChild(el("option", { value: wf.uniqueName || wf.id }, wf.name || wf.type || wf.displayName || wf.warframe || wf.uniqueName));
    wfSelect.value = STATE.warframeId || "";
    wfSelect.addEventListener("change", () => { STATE.warframeId = wfSelect.value || null; saveDraft(); renderCapacity(); });

    const rank = el("input", { type: "range", min: 0, max: 30, value: String(STATE.rank), class: "wf-range" });
    const rankLabel = el("div", { class: "wf-label" }, `Rank: ${STATE.rank}`);
    rank.addEventListener("input", () => { STATE.rank = Number(rank.value) || 0; rankLabel.textContent = `Rank: ${STATE.rank}`; renderCapacity(); saveDraft(); });

    const reactor = el("label", { class: "wf-switch" },
      el("input", { type: "checkbox", checked: STATE.reactor ? "" : null }),
      el("span", {}, "Reacteur Orokin (x2)")
    );
    const reactorInput = reactor.querySelector("input");
    reactorInput.checked = !!STATE.reactor;
    reactorInput.addEventListener("change", () => { STATE.reactor = !!reactorInput.checked; renderCapacity(); saveDraft(); });

    const capacityBox = el("div", { class: "wf-capacity" });

    // Arcanes (2)
    const arcWrap = el("div", { class: "wf-card" }, el("div", { class: "wf-card-title" }, "Arcanes (x2)"));
    const arcSlots = [0,1].map(idx => {
      const slot = el("div", { class: "wf-pill" }, STATE.arcanes[idx] ? arcLabel(STATE.arcanes[idx]) : "+ Arcane");
      slot.addEventListener("click", () => openArcanePicker(idx, slot));
      return slot;
    });
    arcWrap.append(...arcSlots);

    // Shards (5)
    const shardWrap = el("div", { class: "wf-card" }, el("div", { class: "wf-card-title" }, "Archon Shards (x5)"));
    const shardSlots = STATE.shards.map((s, i) => shardPill(i));
    shardWrap.append(...shardSlots);

    const left = el("div", { class: "wf-left" },
      section("Warframe", wfSelect),
      section("Niveau & capacité", el("div", {}, rankLabel, rank), reactor, capacityBox),
      arcWrap,
      shardWrap
    );

    function renderCapacity() {
      const { cap, auraBonus, used, remain } = capacitySummary();
      capacityBox.innerHTML = "";
      capacityBox.append(
        el("div", { class: remain < 0 ? "wf-capacity-row neg" : "wf-capacity-row" }, `Capacité: ${cap}`),
        el("div", { class: "wf-capacity-row" }, `Bonus Aura: +${auraBonus}`),
        el("div", { class: "wf-capacity-row" }, `Utilisé: ${used}`),
        el("div", { class: remain < 0 ? "wf-capacity-row neg" : "wf-capacity-row" }, `Restant: ${remain}`),
      );
    }

    function shardPill(idx) {
      const data = STATE.shards[idx];
      const text = data ? `${data.color} – ${data.upgrade}` : "+ Shard";
      const pill = el("div", { class: "wf-pill" }, text);
      pill.addEventListener("click", () => openShardModal(idx, pill));
      return pill;
    }

    renderCapacity();
    return left;
  }

  function arcLabel(arcId) {
    const a = DB.arcanes.find(x => x.id === arcId || x.uniqueName === arcId || x.name === arcId);
    return a ? (a.name || a.displayName || a.id) : String(arcId);
  }

  function openArcanePicker(idx, anchor) {
    const menu = popup(anchor, "Choisir un arcane");
    const input = el("input", { class: "wf-input", placeholder: "Recherche…" });
    const list = el("div", { class: "wf-list" });

    function render(q = "") {
      list.innerHTML = "";
      const items = DB.arcanes.filter(a => (a.name || a.displayName || "").toLowerCase().includes(q.toLowerCase()));
      for (const a of items) {
        const row = el("div", { class: "wf-row" }, a.name || a.displayName || a.id);
        row.addEventListener("click", () => { STATE.arcanes[idx] = a.id || a.uniqueName || a.name; saveDraft(); anchor.textContent = arcLabel(STATE.arcanes[idx]); menu.remove(); });
        list.appendChild(row);
      }
    }

    input.addEventListener("input", () => render(input.value));
    render();
    menu.append(input, list);
  }

  function openShardModal(idx, anchor) {
    const modal = dialog("Configurer un Archon Shard");
    const colorSel = el("select", { class: "wf-select" });
    colorSel.appendChild(el("option", { value: "" }, "— Couleur —"));
    for (const key of Object.keys(DB.shards || {})) colorSel.appendChild(el("option", { value: key }, key));

    const upgradeSel = el("select", { class: "wf-select", disabled: "" });
    upgradeSel.appendChild(el("option", { value: "" }, "— Amélioration —"));

    colorSel.addEventListener("change", () => {
      upgradeSel.innerHTML = "";
      upgradeSel.appendChild(el("option", { value: "" }, "— Amélioration —"));
      const chosen = DB.shards[colorSel.value];
      if (chosen && Array.isArray(chosen.upgrades)) {
        upgradeSel.removeAttribute("disabled");
        for (const u of chosen.upgrades) upgradeSel.appendChild(el("option", { value: u }, u));
      } else upgradeSel.setAttribute("disabled", "");
    });

    const apply = el("button", { class: "wf-btn primary" }, "Appliquer");
    const removeBtn = el("button", { class: "wf-btn danger" }, "Retirer");
    const close = el("button", { class: "wf-btn" }, "Fermer");

    apply.addEventListener("click", () => {
      if (!colorSel.value || !upgradeSel.value) return;
      STATE.shards[idx] = { color: colorSel.value, upgrade: upgradeSel.value };
      saveDraft();
      anchor.textContent = `${colorSel.value} – ${upgradeSel.value}`;
      modal.remove();
    });
    removeBtn.addEventListener("click", () => { STATE.shards[idx] = null; saveDraft(); anchor.textContent = "+ Shard"; modal.remove(); });
    close.addEventListener("click", () => modal.remove());

    modal.body.append(
      section("Couleur", colorSel),
      section("Amélioration", upgradeSel),
      el("div", { class: "wf-actions" }, apply, removeBtn, close)
    );
  }

  // ----------------------------
  // Middle: Mod slots (8 + aura + exilus)
  // ----------------------------
  function slotsView() {
    const mid = el("div", { class: "wf-mid" });

    const auraRow = slotRow("Aura", true);
    const exilusRow = slotRow("Exilus", false, true);
    const rows = [0,1,2,3,4,5,6,7].map(i => slotRow(`Slot ${i+1}`, false, false, i));

    mid.append(
      el("div", { class: "wf-card" }, el("div", { class: "wf-card-title" }, "Aura"), auraRow),
      el("div", { class: "wf-card" }, el("div", { class: "wf-card-title" }, "Exilus"), exilusRow),
      el("div", { class: "wf-card" }, el("div", { class: "wf-card-title" }, "Mods (8)"), ...rows)
    );

    return mid;
  }

  function slotRow(label, isAura = false, isExilus = false, idx = -1) {
    const row = el("div", { class: "wf-slot" });

    const polBtn = el("button", { class: "wf-chip" }, "Polarity: —");
    const modBtn = el("button", { class: "wf-chip" }, isAura ? "+ Aura" : isExilus ? "+ Exilus" : "+ Mod");
    const drainLbl = el("span", { class: "wf-drain" }, "");

    function cyclePolarity(current) {
      const order = [null, "madurai", "vazarin", "naramon", "zenurik", "unairu", "penjaga", "umbra"];
      const i = order.indexOf((current || null));
      return order[(i + 1) % order.length];
    }

    function refresh() {
      if (isAura) {
        const m = STATE.aura?.mod || null; const pol = STATE.aura?.polarity || null;
        polBtn.textContent = `Polarity: ${pol || "—"}`;
        modBtn.textContent = m ? (m.name || m.displayName || m.id) : "+ Aura";
        drainLbl.textContent = `Bonus +${auraBonusCapacity(m, pol)}`;
      } else if (isExilus) {
        const m = STATE.exilus?.mod || null; const pol = STATE.exilus?.polarity || null;
        polBtn.textContent = `Polarity: ${pol || "—"}`;
        modBtn.textContent = m ? (m.name || m.displayName || m.id) : "+ Exilus";
        drainLbl.textContent = `Drain ${effectiveDrain(m, pol, false)}`;
      } else {
        const s = STATE.slots[idx];
        polBtn.textContent = `Polarity: ${s.polarity || "—"}`;
        modBtn.textContent = s.mod ? (s.mod.name || s.mod.displayName || s.mod.id) : "+ Mod";
        drainLbl.textContent = `Drain ${effectiveDrain(s.mod, s.polarity, false)}`;
      }
      const box = $(".wf-capacity");
      if (box) {
        const { cap, auraBonus, used, remain } = capacitySummary();
        box.innerHTML =
          `<div class="wf-capacity-row${remain<0?" neg":""}">Capacité: ${cap}</div>` +
          `<div class="wf-capacity-row">Bonus Aura: +${auraBonus}</div>` +
          `<div class="wf-capacity-row">Utilisé: ${used}</div>` +
          `<div class="wf-capacity-row${remain<0?" neg":""}">Restant: ${remain}</div>`;
      }
    }

    polBtn.addEventListener("click", () => {
      if (isAura) {
        const next = cyclePolarity(STATE.aura?.polarity || null);
        STATE.aura = { ...(STATE.aura || { mod: null }), polarity: next };
      } else if (isExilus) {
        const next = cyclePolarity(STATE.exilus?.polarity || null);
        STATE.exilus = { ...(STATE.exilus || { mod: null }), polarity: next };
      } else {
        STATE.slots[idx].polarity = cyclePolarity(STATE.slots[idx].polarity || null);
      }
      saveDraft();
      refresh();
    });

    modBtn.addEventListener("click", () => openModPicker({
      isAura, isExilus, idx,
      onPick(mod){
        if (isAura) STATE.aura = { mod, polarity: (STATE.aura?.polarity || null) };
        else if (isExilus) STATE.exilus = { mod, polarity: (STATE.exilus?.polarity || null) };
        else STATE.slots[idx].mod = mod;
        saveDraft();
        refresh();
      }
    }));

    refresh();
    row.append(el("span", { class: "wf-slot-label" }, label), polBtn, modBtn, drainLbl);
    return row;
  }

  function openModPicker({ isAura, isExilus, idx, onPick }) {
    const modal = dialog(isAura ? "Choisir une Aura" : isExilus ? "Choisir un Mod Exilus" : "Choisir un Mod");

    const search = el("input", { class: "wf-input", placeholder: "Recherche mod…" });
    const polSel = el("select", { class: "wf-select" },
      el("option", { value: "" }, "Toutes polarités"),
      el("option", { value: "madurai" }, "Madurai"),
      el("option", { value: "vazarin" }, "Vazarin"),
      el("option", { value: "naramon" }, "Naramon"),
      el("option", { value: "zenurik" }, "Zenurik"),
      el("option", { value: "unairu" }, "Unairu"),
      el("option", { value: "penjaga" }, "Penjaga"),
      el("option", { value: "umbra" }, "Umbra"),
      el("option", { value: "aura" }, "Aura"),
      el("option", { value: "exilus" }, "Exilus"),
    );
    const rarSel = el("select", { class: "wf-select" },
      el("option", { value: "" }, "Toutes raretés"),
      el("option", { value: "Common" }, "Common"),
      el("option", { value: "Uncommon" }, "Uncommon"),
      el("option", { value: "Rare" }, "Rare"),
      el("option", { value: "Legendary" }, "Legendary"),
    );

    const list = el("div", { class: "wf-list" });

    const doFilter = debounce(async () => {
      await fetchAndRenderMods({
        polarity: polSel.value || undefined,
        rarity: rarSel.value || undefined,
        search: search.value || undefined,
      });
      renderRows();
    }, 150);

    search.addEventListener("input", doFilter);
    polSel.addEventListener("change", doFilter);
    rarSel.addEventListener("change", doFilter);

    function renderRows() {
      list.innerHTML = "";
      const items = DB.mods.filter(m => {
        const name = (m.name || m.displayName || m.id || "").toLowerCase();
        if (search.value && !name.includes(search.value.toLowerCase())) return false;
        if (isAura && String(m.polarity || "").toLowerCase() !== "aura") return false;
        if (isExilus && String(m.polarity || "").toLowerCase() !== "exilus") return false;
        return true;
      });

      for (const m of items) {
        const row = el("div", { class: "wf-row" });
        const name = el("div", { class: "wf-row-name" }, m.name || m.displayName || m.id);
        const tags = el("div", { class: "wf-row-tags" },
          el("span", { class: "tag" }, m.rarity || ""),
          m.polarity ? el("span", { class: "tag" }, m.polarity) : "",
          el("span", { class: "tag" }, `Drain ${modDrain(m, m.level || 0)}`),
        );
        const pick = el("button", { class: "wf-btn small" }, "Choisir");
        pick.addEventListener("click", () => { onPick(m); modal.remove(); });
        row.append(name, tags, pick);
        list.appendChild(row);
      }
    }

    renderRows();

    modal.body.append(
      el("div", { class: "wf-filter" }, search, polSel, rarSel),
      list
    );
  }

  // ----------------------------
  // Right: Catalog (aperçu)
  // ----------------------------
  function catalogView() {
    const wrap = el("div", { class: "wf-right" });

    const title = el("div", { class: "wf-card-title" }, "Catalogue (aperçu)");
    const list = el("div", { class: "wf-list" });

    function render() {
      list.innerHTML = "";
      for (const m of DB.mods.slice(0, 50)) {
        const row = el("div", { class: "wf-row" });
        row.append(
          el("div", { class: "wf-row-name" }, m.name || m.displayName || m.id),
          el("div", { class: "wf-row-tags" },
            el("span", { class: "tag" }, m.rarity || ""),
            m.polarity ? el("span", { class: "tag" }, m.polarity) : "",
            el("span", { class: "tag" }, `Drain ${modDrain(m, m.level || 0)}`),
          )
        );
        list.appendChild(row);
      }
    }

    renderCatalog = render;
    render();

    wrap.append(el("div", { class: "wf-card" }, title, list));
    return wrap;
  }

  let renderCatalog = () => {};

  // ----------------------------
  // UI helpers – sections, dialog, popup, toast
  // ----------------------------
  function section(title, ...children) {
    return el("div", { class: "wf-card" }, el("div", { class: "wf-card-title" }, title), ...children);
  }

  function dialog(title) {
    const scrim = el("div", { class: "wf-scrim" });
    const box = el("div", { class: "wf-dialog" });
    const head = el("div", { class: "wf-dialog-head" }, title);
    const body = el("div", { class: "wf-dialog-body" });
    box.append(head, body);
    scrim.append(box);
    scrim.addEventListener("click", (e) => { if (e.target === scrim) scrim.remove(); });
    document.body.appendChild(scrim);
    return { body, remove: () => scrim.remove() };
  }

  function popup(anchor, title = "") {
    const pop = el("div", { class: "wf-popup" }, title ? el("div", { class: "wf-popup-title" }, title) : "");
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = `${r.left + window.scrollX}px`;
    pop.style.top = `${r.bottom + window.scrollY + 6}px`;
    const off = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener("mousedown", off); } };
    document.addEventListener("mousedown", off);
    return pop;
  }

  function toast(msg) {
    const t = el("div", { class: "wf-toast" }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 1800);
  }

  // ----------------------------
  // Boot
  // ----------------------------
  mount();
  loadData().catch(err => { console.error(err); toast("Erreur de chargement des données"); });
})();
