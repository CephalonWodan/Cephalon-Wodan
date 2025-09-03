// js/shards.js — Archon Shards (local images first + effets API, sans lien wiki)
//
// Utilise en priorité /img/shards/:
//   AmberArchonShard.png
//   AzureArchonShard.png
//   CrimsonArchonShard.png
//   EmeraldArchonShard.png
//   TopazArchonShard.png
//   VioletArchonShard.png
// …et les variantes tauforged : TauforgedAmberArchonShard.png, etc.
//
// Fallbacks : wiki thumbnail (HD) → pastille colorée si rien.
//
// Conserve: recherche, tris, filtres couleur + tau, pagination, lightbox, URL sync.

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
const LOCAL_DIR = new URL("img/shards/", document.baseURI).href;

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

/* ------------ Helpers: color/tau ------------ */
function parseColor(name=""){
  const n = String(name).toLowerCase();
  if (n.includes("crimson")) return "Crimson";
  if (n.includes("amber"))   return "Amber";
  if (n.includes("azure"))   return "Azure";
  if (n.includes("emerald")) return "Emerald";
  if (n.includes("violet"))  return "Violet";
  if (n.includes("topaz"))   return "Topaz";
  return "Unknown";
}
function parseTau(name=""){ return /tauforged/i.test(name); }

/* ------------ Images: local → wiki → dot ------------ */
// Local filename from color + tau
function localShardPath(color, tau){
  if (!color || color === "Unknown") return "";
  const base = tau ? `Tauforged${color}ArchonShard.png` : `${color}ArchonShard.png`;
  return LOCAL_DIR + base;
}

// Wiki helpers
function rawWikiThumb(m){
  return (
    m.wikiaThumbnail || m.wikiathumbnail ||
    m.wikiThumbnail  || m.thumbnail ||
    m.image          || m.icon      || ""
  );
}
function normalizeUrl(u){
  if (!u) return "";
  if (u.startsWith("//")) return "https:" + u;
  return u;
}
function upscaleWikiThumb(url, size=512){
  if (!url) return "";
  let out = normalizeUrl(url);
  out = out.replace(/scale-to-width-down\/\d+/i, `scale-to-width-down/${size}`);
  if (!/scale-to-width-down\/\d+/i.test(out) && /\/latest/i.test(out)) {
    out = out.replace(/\/latest(\/?)(\?[^#]*)?$/i, (m, slash, qs='') => {
      const delim = slash ? "" : "/";
      return `/latest${delim}scale-to-width-down/${size}${qs || ""}`;
    });
  }
  return out;
}

// Color-dot fallback data URL
function colorDotDataUrl(color, tau){
  const hex = COLOR_MAP[color] || "#888";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <defs><radialGradient id="g" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".22"/>
      <stop offset="100%" stop-color="${hex}"/>
    </radialGradient></defs>
    <circle cx="48" cy="48" r="44" fill="url(#g)" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
    ${tau ? `<circle cx="48" cy="48" r="40" fill="none" stroke="#D4AF37" stroke-width="3" />` : ``}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Compose sources for a shard (primary/local + fallbacks)
function getShardImageSources(m){
  const color = parseColor(m.name||"");
  const tau   = parseTau(m.name||"");
  const localGrid = localShardPath(color, tau);
  const localFull = localGrid; // tes PNG sont assez grands pour la lightbox

  const wikiRaw = rawWikiThumb(m);
  const wikiGrid = wikiRaw ? upscaleWikiThumb(wikiRaw, 384)  : "";
  const wikiFull = wikiRaw ? upscaleWikiThumb(wikiRaw, 1024) : "";

  const dot = colorDotDataUrl(color, tau);

  return {
    color, tau,
    localGrid, localFull,
    wikiGrid, wikiFull,
    dot
  };
}

/* ------------ Effets (upgradeTypes/effects/bonuses) ------------ */
function extractEffectsFromUpgradeTypes(upgradeTypes){
  const out = [];
  if (!upgradeTypes) return out;

  if (Array.isArray(upgradeTypes)) {
    for (const it of upgradeTypes) {
      if (!it) continue;
      if (typeof it === "string") out.push(norm(it));
      else if (typeof it.value === "string") out.push(norm(it.value));
      else if (typeof it.description === "string") out.push(norm(it.description));
    }
    return out.filter(Boolean);
  }

  if (typeof upgradeTypes === "object") {
    for (const k of Object.keys(upgradeTypes)) {
      const v = upgradeTypes[k];
      if (!v) continue;
      if (typeof v === "string") out.push(norm(v));
      else if (typeof v.value === "string") out.push(norm(v.value));
      else if (typeof v.desc === "string") out.push(norm(v.desc));
      else if (typeof v.description === "string") out.push(norm(v.description));
    }
  }
  return out.filter(Boolean);
}
function extractEffects(m){
  const ut = m.upgradeTypes || m.upgrades || m.values;
  const fromUT = extractEffectsFromUpgradeTypes(ut);
  if (fromUT.length) return uniq(fromUT);

  const pools = [m.effects, m.bonuses, m.stats];
  const list = [];
  for (const p of pools) {
    if (Array.isArray(p)) list.push(...p.map(x => norm(x)).filter(Boolean));
    else if (typeof p === "string") list.push(norm(p));
  }
  if (!list.length && m.description) {
    list.push(...String(m.description).split(/\n|•|;|·/g).map(norm).filter(Boolean));
  }
  return uniq(list);
}
function uniq(arr){ return Array.from(new Set((arr||[]).map(x=>String(x)))).filter(Boolean); }

/* ------------ Dédoublonnage & qualité ------------ */
function hasAnyThumb(m){ return !!rawWikiThumb(m); }
function qualityScore(m){
  let s = 0;
  if (hasAnyThumb(m)) s += 1000;
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
    const withThumb = items.filter(hasAnyThumb);
    const cand = (withThumb.length ? withThumb : items).sort((a,b)=> qualityScore(b)-qualityScore(a))[0];
    out.push(cand);
  }
  return out;
}

/* ------------ UI ------------ */
function colorChip(color){
  const hex = COLOR_MAP[color] || "#888888";
  return `<span class="color-chip"><span class="color-dot" style="background:${hex}"></span>${color}</span>`;
}
function badge(text){ return `<span class="badge">${text}</span>`; }
function badgeGold(text){ return `<span class="badge gold">${text}</span>`; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function shardCard(m){
  const { color, tau, localGrid, localFull, wikiGrid, wikiFull, dot } = getShardImageSources(m);
  const effects = extractEffects(m);

  const metaRight = [
    tau ? badgeGold("Tauforged") : "",
    color !== "Unknown" ? colorChip(color) : "",
  ].filter(Boolean).join(" ");

  // On pose d'abord la source locale (data-primary). On met src sur la locale;
  // et data-fallback pour la wiki/dot. Un gestionnaire 'error' fixera la fallback.
  const primary = localGrid || wikiGrid || dot;
  const fallback = (localGrid ? (wikiGrid || dot) : dot);
  const fullPrimary = localFull || wikiFull || dot;
  const fullFallback = (localFull ? (wikiFull || dot) : dot);

  return `
  <div class="shard-card">
    <a href="#" class="shard-cover"
       data-full="${escapeHtml(fullFallback)}"
       data-full-primary="${escapeHtml(fullPrimary)}"
       data-full-fallback="${escapeHtml(fullFallback)}">
      <img
        src="${escapeHtml(primary)}"
        alt="${escapeHtml(m.name||"Archon Shard")}"
        data-fallback="${escapeHtml(fallback)}"
        loading="lazy" decoding="async">
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

      ${ effects.length ? `
        <div class="mt-2">
          <div class="text-sm muted mb-1">Effects</div>
          <div class="kv">
            ${effects.map(b => `<div class="k">•</div><div class="v">${escapeHtml(b)}</div>`).join("")}
          </div>
        </div>` : "" }

      <div class="card-actions">
        ${ `<a href="#" class="btn-view"
               data-full-primary="${escapeHtml(fullPrimary)}"
               data-full-fallback="${escapeHtml(fullFallback)}">View</a>` }
      </div>
    </div>
  </div>`;
}

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
      const hay = [
        m.name, m.description, m.type, m.uniqueName,
        (extractEffects(m)||[]).join(" ")
      ].map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  const sort = state.sort = $("#sort").value;
  arr.sort((a,b)=>{
    if (sort === "color") return parseColor(a.name||"").localeCompare(parseColor(b.name||"")) || (a.name||"").localeCompare(b.name||"");
    if (sort === "tau")   return (parseTau(b.name||"") - parseTau(a.name||"")) || (a.name||"").localeCompare(b.name||"");
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

  // Accroche lightbox + gestion des images locales manquantes (fallbacks)
  grid.querySelectorAll(".shard-cover").forEach(a=>{
    const img = a.querySelector("img");
    const fullPrimary = a.getAttribute("data-full-primary");
    const fullFallback = a.getAttribute("data-full-fallback");

    if (img) {
      // si la locale charge => on met le full sur la locale
      img.addEventListener("load", () => {
        a.dataset.full = fullPrimary;
      }, { once: true });

      // si la locale 404 => switcher sur fallback (wiki/dot) ET pour la lightbox aussi
      img.addEventListener("error", () => {
        const fb = img.getAttribute("data-fallback");
        if (fb) img.src = fb;
        a.dataset.full = fullFallback;
      }, { once: true });
    }

    a.addEventListener("click", (ev)=>{
      ev.preventDefault();
      const url = a.dataset.full || fullPrimary || fullFallback;
      const nm  = a.getAttribute("data-name") || "";
      if (!url) return;
      openLightbox(url, nm);
    });
  });

  // Bouton "View"
  grid.querySelectorAll(".btn-view").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.preventDefault();
      const card = btn.closest(".shard-card");
      const cov  = card?.querySelector(".shard-cover");
      const url  = cov?.dataset.full || btn.getAttribute("data-full-primary") || btn.getAttribute("data-full-fallback");
      const nm   = cov?.getAttribute("data-name") || "";
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

/* ------------ API fetch + normalisation ------------ */
async function fetchShardsFromEndpoints() {
  const errors = [];
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) { errors.push(`${url} → HTTP ${r.status}`); continue; }
      const data = await r.json();

      // 1) Réponse tableau direct
      if (Array.isArray(data) && data.length) {
        console.info("[shards] Loaded", data.length, "from", url);
        return { list: data, source: url };
      }

      // 2) Réponse objet avec clés ACC_* (ex: ACC_BLUE)
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const keys = Object.keys(data).filter(k => /^ACC_/i.test(k));
        if (keys.length) {
          const converted = [];
          for (const k of keys) {
            const node = data[k] || {};
            const color = node.value || node.name || k.replace(/^ACC_/i, "");
            const name = `${capitalize(color)} Archon Shard`;
            converted.push({
              name,
              type: `${capitalize(color)} Shard`,
              upgradeTypes: node.upgradeTypes || node.upgrades || node.values || null,
              description: node.description || "",
              wikiaThumbnail: normalizeUrl(node.thumbnail || node.wikiaThumbnail || node.wikiathumbnail || ""),
            });
          }
          if (converted.length) {
            console.info("[shards] Converted ACC_* object →", converted.length, "items (", url, ")");
            return { list: converted, source: url };
          }
        }

        // 3) D'autres enveloppes possibles (archonShards / shards)
        if (Array.isArray(data.archonShards) && data.archonShards.length) {
          return { list: data.archonShards, source: url };
        }
        if (Array.isArray(data.shards) && data.shards.length) {
          return { list: data.shards, source: url };
        }
      }

      errors.push(`${url} → empty/unknown shape`);
    } catch (e) {
      errors.push(`${url} → ${e.message || e}`);
    }
  }
  console.warn("[shards] All endpoints failed/empty]:", errors);
  return { list: [], source: null, errors };
}

function capitalize(s){ s=String(s||""); return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); }

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
    const raw = Array.isArray(apiList) ? apiList : [];

    state.all = dedupeByName(raw);

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
    status.textContent = `Shards loaded: ${state.all.length}${source ? ` (from ${source.replace(/^https?:\/\//,'')})` : ""}`;
    applyFilters();
  } catch (e) {
    console.error("[shards] error:", e);
    status.textContent = "Error while loading archon shards.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
