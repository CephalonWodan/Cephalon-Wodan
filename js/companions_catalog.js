// js/companions_catalog.js
// Page "Companions" avec onglets : Compagnons standards / MOA modulaires / Hound modulaires
// - Source 1 : ExportSentinels_en.json (Public Export) -> compagnons standards
// - Source 2 : ExportWeapons_en.json (Public Export) -> pièces modulaires (MOA/Hound)
// - Fallback enrichissement : companions.json (LUA wiki) -> injecte Attacks par Name
// - Images : Wiki (Special:FilePath) -> CDN -> Local

(() => {
  "use strict";

  /* ----------------- Config ----------------- */
  const EXPORT_SENTINELS_URL = "data/ExportSentinels_en.json";
  const EXPORT_WEAPONS_URL   = "data/ExportWeapons_en.json";
  const FALLBACK_LUA_URL     = "data/companions.json"; // pour Attacks + quelques images

  // Helpers images (priorité : Wiki -> CDN -> Local)
  const wikiFilepath = (file) =>
    file ? `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(file)}` : "";
  const wikiImages   = (file) =>
    file ? `https://wiki.warframe.com/images/${encodeURIComponent(file)}` : "";
  const cdnImg = (file) =>
    file ? `https://cdn.warframestat.us/img/${encodeURIComponent(file)}` : "";
  const localImg = (file) =>
    file ? `img/companions/${encodeURIComponent(file)}` : "";

  // Quelques corrections manuelles utiles
  const MANUAL_IMG = {
    "Venari": "Venari.png",
    "Venari Prime": "VenariPrime.png",
    "Helminth Charger": "HelminthCharger.png",
    "Nautilus": "Nautilus.png",
    "Nautilus Prime": "NautilusPrime.png",
    // MOA heads connus
    "Lambeo Moa": "LambeoMOA.png",
    "Oloro Moa":  "OloroMOA.png",
    "Nychus Moa": "NychusMOA.png",
    "Para Moa":   "ParaMOA.png",
    // Hound heads connus
    "Bhaira Hound": "BhairaHound.png",
    "Dorma Hound":  "DormaHound.png",
    "Hec Hound":    "HecHound.png",
  };

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const norm = (s) => String(s || "").trim();
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const fmtNum = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
  const pct = (v) => (v === null || v === undefined) ? "—" : `${Math.round(v*1000)/10}%`;
  const cleanLF = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const cleanDesc = (s) => escapeHtml(cleanLF(s)).replace(/\n/g, "<br>");

  const coalesce = (obj, keys, def=null) => {
    for (const k of keys) if (obj && obj[k] != null) return obj[k];
    return def;
  };

  // joli placeholder en SVG
  const PLACEHOLDER = 'data:image/svg+xml;utf8,'+encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/>
      </linearGradient></defs>
      <rect width="600" height="360" fill="url(#g)"/>
      <rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/>
      <text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text>
    </svg>`
  );

  // cycle des fallbacks d’image (utilisé dans onerror=)
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

  /* ----------------- Détection de type (ExportSentinels) ----------------- */
  function detectTypeFromUnique(uniqueName) {
    const p = String(uniqueName || "");
    if (p.includes("/CatbrowPet/")) return "Kavat";
    if (p.includes("/KubrowPet/"))  return "Kubrow";
    if (p.includes("/CreaturePets/ArmoredInfestedCatbrow")) return "Vulpaphyla";
    if (p.includes("/CreaturePets/PharaohPredator") || p.includes("/CreaturePets/VizierPredator") || p.includes("/CreaturePets/MedjayPredator")) return "Predasite";
    if (p.includes("/SentinelPowersuits/")) return "Sentinel";
    return "Companion";
  }

  /* ----------------- Normalise les compagnons standards ----------------- */
  function normalizeFromExportSentinels(raw){
    const arr = Array.isArray(raw?.ExportSentinels) ? raw.ExportSentinels.slice() : [];
    return arr.map(x => {
      const name = x.name || "";
      const type = detectTypeFromUnique(x.uniqueName);
      const category = (x.productCategory === "Sentinels") ? "Sentinels" : "Pets";

      // Essais d’images (manuel -> wiki -> cdn -> local), deux variantes (underscore / no-space)
      const manual = MANUAL_IMG[name];
      const baseUS = (manual || name).replace(/\s+/g, "_") + ".png";
      const baseNS = (manual || name).replace(/\s+/g, "")  + ".png";

      const candidates = [
        manual ? wikiImages(manual) : "",                 // si on a une correspondance exacte
        wikiFilepath(baseUS), wikiFilepath(baseNS),
        wikiImages(baseUS),   wikiImages(baseNS),
        cdnImg(baseNS),       cdnImg(baseUS),
        localImg(baseNS),     localImg(baseUS),
      ].filter(Boolean);

      return {
        Name: name,
        Type: type,
        Category: category,
        Description: x.description || "",
        Armor:  x.armor ?? 0,
        Health: x.health ?? 0,
        Shield: x.shield ?? 0,
        Energy: x.power ?? 0,
        Attacks: null, // à enrichir via LUA
        _imgList: candidates.length ? candidates : [PLACEHOLDER],
      };
    }).sort(byName);
  }

  /* ----------------- Normalise le JSON LUA (pour Attacks + images) ----------------- */
  function normalizeFromLua(raw){
    let coll = raw && raw.Companions ? raw.Companions : raw;
    if (!coll) return [];

    let arr = Array.isArray(coll)
      ? coll.slice()
      : Object.entries(coll).map(([k,v]) => (v.Name ? v : { ...v, Name: v.Name || k }));

    arr = arr.map(v => {
      const name = coalesce(v, ["Name","name"], "");
      const file = coalesce(v, ["Image","image"], "");
      const manual = MANUAL_IMG[name];
      const baseUS = (manual || file || (name ? name.replace(/\s+/g, "_") + ".png" : ""));
      const baseNS = (manual || file || (name ? name.replace(/\s+/g, "")  + ".png" : ""));

      const candidates = [
        baseUS ? wikiFilepath(baseUS) : "",
        baseNS ? wikiFilepath(baseNS) : "",
        baseUS ? wikiImages(baseUS)   : "",
        baseNS ? wikiImages(baseNS)   : "",
        baseNS ? cdnImg(baseNS)       : "",
        baseUS ? cdnImg(baseUS)       : "",
        baseNS ? localImg(baseNS)     : "",
        baseUS ? localImg(baseUS)     : "",
      ].filter(Boolean);

      return {
        ...v,
        _imgList: candidates.length ? candidates : [PLACEHOLDER],
      };
    });

    arr.sort(byName);
    return arr;
  }

  /* ----------------- Fusion "Attacks" depuis LUA par Name ----------------- */
  function injectAttacksFromLua(standardList, luaList){
    const byNameMap = new Map(luaList.map(it => [String(it.Name || "").toLowerCase(), it]));
    for (const item of standardList){
      const key = String(item.Name || "").toLowerCase();
      const src = byNameMap.get(key);
      if (src && Array.isArray(src.Attacks)) {
        item.Attacks = src.Attacks;
      }
      // si l’export n’a pas d’image correct et que le LUA en a une plus plausible, merge les listes images
      if (src && Array.isArray(src._imgList)) {
        const set = new Set([...(item._imgList || []), ...src._imgList]);
        item._imgList = Array.from(set);
      }
    }
  }

  /* ----------------- Attaques (bloc UI) ----------------- */
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

  /* ----------------- Rendu fiche compagnon standard ----------------- */
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
    const imgs = Array.isArray(item._imgList) && item._imgList.length ? item._imgList : [PLACEHOLDER];

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img
              src="${imgs[0]}"
              data-srcs="${imgs.join("|")}"
              data-i="0"
              alt="${escapeHtml(name)}"
              class="w-full h-full object-contain"
              onerror="__cycleImg(this, '${PLACEHOLDER}')">
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

  /* ----------------- MOA / Hound (modulaires) : parsing des pièces ----------------- */
  function parseModularPartsFromWeapons(raw){
    const arr = Array.isArray(raw?.ExportWeapons) ? raw.ExportWeapons : [];
    const moa   = { Head:[], Core:[], Gyro:[], Bracket:[], Other:[] };
    const hound = { Head:[], Core:[], Stabilizer:[], Tail:[], Other:[] };

    for (const it of arr){
      const u = String(it.uniqueName || "");
      const name = it.name || "";
      const desc = it.description || "";

      // Détection MOA parts
      if (/\/MoaPetParts\//i.test(u)) {
        const slot = /MoaPetHead/i.test(u) ? "Head"
                   : /MoaPetCore|MoaPetEngine/i.test(u) ? "Core"
                   : /MoaPetGyro/i.test(u) ? "Gyro"
                   : /MoaPetBracket/i.test(u) ? "Bracket"
                   : "Other";
        moa[slot].push(decoratePart(it, name, desc, "MOA"));
        continue;
      }

      // Détection Hound parts (Zanuka)
      if (/\/ZanukaPetParts\//i.test(u)) {
        const slot = /ZanukaPetPartHead/i.test(u) ? "Head"
                   : /ZanukaPetPartCore|ZanukaPetPartChassis/i.test(u) ? "Core"
                   : /ZanukaPetPartStabilizer/i.test(u) ? "Stabilizer"
                   : /ZanukaPetPartTail/i.test(u) ? "Tail"
                   : "Other";
        hound[slot].push(decoratePart(it, name, desc, "HOUND"));
        continue;
      }
    }

    // tri par nom
    Object.values(moa).forEach(list => list.sort((a,b)=>a.Name.localeCompare(b.Name)));
    Object.values(hound).forEach(list => list.sort((a,b)=>a.Name.localeCompare(b.Name)));

    return { moa, hound };
  }

  function decoratePart(it, name, desc, family){
    // composants de craft (si présents dans l’export)
    const components = Array.isArray(it.components) ? it.components.map(c => ({
      Name: c.name || c.type || "",
      Count: c.itemCount ?? c.ItemCount ?? c.count ?? 1,
      Image: c.imageName || c.Image || "",
      Description: c.description || c.Description || ""
    })) : [];

    // heuristique image : si imageName dispo on l’utilise, sinon tentatives par nom
    const imgFile = it.imageName || "";
    const manual  = MANUAL_IMG[name] || "";
    const baseUS  = (manual || name).replace(/\s+/g, "_") + ".png";
    const baseNS  = (manual || name).replace(/\s+/g, "")  + ".png";

    const imgs = [
      manual ? wikiImages(manual) : "",
      imgFile ? wikiFilepath(imgFile) : "",
      wikiFilepath(baseUS), wikiFilepath(baseNS),
      wikiImages(baseUS),   wikiImages(baseNS),
      cdnImg(baseNS),       cdnImg(baseUS),
      localImg(baseNS),     localImg(baseUS),
    ].filter(Boolean);

    return {
      Name: name,
      Description: desc,
      Components: components,
      Family: family,
      _imgList: imgs.length ? imgs : [PLACEHOLDER],
    };
  }

  /* ----------------- Rendu MOA/Hound (catalogue de pièces) ----------------- */
  function renderModularCatalog(kind, data){
    // kind: "moa" | "hound"
    const order = kind === "moa"
      ? ["Head","Core","Gyro","Bracket","Other"]
      : ["Head","Core","Stabilizer","Tail","Other"];

    const title = kind === "moa" ? "MOA — pièces modulaires" : "Hound — pièces modulaires";
    const root = $("#card");
    root.innerHTML = `
      <div>
        <h2 class="text-xl font-semibold mb-3">${title}</h2>
        <div class="text-[var(--muted)] mb-4">
          Sélectionne des pièces pour composer ton compagnon. Chaque carte liste la description et les composants de craft.
        </div>
        ${order.map(slot => slotSection(slot, data[slot] || [])).join("")}
      </div>
    `;
  }

  function slotSection(slot, list){
    if (!list.length) return "";
    const grid = list.map(part => modularPartCard(part)).join("");
    return `
      <div class="mt-6">
        <div class="text-sm muted mb-2">${slot}</div>
        <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          ${grid}
        </div>
      </div>
    `;
  }

  function modularPartCard(p){
    const name = p.Name || "—";
    const desc = cleanDesc(p.Description || "");
    const imgs = p._imgList?.length ? p._imgList : [PLACEHOLDER];

    const components = Array.isArray(p.Components) && p.Components.length
      ? `<div class="mt-3 text-sm">
           <div class="muted mb-1">Composants requis</div>
           <ul class="list-disc pl-5 space-y-1">
             ${p.Components.map(c => `<li>${escapeHtml(c.Name)} × ${escapeHtml(String(c.Count ?? 1))}</li>`).join("")}
           </ul>
         </div>`
      : "";

    return `
      <div class="card p-4 orn">
        <div class="w-full h-[160px] rounded-xl overflow-hidden bg-[var(--panel-2)] border flex items-center justify-center mb-3">
          <img
            src="${imgs[0]}"
            data-srcs="${imgs.join("|")}"
            data-i="0"
            alt="${escapeHtml(name)}"
            class="w-full h-full object-contain"
            onerror="__cycleImg(this, '${PLACEHOLDER}')">
        </div>
        <div class="font-semibold">${escapeHtml(name)}</div>
        ${desc ? `<p class="mt-1 text-[var(--muted)]">${desc}</p>` : ""}
        ${components}
      </div>
    `;
  }

  /* ----------------- Onglets haut de page ----------------- */
  function setActiveTab(tab){
    // tab: "standard" | "moa" | "hound"
    $("#tab-standard").classList.toggle("active", tab === "standard");
    $("#tab-moa").classList.toggle("active", tab === "moa");
    $("#tab-hound").classList.toggle("active", tab === "hound");

    // Affichage/masquage des contrôles de recherche/choix
    const controls = $("#controls-standard");
    controls.style.display = (tab === "standard") ? "" : "none";
  }

  function renderTabsHost(){
    const host = $("#tabs-host");
    if (!host) return;
    host.innerHTML = `
      <div class="flex gap-2 mb-4">
        <button id="tab-standard" class="btn-tab active">Compagnons</button>
        <button id="tab-moa" class="btn-tab">MOA (modulaire)</button>
        <button id="tab-hound" class="btn-tab">Hound (modulaire)</button>
      </div>
    `;
  }

  /* ----------------- Boot ----------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des données…";

      // 1) Charge ExportSentinels (compagnons standards)
      const rStd = await fetch(EXPORT_SENTINELS_URL, { cache: "no-store" });
      const rawStd = rStd.ok ? await rStd.json() : { ExportSentinels: [] };
      const standardList = normalizeFromExportSentinels(rawStd);

      // 2) Charge ExportWeapons (pièces MOA/Hound)
      const rW = await fetch(EXPORT_WEAPONS_URL, { cache: "no-store" });
      const rawW = rW.ok ? await rW.json() : { ExportWeapons: [] };
      const modular = parseModularPartsFromWeapons(rawW);

      // 3) Fallback LUA (pour Attacks + images supplémentaires)
      let luaList = [];
      try{
        const rLua = await fetch(FALLBACK_LUA_URL, { cache: "no-store" });
        if (rLua.ok) {
          const rawLua = await rLua.json();
          luaList = normalizeFromLua(rawLua);
          injectAttacksFromLua(standardList, luaList);
        }
      }catch{/* silencieux */}

      // ---- UI de la page
      renderTabsHost();
      setActiveTab("standard");

      // Contrôles standard
      const setStatus = (msg, ok = true) => {
        status.textContent = msg;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg " + (ok ? "orn" : "");
        status.style.background = ok ? "rgba(0,229,255,.08)" : "rgba(255,0,0,.08)";
        status.style.color = ok ? "#bfefff" : "#ffd1d1";
      };

      // Prépare la liste standard
      renderPicker(standardList);
      if (standardList.length) renderCard(standardList[0]);
      setStatus(`Données chargées — ${standardList.length} compagnon(s) standard, ${Object.values(modular.moa).flat().length} pièces MOA, ${Object.values(modular.hound).flat().length} pièces Hound.`);

      // interactions recherche + picker
      $("#picker").addEventListener("change", (e)=>{
        const idx = parseInt(e.target.value, 10);
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? standardList.filter(x => (x.Name||"").toLowerCase().includes(q)) : standardList;
        if (filtered.length) renderCard(filtered[Math.min(idx, filtered.length-1)]);
      });
      $("#search").addEventListener("input", ()=>{
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? standardList.filter(x => (x.Name||"").toLowerCase().includes(q)) : standardList;
        renderPicker(filtered);
        if (filtered.length) renderCard(filtered[0]);
        setStatus(`Affichage : ${filtered.length} résultat(s)`);
      });

      // onglets
      $("#tab-standard").addEventListener("click", ()=>{ setActiveTab("standard"); if (standardList.length) renderCard(standardList[0]); });
      $("#tab-moa").addEventListener("click", ()=>{ setActiveTab("moa"); renderModularCatalog("moa", modular.moa); });
      $("#tab-hound").addEventListener("click", ()=>{ setActiveTab("hound"); renderModularCatalog("hound", modular.hound); });

    } catch(e){
      console.error("[companions] load error:", e);
      const status = $("#status");
      status.textContent = "Erreur de chargement des données.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
