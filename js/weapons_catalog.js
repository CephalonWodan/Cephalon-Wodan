// js/weapons_catalog.js
// Sources: ton API /weapons (enriched) + ExportWeapons (images/fallbacks)
// Onglets Primary/Secondary/Melee, Archwing exclu.

(() => {
  "use strict";

  /* -------------------- Config -------------------- */
  // URL de ton API (même domaine que le site). Fallback local si offline.
  const ENRICHED_WEAPONS_URL_PRIMARY = "https://cephalon-wodan-production.up.railway.app/weapons";
  const ENRICHED_WEAPONS_URL_FALLBACK = "data/enriched_weapons.json";

  // On NE GARDE que ces catégories (UI)
  const KEEP_UI = new Set(["Primary", "Secondary", "Melee"]);
  const MAP_EXPORT_TO_CAT = {
    LongGuns: "Primary",
    Pistols: "Secondary",
    Melee: "Melee",
    // SpaceGuns / SpaceMelee = Archwing -> exclus
  };

  // Images (priorité wiki > cdn > local)
  const wikiImage  = (file) => file ? `https://wiki.warframe.com/images/${encodeURIComponent(file)}` : "";
  const cdnImage   = (name) => name ? `https://cdn.warframestat.us/img/${encodeURIComponent(name)}` : "";
  const localImage = (name) => name ? `img/weapons/${encodeURIComponent(name)}` : "";
  
  /* -------------------- Utils -------------------- */
  const $ = (s) => document.querySelector(s);
  const norm = (s) => String(s || "").trim();
  const esc  = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const byName = (a,b) => (a.name||"").localeCompare(b.name||"");

  const toPct = (v) => (v == null ? "—" : `${Math.round(Number(v) * 1000)/10}%`);
  const toX   = (v) => (v == null ? "—" : `×${v}`);
  const num   = (v) => (v == null ? "—" : String(v));

  function cleanDesc(s){
    return esc(String(s || ""))
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n/g, "<br>");
  }
  function coalesce(obj, keys, def=null){ for (const k of keys) if (obj && obj[k]!=null) return obj[k]; return def; }
  function mapByLowerName(list){ const m=new Map(); for (const it of list){ const n=norm(it.name||it.Name||""); if(n) m.set(n.toLowerCase(), it); } return m; }
  const cap = (s) => s ? s[0].toUpperCase()+s.slice(1) : s;

  const subtypeToCategory = (subtype) => {
    const s = String(subtype||"").toLowerCase();
    if (s === "primary") return "Primary";
    if (s === "secondary") return "Secondary";
    if (s === "melee") return "Melee";
    return ""; // on exclut le reste (archgun, archmelee, etc.)
  };

  /* -------------------- Loaders -------------------- */
  async function loadExportWeapons(){
    try{
      const r = await fetch(EXPORT_WEAPONS_URL, { cache:"no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      let list = data && (data.ExportWeapons || data.exportWeapons || data);
      if (!list) return [];
      if (!Array.isArray(list)) list = Object.values(list);
      // Filtre: seulement catégories qu'on mappe (pas SpaceGuns/SpaceMelee)
      list = list.filter(rec => MAP_EXPORT_TO_CAT[rec.ProductCategory]);
      list.sort((a,b)=> (a.Name||"").localeCompare(b.Name||""));
      return list;
    }catch{ return []; }
  }

  async function loadEnrichedWeapons(){
    // essaie l’API; si KO, retombe sur le JSON local
    const tryFetch = async (url) => {
      const r = await fetch(url, { cache:"no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    };
    try{
      return await tryFetch(ENRICHED_WEAPONS_URL_PRIMARY);
    }catch{
      try{
        return await tryFetch(ENRICHED_WEAPONS_URL_FALLBACK);
      }catch{
        return [];
      }
    }
  }

  /* -------------------- Merge model -------------------- */
  function computeDamageMap(apiRec){
    // Dans l’enrichi: damageTypes (map), sinon rien
    const obj = apiRec && (apiRec.damageTypes || apiRec.damage);
    if (!obj || typeof obj !== "object") return null;
    const out = {};
    for (const k of Object.keys(obj)){
      const v = Number(obj[k]); if (!isNaN(v) && v>0) out[k]=v;
    }
    return Object.keys(out).length ? out : null;
  }
  function sumDamage(map){ if(!map) return null; let t=0; for(const k in map){ const v=Number(map[k]); if(!isNaN(v)) t+=v; } return t||null; }

  function unifyWeapon(name, exportRec, apiRec){
    // Catégorie prioritaire = enriched.subtype
    let category = subtypeToCategory(apiRec?.subtype);
    if (!category) {
      category = MAP_EXPORT_TO_CAT[coalesce(exportRec, ["ProductCategory"], "")] || "";
    }

    // Type + description
    const type    = apiRec?.type || exportRec?.Type || "";
    const desc    = apiRec?.description || exportRec?.Description || "";

    // Champs communs
    const mastery = apiRec?.masteryReq ?? exportRec?.Mastery ?? null;
    const dispo   = apiRec?.disposition ?? exportRec?.Disposition ?? null;
    const trigger = apiRec?.trigger || exportRec?.Trigger || null;

    // Stats
    const critC   = apiRec?.criticalChance ?? exportRec?.CritChance ?? null;
    const critM   = apiRec?.criticalMultiplier ?? exportRec?.CritMultiplier ?? null;
    const status  = apiRec?.statusChance ?? exportRec?.StatusChance ?? null;
    // Fire vs Attack speed (mêlée)
    const isMelee = category === "Melee";
    const fire    = isMelee ? (apiRec?.attackSpeed ?? exportRec?.FireRate ?? null)
                            : (apiRec?.fireRate ?? exportRec?.FireRate ?? null);
    const mag     = apiRec?.magazineSize ?? exportRec?.Magazine ?? null;   // peu fréquent sur enriched
    const reload  = apiRec?.reloadTime ?? exportRec?.Reload ?? null;       // idem

    // Dégâts
    const dmgMap  = computeDamageMap(apiRec);
    const total   = apiRec?.damageTypes?.total ?? exportRec?.TotalDamage ?? sumDamage(dmgMap);

    // Image (Export DE d’abord)
    const exportFile = coalesce(exportRec, ["Image","image"], "");
    const apiImgName = apiRec?.imageName || ""; // rarement disponible côté enriched
    const img = wikiImage(exportFile) || cdnImage(exportFile || apiImgName) || localImage(exportFile || apiImgName);

    return {
      name,
      category,
      type,
      description: desc,
      image: img,
      mastery, disposition: dispo, trigger,
      stats: { total, critC, critM, status, fire, mag, reload },
      damage: dmgMap
    };
  }

  function mergeLists(exportList, enrichedList){
    const expBy = mapByLowerName(exportList);
    const apiBy = mapByLowerName(enrichedList);
    const names = new Set([...expBy.keys(), ...apiBy.keys()]);
    const out = [];
    for (const n of names){
      const e = expBy.get(n) || null;
      const a = apiBy.get(n) || null;
      const name = (a?.name || e?.Name || e?.name || "");
      const w = unifyWeapon(name, e, a);
      // Sécurité: ne garde que Primary/Secondary/Melee
      if (KEEP_UI.has(w.category)) out.push(w);
    }
    return out.sort(byName);
  }

  /* -------------------- UI -------------------- */
  const STATE = {
    list: [],           // tout (3 catégories)
    tab: "Primary",     // onglet actif
    q: ""
  };

  const statBox = (label, value) => `
    <div class="stat">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${esc(label)}</div>
      <div class="text-lg font-semibold">${esc(value)}</div>
    </div>`;

  const chip = (t) => t ? `<span class="badge">${esc(t)}</span>` : "";

  function damageRows(map){
    if (!map) return "";
    const rows = Object.entries(map)
      .filter(([k])=>k!=="total")
      .sort((a,b)=>b[1]-a[1])
      .map(([k,v])=>`
        <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
          <div class="text-sm">${esc(k)}</div>
          <div class="font-medium">${esc(v)}</div>
        </div>
      `).join("");
    return `
      <div class="mt-5">
        <div class="text-sm muted mb-2">Damage Details</div>
        <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
          <div class="flex items-center justify-between py-1">
            <div class="text-sm font-medium">total</div>
            <div class="font-semibold">${esc(map.total ?? "—")}</div>
          </div>
          ${rows}
        </div>
      </div>`;
  }

  function renderCard(w){
    const s = w.stats || {};
    const title = esc(w.name || "—");
    const desc  = cleanDesc(w.description || "");
    const fireLabel = (w.category === "Melee") ? "Attack speed" : "Fire rate";

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            ${w.image ? `<img src="${esc(w.image)}" alt="${title}" class="w-full h-full object-contain">` : `<div class="muted">No Image</div>`}
          </div>
        </div>

        <div class="flex-1 flex flex-col gap-4">
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <h2 class="text-xl font-semibold">${title}</h2>
              <div class="mt-2 flex flex-wrap gap-2">
                ${chip(w.category)} ${chip(w.type)} ${w.mastery!=null ? chip(`MR ${w.mastery}`):""}
                ${w.trigger ? chip(w.trigger) : ""} ${w.disposition!=null ? chip(`Disp. ${w.disposition}`):""}
              </div>
              ${desc ? `<p class="mt-2 text-[var(--muted)]">${desc}</p>` : ""}
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            ${statBox("Damage", s.total ?? "—")}
            ${statBox("Crit", toPct(s.critC))}
            ${statBox("Crit Mult.", toX(s.critM))}
            ${statBox("Status", toPct(s.status))}
            ${statBox(fireLabel, num(s.fire))}
            ${s.mag!=null ? statBox("Magazine", num(s.mag)) : ""}
            ${s.reload!=null ? statBox("Reload", num(s.reload)) : ""}
          </div>

          ${damageRows(w.damage)}
        </div>
      </div>
    `;
  }

  function listForTabAndSearch(){
    const q = STATE.q.toLowerCase();
    return STATE.list
      .filter(w => w.category === STATE.tab)
      .filter(w => !q || (w.name.toLowerCase().includes(q)));
  }

  function renderPicker(arr){
    const pick = $("#picker");
    pick.innerHTML = "";
    arr.forEach((w,i)=>{
      const o = document.createElement("option");
      o.value = i;
      o.textContent = w.name;
      pick.appendChild(o);
    });
    pick.value = "0";
  }

  function updateUI(){
    const arr = listForTabAndSearch();
    renderPicker(arr);
    $("#status").textContent = `Category ${STATE.tab} — ${arr.length} Result(s)`;
    if (arr.length) renderCard(arr[0]); else $("#card").innerHTML = `<div class="muted">No Result</div>`;
  }

  function activateTab(cat){
    STATE.tab = cat;
    document.querySelectorAll("#tabs .btn-tab").forEach(b=>{
      b.classList.toggle("active", b.dataset.cat === cat);
    });
    updateUI();
  }

  /* -------------------- Boot -------------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Weapons Loading…";

      const [exportList, enrichedList] = await Promise.all([
        loadExportWeapons(),
        loadEnrichedWeapons()
      ]);

      STATE.list = mergeLists(exportList, enrichedList); // Primary/Secondary/Melee uniquement

      if (!STATE.list.length){
        status.textContent = "No Weapon Found.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // Interactions
      $("#picker").addEventListener("change", (e)=>{
        const arr = listForTabAndSearch();
        const idx = Math.min(parseInt(e.target.value,10) || 0, Math.max(0, arr.length-1));
        if (arr.length) renderCard(arr[idx]);
      });

      $("#search").addEventListener("input", ()=>{
        STATE.q = norm($("#search").value);
        updateUI();
      });

      document.querySelectorAll("#tabs .btn-tab").forEach(btn=>{
        btn.addEventListener("click", ()=> activateTab(btn.dataset.cat));
      });

      // UI init (onglet Primary par défaut)
      activateTab("Primary");
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";
    }catch(e){
      console.error("[weapons] load error:", e);
      status.textContent = "Weapons Loading Error.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
