// js/companions_catalog.js
// =====================================================
// Companions (Sentinels / Pets) — rendu depuis data/companions.json (dump wiki)
// - Images: local img/companions/<Image> -> cdn.warframestat.us fallback -> placeholder
// - Nettoyage \r\n / \\r\\n dans les descriptions
// - Attaques intégrées au panneau des stats
// - Filtres Catégorie/Type + recherche + tri + pagination
// =====================================================

(() => {
  "use strict";

  const DATA_URL = "data/companions.json";

  /* ---------- utils ---------- */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const norm = (v) => String(v ?? "").trim();
  const txt  = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byName = (a,b) => (a.Name||"").localeCompare(b.Name||"");

  // Description: supprime \r, remplace \n, gère les \\r\\n venant des dumps
  function renderDesc(s) {
    if (!s) return "";
    let t = String(s);
    t = t.replace(/\\r\\n/g, "\n") // séquences échappées
         .replace(/\r\n?/g, "\n"); // retours réels
    // compresser les multiples lignes vides
    t = t.replace(/\n{3,}/g, "\n\n");
    return escapeHtml(t).replace(/\n/g, "<br>");
  }

  // -------- Images + fallback (local -> cdn warframestat -> placeholder) --------
  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">'+
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/></linearGradient></defs>'+
      '<rect width="640" height="360" fill="url(#g)"/>'+
      '<rect x="14" y="14" width="612" height="332" rx="22" ry="22" fill="none" stroke="#3d4b63" stroke-width="3"/>'+
      '<text x="50%" y="52%" fill="#6b7b94" font-size="22" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text></svg>'
    );

  // construit les différentes sources possibles
  function imageCandidates(item) {
    const name = norm(item.Name);
    const raw = norm(item.Image) || (name ? name.replace(/\s+/g, "") + ".png" : "");
    const enc = raw ? encodeURIComponent(raw) : "";
    const local = raw ? `img/companions/${raw}` : "";
    const cdn   = raw ? `https://cdn.warframestat.us/img/${enc}` : "";
    return [local, cdn].filter(Boolean);
  }

  function attachImgFallback(img, cands) {
    const list = cands.slice();
    const tryNext = () => {
      const next = list.shift();
      if (next) img.src = next; else img.src = PLACEHOLDER;
    };
    img.onerror = () => tryNext();
    tryNext();
  }

  /* ---------- Attaques ---------- */
  function pct(x) {
    if (x === undefined || x === null || isNaN(x)) return "—";
    // les dumps ont des chances en 0..1
    if (x > 1) return `${Math.round(x)}%`;
    return `${Math.round(x * 100)}%`;
  }
  function damageTotal(a) {
    if (Number.isFinite(a.TotalDamage) && a.TotalDamage > 0) return a.TotalDamage;
    const d = a.Damage || {};
    return Object.values(d).reduce((s, v) => s + (Number(v) || 0), 0);
  }
  function formatAttackLine(a) {
    const name = norm(a.AttackName) || "Attack";
    const dmg = damageTotal(a);
    const cc  = pct(a.CritChance);
    const cm  = (a.CritMultiplier ? `×${a.CritMultiplier}` : "×—");
    const sc  = pct(a.StatusChance);
    return `• ${escapeHtml(name)} — Dégâts ${escapeHtml(txt(dmg))} · Crit ${escapeHtml(cc)} ${escapeHtml(cm)} · Statut ${escapeHtml(sc)}`;
  }

  /* ---------- Rendu UI ---------- */
  const STATE = {
    all: [],
    filtered: [],
    page: 1,
    perPage: 12,
    q: "",
    sort: "name",
    fCat: new Set(), // Category
    fType: new Set(), // Type
  };

  function chip(label) {
    return `<span class="badge">${escapeHtml(label)}</span>`;
  }

  function statsPanel(item) {
    const rows = [
      ["Armor",  item.Armor],
      ["Health", item.Health],
      ["Shield", item.Shield],
      ["Energy", item.Energy],
    ];

    const attacks = Array.isArray(item.Attacks) ? item.Attacks : [];
    const attHtml = attacks.length
      ? `<div class="mt-3 text-sm">
           <div class="text-[10px] uppercase tracking-wide muted mb-1">Attaques</div>
           ${attacks.map(a => `<div>${formatAttackLine(a)}</div>`).join("")}
         </div>`
      : "";

    return `
      <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
        ${rows.map(([k,v]) => `
          <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
            <div class="text-sm">${escapeHtml(k)}</div>
            <div class="font-medium">${escapeHtml(txt(v))}</div>
          </div>
        `).join("")}
        ${attHtml}
      </div>`;
  }

  function card(item) {
    const cands = imageCandidates(item);
    const cat = norm(item.Category);
    const type = norm(item.Type);
    const desc = renderDesc(item.Description || "");

    const el = document.createElement("div");
    el.className = "card p-4";
    el.innerHTML = `
      <div class="flex gap-4">
        <div class="w-[260px] shrink-0">
          <div class="w-full h-[180px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img class="w-full h-full object-contain" alt="${escapeHtml(item.Name || "")}">
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold">${escapeHtml(item.Name || "—")}</div>
          <div class="mt-1 text-[var(--muted)]">${escapeHtml(cat)} ${escapeHtml(type)}</div>
          <p class="mt-3 text-[var(--ink)]">${desc || ""}</p>
          <div class="mt-3">${statsPanel(item)}</div>
        </div>
      </div>
    `;
    const img = el.querySelector("img");
    attachImgFallback(img, cands);
    return el;
  }

  /* ---------- Filtres ---------- */
  function buildFilters(arr) {
    const cats = new Set();
    const types = new Set();
    for (const it of arr) {
      if (norm(it.Category)) cats.add(norm(it.Category));
      if (norm(it.Type)) types.add(norm(it.Type));
    }
    $("#f-cat").innerHTML = Array.from(cats).sort().map(v =>
      `<label class="filter-pill"><input type="checkbox" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>`
    ).join("");
    $("#f-type").innerHTML = Array.from(types).sort().map(v =>
      `<label class="filter-pill"><input type="checkbox" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>`
    ).join("");

    $("#f-cat").querySelectorAll("input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        if (cb.checked) STATE.fCat.add(cb.value); else STATE.fCat.delete(cb.value);
        STATE.page = 1; apply();
      });
    });
    $("#f-type").querySelectorAll("input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        if (cb.checked) STATE.fType.add(cb.value); else STATE.fType.delete(cb.value);
        STATE.page = 1; apply();
      });
    });
  }

  function renderChips() {
    const wrap = $("#active-filters");
    const chips = [];
    if (STATE.q) chips.push(`"${STATE.q}"`);
    if (STATE.fCat.size) chips.push(`Cat: ${[...STATE.fCat].join(", ")}`);
    if (STATE.fType.size) chips.push(`Type: ${[...STATE.fType].join(", ")}`);
    wrap.innerHTML = chips.map(chip).join(" ");
  }

  function apply() {
    const q = STATE.q = norm($("#q").value).toLowerCase();
    let arr = STATE.all.slice();

    if (STATE.fCat.size) arr = arr.filter(it => STATE.fCat.has(norm(it.Category)));
    if (STATE.fType.size) arr = arr.filter(it => STATE.fType.has(norm(it.Type)));

    if (q) {
      arr = arr.filter(it => {
        const hay = [
          it.Name, it.Description, it.Category, it.Type
        ].map(norm).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    const sort = $("#sort") ? $("#sort").value : "name";
    STATE.sort = sort;
    arr.sort((a,b)=>{
      if (sort === "armor")  return (a.Armor||0) - (b.Armor||0) || byName(a,b);
      if (sort === "health") return (a.Health||0) - (b.Health||0) || byName(a,b);
      if (sort === "shield") return (a.Shield||0) - (b.Shield||0) || byName(a,b);
      if (sort === "energy") return (a.Energy||0) - (b.Energy||0) || byName(a,b);
      return byName(a,b);
    });

    STATE.filtered = arr;
    STATE.page = 1;
    render();
    renderChips();
  }

  function render() {
    const per = STATE.perPage;
    const total = STATE.filtered.length;
    const pages = Math.max(1, Math.ceil(total / per));
    const page = Math.min(Math.max(1, STATE.page), pages);
    STATE.page = page;

    $("#prev").disabled = (page <= 1);
    $("#next").disabled = (page >= pages);
    $("#pageinfo").textContent = `Page ${page} / ${pages}`;
    $("#count").textContent = `${total} résultat(s)`;

    const start = (page - 1) * per;
    const slice = STATE.filtered.slice(start, start + per);

    const grid = $("#results");
    grid.className = "grid gap-4 grid-cols-1 md:grid-cols-1"; // liste verticale propre
    grid.innerHTML = "";
    slice.forEach(it => grid.appendChild(card(it)));
  }

  /* ---------- Boot ---------- */
  async function fetchJson(url){
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
    return r.json();
  }

  (async function boot(){
    const status = $("#status");
    try {
      const raw = await fetchJson(DATA_URL);
      // Le fichier dump wiki a une racine "Companions" -> dictionnaire.
      // On convertit en tableau.
      const list = (() => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === "object" && raw.Companions) {
          // raw.Companions peut être un objet { Name: { ... }, ... }
          const obj = raw.Companions;
          const arr = Array.isArray(obj) ? obj : Object.values(obj);
          return arr;
        }
        // certains dumps sont directement un objet { "Adarza Kavat": {...}, ... }
        if (raw && typeof raw === "object") return Object.values(raw);
        return [];
      })();

      STATE.all = list.sort(byName);

      // Filtres
      buildFilters(STATE.all);

      // UI events
      $("#q").addEventListener("input", ()=>{ STATE.page=1; apply(); });
      const sortSel = $("#sort");
      if (sortSel) sortSel.addEventListener("change", ()=>{ STATE.page=1; apply(); });
      $("#reset").addEventListener("click", ()=>{
        $("#q").value = "";
        if ($("#sort")) $("#sort").value = "name";
        STATE.fCat.clear(); STATE.fType.clear();
        $$("#f-cat input, #f-type input").forEach(cb => cb.checked = false);
        STATE.page = 1; apply();
      });
      $("#prev").addEventListener("click", ()=>{ STATE.page--; render(); });
      $("#next").addEventListener("click", ()=>{ STATE.page++; render(); });

      status.textContent = `Chargé : ${STATE.all.length} compagnons`;
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";

      apply();
    } catch (e) {
      console.error("[companions] boot error:", e);
      if (status) {
        status.textContent = `Erreur de chargement : ${e.message || e}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    }
  })();

})();
