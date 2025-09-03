// js/shards.js — Archon Shards catalog (API EN) + dedupe + filters + graceful fields
const API = "https://api.warframestat.us/archonshards/?language=en";

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const norm = (s) => String(s || "").trim();

const COLORS = ["Crimson","Amber","Azure","Emerald","Violet","Topaz"];
const COLOR_MAP = {
  Crimson: "#e25656", Amber: "#f6c152", Azure: "#58b3e2",
  Emerald: "#4ec88f", Violet: "#9a68e3", Topaz: "#f1a33a"
};

const state = {
  all: [],
  filtered: [],
  page: 1,
  perPage: 18,
  q: "",
  sort: "name",
  colors: new Set(),
  onlyTau: false,
  view: "cards", // cards only (table not needed ici)
};

function hasThumb(m){
  const wik = m.wikiaThumbnail || m.wikiathumbnail;
  return wik && /^https?:\/\//i.test(wik);
}
function getThumb(m){
  const wik = m.wikiaThumbnail || m.wikiathumbnail;
  if (wik && /^https?:\/\//i.test(wik)) return wik;
  // fallback: SVG spot
  const { color, tau } = parseColorTau(m);
  const hex = COLOR_MAP[color] || "#888888";
  const ring = tau ? 'class="shard-dot tau"' : 'class="shard-dot"';
  // inline SVG circle
  return `data:image/svg+xml;utf8,${encodeURIComponent(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="65%">
    <stop offset="0%" stop-color="#fff" stop-opacity=".25"/>
    <stop offset="100%" stop-color="${hex}"/>
  </radialGradient></defs>
  <circle cx="48" cy="48" r="44" fill="url(#g)" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
  ${tau ? `<circle cx="48" cy="48" r="40" fill="none" stroke="#D4AF37" stroke-width="3" />` : ``}
</svg>` )}`;
}

function parseColor(mName=""){
  const n = (mName||"").toLowerCase();
  if (n.includes("crimson")) return "Crimson";
  if (n.includes("amber"))   return "Amber";
  if (n.includes("azure"))   return "Azure";
  if (n.includes("emerald")) return "Emerald";
  if (n.includes("violet"))  return "Violet";
  if (n.includes("topaz"))   return "Topaz";
  return "Unknown";
}
function parseColorTau(m){
  const name = m.name || "";
  const tau = /tauforged/i.test(name);
  const color = parseColor(name);
  return { color, tau };
}

// Some endpoints list “effects/bonuses” differently; we try multiple fields
function extractBonuses(m){
  // common possibilities
  if (Array.isArray(m.effects)) return m.effects;
  if (Array.isArray(m.bonuses)) return m.bonuses;
  if (Array.isArray(m.stats))   return m.stats;
  // Try to split description lines
  const d = norm(m.description);
  if (!d) return [];
  // split on •, ; or linebreaks
  const bits = d.split(/\n|•|;|·/g).map(x=>norm(x)).filter(Boolean);
  // keep only lines that look like bonuses (+ / % / “per …”)
  return bits.filter(x => /[%+]|per\s/i.test(x));
}

function qualityScore(m){
  let s = 0;
  if (hasThumb(m)) s += 1000;
  if (m.description) s += Math.min(200, m.description.length);
  const { tau } = parseColorTau(m); if (tau) s += 5;
  return s;
}
function dedupeByName(arr){
  const groups = new Map();
  for (const m of arr) {
    const k = norm(m.name).toLowerCase();
    if (!k) continue;
    (groups.get(k) ?? groups.set(k, []).get(k)).push(m);
  }
  const out = [];
  for (const [,items] of groups) {
    if (items.length === 1) { out.push(items[0]); continue; }
    const withThumb = items.filter(hasThumb);
    const cand = (withThumb.length ? withThumb : items).sort((a,b)=> qualityScore(b)-qualityScore(a))[0];
    out.push(cand);
  }
  return out;
}

/* ------------ UI Helpers ------------ */
function badge(text){ return `<span class="badge">${text}</span>`; }
function badgeGold(text){ return `<span class="badge gold">${text}</span>`; }

function colorChip(color){
  const hex = COLOR_MAP[color] || "#888888";
  return `<span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md"
    style="border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.04)">
    <span style="width:.75rem;height:.75rem;border-radius:9999px;background:${hex};display:inline-block"></span>
    ${color}
  </span>`;
}

function shardCard(m){
  const { color, tau } = parseColorTau(m);
  const img = getThumb(m);
  const bonuses = extractBonuses(m);
  const metaRight = [
    tau ? badgeGold("Tauforged") : "",
    color !== "Unknown" ? colorChip(color) : "",
  ].filter(Boolean).join(" ");

  return `
  <div class="shard-card">
    <a href="#" class="shard-cover" data-full="${hasThumb(m)?img:""}" data-name="${m.name||"Archon Shard"}">
      ${ img ? `<img src="${img}" alt="${m.name||"Archon Shard"}">` : "" }
    </a>
    <div class="shard-body">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="title truncate">${m.name || "Archon Shard"}</div>
          <div class="meta">${m.type ? m.type : ""}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">${metaRight}</div>
      </div>

      ${ m.description ? `<div class="desc mt-1">${m.description}</div>` : "" }

      ${ bonuses.length ? `
        <div class="mt-2">
          <div class="text-sm muted mb-1">Bonuses</div>
          <div class="kv">
            ${bonuses.map(b => `<div class="k">•</div><div class="v">${b}</div>`).join("")}
          </div>
        </div>` : "" }

      ${ !bonuses.length && !m.description ? `
        <details class="mt-2 text-xs">
          <summary class="cursor-pointer muted">Raw JSON (debug)</summary>
          <pre class="mt-1 overflow-auto">${escapeHtml(JSON.stringify(m, null, 2))}</pre>
        </details>` : "" }
    </div>
  </div>`;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ------------ Filters & render ------------ */
function renderColorFilters(){
  const host = $("#f-colors");
  host.innerHTML = COLORS.map(c => {
    const id = `col-${c}`;
    const checked = state.colors.has(c) ? "checked" : "";
    return `
      <label for="${id}" class="flex items-center gap-2 cursor-pointer">
        <input id="${id}" type="checkbox" value="${c}" ${checked} class="accent-[var(--ink)]">
        ${colorChip(c)}
      </label>`;
  }).join("");
  COLORS.forEach(c => {
    const el = $(`#col-${c}`);
    el.addEventListener("change", () => {
      if (el.checked) state.colors.add(c);
      else state.colors.delete(c);
      applyFilters();
    });
  });
}

function renderActiveChips(){
  const wrap = $("#active-filters");
  const chips = [];
  if (state.q) chips.push({k:"q", label:`Text: "${state.q}"`});
  if (state.colors.size) chips.push({k:"colors", label:`Colors: ${[...state.colors].join(", ")}`});
  if (state.onlyTau) chips.push({k:"tau", label:`Tauforged only`});
  if (!chips.length) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = chips.map((c, i)=>`<button class="badge gold" data-chip="${c.k}|${i}">${c.label} ✕</button>`).join("");
  wrap.querySelectorAll("[data-chip]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const [k] = btn.dataset.chip.split("|");
      if (k==="q") state.q="";
      if (k==="colors") state.colors.clear();
      if (k==="tau") state.onlyTau=false;
      $("#q").value = state.q;
      $("#only-tau").checked = state.onlyTau;
      renderColorFilters();
      applyFilters();
    });
  });
}

function applyFilters(){
  const q = state.q = norm($("#q").value).toLowerCase();
  let arr = state.all.slice();

  if (state.colors.size) arr = arr.filter(m => state.colors.has(parseColorTau(m).color));
  if (state.onlyTau) arr = arr.filter(m => parseColorTau(m).tau);

  if (q) {
    arr = arr.filter(m => {
      const hay = [m.name, m.description, m.type, m.uniqueName, (extractBonuses(m)||[]).join(" ")]
        .map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  const sort = state.sort = $("#sort").value;
  arr.sort((a,b)=>{
    if (sort === "color") {
      return parseColorTau(a).color.localeCompare(parseColorTau(b).color) || (a.name||"").localeCompare(b.name||"");
    }
    if (sort === "tau") {
      const at = parseColorTau(a).tau ? 0 : 1;
      const bt = parseColorTau(b).tau ? 0 : 1;
      return at - bt || (a.name||"").localeCompare(b.name||"");
    }
    return (a.name||"").localeCompare(b.name||"");
  });

  state.filtered = arr;
  state.page = 1;
  render();
}

function render(){
  renderActiveChips();

  const total = state.filtered.length;
  $("#count").textContent = `${total} shard(s)`;

  const pages = Math.max(1, Math.ceil(total / state.perPage));
  state.page = Math.min(Math.max(1, state.page), pages);
  $("#prev").disabled = (state.page <= 1);
  $("#next").disabled = (state.page >= pages);
  $("#pageinfo").textContent = `Page ${state.page} / ${pages}`;

  const start = (state.page - 1) * state.perPage;
  const slice = state.filtered.slice(start, start + state.perPage);

  const grid = $("#results");
  grid.className = "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3";
  grid.innerHTML = slice.map(shardCard).join("");

  // Lightbox si image wiki
  grid.querySelectorAll(".shard-cover").forEach(a=>{
    a.addEventListener("click", (ev)=>{
      ev.preventDefault();
      const url = a.dataset.full;
      if (!url) return;
      openLightbox(url, a.dataset.name || "");
    });
  });
}

/* ------------ Lightbox ------------ */
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
  const lb = $("#lightbox");
  if (!lb) return;
  $("#lb-close").addEventListener("click", closeLightbox);
  lb.addEventListener("click", (e)=>{
    if (e.target.id === "lightbox" || e.target.classList.contains("lb-backdrop")) closeLightbox();
  });
  document.addEventListener("keydown", (e)=>{ if (e.key === "Escape") closeLightbox(); });
})();

/* ------------ Boot ------------ */
(async function boot(){
  const status = $("#status");
  try {
    // skeleton
    $("#results").innerHTML = Array.from({length:6}).map(()=>`
      <div class="shard-card">
        <div class="shard-cover" style="height:200px;background:rgba(255,255,255,.04)"></div>
        <div class="shard-body">
          <div class="h-4 rounded bg-[rgba(255,255,255,.08)] w-2/3 mb-2"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-1/2 mb-1"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-5/6"></div>
        </div>
      </div>
    `).join("");

    // fetch
    const data = await fetch(API).then(r => r.json());
    const raw = Array.isArray(data) ? data : [];

    // dedupe by name
    const cleaned = dedupeByName(raw);

    state.all = cleaned;
    status.textContent = `Shards loaded: ${state.all.length} (EN)`;

    // filters
    renderColorFilters();

    // listeners
    $("#q").addEventListener("input", applyFilters);
    $("#sort").addEventListener("change", applyFilters);
    $("#only-tau").addEventListener("change", () => { state.onlyTau = $("#only-tau").checked; applyFilters(); });
    $("#reset").addEventListener("click", ()=>{
      state.q=""; $("#q").value="";
      state.colors.clear(); $("#only-tau").checked=false; state.onlyTau=false;
      $("#sort").value="name";
      renderColorFilters();
      applyFilters();
    });
    $("#prev").addEventListener("click", ()=>{ state.page--; render(); });
    $("#next").addEventListener("click", ()=>{ state.page++; render(); });

    // first render
    applyFilters();
  } catch (e) {
    console.error("[shards] error:", e);
    status.textContent = "Error while loading archon shards.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
