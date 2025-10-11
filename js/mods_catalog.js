(() => {
  "use strict";

  /* ================== Text Icons (DT_...) → <img> inline ================== */
  const ICON_BASE = new URL("img/symbol/", document.baseURI).href;

  // mapping minimal : chaque balise -> nom de fichier PNG (aucun label/pastille)
  const DT_ICONS = {
    // Physiques
    DT_IMPACT_COLOR:     "ImpactSymbol.png",
    DT_PUNCTURE_COLOR:   "PunctureSymbol.png",
    DT_SLASH_COLOR:      "SlashSymbol.png",

    // Élémentaires
    DT_FIRE_COLOR:       "HeatSymbol.png",
    DT_FREEZE_COLOR:     "ColdSymbol.png",
    DT_ELECTRICITY_COLOR:"ElectricitySymbol.png",
    DT_POISON_COLOR:     "ToxinSymbol.png",
    DT_TOXIN_COLOR:      "ToxinSymbol.png",

    // Combinés
    DT_GAS_COLOR:        "GasSymbol.png",
    DT_MAGNETIC_COLOR:   "MagneticSymbol.png",
    DT_RADIATION_COLOR:  "RadiationSymbol.png",
    DT_VIRAL_COLOR:      "ViralSymbol.png",
    DT_CORROSIVE_COLOR:  "CorrosiveSymbol.png",
    DT_BLAST_COLOR:      "BlastSymbol.png",
    DT_EXPLOSION_COLOR:  "BlastSymbol.png",

    // Divers / Void
    DT_RADIANT_COLOR:    "VoidSymbol.png",
    DT_SENTIENT_COLOR:   "SentientSymbol.png",
    DT_RESIST_COLOR:     "ResistSymbol.png",
    DT_POSITIVE_COLOR:   "PositiveSymbol.png",
    DT_NEGATIVE_COLOR:   "NegativeSymbol.png",
  };

  // tags additionnels simples (ex : <ENERGY>, <PRE_ATTACK>)
  const EXTRA_ICONS = {
    ENERGY: "EnergySymbol.png",
    PRE_ATTACK: "LeftclicSymbol.png",
  };

  // Rend le texte en remplaçant les <DT_...> par une icône inline
  // + absorbe les espaces/retours autour de la balise pour éviter les sauts de ligne.
  function renderTextIcons(input) {
    let s = String(input ?? "");

    // normaliser d'abord
    s = s.replace(/\r\n?|\r/g, "\n")
         .replace(/<\s*br\s*\/?>/gi, "\n")
         .replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n");

    // échapper le HTML (sécurité)
    s = s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    // remplacer les DT_* (forme brute ou encodée) en "mangeant" le blanc autour
    s = s.replace(/\s*(?:&lt;|<)\s*(DT_[A-Z_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
      const file = DT_ICONS[key];
      if (!file) return "";
      const src = ICON_BASE + file;
      return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
    });

    // remplacer quelques tags additionnels (ex: <ENERGY>, <PRE_ATTACK>) — même logique
    s = s.replace(/\s*(?:&lt;|<)\s*(?!DT_)([A-Z0-9_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
      const file = EXTRA_ICONS[key];
      if (!file) return `&lt;${key}&gt;`;
      const src = ICON_BASE + file;
      return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
    });

    // supprimer toute autre balise technique restante (p.ex. &lt;LOWER_IS_BETTER&gt;)
    s = s.replace(/&lt;\/?[A-Z0-9_]+\/?&gt;/g, "");

    // ménage
    s = s.replace(/[ \t]{2,}/g, " ");
    s = s.replace(/\n/g, "<br>");
    return s.trim();
  }

  /* ================== Utils & Config ================== */
  const ENDPOINTS = [
    // ✅ Priorise ton API Cephalon
    "https://cephalon-wodan-production.up.railway.app/mods",
    // replis warframestat
    "https://api.warframestat.us/mods?language=en",
    "https://api.warframestat.us/mods/?language=en",
    "https://api.warframestat.us/mods/",
  ];
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const norm = (v) => String(v || "").trim();
  const ucFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---- Category denylist (exclues de la sidebar)
  const CATEGORY_DENY = [
    "Focus Way",
    "Mod Set Mod",
    "Arch-Gun Riven Mod",
    "Companion Weapon Riven Mod",
    "Kitgun Riven Mod",
    "Melee Riven Mod",
    "Pistol Riven Mod",
    "Rifle Riven Mod",
    "Shotgun Riven Mod",
    "Zaw Riven Mod",
  ];
  const normTypeName = (s) => norm(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const CATEGORY_DENYSET = new Set(CATEGORY_DENY.map(normTypeName));
  const isDeniedType = (t) => CATEGORY_DENYSET.has(normTypeName(t));

  /* ================== Polarity (icônes locales) ================== */
  const POL_ICON = (p) => {
    const map = {
      Madurai: "Madurai_Pol.svg", Vazarin: "Vazarin_Pol.svg",
      Naramon: "Naramon_Pol.svg", Zenurik: "Zenurik_Pol.svg",
      Unairu:  "Unairu_Pol.svg",  Umbra:   "Umbra_Pol.svg",
      Penjaga: "Penjaga_Pol.svg", Any:     "Any_Pol.svg",
      None:    "Any_Pol.svg",     "":      "Any_Pol.svg",
      Aura:    "Aura_Pol.svg",    Exilus:  "Exilus_Pol.svg",
    };
    const key = canonPolarity(p);
    return `img/polarities/${map[key] || "Any_Pol.svg"}`;
  };
  function canonPolarity(p){
    const s = norm(p).toLowerCase();
    if (!s) return "Any";
    const aliases = {
      madurai:"Madurai", vazarin:"Vazarin", naramon:"Naramon", aura:"Aura", exilus:"Exilus",
      zenurik:"Zenurik", unairu:"Unairu", penjaga:"Penjaga",
      umbra:"Umbra", universal:"Any", any:"Any", none:"Any", "-":"Any"
    };
    return aliases[s] || ucFirst(s);
  }

  /* ================== Images wiki (vérifiées) ================== */
  function wikiThumbRaw(m){ return m.wikiaThumbnail || m.wikiathumbnail || m.wikiThumbnail || ""; }
  function normalizeUrl(u){ return !u ? "" : (u.startsWith("//") ? "https:" + u : u); }
  function upscaleThumb(url, size=720){
    if (!url) return "";
    let out = normalizeUrl(url);
    out = out.replace(/scale-to-width-down\/\d+/i, `scale-to-width-down/${size}`);
    if (!/scale-to-width-down\/\d+/i.test(out) && /\/latest/i.test(out)) {
      out = out.replace(/\/latest(\/?)(\?[^#]*)?$/i, (m, slash, qs='') =>
        `/latest${slash ? "" : "/"}scale-to-width-down/${size}${qs || ""}`);
    }
    return out;
  }
  function verifiedWikiImage(m){
    const raw = wikiThumbRaw(m);
    if (!raw) return { url: "", verified: false };
    return { url: upscaleThumb(raw, 720), verified: true };
  }
  // Placeholder (une seule ligne → pas d’erreur de saut de ligne)
  const MOD_PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/></linearGradient></defs><rect width="600" height="360" fill="url(#g)"/><rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/><text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">Unreleased</text></svg>');

  /* ================== Nettoyage de texte (sans supprimer les <DT_...>) ================== */
  function cleanFxKeepTokens(s) {
    if (!s) return "";
    let t = String(s);
    t = t.replace(/\\n/g, "\n");
    t = t.replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n");
    t = t.replace(/[ \t]{2,}/g, " ").trim();
    return t;
  }

  /* ================== Effets ================== */
  function effectsFromLevelStats(m){
    const ls = Array.isArray(m.levelStats) ? m.levelStats : null;
    if (!ls || !ls.length) return [];
    let pick = ls[ls.length - 1];
    if (Number.isFinite(m.fusionLimit)) {
      const cand = ls.find(x => x?.level === m.fusionLimit);
      if (cand) pick = cand;
    }
    const stats = Array.isArray(pick?.stats) ? pick.stats : [];
    return stats.map(s => cleanFxKeepTokens(norm(s))).filter(Boolean);
  }
  function effectsFromDescription(m){
    let d = norm(m.description);
    if (!d) return [];
    d = cleanFxKeepTokens(d);
    const parts = d
      .replace(/\r?\n/g, "|")
      .replace(/[•;·]/g, "|")
      .split("|")
      .map(x => cleanFxKeepTokens(x))
      .filter(Boolean);
    return parts;
  }
  function makeEffects(m){
    const stats = effectsFromLevelStats(m);
    if (stats.length) return Array.from(new Set(stats));
    const desc = effectsFromDescription(m);
    return Array.from(new Set(desc));
  }

  /* ================== Exclusions par défaut ================== */
  function isFocus(m){
    const name = norm(m.name), type = norm(m.type), uniq = norm(m.uniqueName);
    return /focus/i.test(type) || /\/focus\//i.test(uniq) || /focus/i.test(name);
  }
  function isRiven(m){ return /riven/i.test(m.name) || /riven/i.test(m.type); }
  function isEmptySetStub(m){
    const stub = /set\s*mod/i.test(m.type) || /^set\s*mod$/i.test(m.name);
    const emptyish = !(m.description && m.description.trim().length) && !Array.isArray(m.levelStats);
    return stub && emptyish;
  }

  /* ================== Rareté / Qualité ================== */
  function rarityKey(r){ const s = norm(r).toUpperCase(); return /PRIMED/.test(s) ? "PRIMED" : s; }
  function rarityOrder(r){ return ({COMMON:1,UNCOMMON:2,RARE:3,LEGENDARY:4,PRIMED:5})[rarityKey(r)] || 0; }
  function descScore(m){ return Math.min(500, makeEffects(m).join(" ").length + norm(m.description).length); }

  // ✅ PATCH: bonus si l’item vient de ton API (slug/cats/setBonus)
  function qualityForPrimary(m){
    const imgBonus = wikiThumbRaw(m) ? 2000 : 0;
    const textBonus = descScore(m);
    const rankBonus = (m.fusionLimit || 0);
    const cephalonBonus =
      (m.slug ? 150 : 0) +
      (Array.isArray(m.categories) && m.categories.length ? 100 : 0) +
      (m.setBonus ? 200 : 0);
    return imgBonus + textBonus + rankBonus + cephalonBonus;
  }

  /* ================== Fusion des doublons PAR NOM ================== */

  function mergeGroup(items){
    const primary = items.slice().sort((a,b)=> qualityForPrimary(b)-qualityForPrimary(a))[0];
    const bestTxt = items.slice().sort((a,b)=> descScore(b)-descScore(a))[0];

    const effects = makeEffects(bestTxt).length ? makeEffects(bestTxt) : makeEffects(primary);
    const imgPrim  = verifiedWikiImage(primary);
    const imgBest  = verifiedWikiImage(bestTxt);
    const img      = imgPrim.url || imgBest.url;
    const verified = imgPrim.verified || imgBest.verified;

    function pick(...arr){ return arr.find(v => v != null && String(v).trim() !== "") ?? ""; }
    function pickMaxInt(...arr){ let best=null; for (const v of arr) if (Number.isFinite(v)) best = best==null?v:Math.max(best,v); return best; }
    function pickRarity(...arr){ const vals = arr.filter(Boolean); if (!vals.length) return ""; return vals.sort((a,b)=>rarityOrder(b)-rarityOrder(a))[0]; }
    function pickPolarity(...arr){
      const vals = arr.map(canonPolarity).filter(Boolean);
      if (!vals.length) return "Any";
      return vals.sort((a,b)=> (a==="Any") - (b==="Any") || a.localeCompare(b))[0];
    }

    // ✅ PATCH: préserver des champs Cephalon utiles (slug/cats/setBonus)
    const withMeta = items.find(x => x && (x.slug || (x.categories && x.categories.length) || x.setBonus)) || primary;
    const setBonus = withMeta.setBonus || null;

    return {
      name: pick(primary.name), uniqueName: pick(primary.uniqueName, bestTxt.uniqueName),
      description: pick(bestTxt.description, primary.description),
      effectsLines: effects,
      type: pick(primary.type, bestTxt.type),
      compatibility: pick(primary.compatibility, primary.compatName, bestTxt.compatibility, bestTxt.compatName),
      baseDrain: pickMaxInt(primary.baseDrain, bestTxt.baseDrain),
      fusionLimit: pickMaxInt(primary.fusionLimit, bestTxt.fusionLimit),
      rarity: pickRarity(primary.rarity, primary.rarityString, bestTxt.rarity, bestTxt.rarityString),
      polarity: pickPolarity(primary.polarity, primary.polarityName, bestTxt.polarity, bestTxt.polarityName),
      set: pick(primary.set, bestTxt.set),

      // ✅ PATCH: champs Cephalon conservés
      slug: withMeta.slug || "",
      categories: Array.isArray(withMeta.categories) ? withMeta.categories.slice() : [],
      setBonus,

      wikiImage: img,
      imgVerified: !!verified,
    };
  }
  function mergeByName(arr){
    const groups = new Map();
    for (const m of arr) {
      const k = norm(m.name).toLowerCase(); if (!k) continue;
      (groups.get(k) ?? groups.set(k, []).get(k)).push(m);
    }
    return Array.from(groups.values()).map(mergeGroup);
  }

  /* ================== STATE (unique) ================== */
  const STATE = {
    all: [], filtered: [], page: 1, perPage: 24,
    q: "", sort: "name",
    fCats: new Set(), fPols: new Set(), fRars: new Set(),
    onlyVerified: true,
    view: "cards",
  };

  /* ================== UI helpers ================== */
  function badge(text, cls=""){ return `<span class="badge ${cls}">${escapeHtml(text)}</span>`; }
  function polBadge(p){
    const src = POL_ICON(p), txt = canonPolarity(p);
    return `<span class="badge pol-badge"><img src="${src}" alt="${txt}"><span>${txt}</span></span>`;
  }

  function modCard(m){
    const img = m.imgVerified ? m.wikiImage : MOD_PLACEHOLDER;
    const pol = canonPolarity(m.polarity || "");
    aconst rar = rarityKey(m.rarity || "");
    const compat = m.compatibility || "";
    const cat = m.type || "";
    const lines = Array.isArray(m.effectsLines) ? m.effectsLines : [];

    const chipsLeft = [
      cat && badge(cat),
      compat && badge(compat),
      rar && badge(rar, `rar-${rar}`),
      Number.isFinite(m.fusionLimit) ? badge(`R${m.fusionLimit}`) : "",
      (!m.imgVerified) ? badge("Unreleased","gold") : ""
    ].filter(Boolean).join(" ");

    const headRight = pol ? polBadge(pol) : "";

    return `
    <div class="mod-card">
      <a href="#" class="mod-cover" data-full="${escapeHtml(img)}" data-name="${escapeHtml(m.name)}">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(m.name)}" loading="lazy" decoding="async">
      </a>
      <div class="mod-body">
        <div class="mod-head">
          <div class="mod-title" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</div>
          ${headRight}
        </div>
        <div class="mod-chips">${chipsLeft}</div>
        <div class="mod-effects">
          ${
            lines.length
            ? lines.map(t => `<div class="fx">• ${renderTextIcons(t)}</div>`).join("")
            : `<div class="fx muted">No effect data in API</div>`
          }
        </div>
      </div>
    </div>`;
  }

  function tableRow(m){
    const img = m.imgVerified ? m.wikiImage : MOD_PLACEHOLDER;
    const pol = canonPolarity(m.polarity || "");
    const rar = rarityKey(m.rarity || "");
    return `
      <tr class="border-t border-[rgba(255,255,255,.06)]">
        <td class="p-2"><img src="${escapeHtml(img)}" alt="${escapeHtml(m.name)}" class="w-20 h-12 object-contain"></td>
        <td class="p-2">${escapeHtml(m.name)} ${!m.imgVerified ? '<span class="badge gold ml-1">Unreleased</span>' : ''}</td>
        <td class="p-2">${escapeHtml(m.type || "")}</td>
        <td class="p-2">${escapeHtml(m.compatibility || "")}</td>
        <td class="p-2">${pol ? `<img src="${POL_ICON(pol)}" alt="${pol}" class="inline w-5 h-5 align-[-2px]"> ${pol}` : ""}</td>
        <td class="p-2">${rar}</td>
        <td class="p-2">${Number.isFinite(m.fusionLimit) ? `R${m.fusionLimit}` : "—"}</td>
      </tr>`;
  }

  /* ================== Filtres (sidebar) ================== */
  function buildFiltersFromData(arr){
    const cats = new Set(), pols = new Set(), rars = new Set();

    for (const m of arr) {
      if (isFocus(m) || isRiven(m) || isEmptySetStub(m)) continue;
      const t = m.type || "";
      if (t && !isDeniedType(t)) cats.add(t);
      if (canonPolarity(m.polarity)) pols.add(canonPolarity(m.polarity));
      if (rarityKey(m.rarity)) rars.add(rarityKey(m.rarity));
    }

    const catList = Array.from(cats).sort((a,b)=>a.localeCompare(b));
    const polList = Array.from(pols).sort((a,b)=>a.localeCompare(b));
    const rarList = Array.from(rars).sort((a,b)=>rarityOrder(a)-rarityOrder(b));

    $("#f-cat").innerHTML = catList.map(v => `
      <label class="filter-pill"><input type="checkbox" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>
    `).join("");

    $("#f-pol").innerHTML = polList.map(v => `
      <label class="filter-pill"><input type="checkbox" value="${escapeHtml(v)}">
        <img src="${POL_ICON(v)}" class="w-4 h-4 inline-block mr-1" alt="${escapeHtml(v)}">${escapeHtml(v)}
      </label>
    `).join("");

    $("#f-rar").innerHTML = rarList.map(v => `
      <label class="filter-pill"><input type="checkbox" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>
    `).join("");

    $("#f-cat").querySelectorAll("input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        if (cb.checked) STATE.fCats.add(cb.value); else STATE.fCats.delete(cb.value);
        STATE.page = 1; applyFilters();
      });
    });
    $("#f-pol").querySelectorAll("input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        if (cb.checked) STATE.fPols.add(cb.value); else STATE.fPols.delete(cb.value);
        STATE.page = 1; applyFilters();
      });
    });
    $("#f-rar").querySelectorAll("input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        if (cb.checked) STATE.fRars.add(cb.value); else STATE.fRars.delete(cb.value);
        STATE.page = 1; applyFilters();
      });
    });

    $("#f-verified").addEventListener("change", ()=>{
      STATE.onlyVerified = $("#f-verified").checked;
      STATE.page = 1; applyFilters();
    });
  }

  function renderActiveChips(){
    const wrap = $("#active-filters");
    const chips = [];
    if (STATE.q) chips.push({k:"q", label:`"${escapeHtml(STATE.q)}"`});
    if (STATE.fCats.size) chips.push({k:"cats", label:`Cat: ${[...STATE.fCats].join(", ")}`});
    if (STATE.fPols.size) chips.push({k:"pols", label:`Pol: ${[...STATE.fPols].join(", ")}`});
    if (STATE.fRars.size) chips.push({k:"rars", label:`Rarity: ${[...STATE.fRars].join(", ")}`});
    if (STATE.onlyVerified) chips.push({k:"verified", label:`Verified wiki image`});
    wrap.innerHTML = chips.length
      ? chips.map((c,i)=>`<button class="badge gold" data-chip="${c.k}|${i}">${c.label} ✕</button>`).join("")
      : "";
    wrap.querySelectorAll("[data-chip]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const [k] = btn.dataset.chip.split("|");
        if (k==="q") { STATE.q=""; $("#q").value=""; }
        if (k==="cats") STATE.fCats.clear();
        if (k==="pols") STATE.fPols.clear();
        if (k==="rars") STATE.fRars.clear();
        if (k==="verified") { STATE.onlyVerified = false; $("#f-verified").checked = false; }
        $$("#f-cat input, #f-pol input, #f-rar input").forEach(cb=> cb.checked=false);
        STATE.page = 1; applyFilters();
      });
    });
  }

  /* ================== Tri/filtrage/rendu ================== */
  function applyFilters(){
    const q = STATE.q = norm($("#q").value).toLowerCase();
    let arr = STATE.all.slice();

    arr = arr.filter(m => !isFocus(m) && !isRiven(m) && !isEmptySetStub(m));
    if (STATE.onlyVerified) arr = arr.filter(m => m.imgVerified === true);

    if (STATE.fCats.size) arr = arr.filter(m => STATE.fCats.has(m.type || ""));
    if (STATE.fPols.size) arr = arr.filter(m => STATE.fPols.has(canonPolarity(m.polarity || "")));
    if (STATE.fRars.size) arr = arr.filter(m => STATE.fRars.has(rarityKey(m.rarity || "")));

    if (q) {
      arr = arr.filter(m => {
        const hay = [
          m.name, m.description, (m.effectsLines||[]).join(" "),
          m.type, m.compatibility, m.uniqueName
        ].map(norm).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    const sort = STATE.sort = $("#sort").value;
    arr.sort((a,b)=>{
      if (sort === "rarity")   return rarityOrder(a.rarity) - rarityOrder(b.rarity) || (a.name||"").localeCompare(b.name||"");
      if (sort === "polarity") return canonPolarity(a.polarity||"").localeCompare(canonPolarity(b.polarity||"")) || (a.name||"").localeCompare(b.name||"");
      if (sort === "drain")    return (a.fusionLimit ?? 0) - (b.fusionLimit ?? 0) || (a.name||"").localeCompare(b.name||"");
      if (sort === "compat")   return (a.compatibility||"").localeCompare(b.compatibility||"") || (a.name||"").localeCompare(b.name||"");
      if (sort === "category") return (a.type||"").localeCompare(b.type||"") || (a.name||"").localeCompare(b.name||"");
      return (a.name||"").localeCompare(b.name||"");
    });

    STATE.filtered = arr;
    STATE.page = 1;
    render();
    renderActiveChips();
  }

  function render(){
    const total = STATE.filtered.length;
    $("#count").textContent = `${total} mod(s)`;

    const per = STATE.perPage;
    const pages = Math.max(1, Math.ceil(total / per));
    const page = Math.min(Math.max(1, STATE.page), pages);
    STATE.page = page;

    $("#prev").disabled = (page <= 1);
    $("#next").disabled = (page >= pages);
    $("#pageinfo").textContent = `Page ${page} / ${pages}`;

    const start = (page - 1) * per;
    const slice = STATE.filtered.slice(start, start + per);

    if (STATE.view === "table") {
      $("#results").classList.add("hidden");
      $("#table-wrap").classList.remove("hidden");
      $("#table-body").innerHTML = slice.map(tableRow).join("");
    } else {
      $("#table-wrap").classList.add("hidden");
      $("#results").className = "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3";
      $("#results").innerHTML = slice.map(modCard).join("");

      $("#results").querySelectorAll(".mod-cover").forEach(a=>{
        const img = a.querySelector("img");
        img.addEventListener("error", ()=>{ img.src = MOD_PLACEHOLDER; }, { once:true });
        a.addEventListener("click", (e)=>{
          e.preventDefault();
          openLightbox(a.dataset.full, a.dataset.name);
        });
      });
    }
  }

  /* ================== Lightbox ================== */
  function openLightbox(url, caption=""){
    if (!url) return;
    $("#lb-img").src = url;
    $("#lb-img").alt = caption;
    $("#lb-caption").textContent = caption;
    $("#lightbox").classList.remove("hidden");
  }
  function closeLightbox(){
    $("#lightbox").classList.add("hidden");
    $("#lb-img").src = "";
  }
  (function setupLightbox(){
    const lb = $("#lightbox");
    if (!lb) return;
    $("#lb-close").addEventListener("click", closeLightbox);
    lb.addEventListener("click", (e)=>{
      if (e.target.id === "lightbox" || e.target.classList.contains("lb-backdrop")) closeLightbox();
    });
    document.addEventListener("keydown", (e)=>{ if (e.key === "Escape") closeLightbox(); });
  })();

  /* ================== Fetch + boot ================== */
  async function fetchMods(){
    const errors = [];

    // timeout helper
    function withTimeout(promise, ms = 10000){
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(()=>reject(new Error(`Timeout ${ms}ms`)), ms))
      ]);
    }

    // parse sécurisé : tolère text/plain et montre une erreur claire si HTML
    async function safeJson(resp){
      const ct = String(resp.headers.get("content-type") || "").toLowerCase();
      const text = await resp.text();
      if (!ct.includes("application/json")) {
        try { return JSON.parse(text); }
        catch(e){ throw new Error(`Non-JSON response (${resp.status})`); }
      }
      try { return JSON.parse(text); }
      catch(e){ throw new Error(`JSON parse error: ${e.message}`); }
    }

    // normaliser la forme en tableau
    function pickArray(payload){
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      if (payload && Array.isArray(payload.mods)) return payload.mods;
      return null;
    }

    for (const url of ENDPOINTS) {
      try {
        const r = await withTimeout(fetch(url, { cache: "no-store", mode: "cors" }), 10000);
        if (!r.ok) { errors.push(`${url} → HTTP ${r.status}`); continue; }

        const data = await safeJson(r);
        const arr = pickArray(data);
        if (Array.isArray(arr) && arr.length >= 0) {
          console.debug(`[mods] loaded from ${url}:`, arr.length);
          return arr;
        }
        errors.push(`${url} → unexpected payload shape`);
      } catch (e) {
        errors.push(`${url} → ${e.message || e}`);
      }
    }

    console.warn("[mods] endpoints empty/failed:", errors);
    const status = document.querySelector("#status");
    if (status) {
      status.textContent = `Failed to load mods.\n${errors.join("\n")}`;
      status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
      status.style.whiteSpace = "pre-wrap";
    }
    return [];
  }

  (function boot(){
    const status = $("#status");

    $("#results").innerHTML = Array.from({length:6}).map(()=>`
      <div class="mod-card">
        <div class="mod-cover" style="height:300px;background:rgba(255,255,255,.04)"></div>
        <div class="mod-body">
          <div class="h-4 rounded bg-[rgba(255,255,255,.08)] w-2/3 mb-2"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-1/2 mb-1"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-5/6"></div>
        </div>
      </div>
    `).join("");

    fetchMods().then(raw => {
      STATE.all = mergeByName(raw);
      buildFiltersFromData(STATE.all);

      $("#q").value = "";
      $("#sort").value = "name";
      $("#view-cards").classList.add("active");
      $("#view-table").classList.remove("active");
      $("#f-verified").checked = true;
      STATE.onlyVerified = true;

      $("#q").addEventListener("input", ()=>{ STATE.q = $("#q").value; STATE.page=1; applyFilters(); });
      $("#sort").addEventListener("change", ()=>{ STATE.page=1; applyFilters(); });
      $("#view-cards").addEventListener("click", ()=>{ STATE.view="cards"; $("#view-cards").classList.add("active"); $("#view-table").classList.remove("active"); render(); });
      $("#view-table").addEventListener("click", ()=>{ STATE.view="table"; $("#view-table").classList.add("active"); $("#view-cards").classList.remove("active"); render(); });
      $("#reset").addEventListener("click", ()=>{
        STATE.q=""; $("#q").value="";
        STATE.sort="name"; $("#sort").value="name";
        STATE.fCats.clear(); STATE.fPols.clear(); STATE.fRars.clear();
        $$("#f-cat input, #f-pol input, #f-rar input").forEach(cb=> cb.checked=false);
        $("#f-verified").checked = true; STATE.onlyVerified = true;
        STATE.page=1; applyFilters();
      });
      $("#prev").addEventListener("click", ()=>{ STATE.page--; render(); });
      $("#next").addEventListener("click", ()=>{ STATE.page++; render(); });

      status.textContent = `Mods loaded: ${STATE.all.length} (EN, verified wiki images only by default)`;
      applyFilters();
    }).catch(e=>{
      console.error("[mods] error:", e);
      status.textContent = "Error while loading mods.";
      status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    });
  })();

})();