// js/weapons_catalog.js
// UI style aligné sur Warframes/Companions. Sources :
// - ExportWeapons (WARFRAME officiel — URL hashée à mettre à jour si besoin)
// - WarframeStat API (fallback/complément)

(() => {
  "use strict";

  /* -------------------- Config -------------------- */
  // >>> Mets à jour cette URL si le hash change (voir index_en.txt.lzma) :
  const EXPORT_WEAPONS_URL =
    "http://content.warframe.com/PublicExport/Manifest/ExportWeapons_en.json!00_bEtI98Hav9NkSKXKNxI9cA";

  const WFSTAT_API_URL = "https://api.warframestat.us/weapons/";

  // Catégories valides (armes jouables), pour filtrer bruit/modulaire
  const ALLOWED_API_CATEGORIES = new Set(["Primary", "Secondary", "Melee", "Arch-Gun", "Arch-Melee"]);
  const ALLOWED_EXPORT_PRODUCTS = new Set(["LongGuns", "Pistols", "Melee", "SpaceGuns", "SpaceMelee"]);

  // Images : priorité wiki officiel > CDN WarframeStat > local
  const wikiImage = (file) => file ? `https://wiki.warframe.com/images/${encodeURIComponent(file)}` : "";
  const cdnImage  = (fileOrName) => fileOrName ? `https://cdn.warframestat.us/img/${encodeURIComponent(fileOrName)}` : "";
  const localImage= (fileOrName) => fileOrName ? `img/weapons/${encodeURIComponent(fileOrName)}` : "";

  /* -------------------- Utils -------------------- */
  const $ = (s) => document.querySelector(s);
  const norm = (s) => String(s || "").trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const byName = (a,b) => (a.name || a.Name || "").localeCompare(b.name || b.Name || "");

  const toPct = (v) => (v == null ? "—" : `${Math.round(Number(v) * 1000)/10}%`);
  const toX   = (v) => (v == null ? "—" : `×${v}`);
  const num   = (v) => (v == null ? "—" : String(v));

  function cleanDesc(s){
    return esc(String(s || ""))
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n/g, "<br>");
  }

  function coalesce(obj, keys, def=null){
    for (const k of keys) if (obj && obj[k] != null) return obj[k];
    return def;
  }

  function allowedFromExport(rec){
    const pc = coalesce(rec, ["ProductCategory","productCategory"], "");
    return ALLOWED_EXPORT_PRODUCTS.has(pc);
  }
  function allowedFromApi(rec){
    const c = coalesce(rec, ["category","Category"], "");
    return ALLOWED_API_CATEGORIES.has(c);
  }

  /* -------------------- Loaders -------------------- */
  async function loadExportWeapons(){
    try{
      const r = await fetch(EXPORT_WEAPONS_URL, { cache:"no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      // Export = objet avec propriété ExportWeapons OU simple tableau
      let list = data && (data.ExportWeapons || data.exportWeapons || data);
      if (!list) return [];
      if (!Array.isArray(list)) list = Object.values(list);
      return list.filter(allowedFromExport).sort(byName);
    }catch(_){ return []; }
  }

  async function loadApiWeapons(){
    try{
      const r = await fetch(WFSTAT_API_URL, { cache:"no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!Array.isArray(data)) return [];
      return data.filter(allowedFromApi).sort(byName);
    }catch(_){ return []; }
  }

  function mapByLowerName(list){
    const m = new Map();
    for (const it of list){
      const n = norm(it.name || it.Name || "");
      if (n) m.set(n.toLowerCase(), it);
    }
    return m;
  }

  /* -------------------- Merge model -------------------- */
  function computeDamageMap(apiRec){
    const obj = apiRec && (apiRec.damageTypes || apiRec.damage);
    if (!obj || typeof obj !== "object") return null;
    const out = {};
    for (const k of Object.keys(obj)){
      const v = Number(obj[k]);
      if (!isNaN(v) && v > 0) out[k] = v;
    }
    return Object.keys(out).length ? out : null;
  }

  function sumDamage(map){
    if (!map) return null;
    let t = 0;
    for (const k in map){ const v = Number(map[k]); if (!isNaN(v)) t += v; }
    return t || null;
  }

  function unifyWeapon(name, exportRec, apiRec){
    // Champs de base
    const category = apiRec?.category || (function(pc){
      switch(pc){
        case "LongGuns": return "Primary";
        case "Pistols": return "Secondary";
        case "Melee": return "Melee";
        case "SpaceGuns": return "Arch-Gun";
        case "SpaceMelee": return "Arch-Melee";
        default: return "";
      }
    })(coalesce(exportRec, ["ProductCategory"], ""));

    const type   = apiRec?.type || exportRec?.Type || "";
    const desc   = apiRec?.description || exportRec?.Description || "";
    const mastery= apiRec?.masteryReq ?? exportRec?.Mastery ?? null;
    const dispo  = apiRec?.disposition ?? exportRec?.Disposition ?? null;
    const trigger= apiRec?.trigger || exportRec?.Trigger || null;

    // Stats
    const critC  = apiRec?.criticalChance ?? exportRec?.CritChance ?? null;
    const critM  = apiRec?.criticalMultiplier ?? exportRec?.CritMultiplier ?? null;
    const status = (apiRec?.procChance ?? exportRec?.StatusChance ?? null);
    const fire   = apiRec?.fireRate ?? exportRec?.FireRate ?? null;
    const mag    = apiRec?.magazineSize ?? exportRec?.Magazine ?? null;
    const reload = apiRec?.reloadTime ?? exportRec?.Reload ?? null;

    // Dégâts (API fournit les types; total fallback si possible)
    const dmgMap = computeDamageMap(apiRec);
    const total  = apiRec?.totalDamage ?? exportRec?.TotalDamage ?? sumDamage(dmgMap);

    // Images
    const exportFile = coalesce(exportRec, ["Image","image"], "");
    const apiImgName = apiRec?.imageName || "";
    const wiki = wikiImage(exportFile);
    const cdn  = cdnImage(exportFile || apiImgName);
    const loc  = localImage(exportFile || apiImgName);
    const img  = wiki || cdn || loc;

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

  function mergeLists(exportList, apiList){
    const expBy = mapByLowerName(exportList);
    const apiBy = mapByLowerName(apiList);

    const names = new Set([...expBy.keys(), ...apiBy.keys()]);
    const out = [];
    for (const n of names){
      const e = expBy.get(n) || null;
      const a = apiBy.get(n) || null;
      const name = (a?.name || e?.Name || e?.name || "");
      out.push(unifyWeapon(name, e, a));
    }
    return out.sort((a,b)=>a.name.localeCompare(b.name));
  }

  /* -------------------- UI helpers -------------------- */
  const statBox = (label, value) => `
    <div class="stat">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${esc(label)}</div>
      <div class="text-lg font-semibold">${esc(value)}</div>
    </div>`;

  function chip(t){ return t ? `<span class="badge">${esc(t)}</span>` : ""; }

  function damageRows(map){
    if (!map) return "";
    const rows = Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
      <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
        <div class="text-sm">${esc(k)}</div>
        <div class="font-medium">${esc(v)}</div>
      </div>
    `).join("");
    return `
      <div class="mt-5">
        <div class="text-sm muted mb-2">Détails des dégâts</div>
        <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
          ${rows}
        </div>
      </div>`;
  }

  function renderCard(w){
    const s = w.stats || {};
    const title = esc(w.name || "—");
    const desc  = cleanDesc(w.description || "");

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <!-- image -->
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            ${w.image ? `<img src="${esc(w.image)}" alt="${title}" class="w-full h-full object-contain">`
                       : `<div class="muted">No Image</div>`}
          </div>
        </div>

        <!-- content -->
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
            ${statBox("Dégâts", s.total ?? "—")}
            ${statBox("Crit", toPct(s.critC))}
            ${statBox("Crit Mult.", toX(s.critM))}
            ${statBox("Statut", toPct(s.status))}
            ${statBox("Cadence", num(s.fire))}
            ${s.mag!=null ? statBox("Chargeur", num(s.mag)) : ""}
            ${s.reload!=null ? statBox("Reload", num(s.reload)) : ""}
          </div>

          ${damageRows(w.damage)}
        </div>
      </div>
    `;
  }

  function renderPicker(list){
    const pick = $("#picker");
    pick.innerHTML = "";
    list.forEach((w,i)=>{
      const o = document.createElement("option");
      o.value = i;
      o.textContent = w.name;
      pick.appendChild(o);
    });
    pick.value = "0";
  }

  /* -------------------- Boot -------------------- */
  (async function boot(){
    const status = $("#status");
    try {
      status.textContent = "Chargement des armes…";

      const [exportList, apiList] = await Promise.all([loadExportWeapons(), loadApiWeapons()]);
      const list = mergeLists(exportList, apiList);

      if (!list.length){
        status.textContent = "Aucune arme trouvée.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // UI init
      renderPicker(list);
      renderCard(list[0]);
      const setStatus = (msg, ok=true) => {
        status.textContent = msg;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg" + (ok ? " orn" : "");
        status.style.background = ok ? "rgba(0,229,255,.08)" : "rgba(255,0,0,.08)";
        status.style.color = ok ? "#bfefff" : "#ffd1d1";
      };
      setStatus(`Weapons chargées : ${list.length}`);

      // interactions
      $("#picker").addEventListener("change", (e)=>{
        const idx = parseInt(e.target.value, 10);
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => x.name.toLowerCase().includes(q)) : list;
        if (filtered.length) renderCard(filtered[Math.min(idx, filtered.length-1)]);
      });

      $("#search").addEventListener("input", ()=>{
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => x.name.toLowerCase().includes(q)) : list;
        renderPicker(filtered);
        if (filtered.length) renderCard(filtered[0]);
        setStatus(`Affichage : ${filtered.length} résultat(s)`);
      });

    } catch (e){
      console.error("[weapons] load error:", e);
      status.textContent = "Erreur de chargement des armes.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
