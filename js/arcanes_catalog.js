// Catalogue Arcanes — utilise data/arcanes_list.json (généré depuis arcanes.Lua)

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const norm = (s) => String(s || "").trim();
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Rangs/rareté (ordre)
const RAR_ORDER = ["Common","Uncommon","Rare","Legendary"];
const TYPE_ORDER = ["Warframe","Primary","Secondary","Melee","Shotgun","Bow","Amp","Operator","Kitgun","Zaw"];

const state = {
  all: [],
  filtered: [],
  page: 1,
  perPage: 18,
  q: "",
  sort: "name",
  types: new Set(),
  rarities: new Set(),
};

// ---------- UI helpers
function badge(text, color="") {
  const cls = color === "gold" ? "badge gold" : color === "gray" ? "badge gray" : "badge";
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

function arcCard(a) {
  const name = a.Name || a.name || "—";
  const type = a.Type || a.type || "—";
  const rarity = a.Rarity || a.rarity || "—";
  const rank = a.MaxRank != null ? String(a.MaxRank) : "—";
  const criteria = a.Criteria || a.criteria || "";
  const desc = a.Description || a.description || "";

  const right = [
    rarity ? badge(rarity, rarity === "Legendary" ? "gold" : "") : "",
    type ? badge(type, "gray") : "",
    rank !== "—" ? badge(`Max Rank ${rank}`, "gray") : ""
  ].filter(Boolean).join(" ");

  return `
    <div class="arc-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="arc-title truncate">${escapeHtml(name)}</div>
          ${ type ? `<div class="arc-meta">${escapeHtml(type)}</div>` : "" }
        </div>
        <div class="flex items-center gap-2 shrink-0">${right}</div>
      </div>

      ${ criteria ? `
        <div class="mt-3">
          <div class="text-sm muted mb-1">Criteria</div>
          <div class="arc-desc">${escapeHtml(criteria)}</div>
        </div>` : "" }

      ${ desc ? `
        <div class="mt-3">
          <div class="text-sm muted mb-1">Description</div>
          <div class="arc-desc">${escapeHtml(desc)}</div>
        </div>` : "" }
    </div>
  `;
}

// ---------- URL sync (facultatif, pratique)
function parseQuery(){
  const p = new URLSearchParams(location.search);
  state.q = norm(p.get("q") || "");
  state.sort = p.get("sort") || "name";
  const t = (p.get("types") || "").split(",").map(norm).filter(Boolean);
  const r = (p.get("rar") || "").split(",").map(norm).filter(Boolean);
  state.types = new Set(t);
  state.rarities = new Set(r);
  const page = parseInt(p.get("page")||"1",10);
  state.page = Number.isFinite(page) && page > 0 ? page : 1;
}
function writeQuery(){
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.sort && state.sort !== "name") p.set("sort", state.sort);
  if (state.types.size) p.set("types", [...state.types].join(","));
  if (state.rarities.size) p.set("rar", [...state.rarities].join(","));
  if (state.page > 1) p.set("page", String(state.page));
  const url = `${location.pathname}?${p.toString()}`;
  history.replaceState(null, "", url);
}

// ---------- Filtres UI
function renderTypeFilters(types){
  const host = $("#f-type");
  const arr = [...types].sort((a,b)=> TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
  host.innerHTML = arr.map(t=>{
    const id = `type-${t.replace(/\s+/g,"_")}`;
    const checked = state.types.has(t) ? "checked" : "";
    return `<label for="${id}" class="flex items-center gap-2 cursor-pointer">
              <input id="${id}" type="checkbox" value="${escapeHtml(t)}" ${checked} class="accent-[var(--ink)]">
              ${badge(t,"gray")}
            </label>`;
  }).join("");
  arr.forEach(t=>{
    const el = $(`#type-${t.replace(/\s+/g,"_")}`);
    el.addEventListener("change", ()=>{
      if (el.checked) state.types.add(t);
      else state.types.delete(t);
      state.page = 1;
      applyFilters(); writeQuery();
    });
  });
}
function renderRarityFilters(rars){
  const host = $("#f-rar");
  const arr = [...rars].sort((a,b)=> RAR_ORDER.indexOf(a) - RAR_ORDER.indexOf(b));
  host.innerHTML = arr.map(r=>{
    const id = `rar-${r.replace(/\s+/g,"_")}`;
    const checked = state.rarities.has(r) ? "checked" : "";
    return `<label for="${id}" class="flex items-center gap-2 cursor-pointer">
              <input id="${id}" type="checkbox" value="${escapeHtml(r)}" ${checked} class="accent-[var(--ink)]">
              ${badge(r, r==="Legendary"?"gold":"")}
            </label>`;
  }).join("");
  arr.forEach(r=>{
    const el = $(`#rar-${r.replace(/\s+/g,"_")}`);
    el.addEventListener("change", ()=>{
      if (el.checked) state.rarities.add(r);
      else state.rarities.delete(r);
      state.page = 1;
      applyFilters(); writeQuery();
    });
  });
}
function renderActiveChips(){
  const wrap = $("#active-filters");
  const chips = [];
  if (state.q) chips.push({k:"q", label:`Text: "${escapeHtml(state.q)}"`});
  if (state.types.size) chips.push({k:"types", label:`Types: ${[...state.types].join(", ")}`});
  if (state.rarities.size) chips.push({k:"rar", label:`Rarity: ${[...state.rarities].join(", ")}`});
  wrap.innerHTML = chips.length
    ? chips.map((c,i)=>`<button class="badge gold" data-chip="${c.k}|${i}">${c.label} ✕</button>`).join("")
    : "";
  wrap.querySelectorAll("[data-chip]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const [k] = btn.dataset.chip.split("|");
      if (k==="q") { state.q=""; $("#q").value=""; }
      if (k==="types") { state.types.clear(); renderTypeFilters(allTypes(state.all)); }
      if (k==="rar") { state.rarities.clear(); renderRarityFilters(allRarities(state.all)); }
      state.page = 1; applyFilters(); writeQuery();
    });
  });
}

// ---------- Filters/Sort/Render
function allTypes(arr){ return new Set(arr.map(a=> norm(a.Type || a.type)).filter(Boolean)); }
function allRarities(arr){ return new Set(arr.map(a=> norm(a.Rarity || a.rarity)).filter(Boolean)); }

function applyFilters(){
  const q = state.q = norm($("#q").value).toLowerCase();
  let arr = state.all.slice();

  if (state.types.size) arr = arr.filter(a => state.types.has(norm(a.Type || a.type)));
  if (state.rarities.size) arr = arr.filter(a => state.rarities.has(norm(a.Rarity || a.rarity)));

  if (q) {
    arr = arr.filter(a => {
      const hay = [
        a.Name, a.name, a.Description, a.description, a.Criteria, a.criteria, a.Type, a.type
      ].map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  const sort = state.sort = $("#sort").value;
  arr.sort((a,b)=>{
    if (sort === "type") {
      const A = TYPE_ORDER.indexOf(a.Type||a.type); const B = TYPE_ORDER.indexOf(b.Type||b.type);
      return (A-B) || String(a.Name||a.name).localeCompare(String(b.Name||b.name));
    }
    if (sort === "rarity") {
      const A = RAR_ORDER.indexOf(a.Rarity||a.rarity); const B = RAR_ORDER.indexOf(b.Rarity||b.rarity);
      return (A-B) || String(a.Name||a.name).localeCompare(String(b.Name||b.name));
    }
    if (sort === "maxrank") {
      const A = a.MaxRank ?? -1; const B = b.MaxRank ?? -1;
      return (B-A) || String(a.Name||a.name).localeCompare(String(b.Name||b.name));
    }
    return String(a.Name||a.name).localeCompare(String(b.Name||b.name));
  });

  state.filtered = arr;
  state.page = Math.min(state.page, Math.max(1, Math.ceil(arr.length / state.perPage))) || 1;

  $("#count").textContent = `${arr.length} arcane(s)`;
  renderActiveChips();
  render();
}

function render(){
  const total = state.filtered.length;
  const pages = Math.max(1, Math.ceil(total / state.perPage));
  state.page = Math.min(Math.max(1, state.page), pages);
  $("#prev").disabled = (state.page <= 1);
  $("#next").disabled = (state.page >= pages);
  $("#pageinfo").textContent = `Page ${state.page} / ${pages}`;

  const start = (state.page - 1) * state.perPage;
  const slice = state.filtered.slice(start, start + state.perPage);

  // CARTES
  const grid = $("#results");
  grid.className = "grid gap-4";
  grid.innerHTML = slice.map(arcCard).join("");

  // TABLE
  const tb = $("#table-body");
  tb.innerHTML = slice.map(a => `
    <tr>
      <td class="p-2 align-top">${escapeHtml(a.Name || a.name || "—")}</td>
      <td class="p-2 align-top">${escapeHtml(a.Type || a.type || "—")}</td>
      <td class="p-2 align-top">${escapeHtml(a.Rarity || a.rarity || "—")}</td>
      <td class="p-2 align-top">${a.MaxRank != null ? a.MaxRank : "—"}</td>
      <td class="p-2 align-top">${escapeHtml(a.Criteria || a.criteria || "")}</td>
      <td class="p-2 align-top">${escapeHtml(a.Description || a.description || "")}</td>
    </tr>
  `).join("");
}

// ---------- Boot
(async function boot(){
  const status = $("#status");
  try {
    // Skeleton simple
    $("#results").innerHTML = Array.from({length:6}).map(()=>`
      <div class="arc-card">
        <div class="h-5 rounded bg-[rgba(255,255,255,.08)] w-2/3 mb-2"></div>
        <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-1/2 mb-4"></div>
        <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-5/6 mb-1"></div>
        <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-4/6"></div>
      </div>
    `).join("");

    // Charge la liste JSON (générée par ton script)
    const res = await fetch("data/arcanes_list.json", { cache: "no-store" });
    const data = await res.json();

    // Normalisation légère
    state.all = Array.isArray(data) ? data : [];
    const types = allTypes(state.all);
    const rars  = allRarities(state.all);

    parseQuery();
    $("#q").value = state.q;
    $("#sort").value = state.sort;

    renderTypeFilters(types);
    renderRarityFilters(rars);

    // Listeners
    $("#q").addEventListener("input", ()=>{ state.page=1; applyFilters(); writeQuery(); });
    $("#sort").addEventListener("change", ()=>{ state.page=1; applyFilters(); writeQuery(); });

    $("#reset").addEventListener("click", ()=>{
      state.q=""; $("#q").value="";
      state.types.clear(); state.rarities.clear();
      $("#sort").value="name"; state.page=1;
      renderTypeFilters(types); renderRarityFilters(rars);
      applyFilters(); writeQuery();
    });

    // Vue cartes/table
    const btnCards = $("#view-cards");
    const btnTable = $("#view-table");
    btnCards.addEventListener("click", ()=>{
      btnCards.classList.add("active"); btnTable.classList.remove("active");
      $("#results").classList.remove("hidden");
      $("#table-wrap").classList.add("hidden");
    });
    btnTable.addEventListener("click", ()=>{
      btnTable.classList.add("active"); btnCards.classList.remove("active");
      $("#results").classList.add("hidden");
      $("#table-wrap").classList.remove("hidden");
    });

    // Pager
    $("#prev").addEventListener("click", ()=>{ state.page--; render(); writeQuery(); });
    $("#next").addEventListener("click", ()=>{ state.page++; render(); writeQuery(); });

    status.textContent = `Arcanes loaded: ${state.all.length}`;
    applyFilters();
  } catch (e) {
    console.error("[arcanes] error:", e);
    status.textContent = "Error while loading arcanes.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
