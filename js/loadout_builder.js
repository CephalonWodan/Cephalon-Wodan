/* 
  Loadout Builder – bind to existing DOM (no inline CSS, no #app rendering)
  - Se branche sur les IDs de ton HTML existant:
    wfPicker, wfImg, wfTitle, wfSubtitle,
    rankToggle, rankSlider, rankVal, reactor,
    statsList, polList,
    globalSearch, resetBuild, saveBuild,
    fltPol, fltType, fltRarity, fltGame, fltSort,
    modList,
    slots (data-slot="aura|exilus|1..6", archon-1..5, Arcanes-1..2).
  - Consomme ton API Railway.
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
    if (!res.ok) throw new Error(`Failed ${url}`);
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
  // Capacity rules (no CSS)
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
      getJSON(API.warframes),
      getJSON(API.arcanes),
      getJSON(API.shards),
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
    const url = new URL(API.mods, location.origin);
    url.searchParams.set("type", "WARFRAME");
    url.searchParams.set("compat", "WARFRAME");
    if (extra.polarity) url.searchParams.set("polarity", String(extra.polarity));
    if (extra.rarity)   url.searchParams.set("rarity", String(extra.rarity));
    if (extra.search)   url.searchParams.set("search", String(extra.search));
    if (extra.pvp)      url.searchParams.set("pvp", String(extra.pvp));
    url.searchParams.set("limit", "2000");

    const list = await getJSON(url.toString());
    DB.mods = Array.isArray(list) ? list : (list?.items || []);
    renderModList();
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
    const fltType      = $("#fltType");
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
      // si tu veux filtrer les augments par frame, tu peux relancer:
      // fetchAndRenderMods();
    });

    rankToggle?.addEventListener("change", () => {
      // R0/R30: on synchronise avec le slider pour que l’UI reste cohérente
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
        sort: fltSort?.value || undefined, // à trier côté client ci-dessous
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
      // simple export local
      const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "loadout.json"; a.click();
      URL.revokeObjectURL(url);
    });

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
    // si tu as un mapping d’images dans ton CSS/thème, laisse vide ou mets ton URL logique:
    wfImg && (wfImg.src = "");
  }

  function updateStats() {
    const statsList = $("#statsList");
    if (!statsList) return;
    const wf = getSelectedWF();
    statsList.innerHTML = "";

    const { cap, auraBonus, used, remain } = capacitySummary();
    const capRow = (k, v) => el("div", { class: "stat" }, el("span", { class: "k" }, k), el("span", { class: "v" }, String(v)));

    statsList.append(
      capRow("Capacity", cap),
      capRow("Aura bonus", `+${auraBonus}`),
      capRow("Used", used),
      capRow("Remain", remain)
    );

    // Polarity preview (si tu veux refléter la frame)
    const polList = $("#polList");
    if (polList) {
      polList.innerHTML = "";
      const polys = wf?.polarities || [];
      polys.forEach(p => polList.append(el("span", {}, String(p))));
    }
  }

  function renderSlotsPreview() {
    // Branchement basique sur les slots affichés (sans UI avancée ici)
    // Tu peux ajouter des gestionnaires de clic pour ouvrir un picker si tu veux
    const auraEl   = $('[data-slot="aura"]');
    const exilusEl = $('[data-slot="exilus"]');
    auraEl && (auraEl.textContent   = STATE.aura?.mod?.name || "Aura");
    exilusEl && (exilusEl.textContent = STATE.exilus?.mod?.name || "Exilus");
    for (let i = 0; i < 6; i++) {
      const slot = $(`[data-slot="${i+1}"]`);
      slot && (slot.textContent = STATE.slots[i]?.mod?.name || String(i+1));
    }
    // Arcanes, Shards rapides
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

    // rendu "cartes" simple (utilise tes classes CSS existantes .mod-card, etc.)
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
    // place le mod dans le premier slot libre 1..6 (démo)
    const idx = STATE.slots.findIndex(s => !s.mod);
    if (idx >= 0) {
      STATE.slots[idx].mod = mod;
    } else {
      // sinon en exilus si vide
      if (!STATE.exilus?.mod) STATE.exilus = { mod, polarity: null };
      else STATE.aura = { mod, polarity: null }; // fallback
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
  // Boot
  // ----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    // on ne crée rien: on se branche sur le HTML existant
    loadData().catch(err => {
      console.error(err);
      // laisse la page s’afficher quand même
    });
  });

})();
