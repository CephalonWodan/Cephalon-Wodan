/* 
  Loadout Builder – v3
  - Respecte VRAIMENT les filtres UI : TYPE/Polarity/Rarity/GameMode/Sort (plus de filtre WARFRAME implicite)
  - Normalisation + dédoublonnage des mods (inspiré de mods_catalog.js)
  - Modale "Details", pickers Mods/Aura/Exilus, Arcanes, Shards
  - Fallback API tolérant + persistance (URL + localStorage)
  - Aucun CSS inline (tout dans /css)
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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const up = (x) => String(x || "").toUpperCase();
  const low = (x) => String(x || "").toLowerCase();
  const truthy = (v) => v !== undefined && v !== null && v !== "";

  const b64urlEncode = (obj) => {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replaceAll("=","").replaceAll("+","-").replaceAll("/","_"); }
    catch { return ""; }
  };
  const b64urlDecode = (s) => {
    try { return JSON.parse(decodeURIComponent(escape(atob(s.replaceAll("-","+").replaceAll("_","/"))))); }
    catch { return null; }
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
    arcanes: [null, null],
    shards: [null, null, null, null, null], // {color, upgrade}
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const STATE = loadFromURL() || JSON.parse(localStorage.getItem("wf-loadout-draft") || "null") || initial();
  const DB = { warframes: [], mods: [], arcanes: [], shards: {}, modsIndex: new Map(), debug: {} };

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
  // Capacity / stats
  // ----------------------------
  function frameCapacity(rank, reactor) {
    const base = clamp(Number(rank)||0,0,60);
    return reactor ? base * 2 : base;
  }
  function modDrain(mod, level = 0) {
    const base = Number(mod?.drain ?? mod?.baseDrain ?? mod?.cost ?? 0);
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
  const getStat = (obj, keys, fallback=0) => {
    for (const k of keys) if (obj && obj[k] != null && isFinite(Number(obj[k]))) return Number(obj[k]);
    return fallback;
  };

  // ----------------------------
  // Normalisation (mods / arcanes / shards)
  // ----------------------------
  function cryptoRandom() {
    try { return crypto.getRandomValues(new Uint32Array(2)).join("-"); }
    catch { return "rnd-" + Math.random().toString(36).slice(2); }
  }
  function modQuality(m) {
    let q = 0;
    if (truthy(m.imageUrl) || truthy(m.img) || truthy(m.icon)) q += 2;
    if (truthy(m.description) || truthy(m.Details)) q += 1;
    if (up(m.source || m.Source).includes("CEPHALON WODAN")) q += 1;
    if (truthy(m.rarity)) q += 0.5;
    return q;
  }
  function keyForMod(m) {
    return (m.uniqueName || m.id || m.slug || up(m.name || m.displayName || "")).trim();
  }
  function normalizeMod(m) {
    const id   = m.id || m.uniqueName || m.slug || m.InternalName || m.Name || (m.name ? up(m.name) : null) || cryptoRandom();
    const name = m.name || m.displayName || m.Name || m.title || id;
    const img  = m.imageUrl || m.icon || m.img || m.ImageUrl || null;
    const pol  = low(m.polarity || m.Polarity || "");
    const rarity = up(m.rarity || m.Rarity || "");
    const compat = m.CompatName || m.compat || m.compatibility || m.Category || m.category || m.ModType || null;
    const set    = m.set || m.Set || null;
    const isPvp  = !!(m.pvp || m.PvpOnly);
    const desc   = m.description || m.Details || "";
    const type   = up(m.type || m.Type || "");
    return { ...m, id, name, displayName: name, imageUrl: img, polarity: pol, rarity, compat, set, pvp: isPvp, description: desc, type };
  }
  function mergeDuplicates(list) {
    const map = new Map();
    for (const raw of list) {
      const m = normalizeMod(raw);
      const k = keyForMod(m);
      if (!map.has(k)) { map.set(k, m); continue; }
      const a = map.get(k);
      const better = modQuality(m) > modQuality(a) ? m : a;
      map.set(k, {
        ...a,
        ...better,
        imageUrl: better.imageUrl || a.imageUrl,
        description: better.description || a.description,
        rarity: better.rarity || a.rarity,
        polarity: better.polarity || a.polarity,
        set: better.set || a.set,
        compat: better.compat || a.compat,
      });
    }
    return Array.from(map.values());
  }
  function computeCategories(m) {
    const cats = [];
    const pol = up(m.polarity);
    if (pol === "AURA") cats.push("AURA");
    if (pol === "EXILUS") cats.push("EXILUS");
    if (/augment/i.test(m.name || m.displayName || "")) cats.push("AUGMENT");
    if (up(m.set) === "SET" || /set/i.test(m.set || "")) cats.push("SET");
    return cats;
  }
  // Arcanes
  function normalizeArc(a) {
    const id = a.id || a.uniqueName || a.InternalName || a.Name;
    const uniqueName = a.uniqueName || a.InternalName || id;
    const name = a.name || a.displayName || a.Name || id;
    const rarity = up(a.rarity || a.Rarity || "");
    const type = up(a.type || a.Type || a.category || "");
    return { ...a, id, uniqueName, name, displayName: name, rarity, type };
  }
  // Shards
  function normalizeShards(obj) {
    const out = {};
    if (!obj || typeof obj !== "object") return out;
    Object.values(obj).forEach(entry => {
      const color = entry.value || entry.color;
      const uo = entry.upgradeTypes || {};
      const upgrades = [];
      for (const k in uo) {
        const u = uo[k];
        if (u && typeof u.value === "string") upgrades.push(u.value);
      }
      if (color) out[color] = { upgrades };
    });
    return out;
  }

  // ----------------------------
  // Chargement
  // ----------------------------
  async function loadData() {
    const [wfs, arcs, shards] = await Promise.all([
      getJSON(API.warframes).catch(e => (console.error(e), [])),
      getJSON(API.arcanes).catch(e => (console.error(e), [])),
      getJSON(API.shards).catch(e => (console.error(e), {})),
    ]);

    DB.warframes = Array.isArray(wfs) ? wfs : [];
    DB.arcanes = (Array.isArray(arcs) ? arcs : []).map(normalizeArc);
    DB.shards = normalizeShards(shards);

    await fetchAndPrepareMods(); // <- plus de filtre implicite ici
    hydrateUI();
  }

  // ----------------------------
  // Mods : fetch + normalisation + dédoublonnage
  // ----------------------------
  async function fetchAndPrepareMods(extra = {}) {
    const applyClientPipeline = (arr) => {
      let items = Array.isArray(arr) ? arr : [];
      const received = items.length;
      items = items.map(normalizeMod);
      items = mergeDuplicates(items);
      items.forEach(m => m._categories = computeCategories(m));

      // Filtres UI (lues à la volée pour éviter les décalages d'état)
      const fltPol    = $("#fltPol")?.value || "";
      const fltRarity = $("#fltRarity")?.value || "";
      const fltGame   = $("#fltGame")?.value || ""; // "pvp" sinon ""
      const fltType   = $("#fltType")?.value || ""; // "", "WARFRAME", "AURA", "EXILUS", "SET"
      const q         = ($("#globalSearch")?.value || "").trim().toLowerCase();

      // TYPE
      if (fltType) {
        items = items.filter(m => {
          if (fltType === "AURA")   return up(m.polarity) === "AURA";
          if (fltType === "EXILUS") return up(m.polarity) === "EXILUS";
          if (fltType === "SET")    return (m._categories||[]).includes("SET");
          if (fltType === "WARFRAME") {
            // heuristique WARFRAME (tolérante)
            const W = "WARFRAME";
            const hasArr = (arr) => Array.isArray(arr) && arr.some(x => up(x).includes(W));
            if (up(m.CompatName) === W) return true;
            if (up(m.compat) === W) return true;
            if (up(m.compatibility) === W) return true;
            if (up(m.type) === W) return true;
            if (up(m.category) === W) return true;
            if (up(m.ModType) === W) return true;
            if (hasArr(m.CompatNames) || hasArr(m.compatNames) || hasArr(m.tags) || hasArr(m.Categories)) return true;
            if (up(m.polarity) === "AURA" || up(m.polarity) === "EXILUS") return true;
            return false;
          }
          return true;
        });
      }

      // POLARITY
      if (fltPol) items = items.filter(m => low(m.polarity) === low(fltPol));

      // RARITY
      if (fltRarity) items = items.filter(m => up(m.rarity) === up(fltRarity));

      // GAME MODE
      if (fltGame === "pvp") items = items.filter(m => (m.hasOwnProperty("pvp") ? !!m.pvp : false));

      // SEARCH
      if (q) items = items.filter(m => low(m.name).includes(q) || low(m.description||"").includes(q) || low(m.set||"").includes(q));

      // tri
      const fltSort = $("#fltSort")?.value || "name";
      switch (low(fltSort)) {
        case "cost":
        case "drain":
          items.sort((a,b) => (modDrain(a) - modDrain(b)));
          break;
        case "rarity": {
          const order = { COMMON:1, UNCOMMON:2, RARE:3, LEGENDARY:4 };
          items.sort((a,b) => (order[a.rarity]||99) - (order[b.rarity]||99) || String(a.name).localeCompare(String(b.name)));
          break;
        }
        default:
          items.sort((a,b) => String(a.name||a.displayName||a.id).localeCompare(String(b.name||b.displayName||b.id)));
      }

      DB.debug = { received, afterNormalize: items.length };
      return items;
    };

    // 1) essai filtré serveur (si jamais tu veux remettre des params plus tard)
    try {
      const u = new URL(API.mods);
      if (extra.polarity) u.searchParams.set("polarity", String(extra.polarity));
      if (extra.rarity)   u.searchParams.set("rarity", String(extra.rarity));
      if (extra.search)   u.searchParams.set("search", String(extra.search));
      if (extra.pvp)      u.searchParams.set("pvp", String(extra.pvp));
      u.searchParams.set("limit", "2000");

      const serverList = await getJSON(u.toString());
      let items = Array.isArray(serverList) ? serverList : (Array.isArray(serverList?.items) ? serverList.items : []);
      items = applyClientPipeline(items);

      if (items.length > 0) {
        DB.mods = items; indexMods(); renderModList(); return;
      } else {
        console.warn("[mods] serveur (avec params) vide ou filtré → fallback /mods brut");
      }
    } catch (e) {
      console.error("[mods] fetch filtré erreur:", e);
    }

    // 2) fallback /mods brut
    try {
      const raw = await getJSON(API.mods);
      const full = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
      DB.mods = applyClientPipeline(full);
    } catch (e2) {
      console.error("[mods] fallback /mods error:", e2);
      DB.mods = [];
    }

    indexMods();
    renderModList();
  }

  function indexMods() {
    DB.modsIndex = new Map();
    DB.mods.forEach(m => DB.modsIndex.set(m.id, m));
  }

  // ----------------------------
  // UI
  // ----------------------------
  function hydrateUI() {
    const wfPicker     = $("#wfPicker");
    const rankToggle   = $("#rankToggle");
    const rankSlider   = $("#rankSlider");
    const rankVal      = $("#rankVal");
    const reactor      = $("#reactor");
    const globalSearch = $("#globalSearch");
    const resetBuild   = $("#resetBuild");
    const saveBuild    = $("#saveBuild");
    const fltPol       = $("#fltPol");
    const fltType      = $("#fltType");
    const fltRarity    = $("#fltRarity");
    const fltGame      = $("#fltGame");
    const fltSort      = $("#fltSort");

    // Warframes
    wfPicker.innerHTML = "";
    wfPicker.appendChild(el("option", { value: "" }, "— Warframe —"));
    for (const wf of DB.warframes) {
      const name = wf.name || wf.type || wf.displayName || wf.warframe || wf.uniqueName;
      const val  = wf.uniqueName || wf.id || name;
      wfPicker.appendChild(el("option", { value: val }, name));
    }
    wfPicker.value = STATE.warframeId || "";
    wfPicker.addEventListener("change", () => { STATE.warframeId = wfPicker.value || null; updateHeaderPreview(); updateStats(); saveDraft(); });

    rankToggle?.addEventListener("change", () => { STATE.rank = rankToggle.checked ? 30 : 0; if (rankSlider) rankSlider.value = String(STATE.rank); if (rankVal) rankVal.textContent = String(STATE.rank); updateStats(); saveDraft(); });
    rankSlider?.addEventListener("input", () => { STATE.rank = Number(rankSlider.value) || 0; if (rankVal) rankVal.textContent = String(STATE.rank); if (rankToggle) rankToggle.checked = STATE.rank >= 30; updateStats(); saveDraft(); });
    reactor?.addEventListener("change", () => { STATE.reactor = !!reactor.checked; updateStats(); saveDraft(); });

    const refetch = debounce(() => fetchAndPrepareMods(), 150);
    globalSearch?.addEventListener("input", refetch);
    [fltPol, fltType, fltRarity, fltGame, fltSort].forEach(sel => sel?.addEventListener("change", refetch));

    resetBuild?.addEventListener("click", () => {
      const keepWF = STATE.warframeId;
      Object.assign(STATE, initial(), { warframeId: keepWF });
      if (rankSlider) rankSlider.value = String(STATE.rank);
      if (rankVal) rankVal.textContent = String(STATE.rank);
      if (rankToggle) rankToggle.checked = true;
      reactor && (reactor.checked = true);
      updateStats(); saveDraft(); renderSlotsPreview();
    });

    saveBuild?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "loadout.json"; a.click();
      URL.revokeObjectURL(url);
    });

    bindSlotPickers();
    updateHeaderPreview();
    updateStats();
    renderSlotsPreview();
    renderModList();
  }

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
    wfImg && (wfImg.src = "");
  }

  function updateStats() {
    const statsList = $("#statsList");
    if (!statsList) return;
    const wf = getSelectedWF();
    statsList.innerHTML = "";
    const { cap, auraBonus, used, remain } = capacitySummary();
    const row = (k, v) => el("div", { class: "stat" }, el("span", { class: "k" }, k), el("span", { class: "v" }, String(v)));

    if (!wf) {
      statsList.append(row("Capacity", cap), row("Aura bonus", `+${auraBonus}`), row("Used", used), row("Remain", remain));
      return;
    }

    const isR30 = STATE.rank >= 30;
    const base   = wf.baseStats || wf.stats || wf;
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

    const items = [...DB.mods];
    if (!items.length) {
      const d = DB.debug || {};
      list.append(
        el("div", { class:"muted" }, "Aucun mod trouvé (vérifie les filtres / API)."),
        el("div", { class:"muted small" }, `Debug: reçus=${d.received ?? "?"}, après pipeline=${d.afterNormalize ?? "?"}`)
      );
      return;
    }

    for (const m of items.slice(0, 300)) {
      const tagWrap = el("div", { class: "mod-tags" });
      (m._categories||[]).forEach(c => tagWrap.append(el("span", { class:"tag" }, c)));
      if (m.rarity) tagWrap.append(el("span", { class:"tag" }, m.rarity));
      if (m.polarity) tagWrap.append(el("span", { class:"tag" }, m.polarity));

      const card = el("div", { class: "mod-card", "data-id": m.id },
        el("div", { class: "mod-art" }, m.imageUrl ? el("img", { src: m.imageUrl, alt: "" }) : ""),
        el("div", { class: "mod-meta" },
          el("div", { class: "mod-name" }, m.name || m.displayName || m.id),
          tagWrap
        ),
        el("div", { class:"mod-actions" },
          el("button", { class:"btn", onclick: () => addModToFirstFree(m) }, "Add"),
          el("button", { class:"btn ghost", onclick: () => openModDetails(m) }, "Details")
        ),
      );
      list.append(card);
    }
  }

  // ----------------------------
  // Modale "Details"
  // ----------------------------
  function openModDetails(m) {
    const wrap = overlay(m.name || m.displayName || "Mod");
    const body = wrap.querySelector(".body");
    const header = el("div", { class:"mod-detail-head" },
      m.imageUrl ? el("img", { src: m.imageUrl, alt: "" }) : el("div", { class:"placeholder" }, ""),
      el("div", { class:"col" },
        el("div", { class:"title" }, m.name || m.displayName || m.id),
        el("div", { class:"subtitle" }, [
          up(m.rarity)||"", " · ", m.polarity||"", (m.set? " · Set":"")
        ].join(" ").replace(/\s·\s$/,""))
      )
    );
    const desc = el("div", { class:"mod-detail-desc" }, m.description || "—");
    const meta = el("div", { class:"mod-detail-meta" },
      el("div", {}, `Drain: ${modDrain(m)}`),
      el("div", {}, `Compat: ${m.compat || "—"}`),
      el("div", {}, `Catégories: ${(m._categories||[]).join(", ")||"—"}`),
    );
    const actions = el("div", { class:"mod-detail-actions" },
      el("button", { class:"btn", onclick: () => { addModToFirstFree(m); document.body.removeChild(wrap);} }, "Ajouter au build"),
      el("button", { class:"btn ghost", onclick: () => document.body.removeChild(wrap) }, "Fermer"),
    );
    body.append(header, desc, meta, actions);
  }

  function overlay(title="") {
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
  // Affectations
  // ----------------------------
  function addModToFirstFree(mod) {
    const idx = STATE.slots.findIndex(s => !s.mod);
    if (idx >= 0) STATE.slots[idx].mod = mod;
    else if (!STATE.exilus?.mod) STATE.exilus = { mod, polarity: null };
    else STATE.aura = { mod, polarity: null };
    saveDraft(); updateStats(); renderSlotsPreview();
  }

  function getSelectedWF() {
    if (!STATE.warframeId) return null;
    const id = STATE.warframeId;
    return DB.warframes.find(w => w.uniqueName === id || w.id === id || w.name === id || w.type === id || w.displayName === id || w.warframe === id) || null;
  }

  function bindSlotPickers() {
    const auraEl   = $('[data-slot="aura"]');
    const exilusEl = $('[data-slot="exilus"]');
    auraEl && auraEl.addEventListener("click", () => openModPicker({ kind:"aura" }));
    exilusEl && exilusEl.addEventListener("click", () => openModPicker({ kind:"exilus" }));
    for (let i=1;i<=6;i++) {
      const slot = $(`[data-slot="${i}"]`);
      slot && slot.addEventListener("click", () => openModPicker({ kind:"normal", index:i-1 }));
    }
    const arc1 = $('[data-slot="Arcanes-1"]');
    const arc2 = $('[data-slot="Arcanes-2"]');
    arc1 && arc1.addEventListener("click", () => openArcanePicker(0));
    arc2 && arc2.addEventListener("click", () => openArcanePicker(1));
    for (let i=1;i<=5;i++) {
      const s = $(`[data-slot="archon-${i}"]`);
      s && s.addEventListener("click", () => openShardPicker(i-1));
    }
  }

  function openModPicker({ kind, index }) {
    const wrap = overlay("Choisir un Mod");
    const body = wrap.querySelector(".body");
    const search = el("input", { placeholder:"Rechercher…", class:"picker-search" });
    const polSel = el("select", { class:"picker-select" },
      el("option", { value: "" }, "Toutes polarités"),
      el("option", { value: "madurai" }, "Madurai"),
      el("option", { value: "naramon" }, "Naramon"),
      el("option", { value: "vazarin" }, "Vazarin"),
      el("option", { value: "zenurik" }, "Zenurik"),
      el("option", { value: "umbra" }, "Umbra"),
      el("option", { value: "aura" }, "Aura"),
      el("option", { value: "exilus" }, "Exilus"),
    );
    const list = el("div", { class:"picker-list" });

    const applyFilter = () => {
      list.innerHTML = "";
      let items = DB.mods.filter(m => {
        const name = low(m.name || m.displayName || m.id || "");
        if (search.value && !name.includes(low(search.value))) return false;
        if (kind === "aura"   && up(m.polarity) !== "AURA") return false;
        if (kind === "exilus" && up(m.polarity) !== "EXILUS") return false;
        if (polSel.value && low(m.polarity) !== low(polSel.value)) return false;
        return true;
      });
      if (!items.length) list.append(el("div", { class:"muted" }, "Aucun résultat."));
      items.slice(0, 250).forEach(m => {
        const row = el("div", { class:"picker-row" },
          el("span", { class:"picker-name" }, m.name || m.displayName || m.id),
          el("div", { class:"picker-actions" },
            el("button", { class:"btn ghost", onclick: () => openModDetails(m) }, "Détails"),
            el("button", { class:"btn", onclick: () => {
              if (kind === "aura") STATE.aura = { mod:m, polarity: STATE.aura?.polarity || null };
              else if (kind === "exilus") STATE.exilus = { mod:m, polarity: STATE.exilus?.polarity || null };
              else STATE.slots[index] = { ...(STATE.slots[index]||{}), mod:m };
              saveDraft(); updateStats(); renderSlotsPreview(); document.body.removeChild(wrap);
            } }, "Sélectionner")
          )
        );
        list.append(row);
      });
    };
    search.addEventListener("input", debounce(applyFilter, 150));
    polSel.addEventListener("change", applyFilter);

    body.append(el("div", { class:"picker-bar" }, search, polSel), list, el("div", { class:"picker-actions" }, el("button", { class:"btn ghost", onclick: () => document.body.removeChild(wrap) }, "Fermer")));
    applyFilter();
  }

  function openArcanePicker(slotIndex) {
    const wrap = overlay(`Choisir un Arcane (${slotIndex+1})`);
    const body = wrap.querySelector(".body");
    const search = el("input", { placeholder:"Rechercher…", class:"picker-search" });
    const list = el("div", { class:"picker-list" });

    const applyFilter = () => {
      list.innerHTML = "";
      const items = DB.arcanes.filter(a => low(a.name||"").includes(low(search.value)));
      if (!items.length) list.append(el("div", { class:"muted" }, "Aucun résultat."));
      items.slice(0, 200).forEach(a => {
        const row = el("div", { class:"picker-row" },
          el("span", { class:"picker-name" }, a.name || a.displayName || a.id),
          el("button", { class:"btn", onclick: () => {
            STATE.arcanes[slotIndex] = a.id || a.uniqueName || a.name;
            saveDraft(); renderSlotsPreview(); document.body.removeChild(wrap);
          }}, "Sélectionner")
        );
        list.append(row);
      });
    };
    search.addEventListener("input", debounce(applyFilter, 150));
    body.append(search, list, el("div", { class:"picker-actions" }, el("button", { class:"btn ghost", onclick: () => document.body.removeChild(wrap) }, "Fermer")));
    applyFilter();
  }

  function openShardPicker(idx) {
    const wrap = overlay(`Configurer Archon Shard #${idx+1}`);
    const body = wrap.querySelector(".body");
    const colorSel = el("select", { class:"picker-select" },
      el("option", { value:"" }, "— Couleur —"),
      ...Object.keys(DB.shards||{}).map(c => el("option", { value:c }, c))
    );
    const upgradeSel = el("select", { class:"picker-select", disabled:"" }, el("option", { value:"" }, "— Amélioration —"));

    colorSel.addEventListener("change", () => {
      upgradeSel.innerHTML = "";
      upgradeSel.append(el("option", { value:"" }, "— Amélioration —"));
      const c = DB.shards[colorSel.value];
      if (c && Array.isArray(c.upgrades)) {
        upgradeSel.removeAttribute("disabled");
        c.upgrades.forEach(u => upgradeSel.append(el("option", { value:u }, u)));
      } else upgradeSel.setAttribute("disabled","");
    });

    const actions = el("div", { class:"picker-actions" },
      el("button", { class:"btn", onclick: () => {
        if (!colorSel.value || !upgradeSel.value) return;
        STATE.shards[idx] = { color: colorSel.value, upgrade: upgradeSel.value };
        saveDraft(); renderSlotsPreview(); document.body.removeChild(wrap);
      }}, "Appliquer"),
      el("button", { class:"btn ghost", onclick: () => { STATE.shards[idx] = null; saveDraft(); renderSlotsPreview(); document.body.removeChild(wrap); } }, "Retirer"),
      el("button", { class:"btn ghost", onclick: () => document.body.removeChild(wrap) }, "Fermer"),
    );

    body.append(el("div", { class:"picker-bar" }, colorSel, upgradeSel), actions);
  }

  // ----------------------------
  // Boot
  // ----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    loadData().catch(err => console.error(err));
  });

})();
