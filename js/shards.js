// js/shards.js — Archon Shards (robuste)
// - Essaie plusieurs endpoints WarframeStat (casse/param/langue)
// - Supporte réponse Array OU Objet ({ archonShards: [...] })
// - Fallback local si l'API renvoie 0 résultat (toujours une page utile)
// - Le reste (UI, filtres, tri, lightbox, URL sync) est inchangé

const ENDPOINTS = [
  "https://api.warframestat.us/archonshards?language=en",
  "https://api.warframestat.us/archonShards?language=en",
  "https://api.warframestat.us/archonshards/",
  "https://api.warframestat.us/archonShards/",
];

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
};

/* ------------ Helpers ------------ */
function parseColor(name=""){
  const n = name.toLowerCase();
  if (n.includes("crimson")) return "Crimson";
  if (n.includes("amber"))   return "Amber";
  if (n.includes("azure"))   return "Azure";
  if (n.includes("emerald")) return "Emerald";
  if (n.includes("violet"))  return "Violet";
  if (n.includes("topaz"))   return "Topaz";
  return "Unknown";
}
function parseTau(name=""){ return /tauforged/i.test(name); }

function hasThumb(m){
  const wik = m.wikiaThumbnail || m.wikiathumbnail;
  return wik && /^https?:\/\//i.test(wik);
}
function getThumb(m){
  const wik = m.wikiaThumbnail || m.wikiathumbnail;
  return wik && /^https?:\/\//i.test(wik) ? wik : "";
}
function getWikiUrl(m){
  const u = m.wikiaUrl || m.wikiaurl || m.wikiUrl || m.wikiurl;
  return u && /^https?:\/\//i.test(u) ? u : "";
}

function extractBonuses(m){
  if (Array.isArray(m.effects)) return m.effects;
  if (Array.isArray(m.bonuses)) return m.bonuses;
  if (Array.isArray(m.stats))   return m.stats;
  const d = norm(m.description);
  if (!d) return [];
  return d.split(/\n|•|;|·/g).map(x=>norm(x)).filter(Boolean);
}

function qualityScore(m){
  let s = 0;
  if (hasThumb(m)) s += 1000;
  if (m.description) s += Math.min(200, m.description.length);
  if (parseTau(m.name||"")) s += 5;
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

function colorChip(color){
  const hex = COLOR_MAP[color] || "#888888";
  return `<span class="color-chip"><span class="color-dot" style="background:${hex}"></span>${color}</span>`;
}
function badge(text){ return `<span class="badge">${text}</span>`; }
function badgeGold(text){ return `<span class="badge gold">${text}</span>`; }

function shardCard(m){
  const color = parseColor(m.name||"");
  const tau = parseTau(m.name||"");
  const img = getThumb(m);
  const bonuses = extractBonuses(m);
  const wiki = getWikiUrl(m);
  const metaRight = [
    tau ? badgeGold("Tauforged") : "",
    color !== "Unknown" ? colorChip(color) : "",
  ].filter(Boolean).join(" ");

  return `
  <div class="shard-card">
    <a href="#" class="shard-cover" data-full="${img}" data-name="${escapeHtml(m.name||"Archon Shard")}">
      ${ img ? `<img src="${img}" alt="${escapeHtml(m.name||"Archon Shard")}">` : "" }
    </a>
    <div class="shard-body">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="title truncate">${escapeHtml(m.name || "Archon Shard")}</div>
          <div class="meta">${m.type ? escapeHtml(m.type) : ""}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">${metaRight}</div>
      </div>

      ${ m.description ? `<div class="desc mt-1">${escapeHtml(m.description)}</div>` : "" }

      ${ bonuses.length ? `
        <div class="mt-2">
          <div class="text-sm muted mb-1">Bonuses</div>
          <div class="kv">
            ${bonuses.map(b => `<div class="k">•</div><div class="v">${escapeHtml(b)}</div>`).join("")}
          </div>
        </div>` : "" }

      <div class="card-actions">
        ${ img ? `<a href="#" class="btn-view" data-full="${img}" data-name="${escapeHtml(m.name||"Archon Shard")}">View</a>` : "" }
        ${ wiki ? `<a href="${wiki}" target="_blank" rel="noopener">Wiki</a>` : "" }
      </div>
    </div>
  </div>`;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ------------ URL sync ------------ */
function parseQuery(){
  const p = new URLSearchParams(location.search);
  state.q = norm(p.get("q") || "");
  state.sort = p.get("sort") || "name";
  state.onlyTau = p.get("tau") === "1";
  const cols = (p.get("colors") || "").split(",").map(norm).filter(Boolean);
  state.colors = new Set(cols);
  const page = parseInt(p.get("page")||"1",10);
  state.page = Number.isFinite(page) && page > 0 ? page : 1;
}
function writeQuery(){
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.sort && state.sort !== "name") p.set("sort", state.sort);
  if (state.onlyTau) p.set("tau", "1");
  if (state.colors.size) p.set("colors", [...state.colors].join(","));
  if (state.page > 1) p.set("page", String(state.page));
  const url = `${location.pathname}?${p.toString()}`;
  history.replaceState(null, "", url);
}

/* ------------ Filtres/UI ------------ */
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
      state.page = 1;
      applyFilters();
      writeQuery();
    });
  });
}
function renderActiveChips(){
  const wrap = $("#active-filters");
  const chips = [];
  if (state.q) chips.push({k:"q", label:`Text: "${escapeHtml(state.q)}"`});
  if (state.colors.size) chips.push({k:"colors", label:`Colors: ${[...state.colors].join(", ")}`});
  if (state.onlyTau) chips.push({k:"tau", label:`Tauforged only`});
  wrap.innerHTML = chips.length
    ? chips.map((c,i)=>`<button class="badge gold" data-chip="${c.k}|${i}">${c.label} ✕</button>`).join("")
    : "";
  wrap.querySelectorAll("[data-chip]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const [k] = btn.dataset.chip.split("|");
      if (k==="q") { state.q=""; $("#q").value=""; }
      if (k==="colors") { state.colors.clear(); renderColorFilters(); }
      if (k==="tau") { state.onlyTau=false; $("#only-tau").checked=false; }
      state.page = 1;
      applyFilters();
      writeQuery();
    });
  });
}
function renderColorStats(arr){
  const host = $("#color-stats");
  const counts = Object.fromEntries(COLORS.map(c => [c, 0]));
  for (const m of arr) { const c = parseColor(m.name||""); if (counts[c]!=null) counts[c]++; }
  host.innerHTML = COLORS.map(c=>{
    const hex = COLOR_MAP[c];
    return `<div class="stat"><span class="color-dot" style="background:${hex}"></span>${c}: ${counts[c]}</div>`;
  }).join("");
}

/* ------------ Filter/apply/render ------------ */
function applyFilters(){
  const q = state.q = norm($("#q").value).toLowerCase();
  let arr = state.all.slice();

  if (state.colors.size) arr = arr.filter(m => state.colors.has(parseColor(m.name||"")));
  if (state.onlyTau) arr = arr.filter(m => parseTau(m.name||""));
  if (q) {
    arr = arr.filter(m => {
      const hay = [m.name, m.description, m.type, m.uniqueName, (extractBonuses(m)||[]).join(" ")].map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  const sort = state.sort = $("#sort").value;
  arr.sort((a,b)=>{
    if (sort === "color") return parseColor(a.name||"").localeCompare(parseColor(b.name||"")) || (a.name||"").localeCompare(b.name||"");
    if (sort === "tau")   return (parseTau(b.name||"") ? -1:1) - (parseTau(a.name||"") ? -1:1) || (a.name||"").localeCompare(b.name||"");
    return (a.name||"").localeCompare(b.name||"");
  });

  state.filtered = arr;
  state.page = Math.min(state.page, Math.max(1, Math.ceil(arr.length / state.perPage))) || 1;

  renderColorStats(state.filtered);
  renderActiveChips();
  render();
}

function render(){
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

  grid.querySelectorAll(".btn-view, .shard-cover").forEach(a=>{
    a.addEventListener("click", (ev)=>{
      ev.preventDefault();
      const url = a.getAttribute("data-full");
      const nm  = a.getAttribute("data-name") || "";
      if (!url) return;
      openLightbox(url, nm);
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

/* ------------ API fetch (robuste) + fallback ------------ */
async function fetchShardsFromEndpoints() {
  const errors = [];
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) { errors.push(`${url} → HTTP ${r.status}`); continue; }
      const data = await r.json();
      // data peut être [] OU { archonShards:[...] } OU { shards:[...] }
      let arr = [];
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray(data?.archonShards)) arr = data.archonShards;
      else if (Array.isArray(data?.shards)) arr = data.shards;

      if (arr && arr.length) {
        console.info("[shards] Loaded", arr.length, "from", url);
        return { list: arr, source: url };
      } else {
        errors.push(`${url} → empty array`);
      }
    } catch (e) {
      errors.push(`${url} → ${e.message || e}`);
    }
  }
  console.warn("[shards] All endpoints failed/empty:", errors);
  return { list: [], source: null, errors };
}

// fallback minimal (noms + description sommaire, pas de thumb)
const FALLBACK_SHARDS = (() => {
  const base = [
    ["Crimson Archon Shard", "Crimson", "Offense-focused shard (e.g. ability strength, melee crit, etc.)."],
    ["Amber Archon Shard",   "Amber",   "Utility-focused shard (e.g. casting speed, efficiency, parkour)."],
    ["Azure Archon Shard",   "Azure",   "Defense-focused shard (e.g. health, shield, energy on orb)."],
    ["Emerald Archon Shard", "Emerald", "Fusion color (utility/parkour/loot interactions)."],
    ["Violet Archon Shard",  "Violet",  "Fusion color (ability damage vs. Electricity, etc.)."],
    ["Topaz Archon Shard",   "Topaz",   "Fusion color (gun/melee hybrid benefits)."],
  ];
  const tau = base.map(([n,c,d]) => [`Tauforged ${n}`, c, d.replace(" (", " (Tau, ")]);
  const all = base.concat(tau);
  return all.map(([name, color, description]) => ({
    name,
    type: `${color} Shard`,
    description,
    effects: [],
    wikiaThumbnail: "", // pas d'image sûre en fallback
    wikiaUrl: "https://warframe.fandom.com/wiki/Archon_Shard"
  }));
})();

/* ------------ Boot ------------ */
(async function boot(){
  const status = $("#status");
  try {
    // Skeleton
    $("#results").innerHTML = Array.from({length:6}).map(()=>`
      <div class="shard-card">
        <div class="shard-cover" style="height:260px;background:rgba(255,255,255,.04)"></div>
        <div class="shard-body">
          <div class="h-4 rounded bg-[rgba(255,255,255,.08)] w-2/3 mb-2"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-1/2 mb-1"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-5/6"></div>
        </div>
      </div>
    `).join("");

    const { list: apiList, source } = await fetchShardsFromEndpoints();
    let raw = Array.isArray(apiList) ? apiList : [];

    // Si l'API est vide, fallback (jamais 0 item)
    let usedFallback = false;
    if (!raw.length) {
      usedFallback = true;
      raw = FALLBACK_SHARDS;
    }

    const cleaned = dedupeByName(raw);
    state.all = cleaned;

    // URL → state
    parseQuery();

    // UI init (from state)
    $("#q").value = state.q;
    $("#sort").value = state.sort;
    $("#only-tau").checked = state.onlyTau;
    renderColorFilters();

    // Listeners
    $("#q").addEventListener("input", ()=>{ state.page=1; applyFilters(); writeQuery(); });
    $("#sort").addEventListener("change", ()=>{ state.page=1; applyFilters(); writeQuery(); });
    $("#only-tau").addEventListener("change", ()=>{ state.onlyTau = $("#only-tau").checked; state.page=1; applyFilters(); writeQuery(); });
    $("#reset").addEventListener("click", ()=>{
      state.q=""; $("#q").value="";
      state.colors.clear(); $("#only-tau").checked=false; state.onlyTau=false;
      $("#sort").value="name";
      state.page=1;
      renderColorFilters();
      applyFilters();
      writeQuery();
    });
    $("#prev").addEventListener("click", ()=>{ state.page--; render(); writeQuery(); });
    $("#next").addEventListener("click", ()=>{ state.page++; render(); writeQuery(); });

    // First render
    if (usedFallback) {
      status.textContent = `Shards loaded: ${state.all.length} (fallback dataset — API empty)`;
      status.style.background = "rgba(212,175,55,.10)";
      status.style.color = "#ffdca7";
    } else {
      status.textContent = `Shards loaded: ${state.all.length} (from ${source?.replace(/^https?:\/\//,'') || 'API'})`;
    }
    applyFilters();
  } catch (e) {
    console.error("[shards] error:", e);
    status.textContent = "Error while loading archon shards.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
