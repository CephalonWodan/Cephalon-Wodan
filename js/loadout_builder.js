/* 
  Loadout Builder – v4
  - Extraction robuste des /mods (array direct, {items}, {data}, {results}, objets-clés…)
  - Debug fiable (reçus / après-pipeline / erreur éventuelle)
  - Fallback d’affichage: si 0 après filtros mais reçu>0 → montrer tranche brute
  - Respect des filtres UI (TYPE / POLARITY / RARITY / GAME MODE / SORT)
  - Normalisation + dédoublonnage + modale Détails + pickers (mods/arcanes/shards)
  - Zéro CSS inline
*/

(() => {
  const API_BASE = "https://cephalon-wodan-production.up.railway.app";
  const API = {
    warframes: `${API_BASE}/warframes`,
    mods: `${API_BASE}/mods`,
    arcanes: `${API_BASE}/arcanes`,
    shards: `${API_BASE}/archonshards`,
  };

  // ---------------- helpers ----------------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const el = (t, p={}, ...c) => { const n=document.createElement(t);
    Object.entries(p).forEach(([k,v])=>{
      if(k==="class") n.className=v;
      else if(k.startsWith("on") && typeof v==="function") n.addEventListener(k.slice(2),v);
      else if(v!==undefined && v!==null) n.setAttribute(k,v);
    });
    for(const x of c) n.append(x && x.nodeType ? x : document.createTextNode(String(x??"")));
    return n;
  };
  const debounce=(f,ms=200)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),ms)}};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const up =(x)=>String(x||"").toUpperCase();
  const low=(x)=>String(x||"").toLowerCase();
  const truthy = v => v!==undefined && v!==null && v!=="";

  const b64urlEncode=obj=>{try{return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replaceAll("=","").replaceAll("+","-").replaceAll("/","_")}catch{return""}};
  const b64urlDecode=s=>{try{return JSON.parse(decodeURIComponent(escape(atob(s.replaceAll("-","+").replaceAll("_","/")))))}catch{return null}};

  async function getJSON(url){ const res=await fetch(url); if(!res.ok) throw new Error(`HTTP ${res.status} on ${url}`); return res.json(); }

  // ---------- state ----------
  const initial=()=>({
    warframeId:null, title:"Mon Loadout", notes:"",
    rank:30, reactor:true,
    aura:null, exilus:null,
    slots:Array.from({length:8},()=>({mod:null,polarity:null})),
    arcanes:[null,null],
    shards:[null,null,null,null,null],
    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
  });
  const STATE = loadFromURL() || JSON.parse(localStorage.getItem("wf-loadout-draft")||"null") || initial();
  const DB = { warframes:[], mods:[], arcanes:[], shards:{}, modsIndex:new Map(), debug:{} };

  function saveDraft(){
    STATE.updatedAt=new Date().toISOString();
    localStorage.setItem("wf-loadout-draft", JSON.stringify(STATE));
    const url=new URL(location.href); url.searchParams.set("s", b64urlEncode(STATE));
    history.replaceState(null,"",url.toString());
  }
  function loadFromURL(){ const url=new URL(location.href); const s=url.searchParams.get("s"); return s? b64urlDecode(s):null; }

  // ---------- capacity / stats ----------
  function frameCapacity(rank,reactor){ const base=clamp(Number(rank)||0,0,60); return reactor? base*2:base; }
  function modDrain(mod, lvl=0){ const base=Number(mod?.drain ?? mod?.baseDrain ?? mod?.cost ?? 0); return Math.max(0, base+(lvl||0)); }
  function effectiveDrain(mod, slotPol, isAura){ if(!mod) return 0; if(isAura) return 0; let d=modDrain(mod,mod.level||0);
    const m=low(mod.polarity||""), s=low(slotPol||""); if(s&&m){ d = s===m ? Math.ceil(d/2) : Math.ceil(d*1.25); } return d; }
  function auraBonusCapacity(auraMod, slotPol){ if(!auraMod) return 0; const base=modDrain(auraMod,auraMod.level||0);
    const m=low(auraMod.polarity||""), s=low(slotPol||""); return (s&&m&&s===m)? base*2 : base; }
  function capacitySummary(){ const cap=frameCapacity(STATE.rank,STATE.reactor);
    const aura=auraBonusCapacity(STATE.aura?.mod||null, STATE.aura?.polarity||null);
    let used=0; for(const s of STATE.slots) used+=effectiveDrain(s.mod,s.polarity,false);
    used+=effectiveDrain(STATE.exilus?.mod||null, STATE.exilus?.polarity||null, false);
    return {cap, auraBonus:aura, used, remain: cap+aura-used}; }
  const getStat=(o,keys,fb=0)=>{ for(const k of keys){ if(o&&o[k]!=null && isFinite(Number(o[k]))) return Number(o[k]); } return fb; };

  // ---------- normalization ----------
  function rnd(){ try{ return crypto.getRandomValues(new Uint32Array(2)).join("-"); }catch{ return "rnd-"+Math.random().toString(36).slice(2); } }
  function modQuality(m){ let q=0; if(truthy(m.imageUrl)||truthy(m.img)||truthy(m.icon))q+=2; if(truthy(m.description)||truthy(m.Details))q+=1;
    if(up(m.source||m.Source).includes("CEPHALON WODAN"))q+=1; if(truthy(m.rarity))q+=.5; return q; }
  function keyForMod(m){ return (m.uniqueName||m.id||m.slug||up(m.name||m.displayName||"")).trim(); }
  function normalizeMod(m){
    const id = m.id||m.uniqueName||m.slug||m.InternalName||m.Name||(m.name?up(m.name):null)||rnd();
    const name = m.name||m.displayName||m.Name||m.title||id;
    const img = m.imageUrl||m.icon||m.img||m.ImageUrl||null;
    const pol = low(m.polarity||m.Polarity||"");
    const rarity = up(m.rarity||m.Rarity||"");
    const compat = m.CompatName||m.compat||m.compatibility||m.Category||m.category||m.ModType||null;
    const set = m.set||m.Set||null;
    const isPvp = !!(m.pvp||m.PvpOnly);
    const desc = m.description||m.Details||"";
    const type = up(m.type||m.Type||"");
    return {...m, id, name, displayName:name, imageUrl:img, polarity:pol, rarity, compat, set, pvp:isPvp, description:desc, type};
  }
  function mergeDuplicates(list){
    const map=new Map();
    for(const raw of list){
      const m=normalizeMod(raw); const k=keyForMod(m);
      if(!map.has(k)){ map.set(k,m); continue; }
      const a=map.get(k); const better = modQuality(m)>modQuality(a)? m:a;
      map.set(k,{...a,...better,
        imageUrl:better.imageUrl||a.imageUrl,
        description:better.description||a.description,
        rarity:better.rarity||a.rarity,
        polarity:better.polarity||a.polarity,
        set:better.set||a.set, compat:better.compat||a.compat
      });
    }
    return [...map.values()];
  }
  function computeCategories(m){
    const cats=[]; const p=up(m.polarity);
    if(p==="AURA") cats.push("AURA");
    if(p==="EXILUS") cats.push("EXILUS");
    if(/augment/i.test(m.name||m.displayName||"")) cats.push("AUGMENT");
    if(up(m.set)==="SET" || /set/i.test(m.set||"")) cats.push("SET");
    return cats;
  }
  function normalizeArc(a){
    const id=a.id||a.uniqueName||a.InternalName||a.Name; const uniqueName=a.uniqueName||a.InternalName||id;
    const name=a.name||a.displayName||a.Name||id; const rarity=up(a.rarity||a.Rarity||""); const type=up(a.type||a.Type||a.category||"");
    return {...a,id,uniqueName,name,displayName:name,rarity,type};
  }
  function normalizeShards(obj){
    const out={}; if(!obj||typeof obj!=="object") return out;
    Object.values(obj).forEach(e=>{
      const color=e.value||e.color;
      const uo=e.upgradeTypes||{}; const upgrades=[];
      for(const k in uo){ const u=uo[k]; if(u && typeof u.value==="string") upgrades.push(u.value); }
      if(color) out[color]={upgrades};
    });
    return out;
  }

  // ---------- extraction robuste ----------
  function extractArray(raw){
    if(Array.isArray(raw)) return raw;
    if(raw && Array.isArray(raw.items)) return raw.items;
    if(raw && Array.isArray(raw.data)) return raw.data;
    if(raw && raw.results && Array.isArray(raw.results)) return raw.results;
    // parfois un objet {id:obj, id2:obj...}
    if(raw && typeof raw==="object"){
      const vals = Object.values(raw).filter(x=>x && typeof x==="object");
      // si c’est un array d’array
      if(vals.length && Array.isArray(vals[0])) return vals.flat();
      return vals;
    }
    return [];
  }

  // ---------- load ----------
  async function loadData(){
    const [wfs, arcs, shards] = await Promise.all([
      getJSON(API.warframes).catch(e=>(console.error(e),[])),
      getJSON(API.arcanes).catch(e=>(console.error(e),[])),
      getJSON(API.shards).catch(e=>(console.error(e),{})),
    ]);
    DB.warframes = Array.isArray(wfs)? wfs : extractArray(wfs);
    DB.arcanes = extractArray(arcs).map(normalizeArc);
    DB.shards = normalizeShards(shards);
    await fetchAndPrepareMods();
    hydrateUI();
  }

  // ---------- mods pipeline ----------
  async function fetchAndPrepareMods(){
    DB.debug = { received:0, afterPipeline:0, error:null };
    let rawList = [];
    try{
      const raw = await getJSON(API.mods);
      rawList = extractArray(raw);
      DB.debug.received = rawList.length;
    }catch(e){
      console.error("[mods] fetch error:", e);
      DB.debug.error = String(e);
      rawList = [];
    }

    const pipeline = (arr)=>{
      let items = arr.map(normalizeMod);
      items = mergeDuplicates(items);
      // catégories
      items.forEach(m => m._categories = computeCategories(m));

      // lire filtres UI
      const fltPol    = $("#fltPol")?.value || "";
      const fltType   = $("#fltType")?.value || "";
      const fltRarity = $("#fltRarity")?.value || "";
      const fltGame   = $("#fltGame")?.value || "";
      const q         = ($("#globalSearch")?.value || "").trim().toLowerCase();

      // TYPE
      if (fltType) {
        items = items.filter(m => {
          if (fltType === "AURA")   return up(m.polarity) === "AURA";
          if (fltType === "EXILUS") return up(m.polarity) === "EXILUS";
          if (fltType === "SET")    return (m._categories||[]).includes("SET");
          if (fltType === "WARFRAME") {
            const W="WARFRAME"; const hasArr = arr => Array.isArray(arr)&&arr.some(x=>up(x).includes(W));
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
        case "drain": items.sort((a,b)=>modDrain(a)-modDrain(b)); break;
        case "rarity":{
          const order={COMMON:1,UNCOMMON:2,RARE:3,LEGENDARY:4};
          items.sort((a,b)=>(order[a.rarity]||99)-(order[b.rarity]||99)||String(a.name).localeCompare(String(b.name)));
          break;
        }
        default: items.sort((a,b)=>String(a.name||a.displayName||a.id).localeCompare(String(b.name||b.displayName||b.id)));
      }

      return items;
    };

    let processed = pipeline(rawList);
    DB.debug.afterPipeline = processed.length;

    // Secours : si 0 après pipeline mais on a reçu des données → montrer tranche brute normalisée
    if (processed.length === 0 && rawList.length > 0) {
      console.warn("[mods] pipeline vide; affichage secours sur la liste brute normalisée (non filtrée).");
      processed = mergeDuplicates(rawList.map(normalizeMod));
      processed.forEach(m => m._categories = computeCategories(m));
      DB.debug.afterPipeline = processed.length;
    }

    DB.mods = processed;
    indexMods();
    renderModList();
  }

  function indexMods(){ DB.modsIndex = new Map(); DB.mods.forEach(m=>DB.modsIndex.set(m.id,m)); }

  // ---------- UI bind ----------
  function hydrateUI(){
    const wfPicker=$("#wfPicker"), rankToggle=$("#rankToggle"), rankSlider=$("#rankSlider"),
          rankVal=$("#rankVal"), reactor=$("#reactor"), globalSearch=$("#globalSearch"),
          resetBuild=$("#resetBuild"), saveBuild=$("#saveBuild"),
          fltPol=$("#fltPol"), fltType=$("#fltType"), fltRarity=$("#fltRarity"), fltGame=$("#fltGame"), fltSort=$("#fltSort");

    // warframes
    wfPicker.innerHTML=""; wfPicker.append(el("option",{value:""},"— Warframe —"));
    for(const wf of DB.warframes){
      const name = wf.name||wf.type||wf.displayName||wf.warframe||wf.uniqueName;
      const val  = wf.uniqueName||wf.id||name;
      wfPicker.append(el("option",{value:val},name));
    }
    wfPicker.value = STATE.warframeId||"";
    wfPicker.addEventListener("change",()=>{ STATE.warframeId=wfPicker.value||null; updateHeaderPreview(); updateStats(); saveDraft(); });

    rankToggle?.addEventListener("change",()=>{ STATE.rank = rankToggle.checked?30:0; if(rankSlider)rankSlider.value=String(STATE.rank); if(rankVal)rankVal.textContent=String(STATE.rank); updateStats(); saveDraft(); });
    rankSlider?.addEventListener("input",()=>{ STATE.rank=Number(rankSlider.value)||0; if(rankVal)rankVal.textContent=String(STATE.rank); if(rankToggle)rankToggle.checked=STATE.rank>=30; updateStats(); saveDraft(); });
    reactor?.addEventListener("change",()=>{ STATE.reactor=!!reactor.checked; updateStats(); saveDraft(); });

    const refetch=debounce(()=>fetchAndPrepareMods(),150);
    globalSearch?.addEventListener("input",refetch);
    [fltPol,fltType,fltRarity,fltGame,fltSort].forEach(sel=>sel?.addEventListener("change",refetch));

    resetBuild?.addEventListener("click",()=>{ const keep=STATE.warframeId; Object.assign(STATE,initial(),{warframeId:keep});
      if(rankSlider)rankSlider.value=String(STATE.rank); if(rankVal)rankVal.textContent=String(STATE.rank); if(rankToggle)rankToggle.checked=true; reactor&&(reactor.checked=true);
      updateStats(); saveDraft(); renderSlotsPreview();
    });

    saveBuild?.addEventListener("click",()=>{ const blob=new Blob([JSON.stringify(STATE,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="loadout.json"; a.click(); URL.revokeObjectURL(url);
    });

    bindSlotPickers();
    updateHeaderPreview(); updateStats(); renderSlotsPreview(); renderModList();
  }

  function updateHeaderPreview(){
    const wf=getSelectedWF(), wfImg=$("#wfImg"), wfTitle=$("#wfTitle"), wfSubtitle=$("#wfSubtitle");
    if(!wf){ wfTitle&&(wfTitle.textContent="NEW BUILD"); wfSubtitle&&(wfSubtitle.textContent="Sélectionnez une Warframe pour démarrer."); wfImg&&(wfImg.src=""); return; }
    const name=wf.name||wf.type||wf.displayName||wf.warframe||wf.uniqueName;
    wfTitle&&(wfTitle.textContent=name); wfSubtitle&&(wfSubtitle.textContent="Régler mods, arcanes et shards pour calculer la capacité."); wfImg&&(wfImg.src="");
  }

  function updateStats(){
    const statsList=$("#statsList"); if(!statsList) return; const wf=getSelectedWF(); statsList.innerHTML="";
    const {cap,auraBonus,used,remain}=capacitySummary();
    const row=(k,v)=>el("div",{class:"stat"},el("span",{class:"k"},k),el("span",{class:"v"},String(v)));
    if(!wf){ statsList.append(row("Capacity",cap),row("Aura bonus",`+${auraBonus}`),row("Used",used),row("Remain",remain)); return; }

    const isR30=STATE.rank>=30; const base=wf.baseStats||wf.stats||wf; const atR30=wf.baseStatsRank30||wf.statsRank30||wf.rank30||{};
    const pick=(k0,k30)=>isR30? getStat(atR30,k30):getStat(base,k0);
    const health=pick(["health","baseHealth","Health"],["health","maxHealth","Health"]);
    const shields=pick(["shields","shield","baseShield","Shield"],["shields","shield","maxShield","Shield"]);
    const armor=pick(["armor","armour","Armor"],["armor","armour","Armor"]);
    const energy=pick(["energy","power","Energy"],["energy","power","Energy"]);
    const sprint=(isR30?(atR30?.sprintSpeed??atR30?.sprint??base?.sprintSpeed??base?.sprint):(base?.sprintSpeed??base?.sprint))??1;

    statsList.append(
      row("Health",Math.round(health)),
      row("Shields",Math.round(shields)),
      row("Armor",Math.round(armor)),
      row("Energy",Math.round(energy)),
      row("Sprint",Number(sprint).toFixed(2)),
      row("Capacity",cap),
      row("Aura bonus",`+${auraBonus}`),
      row("Used",used),
      row("Remain",remain)
    );

    const polList=$("#polList"); if(polList){ polList.innerHTML=""; const polys=wf?.polarities||wf?.Polarities||[]; (Array.isArray(polys)?polys:[]).forEach(p=>polList.append(el("span",{},String(p)))); }
  }

  function renderSlotsPreview(){
    const auraEl=$('[data-slot="aura"]'), exilusEl=$('[data-slot="exilus"]');
    auraEl&&(auraEl.textContent=STATE.aura?.mod?.name||"Aura");
    exilusEl&&(exilusEl.textContent=STATE.exilus?.mod?.name||"Exilus");
    for(let i=0;i<6;i++){ const s=$(`[data-slot="${i+1}"]`); s&&(s.textContent=STATE.slots[i]?.mod?.name||String(i+1)); }
    $('[data-slot="Arcanes-1"]') && ($('[data-slot="Arcanes-1"]').textContent = arcLabel(STATE.arcanes[0]) || "Arcane 1");
    $('[data-slot="Arcanes-2"]') && ($('[data-slot="Arcanes-2"]').textContent = arcLabel(STATE.arcanes[1]) || "Arcane 2");
    for(let i=1;i<=5;i++){ const s=STATE.shards[i-1]; const x=$(`[data-slot="archon-${i}"]`); x&&(x.textContent = s? `${s.color} – ${s.upgrade}`:"Archon Shard"); }
  }
  function arcLabel(id){ if(!id) return ""; const a=DB.arcanes.find(x=>x.id===id||x.uniqueName===id||x.name===id); return a?(a.name||a.displayName||a.id):String(id); }

  function renderModList(){
    const list=$("#modList"); if(!list) return; list.innerHTML="";
    if(!DB.mods.length){
      const d=DB.debug||{};
      list.append(
        el("div",{class:"muted"},"Aucun mod trouvé (vérifie les filtres / API)."),
        el("div",{class:"muted small"},`Debug: reçus=${d.received ?? "?"}, après pipeline=${d.afterPipeline ?? "?"}${d.error? " — erreur: "+d.error:""}`)
      );
      return;
    }
    for(const m of DB.mods.slice(0,300)){
      const tags=el("div",{class:"mod-tags"});
      (m._categories||[]).forEach(c=>tags.append(el("span",{class:"tag"},c)));
      if(m.rarity) tags.append(el("span",{class:"tag"},m.rarity));
      if(m.polarity) tags.append(el("span",{class:"tag"},m.polarity));
      const card=el("div",{class:"mod-card","data-id":m.id},
        el("div",{class:"mod-art"}, m.imageUrl? el("img",{src:m.imageUrl,alt:""}):""),
        el("div",{class:"mod-meta"},
          el("div",{class:"mod-name"}, m.name||m.displayName||m.id),
          tags
        ),
        el("div",{class:"mod-actions"},
          el("button",{class:"btn",onclick:()=>addModToFirstFree(m)},"Add"),
          el("button",{class:"btn ghost",onclick:()=>openModDetails(m)},"Details")
        )
      );
      list.append(card);
    }
  }

  // --------- modal details ----------
  function openModDetails(m){
    const wrap=overlay(m.name||m.displayName||"Mod"); const body=wrap.querySelector(".body");
    const head=el("div",{class:"mod-detail-head"},
      m.imageUrl? el("img",{src:m.imageUrl,alt:""}): el("div",{class:"placeholder"},""),
      el("div",{class:"col"},
        el("div",{class:"title"}, m.name||m.displayName||m.id),
        el("div",{class:"subtitle"}, [up(m.rarity)||""," · ",m.polarity||"", (m.set?" · Set":"")].join(" ").replace(/\s·\s$/,""))
      )
    );
    const desc=el("div",{class:"mod-detail-desc"}, m.description||"—");
    const meta=el("div",{class:"mod-detail-meta"},
      el("div",{} ,`Drain: ${modDrain(m)}`),
      el("div",{} ,`Compat: ${m.compat || "—"}`),
      el("div",{} ,`Catégories: ${(m._categories||[]).join(", ")||"—"}`)
    );
    const act=el("div",{class:"mod-detail-actions"},
      el("button",{class:"btn",onclick:()=>{ addModToFirstFree(m); document.body.removeChild(wrap);} },"Ajouter au build"),
      el("button",{class:"btn ghost",onclick:()=>document.body.removeChild(wrap)},"Fermer")
    );
    body.append(head,desc,meta,act);
  }
  function overlay(title=""){ const s=el("div",{class:"overlay-scrim"}); const b=el("div",{class:"overlay-box"}); const h=el("div",{class:"head"},title); const body=el("div",{class:"body"});
    b.append(h,body); s.append(b); s.addEventListener("click",e=>{ if(e.target===s) document.body.removeChild(s); }); document.body.appendChild(s); return s; }

  // --------- slot pickers ----------
  function addModToFirstFree(mod){
    const idx=STATE.slots.findIndex(s=>!s.mod);
    if(idx>=0) STATE.slots[idx].mod=mod;
    else if(!STATE.exilus?.mod) STATE.exilus={mod,polarity:null};
    else STATE.aura={mod,polarity:null};
    saveDraft(); updateStats(); renderSlotsPreview();
  }
  function getSelectedWF(){ if(!STATE.warframeId) return null; const id=STATE.warframeId;
    return DB.warframes.find(w=>w.uniqueName===id||w.id===id||w.name===id||w.type===id||w.displayName===id||w.warframe===id)||null; }

  function bindSlotPickers(){
    const auraEl=$('[data-slot="aura"]'), exilusEl=$('[data-slot="exilus"]');
    auraEl && auraEl.addEventListener("click",()=>openModPicker({kind:"aura"}));
    exilusEl && exilusEl.addEventListener("click",()=>openModPicker({kind:"exilus"}));
    for(let i=1;i<=6;i++){ const slot=$(`[data-slot="${i}"]`); slot && slot.addEventListener("click",()=>openModPicker({kind:"normal",index:i-1})); }
    const arc1=$('[data-slot="Arcanes-1"]'), arc2=$('[data-slot="Arcanes-2"]');
    arc1 && arc1.addEventListener("click",()=>openArcanePicker(0));
    arc2 && arc2.addEventListener("click",()=>openArcanePicker(1));
    for(let i=1;i<=5;i++){ const s=$(`[data-slot="archon-${i}"]`); s && s.addEventListener("click",()=>openShardPicker(i-1)); }
  }

  function openModPicker({kind,index}){
    const wrap=overlay("Choisir un Mod"); const body=wrap.querySelector(".body");
    const search=el("input",{placeholder:"Rechercher…",class:"picker-search"});
    const polSel=el("select",{class:"picker-select"},
      el("option",{value:""},"Toutes polarités"),
      el("option",{value:"madurai"},"Madurai"),
      el("option",{value:"naramon"},"Naramon"),
      el("option",{value:"vazarin"},"Vazarin"),
      el("option",{value:"zenurik"},"Zenurik"),
      el("option",{value:"umbra"},"Umbra"),
      el("option",{value:"aura"},"Aura"),
      el("option",{value:"exilus"},"Exilus"),
    );
    const list=el("div",{class:"picker-list"});
    const apply=()=>{ list.innerHTML="";
      let items=DB.mods.filter(m=>{
        const name=low(m.name||m.displayName||m.id||"");
        if(search.value && !name.includes(low(search.value))) return false;
        if(kind==="aura"   && up(m.polarity)!=="AURA") return false;
        if(kind==="exilus" && up(m.polarity)!=="EXILUS") return false;
        if(polSel.value && low(m.polarity)!==low(polSel.value)) return false;
        return true;
      });
      if(!items.length) list.append(el("div",{class:"muted"},"Aucun résultat."));
      items.slice(0,250).forEach(m=>{
        const row=el("div",{class:"picker-row"},
          el("span",{class:"picker-name"}, m.name||m.displayName||m.id),
          el("div",{class:"picker-actions"},
            el("button",{class:"btn ghost",onclick:()=>openModDetails(m)},"Détails"),
            el("button",{class:"btn",onclick:()=>{ 
              if(kind==="aura") STATE.aura={mod:m,polarity:STATE.aura?.polarity||null};
              else if(kind==="exilus") STATE.exilus={mod:m,polarity:STATE.exilus?.polarity||null};
              else STATE.slots[index]={...(STATE.slots[index]||{}),mod:m};
              saveDraft(); updateStats(); renderSlotsPreview(); document.body.removeChild(wrap);
            }},"Sélectionner")
          )
        );
        list.append(row);
      });
    };
    search.addEventListener("input",debounce(apply,150)); polSel.addEventListener("change",apply);
    body.append(el("div",{class:"picker-bar"},search,polSel),list,el("div",{class:"picker-actions"},el("button",{class:"btn ghost",onclick:()=>document.body.removeChild(wrap)},"Fermer")));
    apply();
  }

  function openArcanePicker(i){
    const wrap=overlay(`Choisir un Arcane (${i+1})`); const body=wrap.querySelector(".body");
    const search=el("input",{placeholder:"Rechercher…",class:"picker-search"}); const list=el("div",{class:"picker-list"});
    const apply=()=>{ list.innerHTML=""; const items=DB.arcanes.filter(a=>low(a.name||"").includes(low(search.value)));
      if(!items.length) list.append(el("div",{class:"muted"},"Aucun résultat."));
      items.slice(0,200).forEach(a=>{
        const row=el("div",{class:"picker-row"},
          el("span",{class:"picker-name"}, a.name||a.displayName||a.id),
          el("button",{class:"btn",onclick:()=>{ STATE.arcanes[i]=a.id||a.uniqueName||a.name; saveDraft(); renderSlotsPreview(); document.body.removeChild(wrap); }},"Sélectionner")
        ); list.append(row);
      });
    };
    search.addEventListener("input",debounce(apply,150));
    body.append(search,list,el("div",{class:"picker-actions"},el("button",{class:"btn ghost",onclick:()=>document.body.removeChild(wrap)},"Fermer")));
    apply();
  }

  function openShardPicker(idx){
    const wrap=overlay(`Configurer Archon Shard #${idx+1}`); const body=wrap.querySelector(".body");
    const colorSel=el("select",{class:"picker-select"},
      el("option",{value:""},"— Couleur —"),
      ...Object.keys(DB.shards||{}).map(c=>el("option",{value:c},c))
    );
    const upSel=el("select",{class:"picker-select",disabled:""}, el("option",{value:""},"— Amélioration —"));
    colorSel.addEventListener("change",()=>{ upSel.innerHTML=""; upSel.append(el("option",{value:""},"— Amélioration —"));
      const c=DB.shards[colorSel.value]; if(c&&Array.isArray(c.upgrades)){ upSel.removeAttribute("disabled"); c.upgrades.forEach(u=>upSel.append(el("option",{value:u},u))); } else upSel.setAttribute("disabled","");
    });
    const actions=el("div",{class:"picker-actions"},
      el("button",{class:"btn",onclick:()=>{ if(!colorSel.value||!upSel.value) return; STATE.shards[idx]={color:colorSel.value,upgrade:upSel.value}; saveDraft(); renderSlotsPreview(); document.body.removeChild(wrap);} },"Appliquer"),
      el("button",{class:"btn ghost",onclick:()=>{ STATE.shards[idx]=null; saveDraft(); renderSlotsPreview(); document.body.removeChild(wrap);} },"Retirer"),
      el("button",{class:"btn ghost",onclick:()=>document.body.removeChild(wrap)},"Fermer")
    );
    body.append(el("div",{class:"picker-bar"},colorSel,upSel),actions);
  }

  // ---------- boot ----------
  document.addEventListener("DOMContentLoaded",()=>{ loadData().catch(err=>console.error(err)); });
})();
