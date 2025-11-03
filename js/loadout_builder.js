/* 
  Loadout Builder – bind to existing DOM (no inline CSS, no #app rendering)
  Se branche sur ton HTML existant + tes CSS (racine/css/loadout_builder.css & themes.css)
*/

(() => {
  // ----------------------------
  // API endpoints
  // ----------------------------
  const API_BASE = "https://cephalon-wodan-production.up.railway.app";
  const API = {
    warframes: `${API_BASE}/warframes`,
    mods: `${API_BASE}/mods`,
    arcanes: `${API_BASE}/arcanes`,
    shards: `${API_BASE}/archonshards`,
  };

  // ----------------------------
  // Helpers
  // ----------------------------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, props = {}, ...children) => {
    const n = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) n.setAttribute(k, v);
    });
    for (const c of children) n.append(c && c.nodeType ? c : document.createTextNode(String(c ?? "")));
    return n;
  };
  const debounce = (fn, ms = 200) => { let t; return (...a) => (clearTimeout(t), t = setTimeout(()=>fn(...a), ms)); };

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

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return res.json();
  }

  // ----------------------------
  // State & caches
  // ----------------------------
  const initial = () => ({
    warframeId: null,
    title: "Mon Loadout",
    notes: "",
    rank: 30,
    reactor: true,
    aura: null,        // {mod, polarity}
    exilus: null,      // {mod, polarity}
    slots: Array.from({length: 8}, () => ({ mod: null, polarity: null })),
    arcanes: [null, null], // 2
    shards: [null, null, null, null, null], // {color, upgrade}
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const STATE = loadFromURL() || JSON.parse(localStorage.getItem("wf-loadout-draft") || "null") || initial();
  const DB = { warframes: [], mods: [], arcanes: [], shards: {} };

  function saveDraft() {
    STATE.updatedAt = new Date().toISOString();
    localStorage.setItem("wf-loadout-draft", JSON.stringify(STATE));
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
  // Capacity rules
  // ----------------------------
  function frameCapacity(rank, reactor) {
    const base = rank; // base capacity = rank
    return reactor ? base * 2 : base;
  }
  function modDrain(mod, level = 0) {
    const base = Number(mod?.drain ?? mod?.baseDrain ?? 0);
    return Math.max(0, base + (level || 0));
  }
  function effectiveDrain(mod, slotPolarity, isAura) {
    if (!mod) return 0;
    if (isAura) return 0;
    let drain = modDrain(mod, mod.level || 0);
    const modPol  = (mod.polarity || "").toLowerCase();
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
    const modPol  = (auraMod.polarity || "").toLowerCase();
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
  // Data fetching
  // ----------------------------
  async function loadData() {
    const [wfs, arcs, shards] = await Promise.all([
      getJSON(API.warframes).catch(e => (console.error(e), [])),
      getJSON(API.arcanes).catch(e => (console.error(e), [])),
      getJSON(API.shards).catch(e => (console.error(e), {})),
    ]);

    DB.warframes = Array.isArray(wfs) ? wfs : [];

    DB.arcanes = Array.isArray(arcs) ? arcs.map(a => {
      const id = a.id || a.uniqueName || a.InternalName || a.Name;
      const uniqueName = a.uniqueName || a.InternalName || id;
      const name = a.name || a.displayName || a.Name || id;
      return { ...a, id, uniqueName, name, displayName: a.displayName || name };
    }) : [];

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
    }

    await fetchAndRenderMods();
    hydrateUI();
  }

  async function fetchAndRenderMods(extra = {}) {
    try {
      const url = new URL(API.mods);
      url.searchParams.set("type", "WARFRAME");
      url.searchParams.set("compat", "WARFRAME");
      if (extra.polarity) url.searchParams.set("polarity", String(extra.polarity));
      if (extra.rarity)   url.searchParams.set("rarity", String(extra.rarity));
      if (extra.search)   url.searchParams.set("search", String(extra.search));
      if (extra.pvp)      url.searchParams.set("pvp", String(extra.pvp));
      url.searchParams.set("limit", "2000");

      const list = await getJSON(url.toString());
      DB.mods = Array.isArray(list) ? list : (Array.isArray(list?.items) ? list.items : []);
      renderModList();
    } catch (e) {
      console.error("[mods] fetch error:", e);
      DB.mods = [];
      renderModList();
    }
  }

  // ----------------------------
  // Bind to existing DOM
  // ----------------------------
  function hydrateUI() {
    // Header bits
    const wfPicker     = $("#wfPicker");
    const wfImg        = $("#wfImg");
    const wfTitle      = $("#wfTitle");
    const wfSubtitle   = $("#wfSubtitle");

    const rankToggle   = $("#rankToggle");
    const rankSlider   = $("#rankSlider");
    const rankVal      = $("#rankVal");
    const reactor      = $("#reactor");

    const statsList    = $("#statsList");
    const polList      = $("#polList");

    const globalSearch = $("#globalSearch");
    const resetBuild   = $("#resetBuild");
    const saveBuild    = $("#saveBuild");

    const fltPol       = $("#fltPol");
    const fltRarity    = $("#fltRarity");
    const fltGame      = $("#fltGame");
    const fltSort      = $("#fltSort");

    if (!wfPicker) {
      console.warn("[builder] wfPicker non trouvé — vérifie ton HTML");
      return;
    }

    // Populate Warframes
    wfPicker.innerHTML = "";
    wfPicker.appendChild(el("option", { value: "" }, "— Warframe —"));
    for (const wf of DB.warframes) {
      const name = wf.name || wf.type || wf.displayName || wf.warframe || wf.uniqueName;
      const val  = wf.uniqueName || wf.id || name;
      wfPicker.appendChild(el("option", { value: val }, name));
    }
    wfPicker.value = STATE.warframeId || "";

    // Events
    wfPicker.addEventListener("change", () => {
      STATE.warframeId = wfPicker.value || null;
      updateHeaderPreview();
      updateStats();
      saveDraft();
      // fetchAndRenderMods(); // décommente si tu veux filtrer les augments par frame
    });

    rankToggle?.addEventListener("change", () => {
      const isR30 = !!rankToggle.checked;
      STATE.rank = isR30 ? 30 : 0;
      if (rankSlider) rankSlider.value = String(STATE.rank);
      if (rankVal) rankVal.textContent = String(STATE.rank);
      updateStats();
      saveDraft();
    });

    rankSlider?.addEventListener("input", () => {
      STATE.rank = Number(rankSlider.value) || 0;
      if (rankVal) rankVal.textContent = String(STATE.rank);
      if (rankToggle) rankToggle.checked = STATE.rank >= 30;
      updateStats();
      saveDraft();
    });

    reactor?.addEventListener("change", () => {
      STATE.reactor = !!reactor.checked;
      updateStats();
      saveDraft();
    });

    globalSearch?.addEventListener("input", debounce(() => {
      fetchAndRenderMods({
        search: globalSearch.value || undefined,
        polarity: fltPol?.value || undefined,
        rarity: fltRarity?.value || undefined,
        pvp: fltGame?.value === "pvp" ? true : undefined,
      });
    }, 200));

    [fltPol, fltRarity, fltGame, fltSort].forEach(sel => sel?.addEventListener("change", () => {
      fetchAndRenderMods({
        search: globalSearch?.value || undefined,
        polarity: fltPol?.value || undefined,
        rarity: fltRarity?.value || undefined,
        pvp: fltGame?.value === "pvp" ? true : undefined,
        sort: fltSort?.value || undefined,
      });
    }));

    resetBuild?.addEventListener("click", () => {
      const keepWF = STATE.warframeId;
      Object.assign(STATE, initial(), { warframeId: keepWF });
      if (rankSlider) rankSlider.value = String(STATE.rank);
      if (rankVal) rankVal.textContent = String(STATE.rank);
      if (rankToggle) rankToggle.checked = true;
      reactor && (reactor.checked = true);
      updateStats();
      saveDraft();
      renderSlotsPreview();
    });

    saveBuild?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "loadout.json"; a.click();
      URL.revokeObjectURL(url);
    });

    // Bind pickers on your slots
    bindSlotPickers();

    // Première hydratation
    updateHeaderPreview();
    updateStats();
    renderSlotsPreview();
    renderModList();
  }

  // ----------------------------
  // Renders (sur ton HTML)
  // ----------------------------
  function updateHeaderPreview() {
    const wf = getSelectedWF();
    const wfImg = $("#wfImg");
    const wfTitle = $("#wfTitle");
    const wfSubtitle = $("#wfSubtitle");

    if (!wf) {
      wfTitle && (wfTitle.textContent = "NEW BUILD");
      wfSubtitle && (wfSubtitle.textContent = "Sélectionnez une Warframe pour démarrer.");
      wfImg && (wfImg.src = "");
      return;
    }
    const name = wf.name || wf.type || wf.displayName || wf.warframe || wf.uniqueName;
    wfTitle && (wfTitle.textContent = name);
    wfSubtitle && (wfSubtitle.textContent = "Régler mods, arcanes et shards pour calculer la capacité.");
    wfImg && (wfImg.src = ""); // laisse vide (tu gères l’image côté CSS/asset)
  }

  // Robust stat extraction (+ R0/R30)
  function getStat(obj, keys, fallback=0) {
    for (const k of keys) {
      if (obj && obj[k] != null && isFinite(Number(obj[k]))) return Number(obj[k]);
    }
    return fallback;
  }
  function updateStats() {
    const statsList = $("#statsList");
    if (!statsList) return;
    const wf = getSelectedWF();
    statsList.innerHTML = "";

    // capacity bloc
    const { cap, auraBonus, used, remain } = capacitySummary();
    const row = (k, v) => el("div", { class: "stat" }, el("span", { class: "k" }, k), el("span", { class: "v" }, String(v)));

    if (!wf) {
      statsList.append(
        row("Capacity", cap),
        row("Aura bonus", `+${auraBonus}`),
        row("Used", used),
        row("Remain", remain)
      );
      return;
    }

    // lecture stats R0/R30 selon champ dispo
    // essaie plusieurs conventions: health/baseHealth/maxHealth, shields/shield, armor/armour, energy/power, sprint/sprintSpeed
    const isR30 = STATE.rank >= 30;
    const base   = wf.baseStats || wf.stats || wf; // structure la plus permissive
    const atR30  = wf.baseStatsRank30 || wf.statsRank30 || wf.rank30 || {};

    const pick = (k0, k30) => isR30 ? getStat(atR30, k30) : getStat(base, k0);

    const health  = pick(["health","baseHealth","Health"], ["health","maxHealth","Health"]);
    const shields = pick(["shields","shield","baseShield","Shield"], ["shields","shield","maxShield","Shield"]);
    const armor   = pick(["armor","armour","Armor"], ["armor","armour","Armor"]);
    const energy  = pick(["energy","power","Energy"], ["energy","power","Energy"]);
    const sprint  = (isR30 ? (atR30?.sprintSpeed ?? atR30?.sprint ?? base?.sprintSpeed ?? base?.sprint) 
                           : (base?.sprintSpeed ?? base?.sprint)) ?? 1;

    statsList.append(
      row("Health", Math.round(health)),
      row("Shields", Math.round(shields)),
      row("Armor", Math.round(armor)),
      row("Energy", Math.round(energy)),
      row("Sprint", Number(sprint).toFixed(2)),
      row("Capacity", cap),
      row("Aura bonus", `+${auraBonus}`),
      row("Used", used),
      row("Remain", remain)
    );

    // Polarity preview (si fourni)
    const polList = $("#polList");
    if (polList) {
      polList.innerHTML = "";
      const polys = wf?.polarities || wf?.Polarities || [];
      (Array.isArray(polys) ? polys : []).forEach(p => polList.append(el("span", {}, String(p))));
    }
  }

  function renderSlotsPreview() {
    const auraEl   = $('[data-slot="aura"]');
    const exilusEl = $('[data-slot="exilus"]');
    auraEl && (auraEl.textContent   = STATE.aura?.mod?.name || "Aura");
    exilusEl && (exilusEl.textContent = STATE.exilus?.mod?.name || "Exilus");
    for (let i = 0; i < 6; i++) {
      const slot = $(`[data-slot="${i+1}"]`);
      slot && (slot.textContent = STATE.slots[i]?.mod?.name || String(i+1));
    }
    $('[data-slot="Arcanes-1"]') && ($('[data-slot="Arcanes-1"]').textContent = arcLabel(STATE.arcanes[0]) || "Arcane 1");
    $('[data-slot="Arcanes-2"]') && ($('[data-slot="Arcanes-2"]').textContent = arcLabel(STATE.arcanes[1]) || "Arcane 2");
    for (let i=1;i<=5;i++) {
      const s = STATE.shards[i-1];
      const elx = $(`[data-slot="archon-${i}"]`);
      elx && (elx.textContent = s ? `${s.color} – ${s.upgrade}` : "Archon Shard");
    }
  }

  function arcLabel(arcId) {
    if (!arcId) return "";
    const a = DB.arcanes.find(x => x.id === arcId || x.uniqueName === arcId || x.name === arcId);
    return a ? (a.name || a.displayName || a.id) : String(arcId);
  }

  function renderModList() {
    const list = $("#modList");
    if (!list) return;
    const fltSort = $("#fltSort");
    list.innerHTML = "";

    let items = [...DB.mods];
    // tri client si demandé
    switch ((fltSort?.value || "name").toLowerCase()) {
      case "cost":
      case "drain":
        items.sort((a,b) => (modDrain(a) - modDrain(b)));
        break;
      case "rarity":
        const order = { COMMON:1, UNCOMMON:2, RARE:3, LEGENDARY:4 };
        items.sort((a,b) => (order[(a.rarity||"").toUpperCase()]||99) - (order[(b.rarity||"").toUpperCase()]||99));
        break;
      default:
        items.sort((a,b) => String(a.name||a.displayName||a.id).localeCompare(String(b.name||b.displayName||b.id)));
    }

    if (!items.length) {
      list.append(el("div", {}, "Aucun mod trouvé (vérifie les filtres / CORS / API)."));
      return;
    }

    for (const m of items.slice(0, 200)) {
      const card = el("div", { class: "mod-card" },
        el("div", { class: "mod-art" }, m.imageUrl ? el("img", { src: m.imageUrl, alt: "" }) : ""),
        el("div", { class: "mod-meta" },
          el("div", { class: "mod-name" }, m.name || m.displayName || m.id),
          el("div", { class: "mod-tags" },
            el("span", { class: "tag" }, (m.rarity || "").toString()),
            m.polarity ? el("span", { class: "tag" }, m.polarity) : "",
            el("span", { class: "tag" }, `Drain ${modDrain(m)}`)
          )
        ),
        el("div", {}, el("button", { class: "btn", onclick: () => { addModToFirstFree(m); } }, "Add"))
      );
      list.append(card);
    }
  }

  function addModToFirstFree(mod) {
    // place le mod dans le premier slot libre 1..6 (démo rapide)
    const idx = STATE.slots.findIndex(s => !s.mod);
    if (idx >= 0) {
      STATE.slots[idx].mod = mod;
    } else {
      if (!STATE.exilus?.mod) STATE.exilus = { mod, polarity: null };
      else STATE.aura = { mod, polarity: null };
    }
    saveDraft();
    updateStats();
    renderSlotsPreview();
  }

  function getSelectedWF() {
    if (!STATE.warframeId) return null;
    const id = STATE.warframeId;
    return DB.warframes.find(w => w.uniqueName === id || w.id === id || w.name === id || w.type === id || w.displayName === id || w.warframe === id) || null;
  }

  // ----------------------------
  // Slot pickers (minimal, sans CSS inline)
  // ----------------------------
  function bindSlotPickers() {
    // Aura / Exilus
    const auraEl   = $('[data-slot="aura"]');
    const exilusEl = $('[data-slot="exilus"]');
    auraEl && auraEl.addEventListener("click", () => openModPicker({ kind:"aura" }));
    exilusEl && exilusEl.addEventListener("click", () => openModPicker({ kind:"exilus" }));

    // 6 slots
    for (let i=1;i<=6;i++) {
      const slot = $(`[data-slot="${i}"]`);
      slot && slot.addEventListener("click", () => openModPicker({ kind:"normal", index:i-1 }));
    }

    // Arcanes
    const arc1 = $('[data-slot="Arcanes-1"]');
    const arc2 = $('[data-slot="Arcanes-2"]');
    arc1 && arc1.addEventListener("click", () => openArcanePicker(0));
    arc2 && arc2.addEventListener("click", () => openArcanePicker(1));

    // Shards
    for (let i=1;i<=5;i++) {
      const s = $(`[data-slot="archon-${i}"]`);
      s && s.addEventListener("click", () => openShardPicker(i-1));
    }
  }

  function openModPicker({ kind, index }) {
    const wrap = overlay("Choisir un Mod");
    const search = el("input", { placeholder:"Rechercher…" });
    const polSel = el("select", {},
      el("option", { value: "" }, "Toutes polarités"),
      el("option", { value: "madurai" }, "Madurai"),
      el("option", { value: "naramon" }, "Naramon"),
      el("option", { value: "vazarin" }, "Vazarin"),
      el("option", { value: "zenurik" }, "Zenurik"),
      el("option", { value: "umbra" }, "Umbra"),
      el("option", { value: "aura" }, "Aura"),
      el("option", { value: "exilus" }, "Exilus"),
    );
    const list = el("div");

    const applyFilter = () => {
      list.innerHTML = "";
      let items = DB.mods.filter(m => {
        const name = (m.name || m.displayName || m.id || "").toLowerCase();
        if (search.value && !name.includes(search.value.toLowerCase())) return false;
        if (kind === "aura"   && String(m.polarity||"").toLowerCase() !== "aura") return false;
        if (kind === "exilus" && String(m.polarity||"").toLowerCase() !== "exilus") return false;
        return true;
      });
      if (!items.length) list.append(el("div", {}, "Aucun résultat."));
      items.slice(0, 200).forEach(m => {
        const row = el("div", {},
          el("span", {}, m.name || m.displayName || m.id),
          el("button", { onclick: () => {
            if (kind === "aura") STATE.aura = { mod:m, polarity: STATE.aura?.polarity || null };
            else if (kind === "exilus") STATE.exilus = { mod:m, polarity: STATE.exilus?.polarity || null };
            else STATE.slots[index] = { ...(STATE.slots[index]||{}), mod:m };
            saveDraft(); updateStats(); renderSlotsPreview();
            document.body.removeChild(wrap);
          }}, "Sélectionner")
        );
        list.append(row);
      });
    };
    search.addEventListener("input", debounce(applyFilter, 150));
    polSel.addEventListener("change", () => {
      fetchAndRenderMods({
        search: search.value || undefined,
        polarity: polSel.value || undefined
      }).then(applyFilter);
    });

    wrap.querySelector(".body").append(
      el("div", {}, search, polSel),
      list,
      el("div", {}, el("button", { onclick: () => document.body.removeChild(wrap) }, "Fermer"))
    );
    applyFilter();
  }

  function openArcanePicker(slotIndex) {
    const wrap = overlay(`Choisir un Arcane (${slotIndex+1})`);
    const search = el("input", { placeholder:"Rechercher…" });
    const list = el("div");

    const applyFilter = () => {
      list.innerHTML = "";
      const items = DB.arcanes.filter(a => (a.name||"").toLowerCase().includes(search.value.toLowerCase()));
      if (!items.length) list.append(el("div", {}, "Aucun résultat."));
      items.slice(0, 200).forEach(a => {
        const row = el("div", {},
          el("span", {}, a.name || a.displayName || a.id),
          el("button", { onclick: () => {
            STATE.arcanes[slotIndex] = a.id || a.uniqueName || a.name;
            saveDraft(); renderSlotsPreview();
            document.body.removeChild(wrap);
          }}, "Sélectionner")
        );
        list.append(row);
      });
    };
    search.addEventListener("input", debounce(applyFilter, 150));

    wrap.querySelector(".body").append(
      search, list,
      el("div", {}, el("button", { onclick: () => document.body.removeChild(wrap) }, "Fermer"))
    );
    applyFilter();
  }

  function openShardPicker(idx) {
    const wrap = overlay(`Configurer Archon Shard #${idx+1}`);
    const colorSel = el("select", {},
      el("option", { value:"" }, "— Couleur —"),
      ...Object.keys(DB.shards||{}).map(c => el("option", { value:c }, c))
    );
    const upgradeSel = el("select", { disabled:"" }, el("option", { value:"" }, "— Amélioration —"));

    colorSel.addEventListener("change", () => {
      upgradeSel.innerHTML = "";
      upgradeSel.append(el("option", { value:"" }, "— Amélioration —"));
      const c = DB.shards[colorSel.value];
      if (c && Array.isArray(c.upgrades)) {
        upgradeSel.removeAttribute("disabled");
        c.upgrades.forEach(u => upgradeSel.append(el("option", { value:u }, u)));
      } else upgradeSel.setAttribute("disabled","");
    });

    const actions = el("div", {},
      el("button", { onclick: () => {
        if (!colorSel.value || !upgradeSel.value) return;
        STATE.shards[idx] = { color: colorSel.value, upgrade: upgradeSel.value };
        saveDraft(); renderSlotsPreview(); document.body.removeChild(wrap);
      }}, "Appliquer"),
      el("button", { onclick: () => {
        STATE.shards[idx] = null; saveDraft(); renderSlotsPreview(); document.body.removeChild(wrap);
      }}, "Retirer"),
      el("button", { onclick: () => document.body.removeChild(wrap) }, "Fermer"),
    );

    wrap.querySelector(".body").append(colorSel, upgradeSel, actions);
  }

  function overlay(title="") {
    // simple structure sans styles inline (à styler dans ton CSS si tu veux)
    const scrim = el("div", { class:"overlay-scrim" });
    const box   = el("div", { class:"overlay-box" });
    const head  = el("div", { class:"head" }, title);
    const body  = el("div", { class:"body" });
    box.append(head, body);
    scrim.append(box);
    scrim.addEventListener("click", (e) => { if (e.target === scrim) document.body.removeChild(scrim); });
    document.body.appendChild(scrim);
    return scrim;
  }

  // ----------------------------
  // Boot
  // ----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    loadData().catch(err => console.error(err));
  });

})();
