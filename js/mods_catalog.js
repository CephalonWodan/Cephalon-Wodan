// js/mods_catalog.js — Catalogue élégant + filtres + tri + double vue
const API = "https://api.warframestat.us/mods/?language=fr";
const CDN = (img) => img ? `https://cdn.warframestat.us/img/${img}` : null;

const state = {
  all: [],
  filtered: [],
  page: 1,
  perPage: 48,
  view: "cards", // "cards" | "table"
  // filtres
  q: "",
  cats: new Set(),
  pols: new Set(),
  rars: new Set(),
  sort: "name",
};

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const norm = (s) => String(s || "").trim();
const txt  = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

/* ------------ Détection catégories ----------- */
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
  if (isNecramech(m))                return "Necramech";
  return "Other";
}

/* ------------ UI helpers ------------ */
function badgeGold(text){ return `<span class="badge gold">${text}</span>`; }
function badge(text){ return `<span class="badge">${text}</span>`; }
function rarityOrder(r){ return {common:1,uncommon:2,rare:3,legendary:4}[String(r||"").toLowerCase()] ?? 99; }
function polarityOrder(p){ return ({Madurai:1,Vazarin:2,Naramon:3,Zenurik:4,Unairu:5,Penjaga:6}[p||""] ?? 99); }
function categoryLabel(key){
  return ({
    Aura:"Aura", WarframeAugment:"Warframe (Augment)", WarframeExilus:"Warframe (Exilus)", Warframe:"Warframe",
    Primary:"Primaire", Secondary:"Secondaire", Melee:"Mêlée", Companion:"Compagnon",
    Archwing:"Archwing", Necramech:"Necramech", Other:"Autre"
  })[key] || key;
}

/* ------------ Cards ------------- */
function modCard(m){
  const img = CDN(m.imageName);
  const right = [
    m.compatName ? badgeGold(m.compatName) : "",
    m.polarity   ? badgeGold(m.polarity)   : "",
    m.rarity     ? badge(m.rarity)         : "",
    (m.fusionLimit!=null) ? badge(`R${m.fusionLimit}`) : ""
  ].filter(Boolean).join(" ");

  return `
  <div class="mod-card p-3 flex gap-3">
    <div class="mod-thumb w-[64px] h-[64px] flex items-center justify-center overflow-hidden">
      ${ img ? `<img src="${img}" alt="${m.name||"Mod"}" class="w-full h-full object-contain">`
              : `<div class="text-[10px] muted text-center px-1">Pas<br> d’icône</div>` }
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="font-semibold truncate">${m.name || "Mod"}</div>
          <div class="text-xs muted">${categoryLabel(categoryOf(m))}${m.type ? ` • ${m.type}` : ""}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">${right}</div>
      </div>
      ${ m.description ? `<div class="text-sm text-[var(--muted)] mt-1 clamp-2">${m.description}</div>` : "" }
    </div>
  </div>`;
}

/* ------------ Table row ------------- */
function tableRow(m){
  const img = CDN(m.imageName);
  return `
  <tr>
    <td class="p-2">
      <div class="w-10 h-10 mod-thumb flex items-center justify-center overflow-hidden">
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

/* ------------ Filtres UI (checkbox) ------------- */
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
  // listeners
  values.forEach(v => {
    const el = $(`${hostId}-${v}`);
    el.addEventListener("change", () => {
      if (el.checked) selectedSet.add(v);
      else selectedSet.delete(v);
      applyFilters();
    });
  });
}

/* ------------ Active filters chips ------------- */
function renderActiveChips(){
  const wrap = $("#active-filters");
  const chips = [];
  if (state.q) chips.push({k:"q", v:state.q, label:`Texte: "${state.q}"`});
  if (state.cats.size) chips.push({k:"cats", v:[...state.cats], label:`Cat: ${[...state.cats].map(categoryLabel).join(", ")}`});
  if (state.pols.size) chips.push({k:"pols", v:[...state.pols], label:`Pol: ${[...state.pols].join(", ")}`});
  if (state.rars.size) chips.push({k:"rars", v:[...state.rars], label:`Rareté: ${[...state.rars].join(", ")}`});

  if (!chips.length) { wrap.innerHTML = ""; return; }

  wrap.innerHTML = chips.map((c, idx) =>
    `<button class="badge gold" data-chip="${c.k}|${idx}" title="Retirer">${c.label} ✕</button>`
  ).join("");

  wrap.querySelectorAll("[data-chip]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [k] = btn.dataset.chip.split("|");
      if (k === "q") state.q = "";
      if (k === "cats") state.cats.clear();
      if (k === "pols") state.pols.clear();
      if (k === "rars") state.rars.clear();
      // Reset UI inputs
      $("#q").value = state.q;
      renderFilterGroup("#f-cat", ALL_CATS, state.cats, categoryLabel);
      renderFilterGroup("#f-pol", ALL_POLS, state.pols, x=>x);
      renderFilterGroup("#f-rar", ALL_RARS, state.rars, x=>x);
      applyFilters();
    });
  });
}

/* ------------ Logique filtres/tri/pagination ------------- */
function applyFilters(){
  const q = state.q = norm($("#q").value).toLowerCase();

  let arr = state.all.slice();

  // filtres
  if (state.cats.size) arr = arr.filter(m => state.cats.has(categoryOf(m)));
  if (state.pols.size) arr = arr.filter(m => state.pols.has(m.polarity || "")); // "" ne matche rien
  if (state.rars.size) arr = arr.filter(m => state.rars.has(m.rarity || ""));

  if (q) {
    arr = arr.filter(m => {
      const hay = [
        m.name, m.description, m.type, m.compatName, m.uniqueName
      ].map(norm).join(" ").toLowerCase();
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
    // grille responsive
    grid.className = "grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    grid.innerHTML = slice.map(modCard).join("");
  }
}

/* ------------ Boot ------------- */
(async function boot(){
  const status = $("#status");
  try {
    // Pré-remplir depuis l’URL (optionnel)
    const url = new URL(location.href);
    $("#q").value = url.searchParams.get("q") || "";

    // Skeleton rapide
    $("#results").innerHTML = Array.from({length:8}).map(()=>`
      <div class="mod-card p-3 animate-pulse flex gap-3">
        <div class="mod-thumb w-[64px] h-[64px]"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 rounded bg-[rgba(255,255,255,.08)] w-2/3"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-1/2"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-5/6"></div>
        </div>
      </div>
    `).join("");

    const mods = await fetch(API).then(r => r.json());
    state.all = Array.isArray(mods) ? mods : [];
    status.textContent = `Mods chargés : ${state.all.length}`;

    // Render filtres (checkbox)
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
    status.textContent = "Erreur de chargement des mods.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
