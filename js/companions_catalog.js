// js/companions_catalog.js
// Vue "Compagnons" + onglet "MOA / Hound (modulaires)"
(() => {
  "use strict";

  /* ----------------- Config ----------------- */
  const EXPORT_SENTINELS = "data/ExportSentinels_en.json"; // Public Export (companions & pets)
  const EXPORT_WEAPONS   = "data/ExportWeapons_en.json";   // Public Export (contient les pièces modulaires)
  const FALLBACK_LUA     = "data/companions.json";         // ancien JSON (LUA) pour Attacks + secours

  // Images (priorité : wiki → CDN → local)
  const wikiPath = (file) => file ? `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(file)}` : "";
  const cdnImg   = (file) => file ? `https://cdn.warframestat.us/img/${encodeURIComponent(file)}` : "";
  const locImg   = (file) => file ? `img/companions/${encodeURIComponent(file)}` : "";

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const fmtNum = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
  const pct = (v) => (v === null || v === undefined) ? "—" : `${Math.round(v*1000)/10}%`;
  const cleanLF = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const cleanDesc = (s) => escapeHtml(cleanLF(s)).replace(/\n/g, "<br>");
  const coalesce = (obj, keys, def=null) => { for (const k of keys) if (obj && obj[k] != null) return obj[k]; return def; };
  const kName = (n) => String(n||"").toLowerCase().replace(/[^a-z0-9]+/g, "");

  /* ----------------- State ----------------- */
  const STATE = {
    mode: "companions",            // "companions" | "modular"
    list: [],                      // compagnons normalisés
    source: "export",              // export|lua
    modular: null,                 // { moa:{slot:[parts]}, hound:{slot:[parts]} }
    cache: {},
  };

  /* ----------------- Compagnons (Vue 1) ----------------- */

  // type depuis uniqueName (export)
  function detectType(u) {
    const p = String(u || "");
    if (p.includes("/CatbrowPet/")) return "Kavat";
    if (p.includes("/KubrowPet/"))  return "Kubrow";
    if (p.includes("/CreaturePets/ArmoredInfestedCatbrow") || p.includes("/CreaturePets/HornedInfestedCatbrow")) return "Vulpaphyla";
    if (p.includes("/CreaturePets/PharaohPredator") || p.includes("/CreaturePets/VizierPredator") || p.includes("/CreaturePets/MedjayPredator")) return "Predasite";
    if (p.includes("/SentinelPowersuits/")) return "Sentinel";
    return "Companion";
  }

  function normalizeFromExport(raw){
    const arr = Array.isArray(raw?.ExportSentinels) ? raw.ExportSentinels.slice() : [];
    return arr
      .map(x => ({
        Name: x.name || "",
        Type: detectType(x.uniqueName),
        Category: (x.productCategory === "Sentinels") ? "Sentinels" : "Pets",
        Description: x.description || "",
        Armor:  x.armor ?? 0,
        Health: x.health ?? 0,
        Shield: x.shield ?? 0,
        Energy: x.power ?? 0,
        Attacks: null
      }))
      .sort(byName);
  }

  function normalizeFromLua(raw){
    let coll = raw && (raw.Companions || raw.ExportSentinels || raw); // permissif
    if (!coll) return [];
    let arr = Array.isArray(coll) ? coll.slice()
      : Object.entries(coll).map(([k,v]) => (v.Name ? v : { ...v, Name: v.Name || k }));
    return arr.sort(byName);
  }

  const MANUAL_IMG = {
    "Venari": "Venari.png",
    "Venari Prime": "VenariPrime.png",
    "Helminth Charger": "HelminthCharger.png",
    "Nautilus": "Nautilus.png",
    "Nautilus Prime": "NautilusPrime.png",
  };

  function buildImageCandidates(item){
    const name = (item.Name || item.name || "").trim();
    const manual = MANUAL_IMG[name];
    const baseNS = (manual || name).replace(/\s+/g, "");   // ChesaKubrow
    const baseUS = (manual || name).replace(/\s+/g, "_");  // Chesa_Kubrow

    const cand = [
      wikiPath(baseNS + ".png"), wikiPath(baseUS + ".png"),
      cdnImg(baseNS + ".png"),   cdnImg(baseUS + ".png"),
      locImg(baseNS + ".png"),   locImg(baseUS + ".png"),
    ];
    const seen = new Set();
    const list = cand.filter(u => u && !seen.has(u) && seen.add(u));

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

    return {
      first: list[0] || placeholder,
      listEnc: list.map(encodeURIComponent).join("|"),
      phEnc: encodeURIComponent(placeholder)
    };
  }

  function attachImgFallback(imgEl){
    const sources = (imgEl.dataset.srcs || "").split("|").filter(Boolean).map(decodeURIComponent);
    let i = 0;
    const placeholder = decodeURIComponent(imgEl.dataset.ph || "") || "";
    function handler(){
      i++;
      if (i < sources.length) imgEl.src = sources[i];
      else { imgEl.removeEventListener("error", handler); if (placeholder) imgEl.src = placeholder; }
    }
    imgEl.addEventListener("error", handler);
  }

  function sumDamage(dmg){
    if (!dmg || typeof dmg !== "object") return null;
    let total = 0;
    for (const k in dmg) { const v = Number(dmg[k]); if (!isNaN(v)) total += v; }
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

  function renderCompanionCard(item){
    const name = coalesce(item, ["Name","name"], "—");
    const desc = coalesce(item, ["Description","description"], "");
    const armor  = coalesce(item, ["Armor","armor"], "—");
    const health = coalesce(item, ["Health","health"], "—");
    const shield = coalesce(item, ["Shield","shield"], "—");
    const energy = coalesce(item, ["Energy","energy"], "—");
    const im = buildImageCandidates(item);

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img src="${im.first}" data-srcs="${im.listEnc}" data-ph="${im.phEnc}" alt="${escapeHtml(name)}" class="w-full h-full object-contain">
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
    const imgEl = $("#card img"); if (imgEl) attachImgFallback(imgEl);
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

  /* ----------------- MOA / Hound (Vue 2) ----------------- */

  // Détection de slot depuis nom/uniqueName (heuristique, robuste aux changements)
  const SLOT_KEYS = {
    moa: [
      ["Head", /head/i],
      ["Core", /core/i],
      ["Gyro", /gyro/i],
      ["Bracket", /bracket/i],
      ["Legs", /leg/i],
    ],
    hound: [
      ["Model", /model|head/i],
      ["Core", /core/i],
      ["Stabilizer", /stabilizer|stabiliser/i],
      ["Bracket", /bracket/i],
    ]
  };

  function getSlotFrom(name, uniqueName, animal){
    const hay = (name + " " + uniqueName).toLowerCase();
    for (const [slot, rx] of SLOT_KEYS[animal]) if (rx.test(hay)) return slot;
    return null;
  }

  function collectModularParts(rawWeapons){
    const arr = Array.isArray(rawWeapons?.ExportWeapons) ? rawWeapons.ExportWeapons : [];
    const moa   = {};  // slot -> [parts]
    const hound = {};
    function push(map, slot, item){
      (map[slot] ||= []).push(item);
    }
    for (const w of arr){
      const name = w.name || w.Name || "";
      const uname = w.uniqueName || "";
      const type  = (w.type || "").toLowerCase();
      const isMoa   = /moa/.test(name.toLowerCase())   || /moa/.test(uname.toLowerCase())   || type.includes("moa");
      const isHound = /hound/.test(name.toLowerCase()) || /hound/.test(uname.toLowerCase()) || type.includes("hound");
      if (!(isMoa || isHound)) continue;

      const base = { name, uniqueName: uname, type: w.type || "", description: w.description || "" };
      if (isMoa){
        const slot = getSlotFrom(name, uname, "moa");
        if (slot) push(moa, slot, base);
      }
      if (isHound){
        const slot = getSlotFrom(name, uname, "hound");
        if (slot) push(hound, slot, base);
      }
    }
    // tri
    Object.values(moa).forEach(list=>list.sort((a,b)=>a.name.localeCompare(b.name)));
    Object.values(hound).forEach(list=>list.sort((a,b)=>a.name.localeCompare(b.name)));
    return { moa, hound };
  }

  function renderSelect(label, id, options){
    const opts = options.map(o=>`<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`).join("");
    return `
      <label class="block">
        <div class="text-[11px] uppercase tracking-wide mb-1 text-[var(--muted)]">${escapeHtml(label)}</div>
        <select id="${id}" class="w-full py-2 px-3 rounded-xl bg-[var(--panel-2)] text-[var(--ink)] outline-none orn focus-gold">
          <option value="">—</option>
          ${opts}
        </select>
      </label>
    `;
  }

  function renderModularBuilder(mod){
    const card = $("#card");
    const moa   = mod.moa || {};
    const hound = mod.hound || {};

    function box(title, body){
      return `
        <div class="card p-5">
          <div class="text-lg font-semibold mb-3">${escapeHtml(title)}</div>
          ${body}
        </div>
      `;
    }

    const moaSlots = ["Head","Core","Gyro","Bracket","Legs"].filter(s => Array.isArray(moa[s]) && moa[s].length);
    const hndSlots = ["Model","Core","Stabilizer","Bracket"].filter(s => Array.isArray(hound[s]) && hound[s].length);

    const moaBody = moaSlots.length
      ? `<div class="grid md:grid-cols-2 gap-4">
           ${moaSlots.map(s => renderSelect(`MOA — ${s}`, `moa-${s}`, moa[s])).join("")}
         </div>
         <div class="mt-4 text-sm text-[var(--muted)]" id="moa-summary"></div>`
      : `<div class="text-[var(--muted)]">Aucune pièce MOA détectée dans l’export.</div>`;

    const hndBody = hndSlots.length
      ? `<div class="grid md:grid-cols-2 gap-4">
           ${hndSlots.map(s => renderSelect(`Hound — ${s}`, `hound-${s}`, hound[s])).join("")}
         </div>
         <div class="mt-4 text-sm text-[var(--muted)]" id="hound-summary"></div>`
      : `<div class="text-[var(--muted)]">Aucune pièce Hound détectée dans l’export.</div>`;

    card.innerHTML = `
      <div class="grid gap-5">
        ${box("Assembler un MOA", moaBody)}
        ${box("Assembler un Hound", hndBody)}
      </div>
    `;

    function wire(species, slots){
      function refresh(){
        const picks = slots.map(s => $(`#${species}-${s}`)?.value || "").filter(Boolean);
        const out = picks.length ? `${species.toUpperCase()} sélection : ${picks.join(" + ")}` : "Aucune sélection.";
        $(`#${species}-summary`).textContent = out;
      }
      slots.forEach(s => $(`#${species}-${s}`)?.addEventListener("change", refresh));
      refresh();
    }
    if (moaSlots.length)  wire("moa", moaSlots);
    if (hndSlots.length)  wire("hound", hndSlots);
  }

  /* ----------------- Mode switch (onglets) ----------------- */
  function installTabs(){
    if ($("#cw-tabs")) return;
    const host = document.createElement("div");
    host.id = "cw-tabs";
    host.className = "flex gap-2 mb-4";
    host.innerHTML = `
      <button data-mode="companions" class="badge gold !px-3 !py-1.5">Compagnons</button>
      <button data-mode="modular"    class="badge !px-3 !py-1.5">MOA / Hound</button>
    `;
    const status = $("#status");
    status.parentNode.insertBefore(host, status.nextSibling);

    host.addEventListener("click", async (e)=>{
      const btn = e.target.closest("button[data-mode]"); if (!btn) return;
      const mode = btn.dataset.mode;
      if (STATE.mode === mode) return;
      STATE.mode = mode;
      // style
      $$("#cw-tabs button").forEach(b => b.classList.remove("gold"));
      btn.classList.add("gold");
      // toggle bar recherche / picker
      const toolsRow = $("#tools-row") || $("#search")?.parentElement?.parentElement;
      if (toolsRow) toolsRow.style.display = mode === "companions" ? "" : "none";
      if (mode === "companions") {
        // rerender la carte courante
        if (STATE.list.length) { renderPicker(STATE.list); renderCompanionCard(STATE.list[0]); }
      } else {
        // charger l’export weapons si pas déjà fait
        if (!STATE.modular){
          try{
            const r = await fetch(EXPORT_WEAPONS, { cache: "no-store" });
            const raw = r.ok ? await r.json() : {};
            STATE.modular = collectModularParts(raw);
          }catch{ STATE.modular = {moa:{}, hound:{}}; }
        }
        renderModularBuilder(STATE.modular);
      }
    });
  }

  /* ----------------- Chargement + fusion Attacks ----------------- */
  async function loadBoth(){
    // Export officiel
    let exportList = [];
    try {
      const r = await fetch(EXPORT_SENTINELS, { cache: "no-store" });
      if (r.ok) exportList = normalizeFromExport(await r.json());
    } catch {}
    // LUA (pour Attacks + secours)
    let luaList = [];
    try {
      const r2 = await fetch(FALLBACK_LUA, { cache: "no-store" });
      if (r2.ok) luaList = normalizeFromLua(await r2.json());
    } catch {}

    if (!exportList.length && luaList.length) {
      return { list: luaList, source: "lua" };
    }

    // map attaques
    const attacksByName = new Map();
    for (const it of luaList) {
      const nm = kName(it.Name || it.name);
      if (!nm) continue;
      const atks = coalesce(it, ["Attacks","attacks"], null);
      if (Array.isArray(atks) && atks.length) attacksByName.set(nm, atks);
    }
    const merged = exportList.map(it => {
      const nm = kName(it.Name);
      const atks = attacksByName.get(nm);
      return atks ? { ...it, Attacks: atks } : it;
    });
    return { list: merged, source: "export" };
  }

  /* ----------------- Boot ----------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des companions…";
      installTabs();

      const { list, source } = await loadBoth();
      STATE.list = list;
      STATE.source = source;

      if (!list.length){
        status.textContent = "Aucun compagnon trouvé.";
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // outils de recherche (on garde pour l’onglet Compagnons)
      renderPicker(list);
      renderCompanionCard(list[0]);

      const setStatus = (n) => {
        status.textContent = `Companions chargés : ${n} ${source === "export" ? "(Export officiel)" : "(fallback LUA)"}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      };
      setStatus(list.length);

      // interactions (onglet Compagnons)
      $("#picker").addEventListener("change", (e)=>{
        const idx = parseInt(e.target.value, 10);
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
        if (filtered.length) renderCompanionCard(filtered[Math.min(idx, filtered.length-1)]);
      });

      $("#search").addEventListener("input", ()=>{
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
        renderPicker(filtered);
        if (filtered.length) renderCompanionCard(filtered[0]);
        status.textContent = `Affichage : ${filtered.length} résultat(s)`;
      });

    } catch(e){
      console.error("[companions] load error:", e);
      status.textContent = "Erreur de chargement des données.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
