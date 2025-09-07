// js/companions_catalog.js
// Mise en page type “Warframes” + onglets Companions / MOA / Hound

(() => {
  "use strict";

  /* ----------------- Config ----------------- */
  const EXPORT_URL   = "data/ExportSentinels_en.json"; // Export officiel (workflow GitHub)
  const FALLBACK_URL = "data/companions.json";         // ton JSON/LUA (wiki officiel)

  // Ordre demandé : Wiki (officiel) -> CDN -> Local
  const CDN_IMG   = (file) => file ? `https://cdn.warframestat.us/img/${encodeURIComponent(file)}` : "";
  const LOCAL_IMG = (file) => file ? `img/companions/${encodeURIComponent(file)}` : "";

  // Corrections manuelles si le nom n’est pas standard
  const MANUAL_IMG = {
    "Venari": "Venari.png",
    "Venari Prime": "VenariPrime.png",
    "Helminth Charger": "HelminthCharger.png",
    "Nautilus": "Nautilus.png",
    "Nautilus Prime": "NautilusPrime.png",
  };

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const fmtNum = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
  const pct = (v) => (v === null || v === undefined) ? "—" : `${Math.round(v*1000)/10}%`;
  const cleanLF = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const cleanDesc = (s) => escapeHtml(cleanLF(s)).replace(/\n/g, "<br>");

  function coalesce(obj, keys, def=null) {
    for (const k of keys) if (obj && obj[k] != null) return obj[k];
    return def;
  }

  /* ----------------- STATE ----------------- */
  const STATE = {
    list: [],
    source: "export",
    mode: "companions", // companions | moa | hound
    modular: {
      moa:   { head: "", core: "", legs: "", weapon: "" },
      hound: { head: "", body: "", tail: "", weapon: "" },
    }
  };

  /* ----------------- Types (Export) ----------------- */
  function detectType(u) {
    const p = String(u || "");
    if (p.includes("/CatbrowPet/")) return "Kavat";
    if (p.includes("/KubrowPet/"))  return "Kubrow";
    if (p.includes("/CreaturePets/ArmoredInfestedCatbrow")) return "Vulpaphyla";
    if (p.includes("/CreaturePets/PharaohPredator") || p.includes("/CreaturePets/VizierPredator") || p.includes("/CreaturePets/MedjayPredator")) return "Predasite";
    if (p.includes("/SentinelPowersuits/")) return "Sentinel";
    return "Companion";
  }

  /* ----------------- Normalisation EXPORT ----------------- */
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
          Attacks: null, // injecté plus bas via JSON/LUA
          _imgManual: "", // on le remplira avec le LUA s'il a "Image"
        };
      })
      .sort(byName);
  }

  /* ----------------- Normalisation LUA ----------------- */
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

  /* ----------------- Fusion EXPORT + LUA (inject Attacks + Image) ----------------- */
  function mergeExportWithLua(listExport, listLua){
    const luaByName = new Map();
    for (const it of listLua) {
      const n = norm(it.Name || it.name || "");
      if (!n) continue;
      luaByName.set(n.toLowerCase(), it);
    }
    for (const ex of listExport) {
      const key = (ex.Name || "").toLowerCase();
      const lua = luaByName.get(key);
      if (!lua) continue;

      // Inject Attacks si présentes
      if (Array.isArray(lua.Attacks) && lua.Attacks.length) {
        ex.Attacks = lua.Attacks.map(a => ({
          AttackName: a.AttackName ?? a.name ?? "Attack",
          Damage: a.Damage ?? a.damage ?? null,
          CritChance: a.CritChance ?? null,
          CritMultiplier: a.CritMultiplier ?? null,
          StatusChance: a.StatusChance ?? null
        }));
      }

      // Image du LUA (priorité pour construire le nom)
      const file = coalesce(lua, ["Image","image"], "");
      if (file) ex._imgManual = String(file);
    }
    return listExport;
  }

  /* ----------------- Images (priorité Wiki → CDN → Local) ----------------- */
  function buildImageCandidates(item){
    const name = (item.Name || item.name || "").trim();
    const manual = item._imgManual || MANUAL_IMG[name] || "";

    // Base “Name.png” (sans underscore) puis “Name_With_Underscore.png”
    const baseNoUS = (manual ? manual.replace(/\.png$/i, "") : name).replace(/\s+/g, "");
    const baseUS   = (manual ? manual.replace(/\.png$/i, "") : name).replace(/\s+/g, "_");

    const candidates = [];

    // 1) Wiki officiel — Special:FilePath (d’abord sans underscore -> moins de 404)
    candidates.push(`https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(baseNoUS + ".png")}`);
    candidates.push(`https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(baseUS   + ".png")}`);

    // 2) CDN WarframeStat (2 variantes)
    candidates.push(CDN_IMG(baseNoUS + ".png"));
    candidates.push(CDN_IMG(baseUS   + ".png"));

    // 3) Local (2 variantes)
    candidates.push(LOCAL_IMG(baseNoUS + ".png"));
    candidates.push(LOCAL_IMG(baseUS   + ".png"));

    // de-dup
    const seen = new Set();
    const list = candidates.filter(u => u && !seen.has(u) && seen.add(u));

    // placeholder
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

  // Fallback cyclique d’images (on ne passe plus le placeholder en param pour éviter l’échappement)
  window.__cycleImg = function(el){
    const list = (el.getAttribute("data-srcs") || "").split("|").filter(Boolean);
    let i = parseInt(el.getAttribute("data-i") || "0", 10) + 1;
    if (i < list.length) {
      el.setAttribute("data-i", String(i));
      el.src = list[i];
    } else {
      el.onerror = null;
      const ph = el.getAttribute("data-ph") || "";
      el.src = ph || "";
    }
  };

  /* ----------------- Attaques (affichage) ----------------- */
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

  /* ----------------- UI helpers ----------------- */
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
    const name = coalesce(item, ["Name","name"], "—");
    const desc = coalesce(item, ["Description","description"], "");
    const armor  = coalesce(item, ["Armor","armor"], "—");
    const health = coalesce(item, ["Health","health"], "—");
    const shield = coalesce(item, ["Shield","shield"], "—");
    const energy = coalesce(item, ["Energy","energy"], "—");

    const img = buildImageCandidates(item);

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Colonne image -->
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img
              src="${img.list[0]}"
              data-srcs="${img.list.join("|")}"
              data-i="0"
              data-ph="${img.placeholder}"
              alt="${escapeHtml(name)}"
              class="w-full h-full object-contain"
              onerror="window.__cycleImg && window.__cycleImg(this)">
          </div>
        </div>

        <!-- Colonne contenu -->
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
    if (!pick) return;
    pick.innerHTML = "";
    list.forEach((it, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = coalesce(it, ["Name","name"], "—");
      pick.appendChild(o);
    });
    pick.value = "0";
  }

  /* ----------------- Onglets / Tabs ----------------- */
  function setupTabs(){
    // On cherche #vtabs ; si absent, on en crée un au début de #panel-wrapper
    let host = $("#vtabs");
    if (!host) {
      const wrap = $("#panel-wrapper") || $(".max-w-6xl") || document.body;
      const div = document.createElement("aside");
      div.id = "vtabs";
      div.className = "mb-4 flex gap-2 md:flex-col md:w-[180px] shrink-0";
      if (wrap.firstChild) wrap.insertBefore(div, wrap.firstChild);
      else wrap.appendChild(div);
      host = div;
    }

    host.innerHTML = `
      <div class="flex flex-row md:flex-col gap-2 w-full">
        <button data-mode="companions" class="tabbtn w-full text-left px-3 py-2 rounded-lg">Companions</button>
        <button data-mode="moa"         class="tabbtn w-full text-left px-3 py-2 rounded-lg">MOA</button>
        <button data-mode="hound"       class="tabbtn w-full text-left px-3 py-2 rounded-lg">Hound</button>
      </div>
    `;

    host.querySelectorAll("button[data-mode]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        STATE.mode = btn.getAttribute("data-mode");
        applyMode();
      });
    });
  }

  function applyMode(){
    const showComp = STATE.mode === "companions";

    // masquer/afficher la barre de recherche et le picker si présents
    const searchWrap = $("#search")?.parentElement;
    if (searchWrap) searchWrap.style.display = showComp ? "" : "none";
    const picker = $("#picker");
    if (picker) picker.style.display = showComp ? "" : "none";

    // contenu principal
    if (STATE.mode === "companions") {
      if (STATE.list.length) renderCard(STATE.list[0]);
    } else if (STATE.mode === "moa") {
      renderModularBuilder(STATE.modular, "moa");
    } else if (STATE.mode === "hound") {
      renderModularBuilder(STATE.modular, "hound");
    }

    // stylage des onglets SI #vtabs existe
    const tabs = $("#vtabs");
    if (tabs) {
      tabs.querySelectorAll("button[data-mode]")?.forEach(b=>{
        const on = b.getAttribute("data-mode") === STATE.mode;
        b.className = "tabbtn w-full text-left px-3 py-2 rounded-lg " +
          (on ? "bg-[var(--panel-2)] border" : "hover:bg-[var(--panel-2)]/60");
      });
    }
  }

  /* ----------------- MOA / Hound (UI de builder — listes à compléter) ----------------- */
  const MOA_PARTS = {
    head:  ["Lambeo", "Nychus", "Oloro", "Para"],
    core:  ["Alcrom", "Drexler", "Tianmu"], // placeholders : remplace-les par la vraie liste
    legs:  ["Jayap", "Oloro", "Naramon"],   // placeholders
    weapon:["Cryotra", "Tazicor", "Vulcax"] // placeholders
  };

  const HOUND_PARTS = {
    head:   ["Dorma", "Bhaira", "Hec"],
    body:   ["Senta", "Balla", "Kapu"],     // placeholders : à remplacer
    tail:   ["Anpu", "Nira", "Dea"],        // placeholders
    weapon: ["Lacerten", "Batoten", "Udi"]  // placeholders
  };

  function renderModularBuilder(state, kind){
    const cfg = (kind === "moa") ? MOA_PARTS : HOUND_PARTS;

    const selects = Object.entries(cfg).map(([slot, arr]) => {
      const val = state[kind][slot] || "";
      const opts = ['<option value="">(choisir)</option>']
        .concat(arr.map(v => `<option value="${escapeHtml(v)}"${v===val?' selected':''}>${escapeHtml(v)}</option>`))
        .join("");
      return `
        <label class="block">
          <div class="text-[11px] uppercase tracking-wide mb-1">${escapeHtml(slot)}</div>
          <select data-slot="${slot}" class="w-full py-2 px-3 rounded-xl bg-[var(--panel-2)] text-[var(--ink)] outline-none orn focus-gold">
            ${opts}
          </select>
        </label>`;
    }).join("");

    $("#card").innerHTML = `
      <div class="flex flex-col gap-4">
        <h2 class="text-xl font-semibold">${kind === "moa" ? "Assembler un MOA" : "Assembler un Hound"}</h2>
        <p class="text-[var(--muted)]">
          Sélectionne les pièces (${Object.keys(cfg).length}) pour voir la configuration. 
          <span class="opacity-75">Les listes sont des placeholders à compléter depuis Public Export / Wiki.</span>
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          ${selects}
        </div>
        <div id="modular-summary" class="mt-2 text-sm"></div>
      </div>
    `;

    $("#card").querySelectorAll("select[data-slot]")?.forEach(sel=>{
      sel.addEventListener("change", ()=>{
        const slot = sel.getAttribute("data-slot");
        STATE.modular[kind][slot] = sel.value;
        renderModularSummary(kind);
      });
    });

    renderModularSummary(kind);
  }

  function renderModularSummary(kind){
    const cfg = STATE.modular[kind];
    const filled = Object.entries(cfg).filter(([,v]) => !!v);
    const sum = $("#modular-summary");
    if (!sum) return;
    if (!filled.length) {
      sum.innerHTML = `<div class="muted">Aucune pièce sélectionnée.</div>`;
      return;
    }
    sum.innerHTML = `
      <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
        ${Object.entries(cfg).map(([k,v]) => `
          <div class="flex justify-between py-0.5">
            <div class="text-[11px] uppercase tracking-wide">${escapeHtml(k)}</div>
            <div class="font-medium">${v ? escapeHtml(v) : "—"}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* ----------------- Chargement data ----------------- */
  async function loadData(){
    // 1) Public Export (priorité)
    try{
      const r = await fetch(EXPORT_URL, { cache: "no-store" });
      if (r.ok) {
        const raw = await r.json();
        let list = normalizeFromExport(raw);

        // 2) Fusion Attacks + Image via LUA (si dispo)
        try {
          const r2 = await fetch(FALLBACK_URL, { cache: "no-store" });
          if (r2.ok) {
            const raw2 = await r2.json();
            const luaList = normalizeFromLua(raw2);
            list = mergeExportWithLua(list, luaList);
          }
        } catch {}

        return { list, source: "export" };
      }
    }catch{}

    // 3) Fallback pur sur ton JSON LUA si export KO
    const r2 = await fetch(FALLBACK_URL, { cache: "no-store" });
    const raw2 = await r2.json();
    return { list: normalizeFromLua(raw2), source: "lua" };
  }

  /* ----------------- Boot ----------------- */
  (async function boot(){
    const status = $("#status") || (()=>{ const d=document.createElement("div"); d.id="status"; d.className="mb-4 text-sm px-3 py-2 rounded-lg orn"; document.body.prepend(d); return d; })();
    try{
      status.textContent = "Chargement des companions…";

      // Prépare les onglets (création sûre si absent)
      setupTabs();

      const { list, source } = await loadData();
      STATE.list = list;
      STATE.source = source;

      if (!list.length){
        status.textContent = "Aucun compagnon trouvé.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // UI de base (picker + première fiche)
      renderPicker(list);
      renderCard(list[0]);

      const setStatus = (n) => {
        status.textContent = `Companions chargés : ${n} ${source === "export" ? "(Export officiel + fusion LUA)" : "(fallback LUA)"}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      };
      setStatus(list.length);

      // interactions Companions
      const picker = $("#picker");
      if (picker) {
        picker.addEventListener("change", (e)=>{
          const idx = parseInt(e.target.value, 10);
          const q = norm($("#search")?.value || "").toLowerCase();
          const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
          if (filtered.length) renderCard(filtered[Math.min(idx, filtered.length-1)]);
        });
      }

      const search = $("#search");
      if (search) {
        search.addEventListener("input", ()=>{
          const q = norm(search.value).toLowerCase();
          const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
          renderPicker(filtered);
          if (filtered.length) renderCard(filtered[0]);
          status.textContent = `Affichage : ${filtered.length} résultat(s)`;
        });
      }

      // Appliquer l’onglet courant (met à jour les styles & contenu)
      applyMode();

    } catch(e){
      console.error("[companions] load error:", e);
      status.textContent = "Erreur de chargement des companions.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
