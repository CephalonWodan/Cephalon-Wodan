// js/aw_mech_catalog.js
(() => {
  "use strict";

  /* ----------------- URLs ----------------- */
  const WF_EXPORT_WARFRAMES = "data/ExportWarframes_en.json";
  const WF_EXPORT_WEAPONS   = "data/ExportWeapons_en.json";
  const AW_OVERRIDES        = "data/aw_overrides.json";
  const WF_WEAPONS_API      = "https://api.warframestat.us/weapons/?language=en";

  /* ----------------- Images ----------------- */
  const IMG_SUITS_LOCAL   = (f) => f ? `img/mobilesuits/${encodeURIComponent(f)}` : "";
  const IMG_MSWEAP_LOCAL  = (f) => f ? `img/mobilesuits/MSweapons/${encodeURIComponent(f)}` : "";
  const IMG_WIKI          = (f) => f ? `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(f)}` : "";
  const IMG_CDN           = (f) => f ? `https://raw.githubusercontent.com/wfcd/warframe-items/master/data/img/${encodeURIComponent(f)}` : "";

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name||"").localeCompare(b.Name||"");
  const pct = (v) => (v==null) ? "—" : `${Math.round(Number(v)*1000)/10}%`;
  const fmt = (v) => {
    if (v == null || v === "") return "—";
    if (typeof v === "number") {
      const r = Math.round((v + Number.EPSILON) * 100) / 100;
      return String(Number.isInteger(r) ? Math.trunc(r) : r);
    }
    return String(v);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));

  const cleanDisplayName = (name) => String(name||"")
    .replace(/<[^>]*>\s*/g, "")   // enlève <ARCHWING> / <NECRAMECH>…
    .replace(/\s+/g, " ").trim();

  const cleanFileName = (name) =>
    cleanDisplayName(name).replace(/['’\-\u2019]/g,"").replace(/\s+/g,"") + ".png";

  const slug = (s) => cleanDisplayName(s).toLowerCase()
    .replace(/['’\u2019]/g,"")
    .replace(/[^a-z0-9]+/g," ")
    .trim();

  // Placeholder + cyclage d’images
  const svgPH = (() => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/></linearGradient></defs><rect width="600" height="360" fill="url(#g)"/><rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/><text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  })();
  window.__cycleImg = function(el, placeholder){
    const list = (el.getAttribute("data-srcs") || "").split("|").filter(Boolean);
    let i = parseInt(el.getAttribute("data-i") || "0", 10) + 1;
    if (i < list.length) { el.setAttribute("data-i", String(i)); el.src = list[i]; }
    else { el.onerror = null; el.src = placeholder; }
  };
  function imgTag(name, srcs, klass="w-full h-full object-contain"){
    const safePH = svgPH.replace(/'/g, "%27");
    const dataSrcs = (srcs && srcs.length ? srcs : [svgPH]).join("|").replace(/'/g, "%27");
    return `<img src="${srcs?.[0]||svgPH}" data-srcs="${dataSrcs}" data-i="0" alt="${esc(name||"")}" referrerpolicy="no-referrer" class="${klass}" onerror="__cycleImg(this,'${safePH}')">`;
  }

  /* ----------------- État ----------------- */
  let UI = { all: [], list: [], filtered: [], idx: 0, mode: "archwing" };

  /* ----------------- Normalisation SUITS ----------------- */
  const MECH_NAMES = new Set(["Voidrig","Bonewidow"]);
  function detectSuitKind(x, overrideNamesSet){
    const un = String(x?.uniqueName||"").toLowerCase();
    const nm = cleanDisplayName(x?.name||"");
    if (MECH_NAMES.has(nm) || /mech|necramech/.test(un)) return "Necramech";
    if (/archwing|wing/.test(un)) return "Archwing";
    if (overrideNamesSet?.has(nm)) return MECH_NAMES.has(nm) ? "Necramech" : "Archwing";
    return null;
  }
  function normalizeSuits(raw, overrides){
    const overNames = new Set(Object.keys(overrides||{}));
    const arr = Array.isArray(raw?.ExportWarframes) ? raw.ExportWarframes.slice() : [];
    const list = arr.map(x=>{
      const kind = detectSuitKind(x, overNames);
      if (!kind) return null;
      const name = cleanDisplayName(x.name || "");
      const file = cleanFileName(name);
      return {
        Kind: kind, Name: name, Description: x.description || "",
        Health: x.health, Shield: x.shield, Armor: x.armor, Energy: x.power,
        Sprint: x.sprintSpeed, Mastery: x.masteryReq,
        _imgSrcs: [ IMG_SUITS_LOCAL(file), IMG_WIKI(file), IMG_CDN(file) ].filter(Boolean)
      };
    }).filter(Boolean);

    // ajoute ceux présents uniquement dans overrides (fallback)
    const have = new Set(list.map(i=>i.Name));
    (overrides ? Object.keys(overrides) : []).forEach(n=>{
      if (have.has(n)) return;
      const kind = MECH_NAMES.has(n) ? "Necramech" : "Archwing";
      const file = cleanFileName(n);
      list.push({
        Kind: kind, Name: n, Description: "",
        Health: overrides[n]?.base?.Health ?? null,
        Shield: overrides[n]?.base?.Shield ?? null,
        Armor:  overrides[n]?.base?.Armor  ?? null,
        Energy: overrides[n]?.base?.Energy ?? null,
        _imgSrcs: [ IMG_SUITS_LOCAL(file), IMG_WIKI(file), IMG_CDN(file) ].filter(Boolean)
      });
    });

    return list.sort(byName);
  }

  /* ----------------- Dégâts (helpers robustes) ----------------- */
  const cap = (s) => String(s||"").replace(/[_-]+/g," ").replace(/\b\w/g, m=>m.toUpperCase());
  const isTotalKey = (k) => /^total(\s|$)/i.test(String(k||""));  // ⬅️ ajoute: repère "total"
  function sumDamage(map){ if(!map) return null; let t=0; for(const k in map){ const v=Number(map[k]); if(!isNaN(v)) t+=v; } return t||null; }

  function toDamageMap(d){
    if (!d) return null;

    if (Array.isArray(d)){
      const out = {};
      for (const e of d){
        const kRaw = e?.damageType || e?.type || e?.elemType || e?.name;
        const v = Number(e?.amount ?? e?.value ?? e?.damage ?? e?.dmg);
        if (!kRaw || isNaN(v)) continue;
        const k = cap(kRaw);
        if (isTotalKey(k)) continue;      // ⬅️ ignore toute entrée "total"
        out[k] = (out[k]||0) + v;
      }
      return Object.keys(out).length ? out : null;
    }

    if (typeof d === "object"){
      const out = {};
      for (const kk in d){
        const v = Number(d[kk]);
        if (isNaN(v)) continue;
        const k = cap(kk);
        if (isTotalKey(k)) continue;      // ⬅️ ignore "total"
        out[k] = (out[k]||0) + v;
      }
      return Object.keys(out).length ? out : null;
    }

    return null;
  }
  function mergeDamageMaps(list){
    const out={};
    list.forEach(m=>{
      const map = toDamageMap(m);
      if (!map) return;
      for (const k in map){ out[k] = (out[k]||0) + Number(map[k]||0); }
    });
    return Object.keys(out).length ? out : null;
  }
  function computeDamageMapFromExport(x){
    const parts = [];
    if (x.damage) parts.push(x.damage);
    if (x.normalAttack?.damage) parts.push(x.normalAttack.damage);
    if (x.areaAttack?.damage) parts.push(x.areaAttack.damage);
    if (x.secondaryAreaAttack?.damage) parts.push(x.secondaryAreaAttack.damage);

    if (Array.isArray(x.damagePerShot) && Array.isArray(x.damageTypes)){
      const m={}; x.damageTypes.forEach((t,i)=>{ const v=Number(x.damagePerShot[i]); if(!isNaN(v)) m[t]=(m[t]||0)+v; });
      parts.push(m);
    }
    if (Array.isArray(x.normalDamage) && Array.isArray(x.damageTypes)){
      const m={}; x.damageTypes.forEach((t,i)=>{ const v=Number(x.normalDamage[i]); if(!isNaN(v)) m[t]=(m[t]||0)+v; });
      parts.push(m);
    }
    return mergeDamageMaps(parts);
  }
  function computeDamageMapFromAPI(apiRec){
    // ws API: damageTypes (object) ou damage (object)
    const obj = apiRec && (apiRec.damageTypes || apiRec.damage);
    return toDamageMap(obj);
  }

  /* ----------------- Normalisation ARMES ----------------- */
  function classifyWeapon(x){
    const t = `${x.type||""} ${x.productCategory||""} ${x.uniqueName||""}`.toLowerCase();
    if (t.includes("arch-melee") || t.includes("archmelee") || t.includes("space melee") ||
        (t.includes("archwing") && t.includes("melee")) || t.includes("/archwing/melee") ||
        t.includes("melee/archwing")) return "Archmelee";
    if (t.includes("arch-gun") || t.includes("archgun") || t.includes("spaceguns") ||
        (t.includes("archwing") && (t.includes("gun") || t.includes("primary") || t.includes("rifle"))) ||
        t.includes("heavygun") || t.includes("/archwing/primary")) return "Archgun";
    return null;
  }
  function normalizeWeaponsFromExport(raw){
    const arr = Array.isArray(raw?.ExportWeapons) ? raw.ExportWeapons.slice() : [];
    return arr.map(x=>{
      const kind = classifyWeapon(x);
      if (!kind) return null;
      const name = cleanDisplayName(x.name || "");
      const file = cleanFileName(name);

      const crit  = x.criticalChance ?? x.critChance ?? x.normalAttack?.crit_chance ?? null;
      const critM = x.criticalMultiplier ?? x.critMultiplier ?? x.normalAttack?.crit_mult ?? null;
      const stat  = x.statusChance ?? x.procChance ?? x.normalAttack?.status_chance ?? null;

      const isMelee = (kind === "Archmelee");
      const fireRate = x.fireRate ?? x.fireRateSecondary ?? x.normalAttack?.fire_rate ?? null;
      const atkSpd  = isMelee ? (x.attackSpeed ?? fireRate ?? null) : (x.attackSpeed ?? null);

      const dmgMap = computeDamageMapFromExport(x);
      let totalDmg = sumDamage(dmgMap);
      if (totalDmg == null) {
        const d = x.totalDamage ?? x.damage;
        if (typeof d === "number") totalDmg = d;
        else if (d && typeof d === "object") totalDmg = sumDamage(d);
      }

      return {
        Kind: kind, Name: name, _slug: slug(name),
        Mastery: x.masteryReq,
        CritC: crit, CritM: critM, Status: stat,
        FireRate: isMelee ? null : fireRate,
        AttackSpeed: isMelee ? atkSpd : null,
        Trigger: x.trigger || null, Reload: x.reloadTime ?? null,
        TotalDamage: totalDmg, DamageMap: dmgMap || null,
        _imgSrcs: [ IMG_MSWEAP_LOCAL(file), IMG_WIKI(file), IMG_CDN(file) ]
      };
    }).filter(Boolean).sort(byName);
  }
  function normalizeWeaponsFromAPI(apiList){
    const out=[];
    (Array.isArray(apiList)?apiList:[]).forEach(w=>{
      const cat = String(w.category||"").toLowerCase();
      if (!(cat.includes("arch-gun") || cat.includes("archgun") || cat.includes("arch-melee") || cat.includes("archmelee"))) return;
      const name = cleanDisplayName(w.name||"");
      const kind = cat.includes("melee") ? "Archmelee" : "Archgun";

      const dmgMap = computeDamageMapFromAPI(w);
      const total  = w.totalDamage ?? sumDamage(dmgMap);

      const fire   = w.fireRate ?? null;
      const atkSpd = w.speed ?? w.attackSpeed ?? (cat.includes("melee") ? (w.fireRate ?? null) : null);

      out.push({
        Kind: kind, Name: name, _slug: slug(name),
        Mastery: w.masteryReq ?? null,
        CritC: w.criticalChance ?? null,
        CritM: w.criticalMultiplier ?? null,
        Status: w.procChance ?? w.statusChance ?? null,
        FireRate: kind==="Archmelee" ? null : fire,
        AttackSpeed: kind==="Archmelee" ? atkSpd : null,
        Trigger: w.trigger || null,
        Reload: w.reloadTime ?? null,
        TotalDamage: total ?? null,
        DamageMap: dmgMap || null,
        _imgSrcs: null // on garde les images locales/export
      });
    });
    return out.sort(byName);
  }

  function mergeWeapons(expList, apiList){
    const bySlug = (list)=> {
      const m=new Map();
      list.forEach(x=>m.set(x._slug, x));
      return m;
    };
    const E = bySlug(expList), A = bySlug(apiList);
    const names = new Set([...E.keys(), ...A.keys()]);
    const out=[];
    names.forEach(s=>{
      const e = E.get(s) || null;
      const a = A.get(s) || null;
      const base = e || a;
      if (!base) return;
      out.push({
        Kind: base.Kind,
        Name: base.Name,
        _slug: s,
        Mastery: e?.Mastery ?? a?.Mastery ?? null,
        CritC: e?.CritC ?? a?.CritC ?? null,
        CritM: e?.CritM ?? a?.CritM ?? null,
        Status: e?.Status ?? a?.Status ?? null,
        FireRate: base.Kind==="Archmelee" ? null : (e?.FireRate ?? a?.FireRate ?? null),
        AttackSpeed: base.Kind==="Archmelee" ? (e?.AttackSpeed ?? a?.AttackSpeed ?? null) : null,
        Trigger: e?.Trigger ?? a?.Trigger ?? null,
        Reload: e?.Reload ?? a?.Reload ?? null,
        TotalDamage: e?.TotalDamage ?? a?.TotalDamage ?? sumDamage(e?.DamageMap) ?? sumDamage(a?.DamageMap) ?? null,
        DamageMap: e?.DamageMap || a?.DamageMap || null,
        _imgSrcs: e?._imgSrcs || a?._imgSrcs || []
      });
    });
    return out.sort(byName);
  }

  /* ----------------- Overrides (R30, Abilities, Polarities…) ----------------- */
  function applyOverrides(list, overrides){
    if (!overrides) return;
    list.forEach(it=>{
      const o = overrides[it.Name]; if (!o) return;
      if (o.base){
        it.HealthR30 = o.base.HealthR30 ?? it.HealthR30;
        it.ShieldR30 = o.base.ShieldR30 ?? it.ShieldR30;
        it.ArmorR30  = o.base.ArmorR30  ?? it.ArmorR30;
        it.EnergyR30 = o.base.EnergyR30 ?? it.EnergyR30;
        if (Array.isArray(o.base.Polarities)) it.Polarities = o.base.Polarities.slice();
      }
      if (Array.isArray(o.abilities)) it.Abilities = o.abilities.slice();
    });
  }

  /* ----------------- Rendu ----------------- */
  const statBox = (label, value) => `
    <div class="stat h-24 flex flex-col justify-center">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${esc(label)}</div>
      <div class="text-2xl font-semibold leading-tight">${esc(fmt(value))}</div>
    </div>`;
  const chips = (arr)=> (arr||[]).map(s=>`<span class="badge">${esc(s)}</span>`).join(" ");

  function renderSuitCard(it){
    const imgHTML = imgTag(it.Name, it._imgSrcs || []);
    const r30 = (n,m=3.5)=> Math.round((Number(n)||0)*m);
    const maxH = it.HealthR30 ?? r30(it.Health);
    const maxS = it.ShieldR30 ?? r30(it.Shield);
    const maxA = it.ArmorR30  ?? r30(it.Armor);
    const maxE = it.EnergyR30 ?? r30(it.Energy, 3.0);

    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div class="flex flex-col gap-3">
          <h2 class="text-2xl font-semibold">${esc(it.Name)}</h2>
          <div class="flex flex-wrap gap-2">${chips([it.Kind])}</div>
          ${it.Description ? `<p class="text-[var(--muted)] leading-relaxed">${esc(it.Description)}</p>`:""}

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            ${statBox("HEALTH", it.Health)}${statBox("SHIELD", it.Shield)}${statBox("ARMOR", it.Armor)}${statBox("ENERGY", it.Energy)}
          </div>

          <div class="mt-4">
            <div class="text-[11px] uppercase tracking-wide text-slate-200 mb-2">Max (Rang 30)</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              ${statBox("HEALTH (R30)", maxH)}${statBox("SHIELD (R30)", maxS)}${statBox("ARMOR (R30)", maxA)}${statBox("ENERGY (R30)", maxE)}
            </div>
          </div>

          ${Array.isArray(it.Abilities)&&it.Abilities.length ? `
          <div class="mt-6">
            <div class="text-sm muted mb-2">Abilities</div>
            <div class="bg-[var(--panel-2)] rounded-xl p-4 border border-[rgba(255,255,255,.08)]">
              ${it.Abilities.map(a=>{
                const S=a.stats||{};
                const lines=["Strength","Duration","Range","Misc"].map(k=>S[k]?`<div class="text-[13px]"><b>${k}:</b> ${esc(S[k])}</div>`:"").join("");
                return `<div class="py-1">
                  <div class="font-medium">• ${esc(a.name)} <span class="text-[var(--muted)]">(${esc(a.cost||"—")})</span></div>${lines}
                </div>`;
              }).join("")}
            </div>
          </div>`:""}
        </div>

        <div class="w-full max-w-[420px] mx-auto xl:mx-0">
          <div class="rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn aspect-[1/1] flex items-center justify-center">
            ${imgHTML}
          </div>
        </div>
      </div>`;
  }

  function damagePanel(map, total){
    if (!map) return "";

    // filtre toute entrée "total" et valeurs nulles
    const entries = Object.entries(map)
      .filter(([k,v]) => !isTotalKey(k) && Number(v) > 0)
      .sort((a,b) => a[0].localeCompare(b[0]));

    // calcule/reprend le total
    const tot = (total != null) ? total : entries.reduce((a,[,v]) => a + Number(v||0), 0);

    const rows = [
      `<div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)]">
         <div class="text-[13px] text-[var(--muted)]">Total</div><div class="font-medium">${fmt(tot)}</div>
       </div>`
    ].concat(entries.map(([k,v]) =>
      `<div class="flex items-center justify-between py-1">
         <div class="text-[13px]">${esc(k)}</div><div>${fmt(v)}</div>
       </div>`
    ));

    return `<div class="mt-4">
      <div class="text-[11px] uppercase tracking-wide text-slate-200 mb-2">Détails des dégâts</div>
      <div class="bg-[var(--panel-2)] rounded-xl p-4 border border-[rgba(255,255,255,.08)]">
        ${rows.join("")}
      </div>
    </div>`;
  }

  function renderWeaponCard(w){
    const imgHTML = imgTag(w.Name, w._imgSrcs || []);
    const rows=[]; 
    const add=(k,v)=>rows.push(`<div class="py-1">• <b>${esc(k)}:</b> ${esc(v)}</div>`);
    if (w.TotalDamage!=null) add("Total Dmg", String(Math.round(w.TotalDamage)));
    if (w.CritC!=null)      add("Crit Chance", pct(w.CritC));
    if (w.CritM!=null)      add("Crit Multiplier", `×${fmt(w.CritM)}`);
    if (w.Status!=null)     add("Status Chance", pct(w.Status));
    if (w.Kind==="Archmelee") {
      if (w.AttackSpeed!=null) add("Attack Speed", fmt(w.AttackSpeed));
    } else {
      if (w.FireRate!=null)    add("Fire Rate", fmt(w.FireRate));
    }
    if (w.Trigger)          add("Trigger", w.Trigger);
    if (w.Reload!=null)     add("Reload", `${fmt(w.Reload)}s`);

    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div class="flex flex-col gap-3">
          <h2 class="text-2xl font-semibold">${esc(w.Name)}</h2>
          <div class="flex flex-wrap gap-2">${chips([w.Kind])}</div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            ${statBox("MR", w.Mastery ?? "—")}
            ${statBox("CRIT", w.CritC!=null ? pct(w.CritC) : "—")}
            ${statBox("STATUS", w.Status!=null ? pct(w.Status) : "—")}
            ${statBox(w.Kind==="Archmelee" ? "ATK SPD" : "FIRE RATE", w.Kind==="Archmelee" ? w.AttackSpeed : w.FireRate)}
          </div>

          <div class="mt-4">
            <div class="text-[11px] uppercase tracking-wide text-slate-200 mb-2">Détails</div>
            <div class="bg-[var(--panel-2)] rounded-xl p-4 border border-[rgba(255,255,255,.08)]">
              ${rows.join("") || "<div class='text-[13px] text-[var(--muted)]'>Aucun détail exposé par l’export.</div>"}
            </div>
          </div>

          ${damagePanel(w.DamageMap, w.TotalDamage)}
        </div>

        <div class="w-full max-w-[420px] mx-auto xl:mx-0">
          <div class="rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn aspect-[1/1] flex items-center justify-center">
            ${imgHTML}
          </div>
        </div>
      </div>`;
  }

  /* ----------------- Picker & modes ----------------- */
  function renderPicker(list){
    const pick=$("#picker"); if(!pick) return;
    pick.innerHTML=""; list.forEach((it,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=it.Name||"—"; pick.appendChild(o); });
    pick.value="0";
  }
  function ensureModeTabs(){
    let host=document.getElementById("mode-tabs"); if(host) return host;
    const root=$("#status")?.parentElement||document.body;
    const h1=root.querySelector("h1")||(()=>{const f=document.createElement("h1");f.className = "text-2xl font-semibold mb-3";f.textContent="Archwings / Necramechs";root.prepend(f);return f})();
    const row=document.createElement("div"); row.className="flex items-center justify-between gap-4 mb-4"; h1.parentNode.insertBefore(row,h1); row.appendChild(h1);
    host=document.createElement("div"); host.id="mode-tabs"; host.className="flex flex-wrap items-center gap-2 ml-auto";
    host.innerHTML=`
      <button data-mode="archwing"  class="badge gold px-4 py-2 text-sm md:text-base shadow-sm">Archwings</button>
      <button data-mode="necramech" class="badge px-4 py-2 text-sm md:text-base">Necramechs</button>
      <button data-mode="archgun"   class="badge px-4 py-2 text-sm md:text-base">Archguns</button>
      <button data-mode="archmelee" class="badge px-4 py-2 text-sm md:text-base">Archmelee</button>`;
    row.appendChild(host);
    return host;
  }
  function applyMode(mode){
    UI.mode=mode;
    const host=ensureModeTabs();
    host.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("gold", b.dataset.mode===mode));

    const list = UI.all.filter(it=>{
      if(mode==="archwing")  return it.Kind==="Archwing";
      if(mode==="necramech") return it.Kind==="Necramech";
      if(mode==="archgun")   return it.Kind==="Archgun";
      if(mode==="archmelee") return it.Kind==="Archmelee";
      return true;
    }).sort(byName);

    UI.list=list.slice();
    const q=norm($("#search")?.value).toLowerCase();
    UI.filtered=q? list.filter(x=>(x.Name||"").toLowerCase().includes(q)) : list;
    UI.idx=0;

    renderPicker(UI.filtered);
    if(UI.filtered.length){
      const it=UI.filtered[0];
      (it.Kind==="Archgun"||it.Kind==="Archmelee")? renderWeaponCard(it) : renderSuitCard(it);
    } else {
      $("#card").innerHTML = `<div class="card p-6">Aucun élément.</div>`;
    }
  }

  /* ----------------- Boot ----------------- */
  (async function boot(){
    const status=$("#status");
    try{
      status.textContent="Chargement des données…";

      const overrides = await fetch(AW_OVERRIDES).then(r=>r.json()).catch(()=>null);
      const [wfRes, wpRes, apiW] = await Promise.all([
        fetch(WF_EXPORT_WARFRAMES).then(r=>r.json()).catch(()=>null),
        fetch(WF_EXPORT_WEAPONS).then(r=>r.json()).catch(()=>null),
        fetch(WF_WEAPONS_API).then(r=>r.json()).catch(()=>[])
      ]);

      const suits = normalizeSuits(wfRes, overrides);
      if (overrides) applyOverrides(suits, overrides);

      const weExp = normalizeWeaponsFromExport(wpRes);
      const weApi = normalizeWeaponsFromAPI(apiW);
      const weaps = mergeWeapons(weExp, weApi);

      UI.all = suits.concat(weaps);

      if(!UI.all.length){
        status.textContent="Aucune donnée trouvée.";
        status.style.background="rgba(255,0,0,.08)";
        status.style.color="#ffd1d1";
        return;
      }

      ensureModeTabs();

      $("#picker")?.addEventListener("change", (e)=>{
        const i = e.target.value|0;
        UI.idx = Math.min(i, Math.max(0, UI.filtered.length-1));
        const it = UI.filtered[UI.idx]; if(!it) return;
        (it.Kind==="Archgun"||it.Kind==="Archmelee")? renderWeaponCard(it) : renderSuitCard(it);
      });
      $("#search")?.addEventListener("input", ()=>{
        const q=norm($("#search").value).toLowerCase();
        const base=UI.list;
        UI.filtered=q? base.filter(x=>(x.Name||"").toLowerCase().includes(q)) : base;
        UI.idx=0; renderPicker(UI.filtered);
        if(UI.filtered.length){
          const it = UI.filtered[0];
          (it.Kind==="Archgun"||it.Kind==="Archmelee")? renderWeaponCard(it) : renderSuitCard(it);
        }
        status.textContent=`Affichage : ${UI.filtered.length} résultat(s)`;
      });

      const tabs=ensureModeTabs();
      tabs.querySelector('[data-mode="archwing"]').addEventListener("click", ()=>applyMode("archwing"));
      tabs.querySelector('[data-mode="necramech"]').addEventListener("click", ()=>applyMode("necramech"));
      tabs.querySelector('[data-mode="archgun"]').addEventListener("click", ()=>applyMode("archgun"));
      tabs.querySelector('[data-mode="archmelee"]').addEventListener("click", ()=>applyMode("archmelee"));

      // Démarrage sur une catégorie présente
      if (suits.some(s=>s.Kind==="Archwing")) applyMode("archwing");
      else if (suits.some(s=>s.Kind==="Necramech")) applyMode("necramech");
      else if (weaps.some(w=>w.Kind==="Archgun")) applyMode("archgun");
      else applyMode("archmelee");

      status.textContent = `Datasets chargés : ${UI.all.length}`;
      status.className   = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background="rgba(0,229,255,.08)";
      status.style.color="#bfefff";
      try{ status.setAttribute('aria-busy','false'); }catch(_){}
    } catch(e){
      console.error("[aw/mech] load error:", e);
      status.textContent="Erreur de chargement des données.";
      status.style.background="rgba(255,0,0,.08)";
      status.style.color="#ffd1d1";
    }
  })();
})();
