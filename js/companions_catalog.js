// js/companions_catalog.js
// Page "Companions" avec onglet "MOA & Hound" (parts).
// - Stats Companions depuis ExportSentinels + fusion Attaques depuis ton JSON LUA
// - Hound parts (models/cores/brackets/stabilizers) fixées
// - MOA parts (models/cores/gyros/brackets) fixées depuis le texte wiki collé
// - Images: priorité wiki (Special:FilePath) -> CDN -> local, d'abord NomSansEspace.png puis Nom_Avec_Underscore.png

(() => {
  "use strict";

  /* ----------------- Config ----------------- */
  const EXPORT_SENTINELS_URL = "data/ExportSentinels_en.json"; // stats Companions
  const EXPORT_WEAPONS_URL   = "data/ExportWeapons_en.json";   // (pas obligatoire ici, on garde pour futur)
  const FALLBACK_LUA_URL     = "data/companions.json";         // attaques/titres LUA (merge)

  // Images (priorité: Wiki -> CDN -> Local)
  const localImg     = (name) => `img/companions/${encodeURIComponent(name)}`;
  const wikiFilePath = (name) => `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(name)}`;
  const cdnImg       = (name) => `https://cdn.warframestat.us/img/${encodeURIComponent(name)}`;
  

  // Corrections manuelles (si nom d'image non standard)
  const MANUAL_IMG = {
    "Venari": "Venari",
    "Venari Prime": "Venari",
    "Helminth Charger": "HelminthCharger",
    "Nautilus": "Nautilus",
    "Nautilus Prime": "NautilusPrime",
    "Bhaira": "BhairaHound",
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
  const coalesce = (obj, keys, def=null) => { for (const k of keys) if (obj && obj[k] != null) return obj[k]; return def; };

  function detectType(uniqueName) {
    const p = String(uniqueName || "");
    if (p.includes("/CatbrowPet/"))                     return "Kavat";
    if (p.includes("/KubrowPet/"))                      return "Kubrow";
    if (p.includes("/CreaturePets/ArmoredInfested"))    return "Vulpaphyla";
    if (p.includes("/CreaturePets/") && p.includes("Predator")) return "Predasite";
    if (p.includes("/SentinelPowersuits/"))             return "Sentinel";
    return "Companion";
  }

  /* ----------------- Images ----------------- */
  function buildImageCandidatesFromName(name){
    const manual = MANUAL_IMG[name];
    const baseNS = (manual || name).replace(/\s+/g, "");      // Sly Vulpaphyla -> SlyVulpaphyla
    const baseUS = (manual || name).replace(/\s+/g, "_");     // Sly Vulpaphyla -> Sly_Vulpaphyla
    const list = [];

    // IMPORTANT: moins de 404 si on commence par NomSansEspace
    list.push(wikiFilePath(`${baseNS}.png`));
    list.push(wikiFilePath(`${baseUS}.png`));
    list.push(cdnImg(`${baseNS}.png`));
    list.push(cdnImg(`${baseUS}.png`));
    list.push(localImg(`${baseNS}.png`));
    list.push(localImg(`${baseUS}.png`));

    // de-dup
    const seen = new Set();
    const uniq = list.filter(u => u && !seen.has(u) && seen.add(u));

    const placeholder = 'data:image/svg+xml;utf8,'+encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">
        <defs><linearGradient id="g" x1="0" y="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/>
        </linearGradient></defs>
        <rect width="600" height="360" fill="url(#g)"/>
        <rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/>
        <text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text>
      </svg>`
    );

    return { list: uniq, placeholder };
  }

  // handler global pour chaîner les fallbacks (appelé par onerror)
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

  /* ----------------- Normalisation Export (Companions) ----------------- */
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
        Attacks: null,
      }))
      .sort(byName);
  }

  /* ----------------- Normalisation LUA (fallback + attaques) ----------------- */
  function normalizeFromLua(raw){
    let coll = raw && raw.Companions ? raw.Companions : raw;
    if (!coll) return [];
    let arr;
    if (Array.isArray(coll)) arr = coll.slice();
    else arr = Object.entries(coll).map(([k,v]) => (v.Name ? v : { ...v, Name: v.Name || k }));
    return arr.sort(byName);
  }

  /* ----------------- Fusion attaques LUA -> Export ----------------- */
  function mergeAttacks(exportList, luaList){
    const map = new Map(luaList.map(v => [String(v.Name||v.name||"").toLowerCase(), v]));
    for (const it of exportList){
      const key = (it.Name||"").toLowerCase();
      const src = map.get(key);
      if (!src) continue;
      if (!it.Attacks && Array.isArray(src.Attacks)) it.Attacks = src.Attacks;
      if (!it.Description && src.Description) it.Description = src.Description;
    }
  }

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

  /* ----------------- UI: carte compagnon ----------------- */
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
    const name   = coalesce(item, ["Name","name"], "—");
    const desc   = coalesce(item, ["Description","description"], "");
    const armor  = coalesce(item, ["Armor","armor"], "—");
    const health = coalesce(item, ["Health","health"], "—");
    const shield = coalesce(item, ["Shield","shield"], "—");
    const energy = coalesce(item, ["Energy","energy"], "—");
    const img    = buildImageCandidatesFromName(name);

    return `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img
              src="${img.list[0]}"
              data-srcs="${img.list.join("|")}"
              data-i="0"
              alt="${escapeHtml(name)}"
              class="w-full h-full object-contain"
              onerror="__cycleImg(this, '${img.placeholder}')">
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

  /* ----------------- HOUND: données fixes (de ton texte) ----------------- */
  function houndDataFromWiki(){
    return {
      Models: [
        { Name: "Bhaira", Weapon: "Lacerten", Precept: "Null Audit" },
        { Name: "Dorma",  Weapon: "Batoten",  Precept: "Repo Audit" },
        { Name: "Hec",    Weapon: "Akaten",   Precept: "Equilibrium Audit" },
      ],
      Cores: [
        { Name: "Adlet", Health: 350, Shields: 450, Armor: 350 },
        { Name: "Garmr", Health: 350, Shields: 350, Armor: 450 },
        { Name: "Raiju", Health: 450, Shields: 350, Armor: 350 },
      ],
      Brackets: [
        { Name: "Cela", HealthPct: +10, ShieldsPct: +15, ArmorPct: -5,  Precept: "Reflex Denial" },
        { Name: "Urga", HealthPct: +15, ShieldsPct: -5,  ArmorPct: +10, Precept: "Diversified Denial" },
        { Name: "Zubb", HealthPct: -5,  ShieldsPct: +10, ArmorPct: +15, Precept: "Evasive Denial" },
      ],
      Stabilizers: [
        { Name: "Frak",  School: "Vazarin",  Precept: "Focused Prospectus" },
        { Name: "Hinta", School: "Madurai",  Precept: "Synergized Prospectus" },
        { Name: "Wanz",  School: "Naramon",  Precept: "Aerial Prospectus" },
      ],
      Weapons: ["Lacerten", "Batoten", "Akaten"],
    };
  }

  /* ----------------- MOA: données fixes (de ton texte) ----------------- */
  function moaDataFromWiki(){
    return {
      // Modèles = têtes (2 precepts + coût + rang)
      Models: [
        { Name: "Para",   Precepts: ["Whiplash Mine", "Anti-Grav Grenade"], CostStanding: 500,  Rank: "Rank 0: Neutral" },
        { Name: "Lambeo", Precepts: ["Stasis Field",  "Shockwave Actuators"], CostStanding: 1000, Rank: "Rank 1: Outworlder" },
        { Name: "Oloro",  Precepts: ["Tractor Beam",  "Security Override"],   CostStanding: 2000, Rank: "Rank 2: Rapscallion" },
        { Name: "Nychus", Precepts: ["Blast Shield",  "Hard Engage"],         CostStanding: 3000, Rank: "Rank 3: Doer" },
      ],
      // Cores (pourcentages + coût + bonus don)
      Cores: [
        { Name: "Drex",   HealthPct: +10, ShieldPct: +15, ArmorPct: +5,  CostStanding: 500,  DonationStanding: 300 },
        { Name: "Krisys", HealthPct: +10, ShieldPct: +5,  ArmorPct: +15, CostStanding: 1000, DonationStanding: 300 },
        { Name: "Alcrom", HealthPct: +10, ShieldPct: +10, ArmorPct: +10, CostStanding: 2000, DonationStanding: 300 },
        { Name: "Lehan",  HealthPct: +15, ShieldPct: +0,  ArmorPct: +15, CostStanding: 4000, DonationStanding: 300 },
      ],
      // Gyros
      Gyros: [
        { Name: "Trux",   HealthPct: +5,  ShieldPct: -5,  ArmorPct: +10, CostStanding: 500,  DonationStanding: 300 },
        { Name: "Harpen", HealthPct: +5,  ShieldPct: +10, ArmorPct: -5,  CostStanding: 1000, DonationStanding: 300 },
        { Name: "Aegron", HealthPct: -5,  ShieldPct: +5,  ArmorPct: +10, CostStanding: 2000, DonationStanding: 300 },
        { Name: "Hextra", HealthPct: +10, ShieldPct: +5,  ArmorPct: -5,  CostStanding: 3000, DonationStanding: 300 },
        { Name: "Munit",  HealthPct: +10, ShieldPct: -5,  ArmorPct: +5,  CostStanding: 3000, DonationStanding: 300 },
        { Name: "Atheca", HealthPct: +20, ShieldPct: -5,  ArmorPct: -5,  CostStanding: 4000, DonationStanding: 300 },
        { Name: "Phazor", HealthPct: -5,  ShieldPct: +10, ArmorPct: +5,  CostStanding: 4000, DonationStanding: 300 },
        { Name: "Tyli",   HealthPct: +10, ShieldPct: -10, ArmorPct: +10, CostStanding: 4000, DonationStanding: 300 },
      ],
      // Brackets (jambes) + polarités supplémentaires
      Brackets: [
        { Name: "Drimper Bracket", ExtraPolarity: "None",    CostStanding: 500,  Rank: "Rank 0: Neutral",   Desc: "A basic bracket with no polarized Mod slots." },
        { Name: "Tian Bracket",    ExtraPolarity: "Vazarin", CostStanding: 500,  Rank: "Rank 0: Neutral",   Desc: "Armoured bracket featuring a Vazarin polarity slot." },
        { Name: "Jonsin Bracket",  ExtraPolarity: "Madurai", CostStanding: 1000, Rank: "Rank 1: Outworlder",Desc: "Flexible bracket featuring a Madurai polarity slot." },
        { Name: "Gauth Bracket",   ExtraPolarity: "Naramon", CostStanding: 2000, Rank: "Rank 2: Rapscallion",Desc: "Armoured bracket featuring a Naramon polarity slot." },
        { Name: "Hona Bracket",    ExtraPolarity: "Naramon", CostStanding: 3000, Rank: "Rank 3: Doer",      Desc: "Armoured bracket featuring a Naramon polarity slot." },
      ],
    };
  }

  /* ----------------- UI: petites cartes pour parts ----------------- */
  function partThumb(name){
    const img = buildImageCandidatesFromName(name);
    return `
      <img
        src="${img.list[0]}"
        data-srcs="${img.list.join("|")}"
        data-i="0"
        alt="${escapeHtml(name)}"
        class="w-10 h-10 object-contain rounded"
        onerror="__cycleImg(this, '${img.placeholder}')">`;
  }

  function renderPill(name, subtitle=""){
    return `
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--panel-2)] border">
        ${partThumb(name)}
        <div class="leading-tight">
          <div class="text-sm">${escapeHtml(name)}</div>
          ${subtitle ? `<div class="text-[11px] text-[var(--muted)]">${escapeHtml(subtitle)}</div>` : ""}
        </div>
      </div>`;
  }

  function renderHoundModelCard(m){
    const sub = `Precept: ${m.Precept} · Weapon: ${m.Weapon}`;
    return renderPill(m.Name, sub);
  }
  function renderHoundCoreCard(c){
    const sub = `Base: ${c.Health} HP · ${c.Shields} Shield · ${c.Armor} Armor`;
    return renderPill(c.Name, sub);
  }
  function renderHoundBracketCard(b){
    const sub = `${b.HealthPct>0?'+':''}${b.HealthPct}% HP · ${b.ShieldsPct>0?'+':''}${b.ShieldsPct}% Shield · ${b.ArmorPct>0?'+':''}${b.ArmorPct}% Armor · Precept: ${b.Precept}`;
    return renderPill(b.Name, sub);
  }
  function renderHoundStabCard(s){
    const sub = `${s.School} · Precept: ${s.Precept}`;
    return renderPill(s.Name, sub);
  }

  // MOA pills
  function renderMoaModelCard(m){
    const sub = `Precepts: ${m.Precepts.join(" + ")} · ${m.CostStanding} Standing · ${m.Rank}`;
    return renderPill(m.Name, sub);
  }
  function renderMoaCoreCard(c){
    const sub = `${c.HealthPct>0?'+':''}${c.HealthPct}% HP · ${c.ShieldPct>0?'+':''}${c.ShieldPct}% Shield · ${c.ArmorPct>0?'+':''}${c.ArmorPct}% Armor · ${c.CostStanding} Standing`;
    return renderPill(c.Name, sub);
  }
  function renderMoaGyroCard(g){
    const sub = `${g.HealthPct>0?'+':''}${g.HealthPct}% HP · ${g.ShieldPct>0?'+':''}${g.ShieldPct}% Shield · ${g.ArmorPct>0?'+':''}${g.ArmorPct}% Armor · ${g.CostStanding} Standing`;
    return renderPill(g.Name, sub);
  }
  function renderMoaBracketCard(b){
    const sub = `${b.ExtraPolarity === "None" ? "No extra polarity" : `Extra polarity: ${b.ExtraPolarity}`} · ${b.CostStanding} Standing · ${b.Rank}`;
    return renderPill(b.Name, sub);
  }

  function groupBlock(title, pillsHtml){
    if (!pillsHtml || !pillsHtml.length) return "";
    return `
      <div>
        <div class="text-[11px] tracking-wide uppercase mb-2 text-[var(--muted)]">${escapeHtml(title)}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          ${pillsHtml.join("")}
        </div>
      </div>`;
  }

  function renderModularPanel(moa, hnd){
    // MOA sections
    const mModels = moa.Models.map(renderMoaModelCard);
    const mCores  = moa.Cores.map(renderMoaCoreCard);
    const mGyros  = moa.Gyros.map(renderMoaGyroCard);
    const mBrkts  = moa.Brackets.map(renderMoaBracketCard);

    // Hound sections
    const hModels = hnd.Models.map(renderHoundModelCard);
    const hCores  = hnd.Cores.map(renderHoundCoreCard);
    const hBrkts  = hnd.Brackets.map(renderHoundBracketCard);
    const hStabs  = hnd.Stabilizers.map(renderHoundStabCard);
    const hWeaps  = hnd.Weapons.map(n => renderPill(n, "Hound Weapon"));

    return `
      <div class="flex flex-col gap-8">
        <section>
          <h3 class="text-lg font-semibold mb-3">MOA (Companion)</h3>
          <div class="flex flex-col gap-5">
            ${groupBlock("Models (Heads)", mModels)}
            ${groupBlock("Cores", mCores)}
            ${groupBlock("Gyros", mGyros)}
            ${groupBlock("Brackets (Legs)", mBrkts)}
          </div>
        </section>

        <section>
          <h3 class="text-lg font-semibold mb-3">Hound (Companion)</h3>
          <div class="flex flex-col gap-5">
            ${groupBlock("Models", hModels)}
            ${groupBlock("Cores", hCores)}
            ${groupBlock("Brackets", hBrkts)}
            ${groupBlock("Stabilizers", hStabs)}
            ${groupBlock("Weapons", hWeaps)}
          </div>
        </section>
      </div>
    `;
  }

  /* ----------------- Rendu principal avec onglets ----------------- */
  function renderPage(companions){
    const card = $("#card");
    if (!card) return;

    // Tabs
    card.innerHTML = `
      <div class="flex flex-wrap gap-2 mb-4">
        <button class="tab gold" data-tab="comp">Companions</button>
        <button class="tab" data-tab="mod">MOA & Hound</button>
      </div>
      <div id="tab-content"></div>
    `;

    const tabContent = $("#tab-content");

    function showCompanionList(list) {
      const html = `
        <div class="flex flex-col gap-4">
          <div class="relative max-w-[420px]">
            <input id="search" type="text" placeholder="Rechercher un compagnon…"
              class="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--panel-2)] text-[var(--ink)]
                     placeholder:text-[var(--muted)] outline-none orn focus-gold" />
            <svg class="w-4 h-4 [color:rgba(0,229,255,.7)] absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none">
              <path d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>

          <select id="picker"
            class="w-full max-w-[420px] py-2 px-3 rounded-xl bg-[var(--panel-2)] text-[var(--ink)] outline-none orn focus-gold"></select>

          <div id="comp-card" class="card p-5"></div>
        </div>
      `;
      tabContent.innerHTML = html;

      // init picker + première carte
      const pick = $("#picker");
      pick.innerHTML = "";
      list.forEach((it, i) => {
        const o = document.createElement("option");
        o.value = i;
        o.textContent = it.Name || "—";
        pick.appendChild(o);
      });
      pick.value = "0";

      const show = (it) => { $("#comp-card").innerHTML = renderCompanionCard(it); };

      show(list[0]);

      $("#picker").addEventListener("change", (e)=>{
        const idx = parseInt(e.target.value, 10);
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
        if (filtered.length) show(filtered[Math.min(idx, filtered.length-1)]);
      });

      $("#search").addEventListener("input", ()=>{
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;

        pick.innerHTML = "";
        filtered.forEach((it, i) => {
          const o = document.createElement("option");
          o.value = i;
          o.textContent = it.Name || "—";
          pick.appendChild(o);
        });
        if (filtered.length) {
          pick.value = "0";
          show(filtered[0]);
        } else {
          $("#comp-card").innerHTML = `<div class="text-[var(--muted)]">Aucun résultat.</div>`;
        }
      });
    }

    function showModular(moa, hnd){
      tabContent.innerHTML = `
        <div class="card p-5">
          ${renderModularPanel(moa, hnd)}
        </div>
      `;
    }

    // Tab wiring
    function activate(tab){
      const tabs = card.querySelectorAll(".tab");
      tabs.forEach(t => t.classList.remove("gold"));
      card.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add("gold");

      if (tab === "comp") showCompanionList(companions._listForUI);
      else showModular(companions._moaParts, companions._houndParts);
    }

    // démarrage sur Companions
    activate("comp");
    card.querySelectorAll(".tab").forEach(btn=>{
      btn.addEventListener("click", ()=>activate(btn.getAttribute("data-tab")));
    });
  }

  /* ----------------- Chargement & Boot ----------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des companions…";

      // 1) Export officiels
      const [rComp/*, rWeap*/] = await Promise.all([
        fetch(EXPORT_SENTINELS_URL, { cache: "no-store" }),
        // fetch(EXPORT_WEAPONS_URL,   { cache: "no-store" }), // pas requis pour l’instant
      ]);
      const exportComp = rComp.ok ? await rComp.json() : { ExportSentinels: [] };
      // const exportWeap = rWeap?.ok ? await rWeap.json() : { ExportWeapons: [] };

      let list = normalizeFromExport(exportComp);

      // 2) Fallback LUA (pour attaques & descriptions manquantes)
      let luaList = [];
      try {
        const rLua = await fetch(FALLBACK_LUA_URL, { cache: "no-store" });
        if (rLua.ok) luaList = normalizeFromLua(await rLua.json());
      } catch {}

      mergeAttacks(list, luaList);

      // 3) Parts (MOA/Hound) depuis tes textes wiki
      const moaParts   = moaDataFromWiki();
      const houndParts = houndDataFromWiki();

      // 4) Rendu
      renderPage({
        _listForUI: list,
        _moaParts: moaParts,
        _houndParts: houndParts
      });

      status.textContent = `Companions chargés : ${list.length} (Export officiel${luaList.length ? " + attaques LUA" : ""})`;
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";

    } catch(e){
      console.error("[companions] load error:", e);
      if (status) {
        status.textContent = "Erreur de chargement des companions.";
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    }
  })();
})();
