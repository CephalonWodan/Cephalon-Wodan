// js/companions_catalog.js
// =====================================================
// Companions Catalog (grid + filters + pagination)
// Data: data/companions.json  (dump wiki -> json)
// Image order: Wiki /images/<file> -> WarframeStat CDN -> local img/companions/
// =====================================================
(() => {
  "use strict";

  /* ---------- tiny utils ---------- */
  const $  = (s) => document.querySelector(s);
  const norm  = (s) => String(s || "").trim();
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const byName = (a,b) => (a.Name||a.name||"").localeCompare(b.Name||b.name||"");
  const txt = (v) => (v==null || v==="" ? "—" : String(v));

  function cleanDesc(s){
    return esc(String(s||"").replace(/\r\n?/g,"\n")).replace(/\n{3,}/g,"\n\n").replace(/\n/g,"<br>");
  }
  function fmtPercent(v){
    if (v==null || v==="") return "—";
    if (typeof v === "string" && /%$/.test(v.trim())) return v.trim();
    const n = Number(v);
    if (!Number.isFinite(n)) return esc(String(v));
    const p = (n >= 0 && n <= 1) ? n*100 : n;
    return `${Number(p.toFixed(p%1?1:0))}%`;
  }
  function fmtDamageMap(obj){
    if (!obj || typeof obj !== "object") return "—";
    const parts = [];
    for (const [k,v] of Object.entries(obj)) if (v!=null) parts.push(`${esc(k)} ${Number(v)}`);
    return parts.join(" · ") || "—";
  }

  /* ---------- images (priority + onerror chain) ---------- */
  const wikiImg = (f) => f ? `https://wiki.warframe.com/images/${encodeURIComponent(f)}` : "";
  const wfstat  = (f) => f ? `https://cdn.warframestat.us/img/${encodeURIComponent(f)}` : "";
  const local   = (f) => f ? `img/companions/${encodeURIComponent(f)}` : "";

  function imageCandidates(rec){
    const files = [rec.Image, rec.SquadPortrait, rec.Icon].filter(Boolean);
    const urls = [];
    files.forEach(f=>urls.push(wikiImg(f)));
    files.forEach(f=>urls.push(wfstat(f)));
    files.forEach(f=>urls.push(local(f)));
    urls.push(placeholder(rec.Name || rec.name || "Companion"));
    return Array.from(new Set(urls.filter(Boolean)));
  }
  function placeholder(name){
    const initials = (name||"C").split(/\s+/).map(s=>s[0]).slice(0,2).join("").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0c1729"/><stop offset="100%" stop-color="#0f1d34"/></linearGradient></defs>
      <rect width="360" height="220" rx="18" fill="url(#g)"/>
      <text x="50%" y="56%" text-anchor="middle" font-family="Inter,system-ui,Segoe UI,Roboto" font-size="72" fill="#80b3ff">${esc(initials)}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  // global onerror handler for fallback chain
  window._imgNext = (img) => {
    try {
      const arr = JSON.parse(img.dataset.srcs || "[]");
      let i = Number(img.dataset.idx || 0) + 1;
      if (i < arr.length){ img.dataset.idx = String(i); img.src = arr[i]; }
    } catch {}
  };

  /* ---------- load & normalize data ---------- */
  async function loadCompanions(){
    const r = await fetch("data/companions.json", { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const dict = raw.Companions || raw.companions || raw;
    const list = [];
    for (const [k, v] of Object.entries(dict)){
      const r = { ...v };
      r.Name  = r.Name  || r.name || k;
      r.Type  = r.Type  || r.type || "";
      r.Category = r.Category || r.category || "";
      r.Description = r.Description || r.description || "";
      r.Image = r.Image || r.image || "";
      r.Icon  = r.Icon  || r.icon  || "";
      r.SquadPortrait = r.SquadPortrait || r.squadPortrait || "";
      r.Health = r.Health ?? r.health ?? null;
      r.Shield = r.Shield ?? r.shield ?? null;
      r.Armor  = r.Armor  ?? r.armor  ?? null;
      r.Energy = r.Energy ?? r.energy ?? null;
      r.Stamina = r.Stamina ?? r.stamina ?? null;
      r.Polarities = r.Polarities || r.polarities || [];
      r.Attacks = Array.isArray(r.Attacks) ? r.Attacks
                 : (Array.isArray(r.attacks) ? r.attacks : []);
      list.push(r);
    }
    return list.sort(byName);
  }

  /* ---------- state ---------- */
  const S = {
    all: [],
    filtered: [],
    page: 1,
    perPage: 24,
    q: "",
    sort: "name",
    cats: new Set(),  // categories
    types: new Set(), // companion types
  };

  /* ---------- cards ---------- */
  const statBox = (label, value) => `
    <div class="rounded-lg border border-[rgba(255,255,255,.08)] px-3 py-2">
      <div class="text-[10px] uppercase tracking-wide text-slate-300">${esc(label)}</div>
      <div class="text-base font-semibold">${esc(txt(value))}</div>
    </div>`;

  const badge = (t, cls="") =>
    `<span class="inline-block text-xs px-2 py-[2px] rounded-full border ${cls}">${esc(t)}</span>`;

  function attackChunk(a){
    const name = a.AttackName || a.name || "Attack";
    const total = a.TotalDamage!=null ? Number(a.TotalDamage) : null;
    const dmg = fmtDamageMap(a.Damage||a.damage);
    const cc = a.CritChance!=null ? fmtPercent(a.CritChance) : "—";
    const cd = a.CritMultiplier!=null ? `${Number(a.CritMultiplier)}x` : "—";
    const sc = a.StatusChance!=null ? fmtPercent(a.StatusChance) : "—";
    return `
      <div class="rounded-lg border border-[rgba(255,255,255,.08)] p-2">
        <div class="text-sm font-medium mb-1">${esc(name)}</div>
        <div class="text-xs grid grid-cols-2 gap-x-3 gap-y-1">
          <div><span class="text-[var(--muted)]">Total:</span> <b>${esc(total==null?"—":String(total))}</b></div>
          <div><span class="text-[var(--muted)]">Crit:</span> <b>${cc} / ${cd}</b></div>
          <div class="col-span-2"><span class="text-[var(--muted)]">Dégâts:</span> <b>${esc(dmg)}</b></div>
          <div><span class="text-[var(--muted)]">Statut:</span> <b>${sc}</b></div>
        </div>
      </div>`;
  }

  function card(rec){
    const name = rec.Name || "—";
    const cats = [rec.Category, rec.Type].filter(Boolean)
                  .map(s=>badge(s,"border-[rgba(255,255,255,.3)] text-[rgba(255,255,255,.8)]")).join(" ");

    const srcs = imageCandidates(rec);
    const first = srcs[0];
    const srcsJson = esc(JSON.stringify(srcs));

    const attacks = Array.isArray(rec.Attacks) ? rec.Attacks : [];
    const attacksHtml = attacks.length
      ? `<div class="mt-3 grid gap-2">${attacks.map(attackChunk).join("")}</div>` : "";

    return `
      <div class="card p-4 orn flex flex-col">
        <div class="w-full aspect-[16/10] rounded-xl overflow-hidden bg-[var(--panel-2)] border mb-3">
          <img src="${esc(first)}" data-srcs='${srcsJson}' data-idx="0" alt="${esc(name)}"
               class="w-full h-full object-contain" loading="lazy" decoding="async"
               onerror="_imgNext(this)">
        </div>

        <div class="flex-1 flex flex-col">
          <div class="text-lg font-semibold">${esc(name)}</div>
          ${cats ? `<div class="mt-1 flex flex-wrap gap-2">${cats}</div>` : ""}
          ${rec.Description ? `<p class="mt-2 text-[var(--muted)] text-sm">${cleanDesc(rec.Description)}</p>` : ""}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            ${statBox("Armor", rec.Armor)}
            ${statBox("Health", rec.Health)}
            ${statBox("Shield", rec.Shield)}
            ${statBox("Energy", rec.Energy)}
          </div>
          ${attacksHtml}
        </div>
      </div>`;
  }

  /* ---------- side filters ---------- */
  function renderSideFilters(distCats, distTypes){
    const boxC = $("#f-category");
    const boxT = $("#f-type");
    if (boxC){
      boxC.innerHTML = distCats.map(c=>{
        const id = `c-${c.replace(/\s+/g,"_")}`;
        const checked = S.cats.has(c) ? "checked" : "";
        return `<label for="${id}" class="filter-pill cursor-pointer">
          <input id="${id}" type="checkbox" value="${esc(c)}" ${checked}>
          <span>${esc(c)}</span></label>`;
      }).join("") || `<div class="text-sm text-[var(--muted)]">—</div>`;
      distCats.forEach(c=>{
        const el = $(`#c-${c.replace(/\s+/g,"_")}`);
        el && el.addEventListener("change", ()=>{
          if (el.checked) S.cats.add(c); else S.cats.delete(c);
          S.page = 1; apply();
        });
      });
    }
    if (boxT){
      boxT.innerHTML = distTypes.map(t=>{
        const id = `t-${t.replace(/\s+/g,"_")}`;
        const checked = S.types.has(t) ? "checked" : "";
        return `<label for="${id}" class="filter-pill cursor-pointer">
          <input id="${id}" type="checkbox" value="${esc(t)}" ${checked}>
          <span>${esc(t)}</span></label>`;
      }).join("") || `<div class="text-sm text-[var(--muted)]">—</div>`;
      distTypes.forEach(t=>{
        const el = $(`#t-${t.replace(/\s+/g,"_")}`);
        el && el.addEventListener("change", ()=>{
          if (el.checked) S.types.add(t); else S.types.delete(t);
          S.page = 1; apply();
        });
      });
    }
  }

  function renderActiveChips(){
    const wrap = $("#active-filters");
    if (!wrap) return;
    const chips = [];
    if (S.q) chips.push({k:"q", label:`Texte: "${esc(S.q)}"`});
    if (S.cats.size) chips.push({k:"cats", label:`Catégories: ${[...S.cats].join(", ")}`});
    if (S.types.size) chips.push({k:"types", label:`Types: ${[...S.types].join(", ")}`});
    wrap.innerHTML = chips.map((c,i)=>`<button class="badge gold" data-chip="${c.k}|${i}">${c.label} ✕</button>`).join("");
    wrap.querySelectorAll("[data-chip]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const [k] = btn.dataset.chip.split("|");
        if (k==="q"){ S.q=""; const q=$("#q"); if(q) q.value=""; }
        if (k==="cats") S.cats.clear();
        if (k==="types") S.types.clear();
        S.page = 1; apply();
      });
    });
  }

  /* ---------- render grid + pagination ---------- */
  function render(){
    const total = S.filtered.length;
    const pages = Math.max(1, Math.ceil(total / S.perPage));
    S.page = Math.min(Math.max(1, S.page), pages);

    const start = (S.page-1)*S.perPage;
    const slice = S.filtered.slice(start, start + S.perPage);

    const grid = $("#results");
    if (grid){
      grid.className = "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      grid.innerHTML = slice.map(card).join("");
    }

    const pageinfo = $("#pageinfo"); if (pageinfo) pageinfo.textContent = `Page ${S.page} / ${pages}`;
    const prev = $("#prev"); if (prev) prev.disabled = S.page<=1;
    const next = $("#next"); if (next) next.disabled = S.page>=pages;
    const count = $("#count"); if (count) count.textContent = `${total} compagnon(s)`;
  }

  function apply(){
    const q = S.q = norm($("#q")?.value).toLowerCase();
    const sort = S.sort = $("#sort")?.value || "name";

    let arr = S.all.slice();
    if (S.cats.size)  arr = arr.filter(r => S.cats.has(r.Category));
    if (S.types.size) arr = arr.filter(r => S.types.has(r.Type));

    if (q){
      arr = arr.filter(r=>{
        const hay = [r.Name, r.Type, r.Category, r.Description].map(norm).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    arr.sort((a,b)=>{
      if (sort === "category") return (a.Category||"").localeCompare(b.Category||"") || byName(a,b);
      if (sort === "type")     return (a.Type||"").localeCompare(b.Type||"") || byName(a,b);
      return byName(a,b);
    });

    S.filtered = arr;
    renderActiveChips();
    render();

    const status = $("#status");
    if (status) status.textContent = `Companions chargés : ${S.all.length}`;
  }

  /* ---------- boot ---------- */
  (async function boot(){
    const status = $("#status");
    try{
      if (status){
        status.textContent = "Chargement des companions…";
        status.className = "mb-3 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      }

      S.all = await loadCompanions();

      // distincts
      const distCats  = Array.from(new Set(S.all.map(r=>r.Category).filter(Boolean))).sort();
      const distTypes = Array.from(new Set(S.all.map(r=>r.Type).filter(Boolean))).sort();
      renderSideFilters(distCats, distTypes);

      // hooks
      $("#q")?.addEventListener("input", ()=>{ S.page=1; apply(); });
      $("#sort")?.addEventListener("change", ()=>{ S.page=1; apply(); });
      $("#reset")?.addEventListener("click", ()=>{
        S.q=""; const q=$("#q"); if(q) q.value="";
        S.sort="name"; const s=$("#sort"); if(s) s.value="name";
        S.cats.clear(); S.types.clear();
        renderSideFilters(distCats, distTypes);
        S.page=1; apply();
      });
      $("#prev")?.addEventListener("click", ()=>{ S.page--; render(); });
      $("#next")?.addEventListener("click", ()=>{ S.page++; render(); });

      apply();
    }catch(e){
      console.error("[companions] load error:", e);
      if (status){
        status.textContent = `Erreur : ${e.message || e}`;
        status.className = "mb-3 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    }
  })();

})();
