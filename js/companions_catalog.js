// js/companions_catalog.js
(() => {
  "use strict";

  /* ====== Config ====== */
  const JSON_PATH = "data/companions.json";      // ton JSON local (GitHub Pages)
  const IMG_BASE  = "img/companions/";           // dossier où tu mettras les PNG/JPG (facultatif)
  const PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/></linearGradient></defs><rect width="600" height="360" fill="url(#g)"/><rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/><text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text></svg>');

  /* ====== Utils ====== */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const norm = (v) => String(v || "").trim();
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt = (v) => (v==null || v==='') ? "—" : String(v);

  const pickImageName = (o) => o.Image || o.SquadPortrait || o.Icon || null;
  const imageUrl = (o) => {
    const fn = pickImageName(o);
    return fn ? (IMG_BASE + fn) : PLACEHOLDER;
  };

  const cleanDesc = (s) =>
    String(s||"")
      .replace(/\r\n?/g, "\n")       // CRLF/CR -> LF
      .replace(/\n{2,}/g, "\n")      // pas de doubles sauts
      .trim();

  const badge = (text, cls="") => `<span class="badge ${cls}">${escapeHtml(text)}</span>`;

  /* ====== State ====== */
  const STATE = {
    all: [],
    filtered: [],
    page: 1,
    perPage: 24,
    q: "",
    fCats: new Set(),     // Category (Sentinels / Pets)
    fTypes: new Set(),    // Type (Kavat, Kubrow, MOA, Hound, Predasite, Vulpaphyla, Sentinel…)
    sort: "name"
  };

  /* ====== Card ====== */
  function compCard(name, o){
    const img = imageUrl(o);
    const cat = o.Category || "";
    const type = o.Type || "";

    const chips = [
      cat && badge(cat),
      type && badge(type),
      o.Tradable ? badge("Tradable") : ""
    ].filter(Boolean).join(" ");

    const desc = cleanDesc(o.Description);
    const attacks = Array.isArray(o.Attacks) ? o.Attacks : null;

    const statsHtml = `
      <div class="kv mt-2">
        ${o.Armor!=null  ? `<div class="k">Armor</div><div>${escapeHtml(o.Armor)}</div>` : ""}
        ${o.Health!=null ? `<div class="k">Health</div><div>${escapeHtml(o.Health)}</div>` : ""}
        ${o.Shield!=null ? `<div class="k">Shield</div><div>${escapeHtml(o.Shield)}</div>` : ""}
        ${o.Energy!=null ? `<div class="k">Energy</div><div>${escapeHtml(o.Energy)}</div>` : ""}
      </div>`.replace(/\n\s+/g,"");

    const attacksHtml = (attacks && attacks.length)
      ? `<div class="mt-3">
           <div class="text-sm muted mb-1">Attaques</div>
           <div class="desc">
             ${attacks.map(a=>{
               const parts=[];
               if (a.TotalDamage!=null) parts.push(`Dégâts ${a.TotalDamage}`);
               if (a.CritChance!=null)  parts.push(`Crit ${Math.round(a.CritChance*100)}% x${a.CritMultiplier || '—'}`);
               if (a.StatusChance!=null)parts.push(`Statut ${Math.round(a.StatusChance*100)}%`);
               return `<div>• ${escapeHtml(a.AttackName || 'Attaque')} — ${parts.join(" · ")}</div>`;
             }).join("")}
           </div>
         </div>`
      : "";

    return `
      <div class="arcane-card">
        <div class="arcane-cover">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(name)}"
               loading="lazy" decoding="async"
               onerror="this.src='${PLACEHOLDER}'">
        </div>
        <div class="arcane-body">
          <div class="title" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
          ${chips ? `<div class="mod-chips mt-1">${chips}</div>` : ""}
          ${desc ? `<p class="desc mt-2">${escapeHtml(desc).replace(/\n/g,"<br>")}</p>` : ""}
          ${statsHtml}
          ${attacksHtml}
        </div>
      </div>`;
  }

  /* ====== Filters ====== */
  function buildFiltersFromData(arr){
    const cats  = new Set();
    const types = new Set();

    for (const it of arr) {
      if (it.Category) cats.add(it.Category);
      if (it.Type) types.add(it.Type);
    }
    const catList  = Array.from(cats).sort((a,b)=>a.localeCompare(b));
    const typeList = Array.from(types).sort((a,b)=>a.localeCompare(b));

    const $cat  = $("#f-cat");
    const $type = $("#f-type");
    if ($cat)  $cat.innerHTML  = catList.map(v => `<label class="filter-pill"><input type="checkbox" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>`).join("");
    if ($type) $type.innerHTML = typeList.map(v => `<label class="filter-pill"><input type="checkbox" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>`).join("");

    $$("#f-cat input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        if (cb.checked) STATE.fCats.add(cb.value); else STATE.fCats.delete(cb.value);
        STATE.page = 1; applyFilters();
      });
    });
    $$("#f-type input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        if (cb.checked) STATE.fTypes.add(cb.value); else STATE.fTypes.delete(cb.value);
        STATE.page = 1; applyFilters();
      });
    });
  }

  function renderActiveChips(){
    const wrap = $("#active-filters");
    if (!wrap) return;
    const chips = [];
    if (STATE.q) chips.push({k:"q", label:`"${escapeHtml(STATE.q)}"`});
    if (STATE.fCats.size)  chips.push({k:"cats",  label:`Cat: ${[...STATE.fCats].join(", ")}`});
    if (STATE.fTypes.size) chips.push({k:"types", label:`Type: ${[...STATE.fTypes].join(", ")}`});

    wrap.innerHTML = chips.length
      ? chips.map((c,i)=>`<button class="badge gold" data-chip="${c.k}|${i}">${c.label} ✕</button>`).join("")
      : "";

    wrap.querySelectorAll("[data-chip]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const [k] = btn.dataset.chip.split("|");
        if (k==="q") { STATE.q=""; $("#q") && ($("#q").value=""); }
        if (k==="cats")  STATE.fCats.clear();
        if (k==="types") STATE.fTypes.clear();
        $$("#f-cat input, #f-type input").forEach(cb=> cb.checked=false);
        STATE.page = 1; applyFilters();
      });
    });
  }

  /* ====== Filter/Sort/Render ====== */
  function applyFilters(){
    const q = STATE.q = norm($("#q")?.value).toLowerCase();
    let arr = STATE.all.slice();

    if (STATE.fCats.size)  arr = arr.filter(x => STATE.fCats.has(x.Category || ""));
    if (STATE.fTypes.size) arr = arr.filter(x => STATE.fTypes.has(x.Type || ""));

    if (q) {
      arr = arr.filter(m => {
        const hay = [
          m.__name, m.Description, m.Category, m.Type,
          pickImageName(m) || "", m.InternalName || ""
        ].map(norm).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    const sort = STATE.sort = $("#sort")?.value || "name";
    arr.sort((a,b)=>{
      if (sort==="armor")  return (a.Armor ?? 0) - (b.Armor ?? 0) || a.__name.localeCompare(b.__name);
      if (sort==="health") return (a.Health ?? 0) - (b.Health ?? 0) || a.__name.localeCompare(b.__name);
      if (sort==="shield") return (a.Shield ?? 0) - (b.Shield ?? 0) || a.__name.localeCompare(b.__name);
      if (sort==="energy") return (a.Energy ?? 0) - (b.Energy ?? 0) || a.__name.localeCompare(b.__name);
      return a.__name.localeCompare(b.__name);
    });

    STATE.filtered = arr;
    STATE.page = 1;
    render();
    renderActiveChips();
  }

  function render(){
    const total = STATE.filtered.length;
    $("#count") && ($("#count").textContent = `${total} companion(s)`);

    const per   = STATE.perPage;
    const pages = Math.max(1, Math.ceil(total / per));
    const page  = Math.min(Math.max(1, STATE.page), pages);
    STATE.page  = page;

    $("#prev") && ($("#prev").disabled = (page <= 1));
    $("#next") && ($("#next").disabled = (page >= pages));
    $("#pageinfo") && ($("#pageinfo").textContent = `Page ${page} / ${pages}`);

    const slice = STATE.filtered.slice((page-1)*per, (page-1)*per + per);

    const results = $("#results");
    if (!results) return;
    results.className = "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3";
    results.innerHTML = slice.map(m => compCard(m.__name, m)).join("");
  }

  /* ====== Boot ====== */
  async function fetchCompanions(){
    const r = await fetch(JSON_PATH, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();                 // { Companions: { "Name": {...}, ... } }
    const obj  = data.Companions || data.companions || {};
    // On normalise en liste
    return Object.entries(obj).map(([name, o]) => ({ __name: name, ...o }));
  }

  (function boot(){
    const status = $("#status");
    if (status) {
      status.textContent = "Chargement des compagnons…";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";
    }

    // Skeleton
    const results = $("#results");
    if (results) {
      results.innerHTML = Array.from({length:6}).map(()=>`
        <div class="arcane-card">
          <div class="arcane-cover" style="height:220px;background:rgba(255,255,255,.04)"></div>
          <div class="arcane-body">
            <div class="h-4 rounded bg-[rgba(255,255,255,.08)] w-2/3 mb-2"></div>
            <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-1/2 mb-1"></div>
            <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-5/6"></div>
          </div>
        </div>
      `).join("");
    }

    fetchCompanions().then(list => {
      STATE.all = list;
      buildFiltersFromData(list);

      // init UI
      $("#q") && ($("#q").value = "");
      $("#sort") && ($("#sort").value = "name");
      $("#q") && $("#q").addEventListener("input", ()=>{ STATE.page=1; applyFilters(); });
      $("#sort") && $("#sort").addEventListener("change", ()=>{ STATE.page=1; applyFilters(); });
      $("#reset") && $("#reset").addEventListener("click", ()=>{
        STATE.q=""; $("#q") && ($("#q").value="");
        STATE.sort="name"; $("#sort") && ($("#sort").value="name");
        STATE.fCats.clear(); STATE.fTypes.clear();
        $$("#f-cat input, #f-type input").forEach(cb=> cb.checked=false);
        STATE.page=1; applyFilters();
      });
      $("#prev") && $("#prev").addEventListener("click", ()=>{ STATE.page--; render(); });
      $("#next") && $("#next").addEventListener("click", ()=>{ STATE.page++; render(); });

      status && (status.textContent = `Companions chargés: ${STATE.all.length}`);
      applyFilters();
    }).catch(e=>{
      console.error("[companions] error:", e);
      if (status) {
        status.textContent = "Erreur lors du chargement des compagnons.";
        status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    });
  })();

})();
