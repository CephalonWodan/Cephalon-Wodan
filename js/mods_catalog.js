// js/mods_catalog.js — EN data + grande image (wikiaThumbnail prioritaire) + lightbox
// + Exclusions: Focus Ways, "Mod Set Mods" (hub), Riven Mods
// + Déduplication: 1 seul mod par nom (préférence wikiaThumbnail)
const API = "https://api.warframestat.us/mods/?language=en";
const CDN = (img) => img ? `https://cdn.warframestat.us/img/${img}` : null;
function MOD_THUMB(m) {
  const wik = m.wikiaThumbnail || m.wikiathumbnail || null; // compat
  if (wik && /^https?:\/\//i.test(wik)) return wik;
  return CDN(m.imageName);
}
function HAS_WIKIA_THUMB(m){
  const wik = m.wikiaThumbnail || m.wikiathumbnail || null;
  return !!(wik && /^https?:\/\//i.test(wik));
}// js/mods_catalog.js — Catalogue Mods (EN)
// - Images wiki only (thumbnail wiki quand dispo, sinon heuristique par nom).
// - Effets : levelStats[].stats au rang max → fallback description.
// - Fusion par nom (merge des champs, meilleure image/texte).
// - Filtre Focus / Riven / Set Mod vides.
// - Filtres UI : Category(Type), Polarity, Rarity + recherche, tri, pagination.
// - Deux vues : Cards / Table. Lightbox sur clic image.

const ENDPOINTS = [
  "https://api.warframestat.us/mods?language=en",
  "https://api.warframestat.us/mods/?language=en",
  "https://api.warframestat.us/mods/",
];

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const norm = (v) => String(v || "").trim();
const ucFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* ---------------- Polarity helpers (icônes locales) ---------------- */
const POL_ICON = (p) => {
  const map = {
    Madurai: "Madurai_Pol.svg", Vazarin: "Vazarin_Pol.svg",
    Naramon: "Naramon_Pol.svg", Zenurik: "Zenurik_Pol.svg",
    Unairu:  "Unairu_Pol.svg",  Umbra:   "Umbra_Pol.svg",
    Penjaga: "Penjaga_Pol.svg", Any:     "Any_Pol.svg",
    None:    "Any_Pol.svg",      "":      "Any_Pol.svg",
  };
  const key = canonPolarity(p);
  return `img/polarities/${map[key] || "Any_Pol.svg"}`;
};
function canonPolarity(p){
  const s = norm(p).toLowerCase();
  if (!s) return "Any";
  const aliases = {
    madurai:"Madurai", vazarin:"Vazarin", naramon:"Naramon",
    zenurik:"Zenurik", unairu:"Unairu", penjaga:"Penjaga",
    umbra:"Umbra", universal:"Any", any:"Any", none:"Any", "-":"Any"
  };
  return aliases[s] || ucFirst(s);
}

/* ---------------- Images wiki only ---------------- */
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
// Heuristique : "Primed Redirection" → /images/PrimedRedirectionMod.png
function guessWikiUrl(name){
  const base = norm(name).replace(/[’'`´]/g,"").replace(/[^\p{L}\p{N}\s-]/gu," ").replace(/\s+/g," ").trim();
  if (!base) return "";
  const camel = base.split(" ").map(w => ucFirst(w)).join("");
  return `https://wiki.warframe.com/images/${encodeURIComponent(camel + "Mod.png")}`;
}
function bestWikiImageUrl(m){
  const wiki = wikiThumbRaw(m);
  return wiki ? upscaleThumb(wiki, 720) : guessWikiUrl(m.name || "");
}
const MOD_PLACEHOLDER = (() => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/>
      </linearGradient></defs>
      <rect width="600" height="360" fill="url(#g)"/>
      <rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/>
      <text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">Mod image unavailable</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();

/* ---------------- Effets garantis ---------------- */
function effectsFromLevelStats(m){
  const ls = Array.isArray(m.levelStats) ? m.levelStats : null;
  if (!ls || !ls.length) return [];
  let pick = ls[ls.length - 1];
  if (Number.isFinite(m.fusionLimit)) {
    const cand = ls.find(x => x?.level === m.fusionLimit);
    if (cand) pick = cand;
  }
  const stats = Array.isArray(pick?.stats) ? pick.stats : [];
  return stats.map(s => norm(s)).filter(Boolean);
}
function effectsFromDescription(m){
  const d = norm(m.description);
  if (!d) return [];
  return d.split(/\n|•|;|·/g).map(x => norm(x)).filter(Boolean);
}
function makeEffects(m){
  const stats = effectsFromLevelStats(m);
  if (stats.length) return Array.from(new Set(stats));
  const desc = effectsFromDescription(m);
  return Array.from(new Set(desc));
}

/* ---------------- Exclusions par défaut ---------------- */
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

/* ---------------- Rareté / Qualité ---------------- */
function rarityKey(r){ const s = norm(r).toUpperCase(); return /PRIMED/.test(s) ? "PRIMED" : s; }
function rarityOrder(r){ return ({COMMON:1,UNCOMMON:2,RARE:3,LEGENDARY:4,PRIMED:5})[rarityKey(r)] || 0; }
function descScore(m){ return Math.min(500, makeEffects(m).join(" ").length + norm(m.description).length); }
function qualityForPrimary(m){ return (wikiThumbRaw(m) ? 2000 : 0) + descScore(m) + (m.fusionLimit || 0); }

/* ---------------- Fusion des doublons PAR NOM ---------------- */
function mergeGroup(items){
  const primary = items.slice().sort((a,b)=> qualityForPrimary(b)-qualityForPrimary(a))[0];
  const bestTxt = items.slice().sort((a,b)=> descScore(b)-descScore(a))[0];

  const effects = makeEffects(bestTxt).length ? makeEffects(bestTxt) : makeEffects(primary);
  const wikiImg = bestWikiImageUrl(primary) || bestWikiImageUrl(bestTxt);

  function pick(...arr){ return arr.find(v => v != null && String(v).trim() !== "") ?? ""; }
  function pickMaxInt(...arr){ let best=null; for (const v of arr) if (Number.isFinite(v)) best = best==null?v:Math.max(best,v); return best; }
  function pickRarity(...arr){ const vals = arr.filter(Boolean); if (!vals.length) return ""; return vals.sort((a,b)=>rarityOrder(b)-rarityOrder(a))[0]; }
  function pickPolarity(...arr){
    const vals = arr.map(canonPolarity).filter(Boolean);
    if (!vals.length) return "Any";
    return vals.sort((a,b)=> (a==="Any") - (b==="Any") || a.localeCompare(b))[0];
  }

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
    wikiImage: wikiImg,
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

/* ---------------- State ---------------- */
const state = {
  all: [], filtered: [], page: 1, perPage: 24,
  q: "", sort: "name",
  fCats: new Set(), fPols: new Set(), fRars: new Set(),
  view: "cards",
};

/* ---------------- UI helpers ---------------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function badge(text, cls=""){ return `<span class="badge ${cls}">${escapeHtml(text)}</span>`; }
function polChip(p){ const src = POL_ICON(p), txt = canonPolarity(p); return `<span class="chip"><img src="${src}" alt="${txt}"><span>${txt}</span></span>`; }

function modCard(m){
  const img = m.wikiImage || guessWikiUrl(m.name || "") || MOD_PLACEHOLDER;
  const pol = canonPolarity(m.polarity || "");
  const rar = rarityKey(m.rarity || "");
  const compat = m.compatibility || "";
  const cat = m.type || "";

  const chips = [
    cat && badge(cat),
    compat && badge(compat),
    pol && polChip(pol),
    rar && badge(rar, `rar-${rar}`),
    Number.isFinite(m.fusionLimit) ? badge(`R${m.fusionLimit}`) : ""
  ].filter(Boolean).join(" ");

  const lines = Array.isArray(m.effectsLines) ? m.effectsLines : [];

  return `
  <div class="mod-card">
    <a href="#" class="mod-cover" data-full="${escapeHtml(img)}" data-name="${escapeHtml(m.name)}">
      <img src="${escapeHtml(img)}" alt="${escapeHtml(m.name)}" loading="lazy" decoding="async">
    </a>
    <div class="mod-body">
      <div class="mod-title">${escapeHtml(m.name)}</div>
      <div class="mod-chips">${chips}</div>
      <div class="mod-effects">
        ${
          lines.length
          ? lines.map(t => `<div class="fx">• ${escapeHtml(t)}</div>`).join("")
          : `<div class="fx muted">No effect data in API</div>`
        }
      </div>
    </div>
  </div>`;
}

function tableRow(m){
  const img = m.wikiImage || guessWikiUrl(m.name || "") || MOD_PLACEHOLDER;
  const pol = canonPolarity(m.polarity || "");
  const rar = rarityKey(m.rarity || "");
  return `
    <tr class="border-t border-[rgba(255,255,255,.06)]">
      <td class="p-2"><img src="${escapeHtml(img)}" alt="${escapeHtml(m.name)}" class="w-20 h-12 object-contain"></td>
      <td class="p-2">${escapeHtml(m.name)}</td>
      <td class="p-2">${escapeHtml(m.type || "")}</td>
      <td class="p-2">${escapeHtml(m.compatibility || "")}</td>
      <td class="p-2">${pol ? `<img src="${POL_ICON(pol)}" alt="${pol}" class="inline w-5 h-5 align-[-2px]"> ${pol}` : ""}</td>
      <td class="p-2">${rar}</td>
      <td class="p-2">${Number.isFinite(m.fusionLimit) ? `R${m.fusionLimit}` : "—"}</td>
    </tr>`;
}

/* ---------------- Filtres (sidebar) ---------------- */
function buildFiltersFromData(arr){
  // Categories = type ; Polarities ; Rarities
  const cats = new Set(), pols = new Set(), rars = new Set();
  for (const m of arr) {
    if (norm(m.type)) cats.add(m.type);
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

  // activate listeners
  $("#f-cat").querySelectorAll("input[type=checkbox]").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      if (cb.checked) state.fCats.add(cb.value); else state.fCats.delete(cb.value);
      state.page = 1; applyFilters();
    });
  });
  $("#f-pol").querySelectorAll("input[type=checkbox]").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      if (cb.checked) state.fPols.add(cb.value); else state.fPols.delete(cb.value);
      state.page = 1; applyFilters();
    });
  });
  $("#f-rar").querySelectorAll("input[type=checkbox]").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      if (cb.checked) state.fRars.add(cb.value); else state.fRars.delete(cb.value);
      state.page = 1; applyFilters();
    });
  });
}

function renderActiveChips(){
  const wrap = $("#active-filters");
  const chips = [];
  if (state.q) chips.push({k:"q", label:`"${escapeHtml(state.q)}"`});
  if (state.fCats.size) chips.push({k:"cats", label:`Cat: ${[...state.fCats].join(", ")}`});
  if (state.fPols.size) chips.push({k:"pols", label:`Pol: ${[...state.fPols].join(", ")}`});
  if (state.fRars.size) chips.push({k:"rars", label:`Rarity: ${[...state.fRars].join(", ")}`});
  wrap.innerHTML = chips.length
    ? chips.map((c,i)=>`<button class="badge gold" data-chip="${c.k}|${i}">${c.label} ✕</button>`).join("")
    : "";
  wrap.querySelectorAll("[data-chip]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const [k] = btn.dataset.chip.split("|");
      if (k==="q") { state.q=""; $("#q").value=""; }
      if (k==="cats") state.fCats.clear();
      if (k==="pols") state.fPols.clear();
      if (k==="rars") state.fRars.clear();
      // décocher les cases
      $$("#f-cat input, #f-pol input, #f-rar input").forEach(cb=> cb.checked=false);
      state.page = 1; applyFilters();
    });
  });
}

/* ---------------- Tri/filtrage/rendu ---------------- */
function applyFilters(){
  const q = state.q = norm($("#q").value).toLowerCase();
  let arr = state.all.slice();

  // Exclusions par défaut
  arr = arr.filter(m => !isFocus(m) && !isRiven(m) && !isEmptySetStub(m));

  // Filtres explicites
  if (state.fCats.size) arr = arr.filter(m => state.fCats.has(m.type || ""));
  if (state.fPols.size) arr = arr.filter(m => state.fPols.has(canonPolarity(m.polarity || "")));
  if (state.fRars.size) arr = arr.filter(m => state.fRars.has(rarityKey(m.rarity || "")));

  // Recherche
  if (q) {
    arr = arr.filter(m => {
      const hay = [
        m.name, m.description, (m.effectsLines||[]).join(" "),
        m.type, m.compatibility, m.uniqueName
      ].map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  // Tri
  const sort = state.sort = $("#sort").value;
  arr.sort((a,b)=>{
    if (sort === "rarity")   return rarityOrder(a.rarity) - rarityOrder(b.rarity) || (a.name||"").localeCompare(b.name||"");
    if (sort === "polarity") return canonPolarity(a.polarity||"").localeCompare(canonPolarity(b.polarity||"")) || (a.name||"").localeCompare(b.name||"");
    if (sort === "drain")    return (a.fusionLimit ?? 0) - (b.fusionLimit ?? 0) || (a.name||"").localeCompare(b.name||""); // libellé "Max Rank"
    if (sort === "compat")   return (a.compatibility||"").localeCompare(b.compatibility||"") || (a.name||"").localeCompare(b.name||"");
    if (sort === "category") return (a.type||"").localeCompare(b.type||"") || (a.name||"").localeCompare(b.name||"");
    return (a.name||"").localeCompare(b.name||"");
  });

  state.filtered = arr;
  state.page = 1;
  render();
  renderActiveChips();
}

function render(){
  const total = state.filtered.length;
  $("#count").textContent = `${total} mod(s)`;

  const per = state.perPage;
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(Math.max(1, state.page), pages);
  state.page = page;

  $("#prev").disabled = (page <= 1);
  $("#next").disabled = (page >= pages);
  $("#pageinfo").textContent = `Page ${page} / ${pages}`;

  const start = (page - 1) * per;
  const slice = state.filtered.slice(start, start + per);

  if (state.view === "table") {
    $("#results").classList.add("hidden");
    $("#table-wrap").classList.remove("hidden");
    $("#table-body").innerHTML = slice.map(tableRow).join("");
  } else {
    $("#table-wrap").classList.add("hidden");
    $("#results").className = "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3";
    $("#results").innerHTML = slice.map(modCard).join("");

    // Lightbox + fallback placeholder si 404
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

/* ---------------- Lightbox ---------------- */
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

/* ---------------- Fetch + boot ---------------- */
async function fetchMods(){
  const errors = [];
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) { errors.push(`${url} → HTTP ${r.status}`); continue; }
      const data = await r.json();
      if (Array.isArray(data) && data.length) return data;
    } catch (e) { errors.push(`${url} → ${e.message||e}`); }
  }
  console.warn("[mods] endpoints empty/failed:", errors);
  return [];
}

(function boot(){
  const status = $("#status");

  // skeleton
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
    // fusion + pré-calcul des effets
    state.all = mergeByName(raw);

    // Filtres sidebar
    buildFiltersFromData(state.all);

    // UI init
    $("#q").value = "";
    $("#sort").value = "name";
    $("#view-cards").classList.add("active");
    $("#view-table").classList.remove("active");

    // Listeners barre haute
    $("#q").addEventListener("input", ()=>{ state.q = $("#q").value; state.page=1; applyFilters(); });
    $("#sort").addEventListener("change", ()=>{ state.page=1; applyFilters(); });
    $("#view-cards").addEventListener("click", ()=>{ state.view="cards"; $("#view-cards").classList.add("active"); $("#view-table").classList.remove("active"); render(); });
    $("#view-table").addEventListener("click", ()=>{ state.view="table"; $("#view-table").classList.add("active"); $("#view-cards").classList.remove("active"); render(); });

    // Reset
    $("#reset").addEventListener("click", ()=>{
      state.q=""; $("#q").value="";
      state.sort="name"; $("#sort").value="name";
      state.fCats.clear(); state.fPols.clear(); state.fRars.clear();
      $$("#f-cat input, #f-pol input, #f-rar input").forEach(cb=> cb.checked=false);
      state.page=1; applyFilters();
    });

    // Pager
    $("#prev").addEventListener("click", ()=>{ state.page--; render(); });
    $("#next").addEventListener("click", ()=>{ state.page++; render(); });

    status.textContent = `Mods loaded: ${state.all.length} (EN, wiki images + max-rank effects)`;
    applyFilters();
  }).catch(e=>{
    console.error("[mods] error:", e);
    status.textContent = "Error while loading mods.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  });
})();


const state = {
  all: [],
  filtered: [],
  page: 1,
  perPage: 24,        // images grandes → moins d’items / page
  view: "cards",      // "cards" | "table"
  q: "",
  cats: new Set(),
  pols: new Set(),
  rars: new Set(),
  sort: "name",
};

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const norm = (s) => String(s || "").trim();

/* --------- Catégories --------- */
function isAura(m){ const t=m.type||"",u=m.uniqueName||""; return /aura/i.test(t)||/\/Mods\/Auras?\//i.test(u); }
function isWarframe(m){ const t=m.type||"",u=m.uniqueName||""; return /warframe/i.test(t)||/\/Mods\/Warframe\//i.test(u); }
function isWeaponType(m,k){ return (m.type||"").toLowerCase().includes(k); }
function isCompanion(m){ const t=(m.type||"").toLowerCase(); return t.includes("companion")||t.includes("sentinel"); }
function isArchwing(m){ return (m.uniqueName||"").toLowerCase().includes("/archwing/"); }
function isNecramech(m){ const u=(m.uniqueName||"").toLowerCase(); return u.includes("/mech/")||u.includes("/necramech/"); }
function isExilus(m){
  if (m.isUtility === true) return true;
  if (Array.isArray(m.tags) && m.tags.some(x=>/exilus/i.test(x))) return true;
  if (/exilus/i.test(m.description||"")) return true;
  return false;
}
function isAugment(m){
  const d=m.description||"", n=m.name||"", c=m.compatName||"";
  return /augment/i.test(d) || /augment/i.test(n) || /augment/i.test(c);
}
function categoryOf(m){
  if (isAura(m)) return "Aura";
  if (isWarframe(m) && isAugment(m)) return "WarframeAugment";
  if (isWarframe(m) && isExilus(m))  return "WarframeExilus";
  if (isWarframe(m))                 return "Warframe";
  if (isWeaponType(m,"primary"))     return "Primary";
  if (isWeaponType(m,"secondary"))   return "Secondary";
  if (isWeaponType(m,"melee"))       return "Melee";
  if (isCompanion(m))                return "Companion";
  if (isArchwing(m))                 return "Archwing";
  if (isNecramech(m))               return "Necramech";
  return "Other";
}

/* --------- EXCLUSIONS (Focus Ways, "Mod Set Mods", Riven Mods) --------- */
const FOCUS_SCHOOLS = ["madurai","vazarin","naramon","zenurik","unairu"];
function isFocusWayItem(m){
  const name = (m.name||"").toLowerCase();
  const type = (m.type||"").toLowerCase();
  const url  = (m.wikiaUrl || m.wikiaurl || "").toLowerCase();
  const uniq = (m.uniqueName||"").toLowerCase();
  const desc = (m.description||"").toLowerCase();

  if (type.includes("focus")) return true;
  if (url.includes("/focus")) return true;
  if (uniq.includes("/focus/")) return true;
  if (Array.isArray(m.tags) && m.tags.some(t=> String(t).toLowerCase().includes("focus"))) return true;
  if (FOCUS_SCHOOLS.some(s => name.includes(s) || desc.includes(s))) return true;
  if (/[^a-z]way[^a-z]/i.test(" " + name + " ")) return true;
  return false;
}
function isSetModsHub(m){
  const name = (m.name||"").toLowerCase();
  const url  = (m.wikiaUrl || m.wikiaurl || "").toLowerCase();
  const uniq = (m.uniqueName||"").toLowerCase();
  if (name === "mod set mods" || name === "set mods" || /set mods/.test(name)) return true;
  if (url.includes("/set_mods")) return true;
  if (uniq.includes("/setmods")) return true;
  if (!m.rarity && !m.polarity && m.fusionLimit == null && !m.compatName && (!m.description || m.description.length < 12))
    return true;
  return false;
}
function isRivenMod(m){
  const name = (m.name||"").toLowerCase();
  const type = (m.type||"").toLowerCase();
  const uniq = (m.uniqueName||"").toLowerCase();
  const url  = (m.wikiaUrl || m.wikiaurl || "").toLowerCase();
  const desc = (m.description||"").toLowerCase();

  if (name.includes("riven mod")) return true;
  if (/\briven\b/.test(type)) return true;
  if (uniq.includes("/riven/") || uniq.includes("/rivens/")) return true;
  if (url.includes("/riven_") || url.endsWith("/riven")) return true;
  if (Array.isArray(m.tags) && m.tags.some(t=> String(t).toLowerCase().includes("riven"))) return true;
  if (desc.includes("riven")) return true;
  return false;
}
function isExcluded(m){
  return isFocusWayItem(m) || isSetModsHub(m) || isRivenMod(m);
}

/* --------- Déduplication par nom (préférence wikiaThumbnail) --------- */
function qualityScore(m){
  // Score simple pour choisir la “meilleure” variante
  let s = 0;
  if (HAS_WIKIA_THUMB(m)) s += 1000;
  if (m.description) s += Math.min(200, m.description.length);
  if (m.fusionLimit != null) s += 5 * m.fusionLimit;
  if (m.polarity) s += 3;
  const rarScore = {Legendary:4, Rare:3, Uncommon:2, Common:1}[m.rarity] || 0;
  s += rarScore;
  return s;
}
function dedupeByName(arr){
  const groups = new Map();
  for (const m of arr) {
    const k = norm(m.name).toLowerCase();
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(m);
  }
  const out = [];
  for (const [, items] of groups) {
    if (items.length === 1) { out.push(items[0]); continue; }
    const withThumb = items.filter(HAS_WIKIA_THUMB);
    const cand = (withThumb.length ? withThumb : items).sort((a,b)=> qualityScore(b)-qualityScore(a))[0];
    out.push(cand);
  }
  return out;
}

/* --------- UI helpers --------- */
function badgeGold(text){ return `<span class="badge gold">${text}</span>`; }
function badge(text){ return `<span class="badge">${text}</span>`; }
function rarityOrder(r){ return {common:1,uncommon:2,rare:3,legendary:4}[String(r||"").toLowerCase()] ?? 99; }
function polarityOrder(p){ return ({Madurai:1,Vazarin:2,Naramon:3,Zenurik:4,Unairu:5,Penjaga:6}[p||""] ?? 99); }
function categoryLabel(key){
  return ({
    Aura:"Aura", WarframeAugment:"Warframe (Augment)", WarframeExilus:"Warframe (Exilus)", Warframe:"Warframe",
    Primary:"Primary", Secondary:"Secondary", Melee:"Melee", Companion:"Companion",
    Archwing:"Archwing", Necramech:"Necramech", Other:"Other"
  })[key] || key;
}

/* --------- Carte mod (image large + contenu) --------- */
function modCard(m){
  const img = MOD_THUMB(m);
  const right = [
    m.compatName ? badgeGold(m.compatName) : "",
    m.polarity   ? badgeGold(m.polarity)   : "",
    m.rarity     ? badge(m.rarity)         : "",
    (m.fusionLimit!=null) ? badge(`R${m.fusionLimit}`) : ""
  ].filter(Boolean).join(" ");

  return `
  <div class="mod-card">
    <a href="#" class="mod-cover" data-full="${img||""}" data-name="${m.name||"Mod"}">
      ${ img
          ? `<img src="${img}" alt="${m.name||"Mod"}">`
          : `<div class="text-[10px] muted text-center px-2 py-10">No image</div>` }
    </a>
    <div class="mod-body">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="font-semibold truncate">${m.name || "Mod"}</div>
          <div class="text-xs muted">${categoryLabel(categoryOf(m))}${m.type ? ` • ${m.type}` : ""}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">${right}</div>
      </div>
      ${ m.description ? `<div class="text-sm text-[var(--muted)] mt-2 clamp-3">${m.description}</div>` : "" }
    </div>
  </div>`;
}

/* --------- Table row (icone plus grande) --------- */
function tableRow(m){
  const img = MOD_THUMB(m);
  return `
  <tr>
    <td class="p-2">
      <div class="table-thumb flex items-center justify-center overflow-hidden">
        ${ img ? `<img src="${img}" alt="${m.name||"Mod"}" class="w-full h-full object-contain">` : "" }
      </div>
    </td>
    <td class="p-2">${m.name || "Mod"}</td>
    <td class="p-2">${categoryLabel(categoryOf(m))}</td>
    <td class="p-2">${m.compatName || "—"}</td>
    <td class="p-2">${m.polarity || "—"}</td>
    <td class="p-2">${m.rarity || "—"}</td>
    <td class="p-2">${m.fusionLimit != null ? `R${m.fusionLimit}` : "—"}</td>
  </tr>`;
}

/* --------- Filtres (checkbox) --------- */
const ALL_CATS = ["Aura","WarframeAugment","WarframeExilus","Warframe","Primary","Secondary","Melee","Companion","Archwing","Necramech","Other"];
const ALL_POLS = ["Madurai","Vazarin","Naramon","Zenurik","Unairu","Penjaga"];
const ALL_RARS = ["Common","Uncommon","Rare","Legendary"];

function renderFilterGroup(hostId, values, selectedSet, labelFn = (x)=>x){
  const host = $(hostId);
  host.innerHTML = values.map(v => {
    const id = `${hostId.slice(1)}-${v}`;
    const active = selectedSet.has(v) ? "checked" : "";
    return `
      <label for="${id}" class="flex items-center gap-2 cursor-pointer">
        <input id="${id}" type="checkbox" value="${v}" ${active}
               class="accent-[var(--ink)]">
        <span>${labelFn(v)}</span>
      </label>`;
  }).join("");
  values.forEach(v => {
    const el = $(`${hostId}-${v}`);
    el.addEventListener("change", () => {
      if (el.checked) selectedSet.add(v);
      else selectedSet.delete(v);
      applyFilters();
    });
  });
}

/* --------- Active chips --------- */
function renderActiveChips(){
  const wrap = $("#active-filters");
  const chips = [];
  if (state.q) chips.push({k:"q", label:`Text: "${state.q}"`});
  if (state.cats.size) chips.push({k:"cats", label:`Cat: ${[...state.cats].map(categoryLabel).join(", ")}`});
  if (state.pols.size) chips.push({k:"pols", label:`Pol: ${[...state.pols].join(", ")}`});
  if (state.rars.size) chips.push({k:"rars", label:`Rarity: ${[...state.rars].join(", ")}`});

  if (!chips.length) { wrap.innerHTML = ""; return; }

  wrap.innerHTML = chips.map((c, idx) =>
    `<button class="badge gold" data-chip="${c.k}|${idx}" title="Remove">${c.label} ✕</button>`
  ).join("");

  wrap.querySelectorAll("[data-chip]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [k] = btn.dataset.chip.split("|");
      if (k === "q") state.q = "";
      if (k === "cats") state.cats.clear();
      if (k === "pols") state.pols.clear();
      if (k === "rars") state.rars.clear();
      $("#q").value = state.q;
      renderFilterGroup("#f-cat", ALL_CATS, state.cats, categoryLabel);
      renderFilterGroup("#f-pol", ALL_POLS, state.pols, x=>x);
      renderFilterGroup("#f-rar", ALL_RARS, state.rars, x=>x);
      applyFilters();
    });
  });
}

/* --------- Filtres/tri/pagination --------- */
function applyFilters(){
  const q = state.q = norm($("#q").value).toLowerCase();

  // On repart de la source “propre” (exclue + dédupliquée)
  let arr = state.all.slice();

  if (state.cats.size) arr = arr.filter(m => state.cats.has(categoryOf(m)));
  if (state.pols.size) arr = arr.filter(m => state.pols.has(m.polarity || ""));
  if (state.rars.size) arr = arr.filter(m => state.rars.has(m.rarity || ""));
  if (q) {
    arr = arr.filter(m => {
      const hay = [m.name, m.description, m.type, m.compatName, m.uniqueName]
        .map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  const sort = state.sort = $("#sort").value;
  arr.sort((a,b) => {
    if (sort === "rarity") return rarityOrder(a.rarity)-rarityOrder(b.rarity) || (a.name||"").localeCompare(b.name||"");
    if (sort === "polarity") return polarityOrder(a.polarity)-polarityOrder(b.polarity) || (a.name||"").localeCompare(b.name||"");
    if (sort === "drain") return (a.fusionLimit??0)-(b.fusionLimit??0) || (a.name||"").localeCompare(b.name||"");
    if (sort === "compat") return (a.compatName||"").localeCompare(b.compatName||"") || (a.name||"").localeCompare(b.name||"");
    if (sort === "category") return categoryLabel(categoryOf(a)).localeCompare(categoryLabel(categoryOf(b))) || (a.name||"").localeCompare(b.name||"");
    return (a.name||"").localeCompare(b.name||"");
  });

  state.filtered = arr;
  state.page = 1;
  render();
}

function render(){
  renderActiveChips();

  const total = state.filtered.length;
  $("#count").textContent = `${total} mod(s)`;

  const pages = Math.max(1, Math.ceil(total / state.perPage));
  state.page = Math.min(Math.max(1, state.page), pages);
  $("#prev").disabled = (state.page <= 1);
  $("#next").disabled = (state.page >= pages);
  $("#pageinfo").textContent = `Page ${state.page} / ${pages}`;

  const start = (state.page - 1) * state.perPage;
  const slice = state.filtered.slice(start, start + state.perPage);

  const grid = $("#results");
  const tableWrap = $("#table-wrap");
  const tbody = $("#table-body");

  if (state.view === "table") {
    grid.classList.add("hidden");
    tableWrap.classList.remove("hidden");
    tbody.innerHTML = slice.map(tableRow).join("");
  } else {
    tableWrap.classList.add("hidden");
    grid.classList.remove("hidden");
    grid.className = "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3";
    grid.innerHTML = slice.map(modCard).join("");

    // Click → lightbox
    grid.querySelectorAll(".mod-cover").forEach(a => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const url = a.dataset.full;
        if (!url) return;
        openLightbox(url, a.dataset.name || "");
      });
    });
  }
}

/* --------- Lightbox --------- */
function openLightbox(url, caption=""){
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
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  $("#lb-close").addEventListener("click", closeLightbox);
  lb.addEventListener("click", (e)=>{
    if (e.target.id === "lightbox" || e.target.classList.contains("lb-backdrop")) {
      closeLightbox();
    }
  });
  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape") closeLightbox();
  });
})();

/* --------- Boot --------- */
(async function boot(){
  const status = $("#status");
  try {
    $("#q").value = new URL(location.href).searchParams.get("q") || "";

    // Skeleton (image en haut)
    $("#results").innerHTML = Array.from({length:6}).map(()=>`
      <div class="mod-card">
        <div class="mod-cover" style="height:180px;background:rgba(255,255,255,.04)"></div>
        <div class="mod-body">
          <div class="h-4 rounded bg-[rgba(255,255,255,.08)] w-2/3 mb-2"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-1/2 mb-1"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-5/6"></div>
        </div>
      </div>
    `).join("");

    // Fetch
    const mods = await fetch(API).then(r => r.json());
    const raw = Array.isArray(mods) ? mods : [];

    // 1) ⛔ exclusions
    const filtered = raw.filter(m => !isExcluded(m));
    // 2) 🔁 déduplication (1 entrée par nom, préférence wikiaThumbnail)
    state.all = dedupeByName(filtered);

    status.textContent = `Mods loaded: ${state.all.length} (EN, filtered + dedup by name)`;

    // Filtres
    renderFilterGroup("#f-cat", ALL_CATS, state.cats, categoryLabel);
    renderFilterGroup("#f-pol", ALL_POLS, state.pols, (x)=>x);
    renderFilterGroup("#f-rar", ALL_RARS, state.rars, (x)=>x);

    // Listeners
    $("#q").addEventListener("input", applyFilters);
    $("#sort").addEventListener("change", applyFilters);
    $("#prev").addEventListener("click", ()=>{ state.page--; render(); });
    $("#next").addEventListener("click", ()=>{ state.page++; render(); });
    $("#reset").addEventListener("click", ()=>{
      state.q = ""; $("#q").value = "";
      state.cats.clear(); state.pols.clear(); state.rars.clear();
      $("#sort").value = "name";
      renderFilterGroup("#f-cat", ALL_CATS, state.cats, categoryLabel);
      renderFilterGroup("#f-pol", ALL_POLS, state.pols, (x)=>x);
      renderFilterGroup("#f-rar", ALL_RARS, state.rars, (x)=>x);
      applyFilters();
    });
    $("#view-cards").addEventListener("click", ()=>{
      state.view = "cards";
      $("#view-cards").classList.add("active");
      $("#view-table").classList.remove("active");
      render();
    });
    $("#view-table").addEventListener("click", ()=>{
      state.view = "table";
      $("#view-table").classList.add("active");
      $("#view-cards").classList.remove("active");
      render();
    });

    // Premier rendu
    applyFilters();
  } catch (e) {
    console.error(e);
    status.textContent = "Error while loading mods.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,255,255,.08)";
    status.style.color = "#ffd1d1";
  }
})();
