// js/necramechs_archwings.js
(() => {
  "use strict";

  /* ----------------- URLs des datasets ----------------- */
  const WF_EXPORT_WARFRAMES = "data/ExportWarframes_en.json";
  const WF_EXPORT_WEAPONS   = "data/ExportWeapons_en.json";
  const ABILITIES_BY_WF     = "data/abilities_by_warframe.json"; // déjà géré
  const AW_OVERRIDES        = "data/aw_overrides.json";           // nos compléments

  /* ----------------- Images ----------------- */
  // Archwing/Necramech (corps)
  const IMG_SUITS_LOCAL = (file) => file ? `img/mobilesuits/${encodeURIComponent(file)}` : "";
  // Armes Archgun/Archmelee
  const IMG_MSWEAP_LOCAL = (file) => file ? `img/mobilesuits/MSweapons/${encodeURIComponent(file)}` : "";
  // Fallbacks
  const IMG_WIKI  = (file) => file ? `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(file)}` : "";
  const IMG_CDN   = (file) => file ? `https://raw.githubusercontent.com/wfcd/warframe-items/master/data/img/${encodeURIComponent(file)}` : "";

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const pct = (v) => (v == null) ? "—" : `${Math.round(Number(v)*1000)/10}%`;
  const fmt = (v) => (v==null || v==="") ? "—" : String(v);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const coalesce = (o, ks, d=null) => { for (const k of ks) if (o && o[k]!=null) return o[k]; return d; };
  const cleanFileName = (name) => String(name||"").replace(/['’\-\u2019]/g,"").replace(/\s+/g,"") + ".png";

  // Image placeholder + cyclage sur erreurs
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
  function renderImg(name, srcs, klass="w-full h-full object-contain"){
    const safePH = svgPH.replace(/'/g, "%27");
    const dataSrcs = (srcs && srcs.length ? srcs : [svgPH]).join("|").replace(/'/g, "%27");
    const alt = escapeHtml(name||"");
    return `<img src="${srcs?.[0]||svgPH}" data-srcs="${dataSrcs}" data-i="0" alt="${alt}" referrerpolicy="no-referrer" class="${klass}" onerror="__cycleImg(this,'${safePH}')">`;
  }

  /* ----------------- État UI ----------------- */
  let UI = { list: [], filtered: [], idx: 0, mode: "archwing" };

  /* ----------------- Normalisation AW / Necramech ----------------- */
  function detectSuitType(uName){
    const s = String(uName||"");
    if (s.includes("/Mech/") || s.toLowerCase().includes("necramech")) return "Necramech";
    // Archwing
    return "Archwing";
  }
  function normalizeSuits(raw){
    const arr = Array.isArray(raw?.ExportWarframes) ? raw.ExportWarframes.slice() : [];
    return arr.filter(x=>{
      const un = String(x.uniqueName||"");
      return /ArchwingPowersuits|MechPowersuits|Necramech/i.test(un);
    }).map(x=>{
      const name = x.name || "";
      const type = detectSuitType(x.uniqueName);
      const file = cleanFileName(name);
      return {
        Kind: type, Name: name, Description: x.description || "",
        Health: x.health, Shield: x.shield, Armor: x.armor, Energy: x.power,
        Sprint: x.sprintSpeed, Mastery: x.masteryReq,
        _imgSrcs: [ IMG_SUITS_LOCAL(file), IMG_WIKI(file), IMG_CDN(file) ].filter(Boolean)
      };
    }).sort(byName);
  }

  /* ----------------- Normalisation Armes (Archgun/Archmelee) ----------------- */
  function classifyWeapon(x){
    const t = `${x.type||""} ${x.productCategory||""} ${x.uniqueName||""}`.toLowerCase();
    if (t.includes("arch-melee") || t.includes("archmelee") || t.includes("spacemelee") || t.includes("/archwing/melee")) return "Archmelee";
    if (t.includes("arch-gun")   || t.includes("archgun")   || t.includes("spaceguns")  || t.includes("/archwing/primary") || t.includes("heavygun")) return "Archgun";
    return null;
  }
  function normalizeWeapons(raw){
    const arr = Array.isArray(raw?.ExportWeapons) ? raw.ExportWeapons.slice() : [];
    return arr.map(x=>{
      const cls = classifyWeapon(x);
      if (!cls) return null;
      const name = x.name || "";
      const file = cleanFileName(name);
      const crit = x.criticalChance ?? x.critChance ?? null;
      const critM = x.criticalMultiplier ?? x.critMultiplier ?? null;
      const stat  = x.statusChance ?? x.procChance ?? null;
      // cadence/AS
      const fireRate = x.fireRate ?? x.fireRateSecondary ?? null;
      const attackSp = x.attackSpeed ?? null;
      // dégâts total si dispo
      let totalDmg = null;
      const dmg = x.damage || x.damagePerShot || x.totalDamage || null;
      if (dmg && typeof dmg === "object") {
        totalDmg = Object.values(dmg).reduce((a,b)=> a + (Number(b)||0), 0) || null;
      } else if (typeof dmg === "number") totalDmg = dmg;

      return {
        Kind: cls, Name: name, Mastery: x.masteryReq,
        CritC: crit, CritM: critM, Status: stat,
        FireRate: fireRate, AttackSpeed: attackSp,
        Trigger: x.trigger || null,
        Reload: x.reloadTime ?? null,
        TotalDamage: totalDmg,
        _imgSrcs: [ IMG_MSWEAP_LOCAL(file), IMG_WIKI(file), IMG_CDN(file) ].filter(Boolean)
      };
    }).filter(Boolean).sort(byName);
  }

  /* ----------------- Overrides (AW/Necramech) ----------------- */
  function applyOverrides(list, overrides){
    if (!overrides || !Array.isArray(list)) return;
    const m = overrides; // objet {Name: {...}}
    list.forEach(item=>{
      const o = m[item.Name]; if (!o) return;
      // bases (R30 affichage)
      if (o.base){
        item.HealthR30 = o.base.HealthR30 ?? item.HealthR30;
        item.ShieldR30 = o.base.ShieldR30 ?? item.ShieldR30;
        item.ArmorR30  = o.base.ArmorR30  ?? item.ArmorR30;
        item.EnergyR30 = o.base.EnergyR30 ?? item.EnergyR30;
        if (Array.isArray(o.base.Polarities)) item.Polarities = o.base.Polarities.slice();
      }
      if (Array.isArray(o.abilities)) item.Abilities = o.abilities.slice();
    });
  }

  /* ----------------- Rendus ----------------- */
  const statBox = (label, value) => `
    <div class="stat h-24 flex flex-col justify-center">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${escapeHtml(label)}</div>
      <div class="text-2xl font-semibold leading-tight">${escapeHtml(fmt(value))}</div>
    </div>`;

  function chips(arr){ return (arr||[]).map(s=>`<span class="badge">${escapeHtml(s)}</span>`).join(" "); }

  // Carte AW/Necramech
  function renderSuitCard(item){
    const imgHTML = renderImg(item.Name, item._imgSrcs || []);
    const r30 = (n,m=3.5)=> Math.round((Number(n)||0)*m);
    const maxH = item.HealthR30 ?? r30(item.Health);
    const maxS = item.ShieldR30 ?? r30(item.Shield);
    const maxA = item.ArmorR30  ?? r30(item.Armor);
    const maxE = item.EnergyR30 ?? r30(item.Energy, 3.0);

    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div class="flex flex-col gap-3">
          <h2 class="text-2xl font-semibold">${escapeHtml(item.Name)}</h2>
          <div class="flex flex-wrap gap-2">${chips([item.Kind])}</div>
          <p class="text-[var(--muted)] leading-relaxed">${escapeHtml(item.Description||"")}</p>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            ${statBox("HEALTH", item.Health)}${statBox("SHIELD", item.Shield)}${statBox("ARMOR", item.Armor)}${statBox("ENERGY", item.Energy)}
          </div>

          <div class="mt-4">
            <div class="text-[11px] uppercase tracking-wide text-slate-200 mb-2">Max (Rang 30)</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              ${statBox("HEALTH (R30)", maxH)}${statBox("SHIELD (R30)", maxS)}${statBox("ARMOR (R30)",  maxA)}${statBox("ENERGY (R30)", maxE)}
            </div>
          </div>

          ${Array.isArray(item.Abilities) && item.Abilities.length ? `
            <div class="mt-6"><div class="text-sm muted mb-2">Abilities</div>
              <div class="bg-[var(--panel-2)] rounded-xl p-4 border border-[rgba(255,255,255,.08)]">
                ${item.Abilities.map(a=>{
                  const S = a.stats||{};
                  const lines = ["Strength","Duration","Range","Misc"].map(k=>S[k] ? `<div class="text-[13px]"><b>${k}:</b> ${escapeHtml(S[k])}</div>` : "").join("");
                  return `<div class="py-1">
                    <div class="font-medium">• ${escapeHtml(a.name)} <span class="text-[var(--muted)]">(${escapeHtml(a.cost||"—")})</span></div>
                    ${lines}
                  </div>`;
                }).join("")}
              </div>
            </div>` : ""}
        </div>

        <div class="w-full max-w-[420px] mx-auto xl:mx-0">
          <div class="rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn aspect-[1/1] flex items-center justify-center">
            ${imgHTML}
          </div>
        </div>
      </div>
    `;
  }

  // Carte Arme
  function renderWeaponCard(w){
    const imgHTML = renderImg(w.Name, w._imgSrcs || []);
    const rows = [];
    const mk = (k,v)=> rows.push(`<div class="py-1">• <b>${k}:</b> ${escapeHtml(v)}</div>`);
    if (w.TotalDamage!=null) mk("Total Dmg", String(Math.round(w.TotalDamage)));
    if (w.CritC!=null) mk("Crit", `${pct(w.CritC)} ×${fmt(w.CritM)}`);
    if (w.Status!=null) mk("Status", pct(w.Status));
    if (w.FireRate!=null) mk("Fire Rate", fmt(w.FireRate));
    if (w.AttackSpeed!=null) mk("Attack Speed", fmt(w.AttackSpeed));
    if (w.Trigger) mk("Trigger", w.Trigger);
    if (w.Reload!=null) mk("Reload", `${w.Reload}s`);

    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div class="flex flex-col gap-3">
          <h2 class="text-2xl font-semibold">${escapeHtml(w.Name)}</h2>
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
        </div>

        <div class="w-full max-w-[420px] mx-auto xl:mx-0">
          <div class="rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn aspect-[1/1] flex items-center justify-center">
            ${imgHTML}
          </div>
        </div>
      </div>
    `;
  }

  /* ----------------- Picker & filtrage ----------------- */
  function renderPicker(list){
    const pick = $("#picker"); if (!pick) return;
    pick.innerHTML = "";
    list.forEach((it,i)=>{
      const o=document.createElement("option");
      o.value = i; o.textContent = it.Name || "—"; pick.appendChild(o);
    });
    pick.value = "0";
  }

  function ensureModeTabs(){
    let host = document.getElementById("mode-tabs");
    if (host) return host;

    const root = $("#status")?.parentElement || document.body;
    const h1 = root.querySelector("h1") || (()=>{ const f=document.createElement("h1"); f.className="text-2xl font-semibold mb-3"; f.textContent="Archwings / Necramechs"; root.prepend(f); return f; })();

    const row = document.createElement("div");
    row.className = "flex items-center justify-between gap-4 mb-4";
    h1.parentNode.insertBefore(row, h1); row.appendChild(h1);

    host = document.createElement("div");
    host.id = "mode-tabs";
    host.className = "flex flex-wrap items-center gap-2 ml-auto";
    host.innerHTML = `
      <button data-mode="archwing"  class="badge gold px-4 py-2 text-sm md:text-base shadow-sm">Archwings</button>
      <button data-mode="necramech" class="badge px-4 py-2 text-sm md:text-base">Necramechs</button>
      <button data-mode="archgun"   class="badge px-4 py-2 text-sm md:text-base">Archguns</button>
      <button data-mode="archmelee" class="badge px-4 py-2 text-sm md:text-base">Archmelee</button>`;
    row.appendChild(host);
    return host;
  }

  function applyMode(mode){
    UI.mode = mode;
    const host = ensureModeTabs();
    host.querySelectorAll("[data-mode]").forEach(btn=>{
      btn.classList.toggle("gold", btn.dataset.mode === mode);
    });

    // filtre
    const list = UI.allItems.filter(it => {
      if (mode==="archwing")  return it.Kind==="Archwing";
      if (mode==="necramech") return it.Kind==="Necramech";
      if (mode==="archgun")   return it.Kind==="Archgun";
      if (mode==="archmelee") return it.Kind==="Archmelee";
      return true;
    }).sort(byName);

    UI.list = list.slice();
    const q = norm($("#search")?.value).toLowerCase();
    UI.filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
    UI.idx = 0;

    renderPicker(UI.filtered);
    if (UI.filtered.length){
      const it = UI.filtered[0];
      (it.Kind==="Archgun" || it.Kind==="Archmelee") ? renderWeaponCard(it) : renderSuitCard(it);
    }
  }

  /* ----------------- Boot ----------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des données…";

      const [wfRes, wpRes, overRes] = await Promise.all([
        fetch(WF_EXPORT_WARFRAMES).then(r=>r.json()).catch(()=>null),
        fetch(WF_EXPORT_WEAPONS).then(r=>r.json()).catch(()=>null),
        fetch(AW_OVERRIDES).then(r=>r.json()).catch(()=>null)
      ]);

      const suits = normalizeSuits(wfRes);
      applyOverrides(suits, overRes);

      const weaps = normalizeWeapons(wpRes);

      // Fusion dans un seul tableau pour les tabs
      UI.allItems = suits.concat(weaps);

      if (!UI.allItems.length){
        status.textContent = "Aucune donnée trouvée.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // UI de base
      ensureModeTabs();
      $("#picker")?.addEventListener("change", (e)=>{
        const i = e.target.value|0;
        UI.idx = Math.min(i, Math.max(0, UI.filtered.length-1));
        const it = UI.filtered[UI.idx];
        if (!it) return;
        (it.Kind==="Archgun" || it.Kind==="Archmelee") ? renderWeaponCard(it) : renderSuitCard(it);
      });
      $("#search")?.addEventListener("input", ()=>{
        const q = norm($("#search").value).toLowerCase();
        const base = UI.list;
        UI.filtered = q ? base.filter(x => (x.Name||"").toLowerCase().includes(q)) : base;
        UI.idx = 0;
        renderPicker(UI.filtered);
        if (UI.filtered.length){
          const it = UI.filtered[0];
          (it.Kind==="Archgun" || it.Kind==="Archmelee") ? renderWeaponCard(it) : renderSuitCard(it);
        }
        status.textContent = `Affichage : ${UI.filtered.length} résultat(s)`;
      });

      const tabs = ensureModeTabs();
      tabs.querySelector('[data-mode="archwing"]').addEventListener("click", ()=>applyMode("archwing"));
      tabs.querySelector('[data-mode="necramech"]').addEventListener("click", ()=>applyMode("necramech"));
      tabs.querySelector('[data-mode="archgun"]').addEventListener("click", ()=>applyMode("archgun"));
      tabs.querySelector('[data-mode="archmelee"]').addEventListener("click", ()=>applyMode("archmelee"));

      applyMode("archwing"); // démarrage sur Archwings

      status.textContent = `Datasets chargés : ${UI.allItems.length}`;
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";
      try{ status.setAttribute('aria-busy','false'); }catch(_){}
    } catch(e){
      console.error("[aw/nm] load error:", e);
      status.textContent = "Erreur de chargement des données.";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
