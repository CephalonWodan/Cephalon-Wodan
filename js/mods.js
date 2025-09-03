// js/mods.js — Mods EN, wiki-image first, fusion des doublons pour garder la description
//
// - Images: priorité aux miniatures du wiki (wikiaThumbnail/wikiathumbnail/wikiThumbnail) en HD,
//   fallback sur CDN WarframeStat (thumbnail/image) uniquement si le wiki manque.
// - Déduplication PAR NOM avec FUSION des champs: on récupère la meilleure description, image, etc.
// - Exclusions par défaut: Focus Way, Rivens, "Set Mod" stub (désactivables).
// - Filtres: type, rarity, polarity + recherche ; Tri: name/rarity/drain/type/polarity.
// - Icônes de polarité: tes SVG (img/polarities/*_Pol.svg).

const ENDPOINTS = [
  "https://api.warframestat.us/mods?language=en",
  "https://api.warframestat.us/mods/?language=en",
  "https://api.warframestat.us/mods/",
];

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const norm = (s) => String(s || "").trim();

const POL_ICON = (p) => {
  const map = {
    Madurai: "Madurai_Pol.svg",
    Vazarin: "Vazarin_Pol.svg",
    Naramon: "Naramon_Pol.svg",
    Zenurik: "Zenurik_Pol.svg",
    Unairu:  "Unairu_Pol.svg",
    Umbra:   "Umbra_Pol.svg",
    Penjaga: "Penjaga_Pol.svg",
    Any:     "Any_Pol.svg",
    None:    "Any_Pol.svg",
    "":      "Any_Pol.svg",
  };
  const key = canonPolarity(p);
  const file = map[key] || "Any_Pol.svg";
  return `img/polarities/${file}`;
};

function canonPolarity(p){
  const s = norm(p).toLowerCase();
  if (!s) return "Any";
  const aliases = {
    madurai:"Madurai", vazarin:"Vazarin", naramon:"Naramon",
    zenurik:"Zenurik", unairu:"Unairu", penjaga:"Penjaga",
    umbra:"Umbra", universal:"Any", any:"Any", none:"Any", "-":"Any"
  };
  return aliases[s] || (s.charAt(0).toUpperCase()+s.slice(1));
}

/* ---------- IMAGES : WIKI FIRST ---------- */
function wikiThumbRaw(m){
  return m.wikiaThumbnail || m.wikiathumbnail || m.wikiThumbnail || "";
}
function cdnThumbRaw(m){
  return m.thumbnail || m.image || "";
}
function normalizeUrl(u){ return !u ? "" : (u.startsWith("//") ? "https:" + u : u); }
function upscaleThumb(url, size=600){
  if (!url) return "";
  let out = normalizeUrl(url);
  out = out.replace(/scale-to-width-down\/\d+/i, `scale-to-width-down/${size}`);
  if (!/scale-to-width-down\/\d+/i.test(out) && /\/latest/i.test(out)) {
    out = out.replace(/\/latest(\/?)(\?[^#]*)?$/i, (m, slash, qs='') =>
      `/latest${slash ? "" : "/"}scale-to-width-down/${size}${qs || ""}`
    );
  }
  return out;
}
function bestThumbHD(m, size=600){
  // Wiki en premier, sinon CDN
  const wiki = wikiThumbRaw(m);
  if (wiki) return upscaleThumb(wiki, size);
  const cdn = cdnThumbRaw(m);
  if (cdn)  return upscaleThumb(cdn, size);
  return "";
}
function hasWikiThumb(m){ return !!wikiThumbRaw(m); }
function hasAnyThumb(m){ return !!(wikiThumbRaw(m) || cdnThumbRaw(m)); }

/* ---------- EXCLUSIONS PAR DÉFAUT ---------- */
function shouldExcludeDefault(m){
  const name = norm(m.name);
  const type = norm(m.type);
  const uniq = norm(m.uniqueName);

  const isFocus = /focus/i.test(type) || /\/focus\//i.test(uniq) || /focus/i.test(name);
  const isRiven = /riven/i.test(name) || /riven/i.test(type);
  const isSetStub = /set\s*mod/i.test(type) || /^set\s*mod$/i.test(name);
  const emptyish = !(m.description && m.description.trim().length) && !Array.isArray(m.levelStats);

  return (isFocus || isRiven || (isSetStub && emptyish));
}

/* ---------- QUALITÉ / RARETÉ ---------- */
function rarityKey(r){
  const s = norm(r).toUpperCase();
  if (/PRIMED/.test(s)) return "PRIMED";
  return s; // COMMON / UNCOMMON / RARE / LEGENDARY …
}
function rarityOrder(r){
  const map = { COMMON:1, UNCOMMON:2, RARE:3, LEGENDARY:4, PRIMED:5 };
  return map[rarityKey(r)] || 0;
}
function descLen(m){ return (norm(m.description).length || 0); }
function qualityForPrimary(m){
  // Favorise wiki-image + description longue
  let s = 0;
  if (hasWikiThumb(m)) s += 2000;
  else if (hasAnyThumb(m)) s += 1000;
  s += Math.min(500, descLen(m));
  s += (m.fusionLimit || 0);
  return s;
}

/* ---------- FUSION DES DOUBLONS PAR NOM ---------- */
function mergeGroup(items){
  // Item “primaire” = meilleure image (wiki) + description la plus riche
  const primary = items.slice().sort((a,b)=> qualityForPrimary(b)-qualityForPrimary(a))[0];

  const bestDesc = items.slice().sort((a,b)=> descLen(b)-descLen(a))[0];

  // image: wiki > cdn > vide
  const imageHolder = items.find(hasWikiThumb) || items.find(hasAnyThumb) || primary;

  // champs fusionnés (on prend le premier non vide le plus pertinent)
  function pick(...arr){ return arr.find(v => v != null && String(v).trim() !== "") ?? ""; }
  function pickMaxInt(...arr){
    let best = null;
    for (const v of arr) if (Number.isFinite(v)) best = (best==null? v : Math.max(best, v));
    return best;
  }
  function pickRarity(...arr){
    const vals = arr.filter(Boolean);
    if (!vals.length) return "";
    return vals.sort((a,b)=> rarityOrder(b)-rarityOrder(a))[0];
  }
  function pickPolarity(...arr){
    const vals = arr.map(canonPolarity).filter(Boolean);
    if (!vals.length) return "Any";
    // priorité à autre chose que Any
    return vals.sort((a,b)=>{
      const aAny = a==="Any", bAny=b==="Any";
      if (aAny && !bAny) return 1;
      if (!aAny && bAny) return -1;
      return a.localeCompare(b);
    })[0];
  }

  const merged = {
    // de base
    name: pick(primary.name),
    uniqueName: pick(primary.uniqueName, bestDesc.uniqueName),
    description: pick(bestDesc.description, primary.description),

    // identité/compat
    type: pick(primary.type, bestDesc.type),
    compatibility: pick(primary.compatibility, primary.compatName, bestDesc.compatibility, bestDesc.compatName),

    // chiffres
    baseDrain: pickMaxInt(primary.baseDrain, bestDesc.baseDrain),
    fusionLimit: pickMaxInt(primary.fusionLimit, bestDesc.fusionLimit),

    // rarity/polarity
    rarity: pickRarity(primary.rarity, primary.rarityString, bestDesc.rarity, bestDesc.rarityString),
    polarity: pickPolarity(primary.polarity, primary.polarityName, bestDesc.polarity, bestDesc.polarityName),

    // set éventuel
    set: pick(primary.set, bestDesc.set),

    // image (wiki prioritaire)
    wikiaThumbnail: wikiThumbRaw(imageHolder) || "",
    thumbnail: cdnThumbRaw(imageHolder) || "",
  };

  return merged;
}

function mergeByName(arr){
  const groups = new Map();
  for (const m of arr) {
    const k = norm(m.name).toLowerCase();
    if (!k) continue;
    (groups.get(k) ?? groups.set(k, []).get(k)).push(m);
  }
  const out = [];
  for (const [,items] of groups) {
    out.push(mergeGroup(items));
  }
  return out;
}

/* ---------- UI helpers ---------- */
function badgeRarity(r){
  const k = rarityKey(r);
  return k ? `<span class="badge rar-${k}">${k}</span>` : "";
}
function polChip(p){
  const src = POL_ICON(p);
  const txt = canonPolarity(p);
  return `<span class="chip"><img src="${src}" alt="${txt}"><span>${txt}</span></span>`;
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function modCard(m){
  const img = bestThumbHD(m, 720); // grand pour être bien lisible
  const pol = canonPolarity(m.polarity || "");
  const rar = rarityKey(m.rarity || "");
  const compat = m.compatibility || m.type || "";

  const desc = norm(m.description);
  const lines = desc ? desc.split(/\n|•|;|·/g).map(s => norm(s)).filter(Boolean) : [];

  return `
  <div class="mod-card">
    <div class="mod-cover">
      ${ img ? `<img src="${img}" alt="${escapeHtml(m.name)}">` : "" }
    </div>
    <div class="mod-body">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="mod-title truncate">${escapeHtml(m.name)}</div>
          <div class="text-sm muted">${escapeHtml(compat)}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${ pol ? polChip(pol) : "" }
          ${ rar ? badgeRarity(rar) : "" }
        </div>
      </div>

      <div class="kv mt-1">
        <div class="k">Base drain</div><div class="v">${m.baseDrain ?? "—"}</div>
        <div class="k">Max rank</div><div class="v">${m.fusionLimit ?? "—"}</div>
        ${ m.set ? `<div class="k">Set</div><div class="v">${escapeHtml(m.set)}</div>` : "" }
      </div>

      ${ lines.length ? `
        <div class="mt-2">
          <div class="text-sm muted mb-1">Effects</div>
          <div class="kv">
            ${lines.map(b => `<div class="k">•</div><div class="v">${escapeHtml(b)}</div>`).join("")}
          </div>
        </div>` : "" }
    </div>
  </div>`;
}

/* ---------- Filtres & tri ---------- */
function buildTypeOptions(arr){
  const set = new Set();
  for (const m of arr) {
    const t = norm(m.type || m.compatibility);
    if (t) set.add(t);
  }
  const sel = $("#f-type");
  const opts = ["", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
  sel.innerHTML = opts.map(v => `<option value="${escapeHtml(v)}">${v || "All"}</option>`).join("");
}

const state = {
  all: [],
  filtered: [],
  page: 1,
  perPage: 24,
  q: "",
  sort: "name",
  fType: "",
  fRarity: "",
  fPol: "",
  incRiven: false,
  incFocus: false,
  incSetStub: false,
};

function applyFilters(){
  const q = state.q = norm($("#q").value).toLowerCase();
  state.fType = $("#f-type").value;
  state.fRarity = $("#f-rarity").value;
  state.fPol = $("#f-polarity").value;
  state.incRiven = $("#inc-riven").checked;
  state.incFocus = $("#inc-focus").checked;
  state.incSetStub = $("#inc-setstub").checked;

  let arr = state.all.slice();

  // exclusions par défaut (désactivables)
  arr = arr.filter(m => {
    const ex = shouldExcludeDefault(m);
    if (!ex) return true;
    if (/riven/i.test(m.name) || /riven/i.test(m.type)) return state.incRiven;
    if (/focus/i.test(m.type) || /\/focus\//i.test(m.uniqueName) || /focus/i.test(m.name)) return state.incFocus;
    if ((/set\s*mod/i.test(m.type) || /^set\s*mod$/i.test(m.name))) return state.incSetStub;
    return false;
  });

  if (state.fType)   arr = arr.filter(m => norm(m.type || m.compatibility) === state.fType);
  if (state.fRarity) arr = arr.filter(m => rarityKey(m.rarity || "") === state.fRarity.toUpperCase());
  if (state.fPol)    arr = arr.filter(m => canonPolarity(m.polarity || "") === state.fPol);

  if (q) {
    arr = arr.filter(m => {
      const hay = [
        m.name, m.description, m.type, m.compatibility, m.uniqueName
      ].map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  // tri
  const sort = state.sort = $("#sort").value;
  arr.sort((a,b)=>{
    if (sort === "rarity")   return rarityOrder(a.rarity) - rarityOrder(b.rarity) || (a.name||"").localeCompare(b.name||"");
    if (sort === "drain")    return (a.baseDrain ?? 0) - (b.baseDrain ?? 0) || (a.name||"").localeCompare(b.name||"");
    if (sort === "type")     return (a.type||"").localeCompare(b.type||"") || (a.name||"").localeCompare(b.name||"");
    if (sort === "polarity") return canonPolarity(a.polarity||"").localeCompare(canonPolarity(b.polarity||"")) || (a.name||"").localeCompare(b.name||"");
    return (a.name||"").localeCompare(b.name||"");
  });

  state.filtered = arr;
  state.page = 1;
  render();
}

function render(){
  const total = state.filtered.length;
  $("#count").textContent = `${total} mod(s)`;

  const per = state.perPage;
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(Math.max(1, state.page), pages);
  state.page = page;

  $("#prev").disabled = (page <= 1);
  $("#next").disabled = (page >= pages);
  $("#pageinfo").textContent = `Page ${page} / ${pages}`;

  const start = (page - 1) * per;
  const slice = state.filtered.slice(start, start + per);

  const grid = $("#results");
  grid.className = "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3";
  grid.innerHTML = slice.map(modCard).join("");
}

/* ---------- Fetch + boot ---------- */
async function fetchMods(){
  const errors = [];
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) { errors.push(`${url} → HTTP ${r.status}`); continue; }
      const data = await r.json();
      if (Array.isArray(data) && data.length) return data;
    } catch (e) { errors.push(`${url} → ${e.message||e}`); }
  }
  console.warn("[mods] endpoints empty/failed:", errors);
  return [];
}

(async function boot(){
  const status = $("#status");
  try {
    // skeleton
    $("#results").innerHTML = Array.from({length:6}).map(()=>`
      <div class="mod-card">
        <div class="mod-cover" style="height:300px;background:rgba(255,255,255,.04)"></div>
        <div class="mod-body">
          <div class="h-4 rounded bg-[rgba(255,255,255,.08)] w-2/3 mb-2"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-1/2 mb-1"></div>
          <div class="h-3 rounded bg-[rgba(255,255,255,.06)] w-5/6"></div>
        </div>
      </div>
    `).join("");

    const raw = await fetchMods();

    // fusion par nom (image wiki prioritaire + meilleure description)
    const merged = mergeByName(raw);

    state.all = merged;

    buildTypeOptions(state.all);

    // init UI
    $("#q").value = "";
    $("#sort").value = "name";
    $("#inc-riven").checked = false;
    $("#inc-focus").checked = false;
    $("#inc-setstub").checked = false;

    // listeners
    $("#q").addEventListener("input", applyFilters);
    $("#sort").addEventListener("change", applyFilters);
    $("#f-type").addEventListener("change", applyFilters);
    $("#f-rarity").addEventListener("change", applyFilters);
    $("#f-polarity").addEventListener("change", applyFilters);
    $("#inc-riven").addEventListener("change", applyFilters);
    $("#inc-focus").addEventListener("change", applyFilters);
    $("#inc-setstub").addEventListener("change", applyFilters);
    $("#reset").addEventListener("click", ()=>{
      $("#q").value = "";
      $("#sort").value = "name";
      $("#f-type").value = "";
      $("#f-rarity").value = "";
      $("#f-polarity").value = "";
      $("#inc-riven").checked = false;
      $("#inc-focus").checked = false;
      $("#inc-setstub").checked = false;
      applyFilters();
    });
    $("#prev").addEventListener("click", ()=>{ state.page--; render(); });
    $("#next").addEventListener("click", ()=>{ state.page++; render(); });

    status.textContent = `Mods loaded: ${state.all.length} (EN, wiki images first)`;
    applyFilters();
  } catch (e) {
    console.error("[mods] error:", e);
    status.textContent = "Error while loading mods.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
