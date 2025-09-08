// js/aw_mech_catalog.js
(() => {
  "use strict";

  /* ============================ SOURCES ============================ */

  const WARFRAMESTAT_URL = "https://api.warframestat.us/warframes/?language=en";
  const DATA = {
    exportWarframes: "data/ExportWarframes_en.json",
    exportWeapons:   "data/ExportWeapons_en.json",
    abilitiesA:      "data/abilities.json",
    abilitiesB:      "data/warframe_abilities.json",
    abilitiesC:      "data/abilities_by_warframe.json",
    overrides:       "data/aw_overrides.json"        // ← NEW : compléments (base + R30 + abilities)
  };

  /* =============================== UTILS ============================== */

  const $  = (s) => document.querySelector(s);
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const fmtNum = (v) => (v ?? v === 0) ? String(v) : "—";
  const pct = (v) => (v==null) ? "—" : `${Math.round(v*1000)/10}%`;
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));

  async function getJSON(u){
    try{ const r = await fetch(u, {cache:"force-cache"}); return r.ok ? r.json() : null; }
    catch { return null; }
  }

  // Retire un éventuel tag d’angle au début : <ARCHWING> Elytron → Elytron
  const stripAngleTag = (s) => String(s||"").replace(/^<[^>]+>\s*/g, "").trim();

  let UI = { mode:"archwing", list:[], filtered:[], idx:0 };

  /* ============================== POLARITÉS ============================== */

  function extractPolaritiesFromItem(item){
    let p = item.Polarities || item.polarities || item.Slots || null;
    if (typeof p === "string") p = p.split(/[,\s]+/).filter(Boolean);
    return Array.isArray(p) ? p : [];
  }

  const POL_FILES = {
    Madurai:"Madurai_Pol.svg", Vazarin:"Vazarin_Pol.svg", Naramon:"Naramon_Pol.svg",
    Zenurik:"Zenurik_Pol.svg", Unairu:"Unairu_Pol.svg",  Umbra:"Umbra_Pol.svg",
    Penjaga:"Penjaga_Pol.svg", Exilus:"Exilus_Pol.svg",  Any:"Any_Pol.svg",
    Universal:"Any_Pol.svg", None:"Any_Pol.svg"
  };
  const CANON_POL = Object.fromEntries(Object.keys(POL_FILES).map(k=>[k.toLowerCase(),k]));
  const canonPol = (p)=>{ if(!p) return null; const k=String(p).trim().toLowerCase(); const ali={any:"Any",none:"Any",universal:"Any"}; return CANON_POL[k]||CANON_POL[ali[k]]||(p[0].toUpperCase()+p.slice(1)); };
  function injectLocalPolIcons(host, arr){
    if (!host) return;
    const list = (arr||[]).map(canonPol).filter(Boolean);
    host.innerHTML = "";
    host.classList.add("polarity-row");
    host.style.display = "flex";
    host.style.flexWrap = "wrap";
    host.style.alignItems = "center";
    host.style.gap = "10px";
    list.forEach(p=>{
      const pill = document.createElement("span");
      pill.className = "pol-icon";
      const img = new Image();
      img.alt=p; img.loading="lazy"; img.decoding="async";
      img.src = `img/polarities/${POL_FILES[p]||POL_FILES.Any}`;
      img.onerror = ()=>{ pill.textContent = p[0]||"?"; };
      pill.appendChild(img);
      host.appendChild(pill);
    });
  }

  /* ================================= IMAGES =============================== */

  const WIKI_FILE  = (file) => file ? `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(file)}` : "";
  const CDN_FILE   = (file) => file ? `https://cdn.warframestat.us/img/${encodeURIComponent(file)}` : "";

  // Aliases explicites (Nom → Fichier)
  const IMG_ALIASES = {
    /* Suits */
    "Amesha":"Amesha.png","Bonewidow":"Bonewidow.png","Elytron":"Elytron.png","Itzal":"Itzal.png",
    "Odonata":"Odonata.png","Odonata Prime":"OdonataPrime.png","Voidrig":"Voidrig.png",
    "Damaged Necramech Casing":"DamagedNecramechCasing.png","Damaged Necramech Engine":"DamagedNecramechEngine.png",
    "Damaged Necramech Pod":"DamagedNecramechPod.png","Damaged Necramech Weapon Pod":"DamagedNecramechWeaponPod.png",
    "Generic Archwing Harness":"GenericArchwingHarness.png","Generic Archwing Systems":"GenericArchwingSystems.png",
    "Generic Archwing Wings":"GenericArchwingWings.png","Voidrig Capsule":"VoidrigCapsule.png",
    "Voidrig Casing":"VoidrigCasing.png","Voidrig Engine":"VoidrigEngine.png","Voidrig Weapon Pod":"VoidrigWeaponPod.png",
    /* Weapons */
    "Agkuza":"Agkuza.png","Arquebex":"Arquebex.png","Centaur":"Centaur.png","Cortege":"Cortege.png",
    "Corvas":"Corvas.png","Corvas Prime":"CorvasPrime.png","Cyngas":"Cyngas.png","Dual Decurion":"DualDecurion.png",
    "Dual Decurions":"DualDecurion.png","Fluctus":"Fluctus.png","Grattler":"Grattler.png","Imperator":"Imperator.png",
    "Imperator Vandal":"ImperatorVandal.png","Ironbride":"Ironbride.png","Kaszas":"Kaszas.png","Knux":"Knux.png",
    "Kuva Ayanga":"KuvaAyanga.png","Kuva Grattler":"KuvaGrattler.png","Larkspur":"Larkspur.png",
    "Larkspur Prime":"LarkspurPrime.png","Mandonel":"Mandonel.png","Mausolon":"Mausolon.png","Morgha":"Morgha.png",
    "Onorix":"Onorix.png","Phaedra":"Phaedra.png","Prisma Dual Decurions":"PrismaDualDecurions.png",
    "Prisma Veritux":"PrismaVeritux.png","Rathbone":"Rathbone.png","Velocitus":"Velocitus.png","Veritux":"Veritux.png"
  };

  const svgPlaceholder = (() => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/></linearGradient></defs><rect width="600" height="360" fill="url(#g)"/><rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/><text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  })();

  function renderImg(name, srcs, klass) {
    klass = klass || "w-full h-full object-contain";
    var safePH = svgPlaceholder.replace(/'/g, "%27");
    var first = (srcs && srcs.length) ? srcs[0] : svgPlaceholder;
    var dataSrcs = ((srcs && srcs.length) ? srcs : [svgPlaceholder]).join("|").replace(/'/g, "%27");
    var alt = String(name || "").replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]);
    });
    var onerr = "var el=this,arr=(el.getAttribute('data-srcs')||'').split('|');" +
                "var i=Number(el.getAttribute('data-i')||'0')+1;" +
                "if(i<arr.length){el.setAttribute('data-i',String(i));el.src=arr[i];}" +
                "else{el.onerror=null;el.src='" + safePH + "';}";
    return `<img src="${first}" data-srcs="${dataSrcs}" data-i="0" alt="${alt}" referrerpolicy="no-referrer" class="${klass}" onerror="${onerr}">`;
  }

  function fileNameFor(name){
    if (!name) return "";
    name = stripAngleTag(name);
    if (IMG_ALIASES[name]) return IMG_ALIASES[name];
    return name.replace(/\s+/g, "") + ".png";
  }

  function makeImgCandidates(name, kind){
    const f = fileNameFor(name);
    if (!f) return [];
    const locals = (kind === "archgun" || kind === "archmelee")
      ? [`img/mobilesuits/MSweapons/${encodeURIComponent(f)}`]
      : [`img/mobilesuits/${encodeURIComponent(f)}`];
    return [ ...locals, WIKI_FILE(f), CDN_FILE(f) ];
  }

  /* ===================== DÉTECTION & NORMALISATION ===================== */

  function detectKind(uName, productCategory, name){
    const u  = String(uName||"").toLowerCase();
    const pc = String(productCategory||"").toLowerCase();
    const nm = String(name||"").toLowerCase();

    if (u.includes("/mech/") || u.includes("necramech") || nm.includes("voidrig") || nm.includes("bonewidow"))
      return "necramech";
    if (u.includes("/archwing/") || u.includes("archwingpowersuits") ||
        (u.includes("archwing") && (u.includes("/powersuits/") || u.includes("/avatar/"))) ||
        pc.includes("archwing"))
      return "archwing";

    if (u.includes("archwinggun") || u.includes("/spaceguns/") || pc.includes("archguns") || pc.includes("arch-gun"))
      return "archgun";
    if (u.includes("archwingmelee") || u.includes("/spacemelee/") || pc.includes("archmelee") || pc.includes("arch-melee"))
      return "archmelee";

    return null;
  }

  function normalizePowersuit(x){
    const raw = x.name || x.Name || "";
    const name = stripAngleTag(raw);
    const kind = detectKind(x.uniqueName, x.productCategory, name);
    return {
      Kind: kind,
      Name: name,
      Description: x.description || "",
      Armor:  x.armor  ?? x.Armor  ?? 0,
      Health: x.health ?? x.Health ?? 0,
      Shield: x.shield ?? x.Shield ?? 0,
      Energy: x.power  ?? x.Power  ?? x.Energy ?? null,
      Polarities: x.polarities || x.Polarities || [],
      _imgSrcs: makeImgCandidates(name, kind)
      // R30 seront injectés via overrides si disponibles (HealthR30/ShieldR30/ArmorR30/EnergyR30)
    };
  }

  function sumDamage(dmg){ if (!dmg || typeof dmg !== "object") return null; let t=0; for(const k in dmg){ const v=Number(dmg[k]); if(!isNaN(v)) t+=v; } return t||null; }
  function normalizeWeapon(x){
    const raw = x.name || x.Name || "";
    const name = stripAngleTag(raw);
    const kind = detectKind(x.uniqueName, x.productCategory, name);
    return {
      Kind: kind,
      Name: name,
      Description: x.description || "",
      Damage: x.damage || x.Damage || null,
      TotalDamage: sumDamage(x.damage || x.Damage) || null,
      CritChance: x.criticalChance ?? x.CritChance ?? null,
      CritMultiplier: x.criticalMultiplier ?? x.CritMultiplier ?? null,
      Status: x.procChance ?? x.StatusChance ?? null,
      FireRate: x.fireRate ?? x.FireRate ?? null,
      Polarities: x.polarities || x.Polarities || [],
      _imgSrcs: makeImgCandidates(name, kind)
    };
  }

  /* ============================ ABILITIES ============================ */

  function buildAbilitiesMapFromExportWarframes(suitsSrc){
    const out = new Map();
    const push = (suit, a) => {
      const key = stripAngleTag(suit||"").toLowerCase();
      if (!key || !a || !a.name) return;
      if (!out.has(key)) out.set(key, []);
      const list = out.get(key);
      if (!list.some(x => x.name===a.name && x.desc===a.desc)) list.push(a);
    };
    const getArr = (obj, key) => {
      const v = obj?.[key];
      return Array.isArray(v) ? v : null;
    };
    const pickName = (a) => a?.name || a?.Name || a?.ability || a?.Ability || a?.abilityName || a?.AbilityName || a?.DisplayName || "";
    const pickDesc = (a) => a?.description || a?.Description || a?.desc || a?.Desc || a?.longDescription || "";
    const pickCost = (a) => a?.energyCost ?? a?.EnergyCost ?? a?.cost ?? a?.Energy ?? null;

    (Array.isArray(suitsSrc) ? suitsSrc : []).forEach(x=>{
      const suit = x.name || x.Name || "";
      const kind = detectKind(x.uniqueName, x.productCategory, suit);
      if (!(kind==="archwing" || kind==="necramech")) return;

      const candidates =
        (getArr(x,"abilities") || getArr(x,"Abilities") || getArr(x,"AbilityInfos") || getArr(x,"AbilityInfo") || getArr(x,"Powers") || getArr(x,"powers") || [])
        .filter(Boolean);

      candidates.forEach(a=>{
        const nm = pickName(a);
        if (!nm) return;
        push(suit, { name:nm, desc:pickDesc(a), cost:pickCost(a) });
      });
    });

    for (const [k,list] of out) out.set(k, list.slice(0,4));
    return out;
  }

  function buildAbilitiesMapFromAuxSources(srcs){
    const out = new Map();
    const push = (suit, a) => {
      const key = stripAngleTag(suit||"").toLowerCase();
      if (!key || !a || !a.name) return;
      if (!out.has(key)) out.set(key, []);
      const list = out.get(key);
      if (!list.some(x => x.name===a.name && x.desc===a.desc)) list.push(a);
    };

    const ws = srcs.warframestat;
    if (Array.isArray(ws)){
      ws.forEach(e=>{
        const suit = e.name || e.warframe || "";
        const abs  = Array.isArray(e.abilities) ? e.abilities : [];
        abs.forEach(a => push(suit, { name: a.name || a.ability || "", desc: a.description || a.desc || "", cost: null }));
      });
    }

    [srcs.abilitiesA, srcs.abilitiesB, srcs.abilitiesC].forEach(raw=>{
      if (!raw) return;

      if (Array.isArray(raw)){
        raw.forEach(x=>{
          const suit = x.suitName || x.SuitName || x.parentName || x.Warframe || x.frameName || x.name || "";
          const arr =
            x.abilities || x.Abilities ||
            (Array.isArray(x.abilityList) ? x.abilityList.map(n=>({name:n, desc:""})) : null) ||
            (x.abilityName ? [{name:x.abilityName, desc:(x.description||x.desc||""), cost:(x.energyCost??x.energy??null)}] : null);
          if (suit && Array.isArray(arr)){
            arr.forEach(a => push(suit, { name: a.name || a.ability || "", desc: a.description || a.desc || "", cost: a.energyCost ?? a.cost ?? a.energy ?? null }));
          }
        });
      }

      if (!Array.isArray(raw) && raw && typeof raw==="object"){
        Object.entries(raw).forEach(([k,v])=>{
          const suit = k;
          const arr = Array.isArray(v) ? v : (Array.isArray(v?.abilities) ? v.abilities : []);
          arr.forEach(a => push(suit, { name: a.name || a.ability || String(a), desc: a.description || a.desc || "", cost: a.energyCost ?? a.cost ?? a.energy ?? null }));
        });
      }
    });

    for (const [k,list] of out) out.set(k, list.slice(0,4));
    return out;
  }

  /* ================================ OVERRIDES ================================ */

  function applyOverridesToSuits(suits, overrides) {
    if (!overrides || typeof overrides !== "object") return;
    suits.forEach(s => {
      const ov = overrides[s.Name];
      if (!ov || !ov.base) return;
      const b = ov.base;
      if (b.Energy != null)      s.Energy = b.Energy;
      if (b.SprintSpeed != null) s.SprintSpeed = b.SprintSpeed;
      if (b.Mastery != null)     s.Mastery = b.Mastery;
      if (Array.isArray(b.Polarities)) s.Polarities = b.Polarities.slice();

      // NEW: Rank 30
      if (b.HealthR30 != null) s.HealthR30 = b.HealthR30;
      if (b.ShieldR30 != null) s.ShieldR30 = b.ShieldR30;
      if (b.ArmorR30  != null) s.ArmorR30  = b.ArmorR30;
      if (b.EnergyR30 != null) s.EnergyR30 = b.EnergyR30;
    });
  }

  function mergeAbilityOverrides(abilitiesMap, overrides) {
    if (!overrides || typeof overrides !== "object") return abilitiesMap;
    const out = new Map(abilitiesMap);
    Object.entries(overrides).forEach(([suitName, ov])=>{
      if (!ov || !Array.isArray(ov.abilities) || !ov.abilities.length) return;
      const key = (suitName || "").toLowerCase();
      out.set(key, ov.abilities.map(a => ({
        name: a.name || "",
        desc: a.desc || "",
        cost: a.cost ?? null,
        stats: a.stats || null
      })).filter(x=>x.name));
    });
    return out;
  }

  /* ================================ UI ================================ */

  const statBox = (label, value) => `
    <div class="stat h-24 flex flex-col justify-center">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${escapeHtml(label)}</div>
      <div class="text-2xl font-semibold leading-tight">${escapeHtml(fmtNum(value))}</div>
    </div>`;
  const chip = (t) => `<span class="badge">${escapeHtml(t)}</span>`;

  function abilityBlock(name, cost, desc, stats){
    const costTxt = (cost==null || cost==="") ? "" : `<span class="opacity-80">•</span> <b>Énergie :</b> ${escapeHtml(String(cost))}`;
    const statsRows = (stats && typeof stats==="object")
      ? `<div class="mt-2 text-xs grid gap-1">
           ${Object.entries(stats).map(([k,v])=>`<div><b>${escapeHtml(k)} :</b> ${escapeHtml(String(v))}</div>`).join("")}
         </div>`
      : "";
    return `
      <div class="rounded-xl bg-[var(--panel-2)] border p-4">
        <div class="font-semibold mb-1">${escapeHtml(name)}</div>
        <div class="text-sm mb-2">${escapeHtml(desc||"")}</div>
        <div class="text-xs opacity-80">${costTxt}</div>
        ${statsRows}
      </div>`;
  }

  function renderSuitCard(it, abilitiesBySuit){
    const name = it.Name;
    const img  = renderImg(name, it._imgSrcs);
    const polys = extractPolaritiesFromItem(it);
    const ab = abilitiesBySuit.get(name.toLowerCase()) || [];

    // R30 (si fournis par overrides)
    const hasR30 = (it.HealthR30!=null || it.ShieldR30!=null || it.ArmorR30!=null || it.EnergyR30!=null);

    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div class="flex flex-col gap-4">
          <h2 class="text-2xl font-semibold">${escapeHtml(name)}</h2>
          <div>${chip(it.Kind==="archwing"?"Archwing":"Necramech")}</div>
          <p class="text-[var(--muted)] leading-relaxed">${escapeHtml(it.Description||"")}</p>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            ${statBox("ARMOR", it.Armor)}${statBox("HEALTH", it.Health)}${statBox("SHIELD", it.Shield)}${it.Energy!=null ? statBox("ENERGY", it.Energy) : ""}
          </div>

          ${hasR30 ? `
            <div class="mt-4">
              <div class="text-[11px] uppercase tracking-wide text-slate-200 mb-2">Max (Rank 30)</div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                ${it.HealthR30!=null ? statBox("HEALTH (R30)", it.HealthR30) : ""}
                ${it.ShieldR30!=null ? statBox("SHIELD (R30)", it.ShieldR30) : ""}
                ${it.ArmorR30!=null  ? statBox("ARMOR (R30)",  it.ArmorR30)  : ""}
                ${it.EnergyR30!=null ? statBox("ENERGY (R30)", it.EnergyR30) : ""}
              </div>
            </div>` : ""}

          ${polys.length ? `
            <div class="mt-4">
              <div class="polarity-label">Polarities</div>
              <div class="polarity-row" data-zone="others"></div>
            </div>` : ""}

          ${ab.length ? `
            <div class="mt-6">
              <div class="text-sm muted mb-2">Abilities</div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${ab.map(a=>abilityBlock(a.name,a.cost,a.desc,a.stats)).join("")}
              </div>
            </div>` : ""}
        </div>

        <div class="w-full max-w-[420px] mx-auto xl:mx-0">
          <div class="rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn aspect-[1/1] flex items-center justify-center">
            ${img}
          </div>
        </div>
      </div>
    `;

    document.dispatchEvent(new CustomEvent("wf:card-rendered", {
      detail: { wf: { name, auraPolarity:null, polarities: polys }, source: "awmech" }
    }));
    if (polys.length){
      injectLocalPolIcons($("#card .polarity-row[data-zone='others']"), polys);
    }
  }

  function renderWeaponCard(it){
    const name = it.Name;
    const img  = renderImg(name, it._imgSrcs);
    const polys = extractPolaritiesFromItem(it);
    const rows = [
      it.TotalDamage!=null ? `Dégâts ${it.TotalDamage}` : null,
      it.CritChance!=null ? `Crit ${pct(it.CritChance)}${it.CritMultiplier?` ×${it.CritMultiplier}`:""}` : null,
      it.Status!=null ? `Statut ${pct(it.Status)}` : null,
      it.FireRate!=null ? `Cadence ${fmtNum(it.FireRate)}` : null
    ].filter(Boolean).join(" · ");

    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div class="flex flex-col gap-4">
          <h2 class="text-2xl font-semibold">${escapeHtml(name)}</h2>
          <div>${chip(it.Kind==="archgun"?"Arch-Gun":"Arch-Melee")}</div>
          <p class="text-[var(--muted)] leading-relaxed">${escapeHtml(it.Description||"")}</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div class="h-24 flex flex-col justify-center">
              <div class="text-[10px] uppercase tracking-wide text-slate-200">Principales stats</div>
              <div class="text-base leading-relaxed">${escapeHtml(rows || "—")}</div>
            </div>
          </div>

          ${polys.length ? `
            <div class="mt-4">
              <div class="polarity-label">Polarities</div>
              <div class="polarity-row" data-zone="others"></div>
            </div>` : ""}
        </div>

        <div class="w-full max-w-[420px] mx-auto xl:mx-0">
          <div class="rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn aspect-[1/1] flex items-center justify-center">
            ${img}
          </div>
        </div>
      </div>
    `;

    document.dispatchEvent(new CustomEvent("wf:card-rendered", {
      detail: { wf: { name, auraPolarity:null, polarities: polys }, source: "awmech" }
    }));
    if (polys.length){
      injectLocalPolIcons($("#card .polarity-row[data-zone='others']"), polys);
    }
  }

  function renderCard(it, abilitiesMap){
    if (!it) return;
    if (it.Kind==="archgun" || it.Kind==="archmelee") renderWeaponCard(it);
    else renderSuitCard(it, abilitiesMap);
  }

  function renderPicker(list){
    const pick = $("#picker");
    if (!pick) return;
    pick.innerHTML = "";
    list.forEach((it, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = it.Name || "—";
      pick.appendChild(o);
    });
    pick.value = "0";
  }

  /* ================================ BOOT ================================ */

  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement…";

      const [
        exportWarframesRaw,
        exportWeaponsRaw,
        abilitiesRawA,
        abilitiesRawB,
        abilitiesRawC,
        warframestatRaw,
        overridesRaw
      ] = await Promise.all([
        getJSON(DATA.exportWarframes),
        getJSON(DATA.exportWeapons),
        getJSON(DATA.abilitiesA),
        getJSON(DATA.abilitiesB),
        getJSON(DATA.abilitiesC),
        getJSON(WARFRAMESTAT_URL),
        getJSON(DATA.overrides)
      ]);

      // Normalise SUITS
      const suitsSrc = Array.isArray(exportWarframesRaw?.ExportWarframes)
        ? exportWarframesRaw.ExportWarframes
        : (Array.isArray(exportWarframesRaw) ? exportWarframesRaw : []);
      const suits = suitsSrc
        .map(normalizePowersuit)
        .filter(x => x.Kind==="archwing" || x.Kind==="necramech")
        .sort(byName);

      // Apply overrides (base + Rank30)
      applyOverridesToSuits(suits, overridesRaw);

      // Normalise WEAPONS
      const weaponsSrc = Array.isArray(exportWeaponsRaw?.ExportWeapons)
        ? exportWeaponsRaw.ExportWeapons
        : (Array.isArray(exportWeaponsRaw) ? exportWeaponsRaw : []);
      const weapons = weaponsSrc
        .map(normalizeWeapon)
        .filter(x => x.Kind==="archgun" || x.Kind==="archmelee")
        .sort(byName);

      // Abilities :
      const abFromExport = buildAbilitiesMapFromExportWarframes(suitsSrc);
      const abFromAux    = buildAbilitiesMapFromAuxSources({
        warframestat: warframestatRaw,
        abilitiesA: abilitiesRawA,
        abilitiesB: abilitiesRawB,
        abilitiesC: abilitiesRawC
      });
      let abilitiesMap = new Map(abFromAux);
      for (const [k, list] of abFromExport) abilitiesMap.set(k, list);
      abilitiesMap = mergeAbilityOverrides(abilitiesMap, overridesRaw); // ← overrides (wiki)

      // Datasets par onglet
      const byMode = {
        archwing:  suits.filter(x=>x.Kind==="archwing"),
        necramech: suits.filter(x=>x.Kind==="necramech"),
        archgun:   weapons.filter(x=>x.Kind==="archgun"),
        archmelee: weapons.filter(x=>x.Kind==="archmelee"),
      };

      // UI init
      UI.mode = "archwing";
      UI.list = byMode[UI.mode];
      UI.filtered = UI.list.slice();
      UI.idx = 0;

      const setStatus = () => {
        status.textContent = `Affichage : ${UI.filtered.length} ${UI.mode}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      };

      renderPicker(UI.list);
      renderCard(UI.filtered[0], abilitiesMap);
      setStatus();

      // Interactions
      $("#picker")?.addEventListener("change", (e)=>{
        UI.idx = e.target.value|0;
        renderCard(UI.filtered[UI.idx], abilitiesMap);
      });

      $("#search")?.addEventListener("input", ()=>{
        const q = norm($("#search").value).toLowerCase();
        UI.filtered = q ? UI.list.filter(x =>
          ((x.Name||"") + " " + (x.Description||"")).toLowerCase().includes(q) ||
          (abilitiesMap.get((x.Name||"").toLowerCase())||[]).some(a => (a.name+" "+a.desc).toLowerCase().includes(q))
        ) : UI.list.slice();
        UI.idx = 0;
        renderPicker(UI.filtered);
        if (UI.filtered.length) renderCard(UI.filtered[0], abilitiesMap);
        setStatus();
      });

      // Onglets (si présents dans le HTML)
      const tabs = document.getElementById("mode-tabs");
      if (tabs) {
        tabs.querySelectorAll("[data-mode]").forEach(btn=>{
          btn.addEventListener("click", ()=>{
            const mode = btn.dataset.mode;
            tabs.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("gold", b===btn));
            UI.mode = mode;
            UI.list = byMode[mode];
            UI.filtered = UI.list.slice();
            UI.idx = 0;
            renderPicker(UI.list);
            if (UI.list.length) renderCard(UI.list[0], abilitiesMap);
            setStatus();
          });
        });
      }

      try{ status?.setAttribute("aria-busy","false"); }catch(_){}

    }catch(e){
      console.error("[aw/mech] load error", e);
      if (status){
        status.textContent = "Erreur de chargement des données.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    }
  })();
})();
