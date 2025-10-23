// --- Text Icons: rend les balises <DT_..._COLOR> et <LINE_SEPARATOR>
const DT = {
  DT_SLASH_COLOR:      { label: "Slash",      color: "#d46a6a", icon: "Slash.png" },
  DT_IMPACT_COLOR:     { label: "Impact",     color: "#6aa4e0", icon: "Impact.png" },
  DT_PUNCTURE_COLOR:   { label: "Puncture",   color: "#c6b07f", icon: "Puncture.png" },
  DT_FIRE_COLOR:       { label: "Heat",       color: "#ff8a47", icon: "Heat.png" },
  DT_FREEZE_COLOR:     { label: "Cold",       color: "#7dd3fc", icon: "Cold.png" },
  DT_ELECTRICITY_COLOR:{ label: "Electricity",color: "#f6d05e", icon: "Electricity.png" },
  DT_POISON_COLOR:     { label: "Toxin",      color: "#32d296", icon: "Toxin.png" },
  DT_TOXIN_COLOR:      { alias: "DT_POISON_COLOR" },
  DT_GAS_COLOR:        { label: "Gas",        color: "#7fd4c1", icon: "Gas.png" },
  DT_MAGNETIC_COLOR:   { label: "Magnetic",   color: "#9bb8ff", icon: "Magnetic.png" },
  DT_RADIATION_COLOR:  { label: "Radiation",  color: "#f5d76e", icon: "Radiation.png" },
  DT_VIRAL_COLOR:      { label: "Viral",      color: "#d16ba5", icon: "Viral.png" },
  DT_CORROSIVE_COLOR:  { label: "Corrosive",  color: "#a3d977", icon: "Corrosive.png" },
  DT_BLAST_COLOR:      { label: "Blast",      color: "#ffb26b", icon: "Blast.png" },
  DT_EXPLOSION_COLOR:  { alias: "DT_BLAST_COLOR" },
  DT_RADIANT_COLOR:    { label: "Void",       color: "#c9b6ff", icon: "Void.png" },
};

const ICON_BASE = "img/dmg/";      // <- si tu ajoutes des PNG ici
const USE_ICONS = false;           // passe à true quand tu auras posé les fichiers

function resolveDT(key){
  const k = key.toUpperCase();
  const v = DT[k];
  if (!v) return null;
  if (v.alias) return resolveDT(v.alias);
  return v;
}

// sécurise le HTML puis remplace les balises (gère brut <TAG> et échappé &lt;TAG&gt;)
function renderTextIcons(input){
  let s = String(input ?? "");

  // Normalisation de séparateurs
  s = s.replace(/\r\n|\r/g, "\n")
       .replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n")
       .replace(/\n{2,}/g, "\n");

  // Échappe le HTML pour éviter l’injection
  s = s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  // Remplace chaque balise DT_* (forme encodée &lt;...&gt; ou brute)
  s = s.replace(/(?:&lt;|<)\s*(DT_[A-Z_]+)\s*(?:&gt;|>)/g, (_, key) => {
    const def = resolveDT(key);
    if (!def) return ""; // inconnu -> on supprime la balise “vide”
    const { label, color, icon } = def;
    if (USE_ICONS && icon) {
      const src = ICON_BASE + icon;
      return `<span class="dt-chip" style="color:${color}">
        <img class="dt-ico" alt="${label}" title="${label}" src="${src}">${label}
      </span>`;
    }
    return `<span class="dt-chip" style="color:${color}" title="${label}">${label}</span>`;
  });

  // Convertit les retours à la ligne en <br>
  s = s.replace(/\n/g, "<br>");

  return s;
}


// js/shards.js — Archon Shards (images locales d'abord + effets API, sans lien wiki, sans bouton View)

const ENDPOINTS = [
  "https://cephalon-wodan-production.up.railway.app/archonshards",
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
function localShardPath(color, tau){
  if (!color || color === "Unknown") return "";
  // Noms EXACTS comme dans ton repo : TauforgedCrimsonArchonShard.png, etc.
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
function normalizeUrl(u){ return !u ? "" : (u.startsWith("//") ? "https:" + u : u); }
function upscaleWikiThumb(url, size=512){
  if (!url) return "";
  let out = normalizeUrl(url);
  out = out.replace(/scale-to-width-down\/\d+/i, `scale-to-width-down/${size}`);
  if (!/scale-to-width-down\/\d+/i.test(out) && /\/latest/i.test(out)) {
    out = out.replace(/\/latest(\/?)(\?[^#]*)?$/i, (m, slash, qs='') => `/latest${slash ? "" : "/"}scale-to-width-down/${size}${qs || ""}`);
  }
  return out;
}
// Color-dot fallback
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
function getShardImageSources(m){
  const color = parseColor(m.name||"");
  const tau   = parseTau(m.name||"");
  const localGrid = localShardPath(color, tau);
  const localFull = localGrid;

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

// Hide the grey meta line if it repeats the title meaning
function isMetaRedundant(title, meta, color, tau) {
  if (!meta) return true;
  const clean = s =>
    String(s || "")
      .toLowerCase()
      .replace(/\b(archon|shard)\b/g, "")  // ignore these words
      .replace(/\s+/g, " ")
      .trim();

  const t = clean(title);
  const m = clean(meta);

  if (!m) return true;
  if (t.includes(m)) return true;

  // Expected “meaning” for this card
  const expected = (tau ? "tauforged " : "") + String(color || "").toLowerCase();
  if (m === expected) return true;

  // Common variants from the API
  if (m === color?.toLowerCase()) return true;
  if (m === `${color?.toLowerCase()} shard`) return true;
  if (m === `tauforged ${color?.toLowerCase()} shard`) return true;

  return false;
}

function shardCard(m){
  const { color, tau, localGrid, localFull, wikiGrid, wikiFull, dot } = getShardImageSources(m);
  const effects = extractEffects(m);

  const metaRight = [
    tau ? badgeGold("Tauforged") : "",
    color !== "Unknown" ? colorChip(color) : "",
  ].filter(Boolean).join(" ");

  const primary     = localGrid || wikiGrid || dot;
  const fallback    = (localGrid ? (wikiGrid || dot) : dot);
  const fullPrimary = localFull  || wikiFull  || dot;
  const fullFallback= (localFull ? (wikiFull  || dot) : dot);

  const title = escapeHtml(m.name || "Archon Shard");
  const metaRaw = norm(m.type || "");
  const showMeta = !isMetaRedundant(title, metaRaw, color, tau);

  return `
  <div class="shard-card">
    <a href="#" class="shard-cover"
       data-full="${escapeHtml(fullFallback)}"
       data-full-primary="${escapeHtml(fullPrimary)}"
       data-full-fallback="${escapeHtml(fullFallback)}"
       data-name="${title}">
      <img
        src="${escapeHtml(primary)}"
        alt="${title}"
        data-fallback="${escapeHtml(fallback)}"
        loading="lazy" decoding="async">
    </a>
    <div class="shard-body">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="title">${title}</div>
          ${ showMeta ? `<div class="meta">${escapeHtml(metaRaw)}</div>` : "" }
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

  // Gestion cover/lightbox + fallback image locale→wiki→dot
  grid.querySelectorAll(".shard-cover").forEach(a=>{
    const img = a.querySelector("img");
    const fullPrimary  = a.getAttribute("data-full-primary");
    const fullFallback = a.getAttribute("data-full-fallback");

    if (img) {
      img.addEventListener("load", () => { a.dataset.full = fullPrimary; }, { once:true });
      img.addEventListener("error", () => {
        const fb = img.getAttribute("data-fallback");
        if (fb) img.src = fb;
        a.dataset.full = fullFallback;
      }, { once:true });
    }

    a.addEventListener("click", (ev)=>{
      ev.preventDefault();
      const url = a.dataset.full || fullPrimary || fullFallback;
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

/* ------------ API fetch + normalisation ------------ */
async function fetchShardsFromEndpoints() {
  const errors = [];
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) { errors.push(`${url} → HTTP ${r.status}`); continue; }
      const data = await r.json();

      if (Array.isArray(data) && data.length) return { list: data, source: url };

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
          if (converted.length) return { list: converted, source: url };
        }
        if (Array.isArray(data.archonShards) && data.archonShards.length) return { list: data.archonShards, source: url };
        if (Array.isArray(data.shards) && data.shards.length)           return { list: data.shards, source: url };
      }
    } catch (e) { errors.push(`${url} → ${e.message || e}`); }
  }
  console.warn("[shards] All endpoints failed/empty:", errors);
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

    parseQuery();
    $("#q").value = state.q;
    $("#sort").value = state.sort;
    $("#only-tau").checked = state.onlyTau;
    renderColorFilters();

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
