// js/companions_catalog.js
(() => {
  "use strict";

  /* ----------------- Config ----------------- */
  const EXPORT_URL   = "data/ExportSentinels_en.json"; // Public Export (workflow)
  const FALLBACK_URL = "data/companions.json";         // ancien JSON (LUA)

  // Priorité images : LOCAL -> WIKI -> CDN
  const LOCAL_FILE = (file) => file ? `img/companions/${encodeURIComponent(file)}` : "";
  const WIKI_FILE  = (file) => file ? `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(file)}` : "";
  const CDN_FILE   = (file) => file ? `https://cdn.warframestat.us/img/${encodeURIComponent(file)}` : "";

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const fmtNum = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
  const pct = (v) => (v === null || v === undefined) ? "—" : `${Math.round(v*1000)/10}%`;
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const cleanLF = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const cleanDesc = (s) => escapeHtml(cleanLF(s)).replace(/\n/g, "<br>");
  function coalesce(obj, keys, def=null){ for(const k of keys) if (obj && obj[k]!=null) return obj[k]; return def; }

  // ⬇️ État UI pour restaurer la carte quand on ferme les builders
  let UI = { list: [], filtered: [], idx: 0 };

  // Récupération des polarités éventuelles venant du JSON (ou rien)
  function extractPolaritiesFromItem(item){
    let p = item.Polarities || item.polarities || item.Slots || null;
    if (typeof p === "string") p = p.split(/[,\s]+/).filter(Boolean);
    return Array.isArray(p) ? p : [];
  }

  // Placeholder inline (1 ligne)
  const svgPlaceholder = (() => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/></linearGradient></defs><rect width="600" height="360" fill="url(#g)"/><rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/><text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  })();

  /* -------------- Détection type (Public Export) -------------- */
  function detectType(u) {
    const p = String(u || "");
    if (p.includes("/CatbrowPet/")) return "Kavat";
    if (p.includes("/KubrowPet/"))  return "Kubrow";
    if (p.includes("/CreaturePets/ArmoredInfestedCatbrow")) return "Vulpaphyla";
    if (p.includes("/CreaturePets/PharaohPredator") || p.includes("/CreaturePets/VizierPredator") || p.includes("/CreaturePets/MedjayPredator")) return "Predasite";
    if (p.includes("/SentinelPowersuits/")) return "Sentinel";
    return "Companion";
  }

  /* -------------- Normalisation EXPORT -------------- */
  function normalizeFromExport(raw){
    const arr = Array.isArray(raw?.ExportSentinels) ? raw.ExportSentinels.slice() : [];
    return arr
      .map(x => {
        const name = x.name || "";
        const type = detectType(x.uniqueName);
        const category = (x.productCategory === "Sentinels") ? "Sentinels" : "Pets";
        const fileBase = name ? (name.replace(/\s+/g, "") + ".png") : "";
        return {
          Name: name,
          Type: type,
          Category: category,
          Description: x.description || "",
          Armor:  x.armor ?? 0,
          Health: x.health ?? 0,
          Shield: x.shield ?? 0,
          Attacks: null, // pas fourni par l’Export
          _imgSrcs: [ LOCAL_FILE(fileBase), WIKI_FILE(fileBase), CDN_FILE(fileBase) ].filter(Boolean)
        };
      })
      .sort(byName);
  }

  /* -------------- Normalisation LUA -------------- */
  function normalizeFromLua(raw){
    let coll = raw && raw.Companions ? raw.Companions : raw;
    if (!coll) return [];
    let arr;
    if (Array.isArray(coll)) arr = coll.slice();
    else arr = Object.entries(coll).map(([k,v]) => (v.Name ? v : { ...v, Name: v.Name || k }));
    arr = arr.map(v => {
      const name = coalesce(v, ["Name","name"], "");
      const fileBase = name ? (name.replace(/\s+/g, "") + ".png") : "";
      return { ...v, _imgSrcs: [ LOCAL_FILE(fileBase), WIKI_FILE(fileBase), CDN_FILE(fileBase) ].filter(Boolean) };
    });
    arr.sort(byName);
    return arr;
  }

  /* -------------- Fusion des Attacks (depuis LUA) -------------- */
  function buildAttacksMapFromLua(luaList){
    const m = new Map();
    for (const it of luaList){
      const name = (it.Name || it.name || "").toLowerCase();
      if (!name) continue;
      const atks = it.Attacks || it.attacks;
      if (Array.isArray(atks) && atks.length) m.set(name, atks);
    }
    return m;
  }
  function injectAttacks(list, attacksByName){
    for (const it of list){
      const key = (it.Name || "").toLowerCase();
      if (!it.Attacks && attacksByName.has(key)) it.Attacks = attacksByName.get(key);
    }
  }

  /* -------------- <img> avec fallbacks -------------- */
  window.__cycleImg = function(el, placeholder){
    const list = (el.getAttribute("data-srcs") || "").split("|").filter(Boolean);
    let i = parseInt(el.getAttribute("data-i") || "0", 10) + 1;
    if (i < list.length) { el.setAttribute("data-i", String(i)); el.src = list[i]; }
    else { el.onerror = null; el.src = placeholder; }
  };
  function renderImg(name, srcs, klass="w-full h-full object-contain"){
    const safePH = svgPlaceholder.replace(/'/g, "%27");
    const dataSrcs = (srcs && srcs.length ? srcs : [svgPlaceholder]).join("|").replace(/'/g, "%27");
    const alt = escapeHtml(name||"");
    return `<img src="${srcs?.[0]||svgPlaceholder}" data-srcs="${dataSrcs}" data-i="0" alt="${alt}" referrerpolicy="no-referrer" class="${klass}" onerror="__cycleImg(this,'${safePH}')">`;
  }

  /* -------------- Attaques -------------- */
  function sumDamage(dmg){ if (!dmg || typeof dmg !== "object") return null; let t=0; for(const k in dmg){ const v=Number(dmg[k]); if(!isNaN(v)) t+=v; } return t||null; }
  function attacksBlock(item){
    const atks = coalesce(item, ["Attacks","attacks"], null);
    if (!Array.isArray(atks) || !atks.length) return "";
    const rows = atks.map(a => {
      const name  = a.AttackName || a.name || "Attack";
      const dmgT  = sumDamage(a.Damage || a.damage);
      const critC = a.CritChance != null ? pct(a.CritChance) : null;
      const critM = a.CritMultiplier != null ? `×${a.CritMultiplier}` : null;
      const stat  = a.StatusChance != null ? pct(a.StatusChance) : null;
      const parts = [];
      if (dmgT != null) parts.push(`Dégâts ${dmgT}`);
      if (critC) parts.push(`Crit ${critC}${critM ? " " + critM : ""}`);
      if (stat)  parts.push(`Statut ${stat}`);
      return `<div class="py-1">• ${escapeHtml(name)} — ${parts.join(" · ")}</div>`;
    }).join("");
    return `<div class="mt-6"><div class="text-sm muted mb-2">Attaques</div><div class="bg-[var(--panel-2)] rounded-xl p-4 border border-[rgba(255,255,255,.08)]">${rows}</div></div>`;
  }

  /* ---------- Fallback local icônes de polarité (au cas où polarities.js n'est pas là) ---------- */
  const POL_FILES = {
    Madurai: "Madurai_Pol.svg",
    Vazarin: "Vazarin_Pol.svg",
    Naramon: "Naramon_Pol.svg",
    Zenurik: "Zenurik_Pol.svg",
    Unairu:  "Unairu_Pol.svg",
    Umbra:   "Umbra_Pol.svg",
    Penjaga: "Penjaga_Pol.svg",
    Exilus:  "Exilus_Pol.svg",
    Any:     "Any_Pol.svg",
    Universal: "Any_Pol.svg",
    None:      "Any_Pol.svg"
  };
  const CANON_POL = Object.fromEntries(Object.keys(POL_FILES).map(k=>[k.toLowerCase(),k]));
  function canonPolName(p){
    if (!p) return null;
    const raw = String(p).trim();
    const k = raw.toLowerCase();
    const alias = { universal:"Any", any:"Any", none:"Any" };
    return CANON_POL[k] || CANON_POL[alias[k]] || (raw[0].toUpperCase()+raw.slice(1));
  }
  function injectLocalPolIcons(host, arr){
    if (!host) return;
    const list = (arr||[]).map(canonPolName).filter(Boolean);
    host.innerHTML = "";
    list.forEach(p=>{
      const file = POL_FILES[p] || POL_FILES.Any;
      const img = new Image();
      img.alt = p;
      img.width = 26; img.height = 26;
      img.loading = "lazy";
      img.decoding = "async";
      img.src = `img/polarities/${file}`;
      // petite sécurité si un fichier manque
      img.onerror = () => { img.replaceWith(document.createTextNode(p[0]||"?")); };
      host.appendChild(img);
    });
  }

  /* -------------- Carte Companion -------------- */
  const statBox = (label, value) => `
    <div class="stat h-24 flex flex-col justify-center">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${escapeHtml(label)}</div>
      <div class="text-2xl font-semibold leading-tight">${escapeHtml(fmtNum(value))}</div>
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
    const armor  = Number(coalesce(item, ["Armor","armor"], 0)) || 0;
    const health = Number(coalesce(item, ["Health","health"], 0)) || 0;
    const shield = Number(coalesce(item, ["Shield","shield"], 0)) || 0;
    const imgHTML = renderImg(name, item._imgSrcs || []);

    // Détecte sentinelle pour afficher le bloc "Rang 30"
    const isSentinel = /sentinel/i.test(String(item.Type || item.Category));

    // Rang 30 + EHP
    const RANK30_SCALE = 3.5;
    const maxH = Math.round(health * RANK30_SCALE);
    const maxS = Math.round(shield * RANK30_SCALE);
    const maxA = Math.round(armor  * RANK30_SCALE);
    const ehp  = Math.round(maxH * (1 + maxA/300));
    const ehpS = Math.round(ehp + maxS);

    // HTML carte
    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div class="flex flex-col gap-4">
          <h2 class="text-2xl font-semibold">${escapeHtml(name)}</h2>
          <div class="flex flex-wrap gap-2">${chips(item)}</div>
          <p class="text-[var(--muted)] leading-relaxed">${cleanDesc(desc)}</p>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            ${statBox("ARMOR", armor)}${statBox("HEALTH", health)}${statBox("SHIELD", shield)}
          </div>

          ${isSentinel ? `
            <div class="mt-4">
              <div class="text-[11px] uppercase tracking-wide text-slate-200 mb-2">Max (Rang 30)</div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                ${statBox("HEALTH (R30)", maxH)}
                ${statBox("SHIELD (R30)", maxS)}
                ${statBox("ARMOR (R30)",  maxA)}
                <div class="stat h-24 flex flex-col justify-center">
                  <div class="text-[10px] uppercase tracking-wide text-slate-200">EHP (R30)</div>
                  <div class="text-lg font-semibold">${ehp} <span class="text-[var(--muted)]">/ ${ehpS} avec boucliers</span></div>
                </div>
              </div>

              <!-- Polarités (Sentinelles) -->
              <div class="mt-2 flex items-center gap-2 flex-wrap">
                <span class="text-sm mr-1"><b>Polarités :</b></span>
                <span class="polarity-row" data-zone="others"></span>
              </div>
              <div class="hidden"><span class="polarity-row" data-zone="aura"></span></div>
            </div>
          ` : ""}

          ${attacksBlock(item)}
        </div>

        <div class="w-full max-w-[420px] mx-auto xl:mx-0">
          <div class="rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn aspect-[1/1] flex items-center justify-center">
            ${imgHTML}
          </div>
        </div>
      </div>
    `;

    // ➜ informe polarities.js (il préfèrera ces données et ne fera aucun fetch si elles sont fournies)
    const providedSlots = extractPolaritiesFromItem(item); // tableau ou []
    document.dispatchEvent(new CustomEvent("wf:card-rendered", {
      detail: {
        wf: {
          name,
          auraPolarity: null,     // pas d’aura sur sentinelles
          polarities: providedSlots
        },
        source: "companions"
      }
    }));

    // Fallback local immédiat (affiche des icônes si polarities.js n’est pas/encore chargé)
    if (isSentinel && providedSlots.length){
      const host = $("#card .polarity-row[data-zone='others']");
      injectLocalPolIcons(host, providedSlots);
    }
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

  /* ----------------- MOA: données fixes ----------------- */
  const MOA_BASE = { Health: 350, Shield: 350, Armor: 350 };
  const MOA_MODELS = [
    { name:"Para",   precepts:["Whiplash Mine","Anti-Grav Grenade"] },
    { name:"Lambeo", precepts:["Stasis Field","Shockwave Actuators"] },
    { name:"Oloro",  precepts:["Tractor Beam","Security Override"] },
    { name:"Nychus", precepts:["Blast Shield","Hard Engage"] },
  ];
  const MOA_CORES = [
    { name:"Drex",   H:+0.10, S:+0.15, A:+0.05 },
    { name:"Krisys", H:+0.10, S:+0.05, A:+0.15 },
    { name:"Alcrom", H:+0.10, S:+0.10, A:+0.10 },
    { name:"Lehan",  H:+0.15, S:+0.00, A:+0.15 },
  ];
  const MOA_GYROS = [
    { name:"Trux",   H:+0.05, S:-0.05, A:+0.10 },
    { name:"Harpen", H:+0.05, S:+0.10, A:-0.05 },
    { name:"Aegron", H:-0.05, S:+0.05, A:+0.10 },
    { name:"Hextra", H:+0.10, S:+0.05, A:-0.05 },
    { name:"Munit",  H:+0.10, S:-0.05, A:+0.05 },
    { name:"Atheca", H:+0.20, S:-0.05, A:-0.05 },
    { name:"Phazor", H:-0.05, S:+0.10, A:+0.05 },
    { name:"Tyli",   H:+0.10, S:-0.10, A:+0.10 },
  ];
  const MOA_BRACKETS = [
    { name:"Drimper", polarities:"(—)" },
    { name:"Tian",    polarities:"(Vazarin)" },
    { name:"Jonsin",  polarities:"(Madurai)" },
    { name:"Gauth",   polarities:"(Naramon)" },
    { name:"Hona",    polarities:"(Naramon)" },
  ];
  function moaCompute(core, gyro){
    const h = Math.round(MOA_BASE.Health  * (1 + (core?.H||0) + (gyro?.H||0)));
    const s = Math.round(MOA_BASE.Shield  * (1 + (core?.S||0) + (gyro?.S||0)));
    const a = Math.round(MOA_BASE.Armor   * (1 + (core?.A||0) + (gyro?.A||0)));
    return { h, s, a };
  }

  /* ----------------- Hound: données fixes ----------------- */
  const HOUND_MODELS = [
    { name:"Bhaira", precept:"Null Audit", weapon:"Lacerten" },
    { name:"Dorma",  precept:"Repo Audit", weapon:"Batoten"  },
    { name:"Hec",    precept:"Equilibrium Audit", weapon:"Akaten" },
  ];
  const HOUND_CORES = [
    { name:"Adlet", H:350, S:450, A:350 },
    { name:"Garmr", H:350, S:350, A:450 },
    { name:"Raiju", H:450, S:350, A:350 },
  ];
  const HOUND_BRACKETS = [
    { name:"Cela", H:+0.10, S:+0.15, A:-0.05, precept:"Reflex Denial" },
    { name:"Urga", H:+0.15, S:-0.05, A:+0.10, precept:"Diversified Denial" },
    { name:"Zubb", H:-0.05, S:+0.10, A:+0.15, precept:"Evasive Denial" },
  ];
  const HOUND_STABILIZERS = [
    { name:"Frak",  polarity:"Vazarin",  precept:"Focused Prospectus" },
    { name:"Hinta", polarity:"Madurai",  precept:"Synergized Prospectus" },
    { name:"Wanz",  polarity:"Naramon",  precept:"Aerial Prospectus" },
  ];
  function houndCompute(core, bracket, gilded=false){
    if (!core) return { h:0, s:0, a:0 };
    const mult = gilded ? 2 : 1;
    const h = Math.round(core.H * (1 + mult*(bracket?.H||0)));
    const s = Math.round(core.S * (1 + mult*(bracket?.S||0)));
    const a = Math.round(core.A * (1 + mult*(bracket?.A||0)));
    return { h, s, a };
  }

  /* -------------- Helpers UI builder -------------- */
  function optionHTML(list){ return list.map((x,i)=>`<option value="${i}">${escapeHtml(x.name)}</option>`).join(""); }
  function fileCandidates(simpleName){
    if (!simpleName) return [];
    const file = simpleName.replace(/\s+/g,"") + ".png";
    return [ LOCAL_FILE(file), WIKI_FILE(file), CDN_FILE(file) ];
  }
  function thumb(name){
    return `<div class="w-20 h-20 rounded-xl bg-[var(--panel-2)] border orn flex items-center justify-center overflow-hidden">
      ${renderImg(name, fileCandidates(name), "w-[80%] h-[80%] object-contain")}
    </div>`;
  }

  /* -------------- MOA Builder -------------- */
  function renderMOABuilder(){
    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div>
          <h2 class="text-xl font-semibold mb-4">MOA Builder</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex flex-col gap-1">
              <span class="text-xs uppercase tracking-wider">Model</span>
              <select id="moa-model" class="input">${optionHTML(MOA_MODELS)}</select>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs uppercase tracking-wider">Core</span>
              <select id="moa-core" class="input">${optionHTML(MOA_CORES)}</select>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs uppercase tracking-wider">Gyro</span>
              <select id="moa-gyro" class="input">${optionHTML(MOA_GYROS)}</select>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs uppercase tracking-wider">Bracket</span>
              <select id="moa-bracket" class="input">${optionHTML(MOA_BRACKETS)}</select>
            </label>
          </div>

          <div class="mt-6 grid grid-cols-3 gap-4">
            <div id="moa-h" class="stat h-24"></div>
            <div id="moa-s" class="stat h-24"></div>
            <div id="moa-a" class="stat h-24"></div>
          </div>

          <div id="moa-notes" class="mt-4 text-sm"></div>
        </div>

        <div class="flex flex-col gap-3">
          <div class="text-xs uppercase tracking-wider mb-1">Aperçu des pièces</div>
          <div class="flex flex-wrap gap-3">
            <div id="moa-thumb-model">${thumb("Para")}</div>
            <div id="moa-thumb-core">${thumb("Drex")}</div>
            <div id="moa-thumb-gyro">${thumb("Trux")}</div>
            <div id="moa-thumb-bracket">${thumb("Drimper")}</div>
          </div>
        </div>
      </div>
    `;

    const outH = $("#moa-h"), outS = $("#moa-s"), outA = $("#moa-a"), notes = $("#moa-notes");
    const upd = () => {
      const m = MOA_MODELS[$("#moa-model").value|0];
      const c = MOA_CORES[$("#moa-core").value|0];
      const g = MOA_GYROS[$("#moa-gyro").value|0];
      const b = MOA_BRACKETS[$("#moa-bracket").value|0];
      const r = moaCompute(c,g);
      outH.innerHTML = `${statBox("HEALTH", r.h)}`;
      outS.innerHTML = `${statBox("SHIELD", r.s)}`;
      outA.innerHTML = `${statBox("ARMOR",  r.a)}`;
      notes.innerHTML = `<div><b>Precepts (Model):</b> ${escapeHtml(m.precepts.join(", "))}</div><div><b>Bracket:</b> ${escapeHtml(b.name)} ${escapeHtml(b.polarities)}</div>`;
      $("#moa-thumb-model").innerHTML   = thumb(m.name);
      $("#moa-thumb-core").innerHTML    = thumb(c.name);
      $("#moa-thumb-gyro").innerHTML    = thumb(g.name);
      $("#moa-thumb-bracket").innerHTML = thumb(b.name);
    };
    ["#moa-model","#moa-core","#moa-gyro","#moa-bracket"].forEach(id => $(id).addEventListener("change", upd));
    upd();
  }

  /* -------------- Hound Builder -------------- */
  function renderHoundBuilder(){
    $("#card").innerHTML = `
      <div class="card p-6 grid gap-8 grid-cols-1 xl:grid-cols-2">
        <div>
          <h2 class="text-xl font-semibold mb-4">Hound Builder</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex flex-col gap-1"><span class="text-xs uppercase tracking-wider">Model</span><select id="hound-model" class="input">${optionHTML(HOUND_MODELS)}</select></label>
            <label class="flex flex-col gap-1"><span class="text-xs uppercase tracking-wider">Core</span><select id="hound-core" class="input">${optionHTML(HOUND_CORES)}</select></label>
            <label class="flex flex-col gap-1"><span class="text-xs uppercase tracking-wider">Bracket</span><select id="hound-bracket" class="input">${optionHTML(HOUND_BRACKETS)}</select></label>
            <label class="flex flex-col gap-1"><span class="text-xs uppercase tracking-wider">Stabilizer</span><select id="hound-stab" class="input">${optionHTML(HOUND_STABILIZERS)}</select></label>
          </div>
          <label class="flex items-center gap-2 mt-3"><input id="hound-gilded" type="checkbox" class="scale-125"><span class="text-sm">Gilded (double les bonus de Bracket)</span></label>

          <div class="mt-6 grid grid-cols-3 gap-4">
            <div id="hd-h" class="stat h-24"></div>
            <div id="hd-s" class="stat h-24"></div>
            <div id="hd-a" class="stat h-24"></div>
          </div>

          <div id="hd-notes" class="mt-4 text-sm"></div>
        </div>

        <div class="flex flex-col gap-3">
          <div class="text-xs uppercase tracking-wider mb-1">Aperçu des pièces</div>
          <div class="flex flex-wrap gap-3">
            <div id="hd-thumb-model">${thumb("Bhaira")}</div>
            <div id="hd-thumb-core">${thumb("Adlet")}</div>
            <div id="hd-thumb-bracket">${thumb("Cela")}</div>
            <div id="hd-thumb-stab">${thumb("Frak")}</div>
          </div>
        </div>
      </div>
    `;
    const outH = $("#hd-h"), outS = $("#hd-s"), outA = $("#hd-a"), notes = $("#hd-notes");
    const upd = () => {
      const m = HOUND_MODELS[$("#hound-model").value|0];
      const c = HOUND_CORES[$("#hound-core").value|0];
      const b = HOUND_BRACKETS[$("#hound-bracket").value|0];
      const s = HOUND_STABILIZERS[$("#hound-stab").value|0];
      const gilded = $("#hound-gilded").checked;
      const r = houndCompute(c,b,gilded);
      outH.innerHTML = `${statBox("HEALTH", r.h)}`;
      outS.innerHTML = `${statBox("SHIELD", r.s)}`;
      outA.innerHTML = `${statBox("ARMOR",  r.a)}`;
      notes.innerHTML = `
        <div><b>Model:</b> ${escapeHtml(m.name)} — Precept: ${escapeHtml(m.precept)} — Weapon: ${escapeHtml(m.weapon)}</div>
        <div><b>Bracket:</b> ${escapeHtml(b.name)} — ${Math.round((b.H||0)*100)}% H / ${Math.round((b.S||0)*100)}% S / ${Math.round((b.A||0)*100)}% A — Precept: ${escapeHtml(b.precept)} ${gilded ? "(doublé)" : ""}</div>
        <div><b>Stabilizer:</b> ${escapeHtml(s.name)} (${escapeHtml(s.polarity)}) — Precept: ${escapeHtml(s.precept)}</div>`;
      $("#hd-thumb-model").innerHTML   = thumb(m.name);
      $("#hd-thumb-core").innerHTML    = thumb(c.name);
      $("#hd-thumb-bracket").innerHTML = thumb(b.name);
      $("#hd-thumb-stab").innerHTML    = thumb(s.name);
    };
    ["#hound-model","#hound-core","#hound-bracket","#hound-stab","#hound-gilded"].forEach(id => $(id).addEventListener("change", upd));
    upd();
  }

  /* -------------- Onglets (en haut à droite) -------------- */
  function ensureModeTabs(){
    let host = document.getElementById("mode-tabs");
    if (host) return host;

    const root = $("#status")?.parentElement || document.body;
    const h1   = root.querySelector("h1") || (() => {
      const f = document.createElement("h1");
      f.className = "text-2xl font-semibold mb-3";
      f.textContent = "Companions";
      root.prepend(f);
      return f;
    })();

    const row = document.createElement("div");
    row.className = "flex items-center justify-between gap-4 mb-4";
    h1.parentNode.insertBefore(row, h1);
    row.appendChild(h1);

    host = document.createElement("div");
    host.id = "mode-tabs";
    host.className = "flex flex-wrap items-center gap-2 ml-auto";
    host.innerHTML = `
      <button data-mode="all"   class="badge gold px-4 py-2 text-sm md:text-base shadow-sm">Companions</button>
      <button data-mode="moa"   class="badge px-4 py-2 text-sm md:text-base">MOA</button>
      <button data-mode="hound" class="badge px-4 py-2 text-sm md:text-base">Hound</button>`;
    row.appendChild(host);
    return host;
  }
  function applyMode(mode){
    const host = ensureModeTabs();

    // active/inactive style
    host.querySelectorAll("[data-mode]").forEach(btn => {
      btn.classList.toggle("gold", btn.dataset.mode === mode);
    });

    // show/hide search + picker in builder modes
    const search = $("#search");
    const picker = $("#picker");
    const showListUI = (mode === "all");
    if (search?.parentElement) search.parentElement.style.display = showListUI ? "" : "none";
    if (picker?.parentElement) picker.parentElement.style.display = showListUI ? "" : "none";

    if (mode === "moa") {
      renderMOABuilder();
    } else if (mode === "hound") {
      renderHoundBuilder();
    } else {
      // retour à la vue Companions → re-render l'item courant
      const item = UI.filtered[UI.idx] || UI.list[0];
      if (item) renderCard(item);
    }
  }

  /* -------------- Chargement -------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des companions…";

      // charge export & LUA pour fusionner Attacks
      const [exportRes, luaRes] = await Promise.allSettled([
        (async () => { try { const r=await fetch(EXPORT_URL,{cache:'force-cache'/*he:"no-store"}); if(!r.ok) throw 0; return normalizeFromExport(await r.json()); } catch { return []; } })(),
        (async () => { try { const r=await fetch(FALLBACK_URL,{cache:'force-cache'/*ache:"no-store"}); if(!r.ok) throw 0; return normalizeFromLua(await r.json()); } catch { return []; } })()
      ]);
      const listFromExport = exportRes.status==="fulfilled" ? exportRes.value : [];
      const listFromLua    = luaRes.status==="fulfilled"    ? luaRes.value    : [];
      const list = (listFromExport.length ? listFromExport : listFromLua).slice();
      const source = listFromExport.length ? "export" : "lua";

      if (list.length && listFromLua.length){
        const atkMap = buildAttacksMapFromLua(listFromLua);
        injectAttacks(list, atkMap);
        // Merge Polarities from LUA into Export items if missing (Sentinels)
        (function mergePolaritiesFromLua(){
          try{
            if (!Array.isArray(listFromLua) || !listFromLua.length) return;
            const polMap = new Map();
            listFromLua.forEach(it=>{
              const name = (it.Name||it.name||"").toLowerCase();
              const slots = it.Polarities || it.Slots || it.polarities || null;
              if (!name) return;
              let arr = Array.isArray(slots) ? slots
                       : (typeof slots==="string" ? slots.split(/[\s,]+/).filter(Boolean) : []);
              if (arr && arr.length) polMap.set(name, arr);
            });
            list.forEach(it=>{
              const nm = (it.Name||it.name||"").toLowerCase();
              if (!nm) return;
              const already = it.Polarities || it.Slots || it.polarities;
              if (already && ((Array.isArray(already) && already.length) || typeof already === "string")) return;
              const fromLua = polMap.get(nm);
              if (fromLua && fromLua.length) it.Polarities = fromLua.slice();
            });
          }catch(_){}
        })();

      }

      if (!list.length){
        status.textContent = "Aucun compagnon trouvé.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // Init état UI
      UI.list = list.slice();
      UI.filtered = list.slice();
      UI.idx = 0;

      // UI “Companions”
      renderPicker(list);
      renderCard(list[0]);

      const setStatus = (n) => {
        status.textContent = `Companions chargés : ${n} ${source === "export" ? "(Export officiel)" : "(fallback LUA)"}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      };
      setStatus(list.length);
      try{ document.getElementById('status')?.setAttribute('aria-busy','false'); }catch(_){}

      if ($("#picker")){
        $("#picker").addEventListener("change", (e)=>{
          const idx = parseInt(e.target.value, 10);
          const q = norm($("#search")?.value).toLowerCase();
          const filtered = q ? UI.list.filter(x => ((x.Name||x.name||'')+' '+(x.Type||x.type||'')+' '+(x.Description||x.description||'')+' '+((x.Attacks||[]).map(a=>a.AttackName||a.name||'').join(' '))).toLowerCase().includes(q)) : UI.list;
          UI.filtered = filtered;
          UI.idx = Math.min(idx, Math.max(0, filtered.length-1));
          if (filtered.length) renderCard(filtered[UI.idx]);
        });
      }
      if ($("#search")){
        $("#search").addEventListener("input", ()=>{
          const q = norm($("#search").value).toLowerCase();
          const filtered = q ? UI.list.filter(x => ((x.Name||x.name||'')+' '+(x.Type||x.type||'')+' '+(x.Description||x.description||'')+' '+((x.Attacks||[]).map(a=>a.AttackName||a.name||'').join(' '))).toLowerCase().includes(q)) : UI.list;
          UI.filtered = filtered;
          UI.idx = 0;
          renderPicker(filtered);
          if (filtered.length) renderCard(filtered[0]);
          status.textContent = `Affichage : ${filtered.length} résultat(s)`;
        });
      }

      // Onglets
      const tabs = ensureModeTabs();
      tabs.querySelector('[data-mode="all"]').addEventListener("click", ()=>applyMode("all"));
      tabs.querySelector('[data-mode="moa"]').addEventListener("click", ()=>applyMode("moa"));
      tabs.querySelector('[data-mode="hound"]').addEventListener("click", ()=>applyMode("hound"));
      applyMode("all");
    } catch(e){
      console.error("[companions] load error:", e);
      status.textContent = "Erreur de chargement des données.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
