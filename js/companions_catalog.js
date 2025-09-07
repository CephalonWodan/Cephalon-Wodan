// js/companions_catalog.js
// Page "Companions" avec onglets Companions / MOA / Hound
(() => {
  "use strict";

  /* ===================== Config ===================== */
  const EXPORT_SENTINELS_URL = "data/ExportSentinels_en.json"; // Public Export (officiel)
  const EXPORT_WEAPONS_URL   = "data/ExportWeapons_en.json";   // Pour pièces MOA & Hound
  const FALLBACK_LUA_URL     = "data/companions.json";         // Ancien JSON (wiki/LUA)

  // ordre de priorité demandé : Wiki (Special:FilePath) -> CDN -> Local
  // (on teste d'abord NomSansUnderscore.png pour limiter les 404)
  const IMG_SOURCES = (baseNoSpace, baseUnderscore) => ([
    `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(baseNoSpace + ".png")}`,
    `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(baseUnderscore + ".png")}`,
    `https://cdn.warframestat.us/img/${encodeURIComponent(baseNoSpace + ".png")}`,
    `https://cdn.warframestat.us/img/${encodeURIComponent(baseUnderscore + ".png")}`,
    `img/companions/${encodeURIComponent(baseNoSpace + ".png")}`,
    `img/companions/${encodeURIComponent(baseUnderscore + ".png")}`,
  ]);

  // Corrections manuelles pour quelques noms délicats
  const MANUAL_IMG = {
    "Venari": "Venari",
    "Venari Prime": "VenariPrime",
    "Helminth Charger": "HelminthCharger",
    "Nautilus": "Nautilus",
    "Nautilus Prime": "NautilusPrime",
  };

  /* ===================== Helpers ===================== */
  const $  = (s) => document.querySelector(s);
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const coalesce = (obj, keys, def=null) => { for (const k of keys) if (obj && obj[k] != null) return obj[k]; return def; };
  const fmtNum = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
  const pct = (v) => (v === null || v === undefined) ? "—" : `${Math.round(v*1000)/10}%`;
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const cleanLF = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const cleanDesc = (s) => escapeHtml(cleanLF(s)).replace(/\n/g, "<br>");

  function detectType(uniqueName) {
    const p = String(uniqueName || "");
    if (p.includes("/CatbrowPet/")) return "Kavat";
    if (p.includes("/KubrowPet/"))  return "Kubrow";
    if (p.includes("/CreaturePets/ArmoredInfestedCatbrow")) return "Vulpaphyla";
    if (p.includes("/CreaturePets/PharaohPredator") || p.includes("/CreaturePets/VizierPredator") || p.includes("/CreaturePets/MedjayPredator")) return "Predasite";
    if (p.includes("/SentinelPowersuits/")) return "Sentinel";
    return "Companion";
  }

  function buildImageCandidates(item){
    const name = (item.Name || item.name || "").trim();
    const manual = MANUAL_IMG[name]; // valeur sans extension si présente

    const baseUS = (manual || name).replace(/\s+/g, "_"); // “Sly Vulpaphyla” -> “Sly_Vulpaphyla”
    const baseNS = (manual || name).replace(/\s+/g, "");  // “Sly Vulpaphyla” -> “SlyVulpaphyla”
    const list = IMG_SOURCES(baseNS, baseUS);

    const placeholder = 'data:image/svg+xml;utf8,'+encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/>
        </linearGradient></defs>
        <rect width="600" height="360" fill="url(#g)"/>
        <rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/>
        <text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text>
      </svg>`
    );

    return { list, placeholder };
  }

  // Gestion fallback images (appelée via onerror)
  window.__cycleImg = function(el, placeholder){
    const list = (el.getAttribute("data-srcs") || "").split("|").filter(Boolean);
    let i = parseInt(el.getAttribute("data-i") || "0", 10) + 1;
    if (i < list.length) {
      el.setAttribute("data-i", String(i));
      el.src = list[i];
    } else {
      el.onerror = null;
      el.src = placeholder;
    }
  };

  /* ===================== Normalisation DATA ===================== */
  function normalizeFromExport(raw){
    const arr = Array.isArray(raw?.ExportSentinels) ? raw.ExportSentinels.slice() : [];
    return arr
      .map(x => {
        const name = x.name || "";
        const type = detectType(x.uniqueName);
        const category = (x.productCategory === "Sentinels") ? "Sentinels" : "Pets";
        return {
          Name: name,
          Type: type,
          Category: category,
          Description: x.description || "",
          Armor:  x.armor ?? 0,
          Health: x.health ?? 0,
          Shield: x.shield ?? 0,
          Energy: x.power ?? 0,
          Attacks: null, // fusionné plus tard depuis le LUA si dispo
          _uniqueName: x.uniqueName || "",
        };
      })
      .sort(byName);
  }

  function normalizeFromLua(raw){
    let coll = raw && raw.Companions ? raw.Companions : raw;
    if (!coll) return [];
    let arr;
    if (Array.isArray(coll)) {
      arr = coll.slice();
    } else {
      arr = Object.entries(coll).map(([k,v]) => (v.Name ? v : { ...v, Name: v.Name || k }));
    }
    arr.sort(byName);
    return arr;
  }

  function mergeExportWithLua(exportList, luaList){
    const map = new Map();
    for (const it of luaList){
      const key = (it.Name || it.name || "").toLowerCase();
      if (!key) continue;
      map.set(key, it);
    }

    return exportList.map(base => {
      const key = (base.Name || "").toLowerCase();
      const lua = map.get(key);
      if (!lua) return base;

      // on injecte Attacks si trouvées
      const attacks = coalesce(lua, ["Attacks","attacks"], null);
      const merged = { ...base };
      if (Array.isArray(attacks) && attacks.length) {
        merged.Attacks = attacks;
      }

      // certains anciens JSON ont Type/Category plus explicites (optionnel)
      merged.Type = merged.Type || coalesce(lua, ["Type","type"], "");
      merged.Category = merged.Category || coalesce(lua, ["Category","category"], merged.Category);

      return merged;
    });
  }

  /* ===================== Attaques ===================== */
  function sumDamage(dmg){
    if (!dmg || typeof dmg !== "object") return null;
    let total = 0;
    for (const k in dmg) {
      const v = Number(dmg[k]); if (!isNaN(v)) total += v;
    }
    return total || null;
  }

  function attacksBlock(item){
    const atks = coalesce(item, ["Attacks","attacks"], null);
    if (!Array.isArray(atks) || !atks.length) return "";
    const lines = atks.map(a => {
      const name  = a.AttackName || a.name || "Attack";
      const dmgT  = sumDamage(a.Damage || a.damage);
      const critC = a.CritChance != null ? pct(a.CritChance) : null;
      const critM = a.CritMultiplier != null ? `×${a.CritMultiplier}` : null;
      const stat  = a.StatusChance != null ? pct(a.StatusChance) : null;

      const parts = [];
      if (dmgT != null) parts.push(`Dégâts ${dmgT}`);
      if (critC) parts.push(`Crit ${critC}${critM ? " " + critM : ""}`);
      if (stat)  parts.push(`Statut ${stat}`);

      return `• ${escapeHtml(name)} — ${parts.join(" · ")}`;
    });

    return `
      <div class="mt-4">
        <div class="text-sm muted mb-1">Attaques</div>
        <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
          ${lines.map(l => `<div class="py-1">${l}</div>`).join("")}
        </div>
      </div>`;
  }

  /* ===================== UI: Companions ===================== */
  const statBox = (label, value) => `
    <div class="stat">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${escapeHtml(label)}</div>
      <div class="text-lg font-semibold">${escapeHtml(fmtNum(value))}</div>
    </div>`;

  function chips(item){
    const cat  = coalesce(item, ["Category","category"], "");
    const type = coalesce(item, ["Type","type"], "");
    const mk = (t) => t ? `<span class="badge">${escapeHtml(t)}</span>` : "";
    return [mk(cat), mk(type)].filter(Boolean).join(" ");
  }

  function renderCard(item){
    const name   = coalesce(item, ["Name","name"], "—");
    const desc   = coalesce(item, ["Description","description"], "");
    const armor  = coalesce(item, ["Armor","armor"], "—");
    const health = coalesce(item, ["Health","health"], "—");
    const shield = coalesce(item, ["Shield","shield"], "—");
    const energy = coalesce(item, ["Energy","energy"], "—");

    const img = buildImageCandidates(item);
    const placeholderEsc = img.placeholder.replace(/'/g, "&#39;"); // évite l’erreur "unescaped line break"

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img
              src="${img.list[0]}"
              data-srcs="${img.list.join("|")}"
              data-i="0"
              alt="${escapeHtml(name)}"
              class="w-full h-full object-contain"
              onerror="__cycleImg(this, '${placeholderEsc}')">
          </div>
        </div>

        <div class="flex-1 flex flex-col gap-4">
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <h2 class="text-xl font-semibold">${escapeHtml(name)}</h2>
              <div class="mt-2 flex flex-wrap gap-2">${chips(item)}</div>
              <p class="mt-2 text-[var(--muted)]">${cleanDesc(desc)}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${statBox("ARMOR", armor)}
            ${statBox("HEALTH", health)}
            ${statBox("SHIELD", shield)}
            ${statBox("ENERGY", energy)}
          </div>

          ${attacksBlock(item)}
        </div>
      </div>
    `;
  }

  function renderPicker(list){
    const pick = $("#picker");
    pick.innerHTML = "";
    list.forEach((it, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = coalesce(it, ["Name","name"], "—");
      pick.appendChild(o);
    });
    pick.value = "0";
  }

  /* ===================== MOA / Hound (modulaires) ===================== */

  // --- Définition des slots reconnus (détection par mots-clés sur name & uniqueName)
  const SLOT_KEYS = {
    moa: [
      ["Head", /(^|[^a-z])head/i],
      ["Core", /(^|[^a-z])core/i],
      ["Gyro", /gyro/i],
      ["Bracket", /bracket/i],
      ["Legs", /leg/i],
      // armes de MOA si listées
      ["Weapon", /weapon|gun|rifle|pistol|barrel|receiver|stock|handle|grip/i],
    ],
    hound: [
      ["Model", /model|head|chassis|shell|frame/i],
      ["Core", /(^|[^a-z])core/i],
      ["Stabilizer", /stabiliser|stabilizer|stability|spine/i],
      // slot souvent manquant → ajouté
      ["Weapon", /weapon|gun|rifle|pistol|barrel|receiver|blade|claw|baton|rod/i],
      ["Tail", /tail/i],
    ]
  };

  // Essaie de classer une pièce dans un slot, sinon renvoie "Other"
  function getSlotFrom(name, uniqueName, animal){
    const hay = (String(name||"") + " " + String(uniqueName||"")).toLowerCase();

    // Indices depuis chemins d’assets si présents
    const hard = hay.match(/hound(model|head|core|stabilizer|stabiliser|weapon|tail)|moa(head|core|gyro|bracket|legs|weapon)/i);
    if (hard) {
      const key = hard[0];
      if (/weapon/i.test(key)) return "Weapon";
      if (/model|head/i.test(key)) return animal === "hound" ? "Model" : "Head";
      if (/core/i.test(key)) return "Core";
      if (/stabiliz/i.test(key)) return "Stabilizer";
      if (/tail/i.test(key)) return "Tail";
      if (/gyro/i.test(key)) return "Gyro";
      if (/bracket/i.test(key)) return "Bracket";
      if (/legs?/i.test(key)) return "Legs";
    }

    for (const [slot, rx] of SLOT_KEYS[animal]) {
      if (rx.test(hay)) return slot;
    }
    return "Other";
  }

  function collectModularParts(rawWeapons){
    const arr = Array.isArray(rawWeapons?.ExportWeapons) ? rawWeapons.ExportWeapons : [];
    const moa   = {};
    const hound = {};

    function push(map, slot, item){
      (map[slot] ||= []).push(item);
    }

    for (const w of arr){
      const name  = w.name || w.Name || "";
      const uname = w.uniqueName || "";
      const type  = (w.type || "").toLowerCase();
      const hay   = (name + " " + uname + " " + type).toLowerCase();

      const isMoa   = /moa/.test(hay);
      const isHound = /hound/.test(hay);
      if (!(isMoa || isHound)) continue;

      const base = { name, uniqueName: uname, type: w.type || "", description: w.description || "" };

      if (isMoa){
        const slot = getSlotFrom(name, uname, "moa");
        push(moa, slot, base);
      }
      if (isHound){
        const slot = getSlotFrom(name, uname, "hound");
        push(hound, slot, base);
      }
    }

    Object.values(moa).forEach(list => list.sort((a,b)=>a.name.localeCompare(b.name)));
    Object.values(hound).forEach(list => list.sort((a,b)=>a.name.localeCompare(b.name)));
    return { moa, hound };
  }

  function renderModularBuilder(data, kind /* "moa" | "hound" */){
    const mod = data || {};
    const moa   = mod.moa   || {};
    const hound = mod.hound || {};

    const moaOrder = ["Head","Core","Gyro","Bracket","Legs","Weapon","Other"];
    const hndOrder = ["Model","Core","Stabilizer","Weapon","Tail","Other"];

    const moaSlots = moaOrder.filter(s => Array.isArray(moa[s]) && moa[s].length);
    const hndSlots = hndOrder.filter(s => Array.isArray(hound[s]) && hound[s].length);

    const slots = (kind === "moa") ? moaSlots : hndSlots;
    const dict  = (kind === "moa") ? moa     : hound;

    if (!slots.length){
      $("#card").innerHTML = `
        <div class="p-5 card">
          <h2 class="text-xl font-semibold mb-2">${kind === "moa" ? "Assembler un MOA" : "Assembler un Hound"}</h2>
          <p class="text-[var(--muted)]">Aucune pièce détectée. Vérifie que <code>data/ExportWeapons_en.json</code> est présent dans ton repo.</p>
        </div>`;
      return;
    }

    const selects = slots.map(slot => {
      const options = (dict[slot]||[]).map((p,i)=>`<option value="${i}">${escapeHtml(p.name)}</option>`).join("");
      return `
        <div class="flex flex-col gap-1">
          <label class="text-xs tracking-wide uppercase opacity-80">${slot}</label>
          <select data-slot="${slot}" class="w-full py-2 px-3 rounded-xl bg-[var(--panel-2)] text-[var(--ink)] outline-none orn focus-gold">
            ${options}
          </select>
        </div>`;
    }).join("");

    const details = slots.map(slot => {
      const p = (dict[slot]||[])[0];
      const desc = p?.description ? cleanDesc(p.description) : "—";
      return `
        <div class="p-3 rounded-xl bg-[var(--panel-2)] border">
          <div class="text-sm font-medium mb-1">${slot}</div>
          <div class="text-sm"><span class="opacity-75">Pièce : </span><span data-name="${slot}">${escapeHtml(p?.name || "—")}</span></div>
          <div class="mt-1 text-[var(--muted)] text-sm" data-desc="${slot}">${desc}</div>
        </div>`;
    }).join("");

    $("#card").innerHTML = `
      <div class="flex flex-col gap-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${selects}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${details}</div>
      </div>
    `;

    // interactions
    $("#card").querySelectorAll("select[data-slot]").forEach(sel => {
      sel.addEventListener("change", () => {
        const slot = sel.getAttribute("data-slot");
        const idx  = parseInt(sel.value, 10);
        const piece = (dict[slot]||[])[idx];

        const nameEl = $("#card").querySelector(`[data-name="${slot}"]`);
        const descEl = $("#card").querySelector(`[data-desc="${slot}"]`);
        if (nameEl) nameEl.textContent = piece?.name || "—";
        if (descEl) descEl.innerHTML   = piece?.description ? cleanDesc(piece.description) : "—";
      });
    });
  }

  /* ===================== Chargement DATA ===================== */
  async function loadJson(url){
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`${url} -> ${r.status}`);
    return r.json();
  }

  async function loadAll(){
    // On tente en parallèle
    const tasks = [
      loadJson(EXPORT_SENTINELS_URL).catch(()=>null), // export officiel
      loadJson(EXPORT_WEAPONS_URL).catch(()=>null),   // pièces modulaires
      loadJson(FALLBACK_LUA_URL).catch(()=>null),     // LUA (fallback/attaques)
    ];

    const [exportSent, exportWpn, lua] = await Promise.all(tasks);

    let list = [];
    let source = "lua";

    if (exportSent && Array.isArray(exportSent.ExportSentinels)) {
      const normalizedExport = normalizeFromExport(exportSent);
      const normalizedLua    = lua ? normalizeFromLua(lua) : [];
      list = mergeExportWithLua(normalizedExport, normalizedLua);
      source = "export";
    } else if (lua) {
      // vieux JSON uniquement (moins fiable)
      list = normalizeFromLua(lua);
      source = "lua";
    }

    const modular = exportWpn ? collectModularParts(exportWpn) : { moa:{}, hound:{} };

    return { list, source, modular };
  }

  /* ===================== Onglets & Boot ===================== */
  const STATE = {
    mode: "companions", // "companions" | "moa" | "hound"
    list: [],
    source: "export",
    modular: { moa:{}, hound:{} },
  };

  function applyMode(){
    const showComp = STATE.mode === "companions";
    // toggle search/picker
    const search = $("#search");
    const picker = $("#picker");
    if (search) search.parentElement.style.display = showComp ? "" : "none";
    if (picker) picker.style.display = showComp ? "" : "none";

    if (STATE.mode === "companions") {
      // afficher la première fiche si existante
      if (STATE.list.length) renderCard(STATE.list[0]);
    } else if (STATE.mode === "moa") {
      renderModularBuilder(STATE.modular, "moa");
    } else if (STATE.mode === "hound") {
      renderModularBuilder(STATE.modular, "hound");
    }

    // style onglets
    $("#vtabs").querySelectorAll("button[data-mode]").forEach(b=>{
      const on = b.getAttribute("data-mode") === STATE.mode;
      b.className = "w-full text-left px-3 py-2 rounded-lg " + (on ? "bg-[var(--panel-2)] border" : "hover:bg-[var(--panel-2)]/60");
    });
  }

  function setupTabs(){
    const host = $("#vtabs");
    if (!host) return;
    host.innerHTML = `
      <div class="flex flex-col gap-2">
        <button data-mode="companions" class="w-full text-left px-3 py-2 rounded-lg">Companions</button>
        <button data-mode="moa" class="w-full text-left px-3 py-2 rounded-lg">MOA</button>
        <button data-mode="hound" class="w-full text-left px-3 py-2 rounded-lg">Hound</button>
      </div>
    `;
    host.querySelectorAll("button[data-mode]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        STATE.mode = btn.getAttribute("data-mode");
        applyMode();
      });
    });
  }

  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des companions…";

      // onglets
      setupTabs();

      const { list, source, modular } = await loadAll();
      STATE.list = list;
      STATE.source = source;
      STATE.modular = modular;

      if (!list.length){
        status.textContent = "Aucun compagnon trouvé.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // UI "Companions"
      renderPicker(list);
      renderCard(list[0]);

      const setStatus = (msg) => {
        status.textContent = msg;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      };
      setStatus(`Companions chargés : ${list.length} ${source === "export" ? "(Export officiel)" : "(fallback LUA)"}`);

      // interactions "Companions"
      $("#picker").addEventListener("change", (e)=>{
        const idx = parseInt(e.target.value, 10);
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
        if (filtered.length) renderCard(filtered[Math.min(idx, filtered.length-1)]);
      });

      $("#search").addEventListener("input", ()=>{
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
        renderPicker(filtered);
        if (filtered.length) renderCard(filtered[0]);
        setStatus(`Affichage : ${filtered.length} résultat(s)`);
      });

      // mode par défaut
      applyMode();

    } catch(e){
      console.error("[companions] load error:", e);
      const status = $("#status");
      status.textContent = "Erreur de chargement des companions.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();

})();
