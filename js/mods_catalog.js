// js/mods_catalog.js — EN data + grande image (wikiaThumbnail prioritaire) + lightbox
// + Exclusions: Focus Ways, "Mod Set Mods" (hub), Riven Mods
const API = "https://api.warframestat.us/mods/?language=en";
const CDN = (img) => img ? `https://cdn.warframestat.us/img/${img}` : null;
function MOD_THUMB(m) {
  const wik = m.wikiaThumbnail || m.wikiathumbnail || null; // compat noms de champ
  if (wik && /^https?:\/\//i.test(wik)) return wik;
  return CDN(m.imageName);
}

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

  // Noms usuels : "Rifle Riven Mod", "Kitgun Riven Mod", "Veiled Riven Mod", etc.
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

  // On repart toujours de la source nettoyée (state.all)
  let arr = state.all.slice();

  // filtres
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

  // tri
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

    // ⛔ Exclure Focus Ways + hub "Mod Set Mods" + Rivens
    state.all = raw.filter(m => !isExcluded(m));

    status.textContent = `Mods loaded: ${state.all.length} (EN, filtered)`;

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
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
