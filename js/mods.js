// js/mods.js — Mods EN, images WIKI only (+heuristique), effets via description OU levelStats,
// fusion des doublons, exclusions demandées, filtres/tri identiques.

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

/* ---------------- Images : WIKI only (+ heuristique), pas de CDN ---------------- */
function wikiThumbRaw(m){ return m.wikiaThumbnail || m.wikiathumbnail || m.wikiThumbnail || ""; }
function normalizeUrl(u){ return !u ? "" : (u.startsWith("//") ? "https:" + u : u); }
function upscaleThumb(url, size=720){
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

// Heuristique : "Primed Redirection" → "https://wiki.warframe.com/images/PrimedRedirectionMod.png"
function nameToWikiCandidates(name){
  const base = norm(name).replace(/[’'`´]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  if (!base) return [];
  const words = base.split(" ");
  const CamelNoSpace = words.map(w => w.charAt(0).toUpperCase()+w.slice(1)).join("");
  const Underscore   = words.map(w => w.charAt(0).toUpperCase()+w.slice(1)).join("_");
  return [
    `${CamelNoSpace}Mod.png`,
    `${Underscore}Mod.png`,
  ];
}
function guessWikiUrl(name){ // première candidate
  const files = nameToWikiCandidates(name);
  if (!files.length) return "";
  return `https://wiki.warframe.com/images/${encodeURIComponent(files[0])}`;
}
function bestWikiImage(m){
  const raw = wikiThumbRaw(m);
  if (raw) return upscaleThumb(raw, 720);
  // pas de miniature fournie → heuristique à partir du nom
  const guess = guessWikiUrl(m.name || "");
  return guess || "";
}
// placeholder data-URL (carte neutre)
const MOD_PLACEHOLDER = (() => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0b1220"/>
          <stop offset="100%" stop-color="#101a2e"/>
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#g)"/>
      <rect x="12" y="12" width="576" height="336" rx="24" ry="24"
            fill="none" stroke="#3d4b63" stroke-width="3"/>
      <text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">
        Mod image unavailable
      </text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();

/* ---------------- Effets : description OU stats du rang max ---------------- */
function effectsFromLevelStats(m){
  const ls = Array.isArray(m.levelStats) ? m.levelStats : null;
  if (!ls || !ls.length) return [];
  // rang max : fusionLimit (si présent) sinon la dernière entrée
  let pick = ls[ls.length - 1];
  if (Number.isFinite(m.fusionLimit)) {
    const candidate = ls.find(x => x?.level === m.fusionLimit);
    if (candidate) pick = candidate;
  }
  const stats = Array.isArray(pick?.stats) ? pick.stats : [];
  return stats.map(s => norm(s)).filter(Boolean);
}
function effectsFromDescription(m){
  const d = norm(m.description);
  if (!d) return [];
  return d.split(/\n|•|;|·/g).map(x => norm(x)).filter(Boolean);
}
function getEffects(m){
  const fromDesc = effectsFromDescription(m);
  if (fromDesc.length) return Array.from(new Set(fromDesc));
  const fromStats = effectsFromLevelStats(m);
  return Array.from(new Set(fromStats));
}

/* ---------------- Exclusions par défaut ---------------- */
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

/* ---------------- Rareté / Qualité ---------------- */
function rarityKey(r){
  const s = norm(r).toUpperCase();
  if (/PRIMED/.test(s)) return "PRIMED";
  return s; // COMMON/UNCOMMON/RARE/LEGENDARY…
}
function rarityOrder(r){
  const map = { COMMON:1, UNCOMMON:2, RARE:3, LEGENDARY:4, PRIMED:5 };
  return map[rarityKey(r)] || 0;
}
function descScore(m){ return Math.min(500, (norm(m.description).length || 0) + getEffects(m).join(" ").length); }
function qualityForPrimary(m){
  // favorise une vraie image wiki + du contenu (desc/stats)
  let s = 0;
  if (wikiThumbRaw(m)) s += 2000;
  s += descScore(m);
  s += (m.fusionLimit || 0);
  return s;
}

/* ---------------- Fusion des doublons PAR NOM ---------------- */
function mergeGroup(items){
  const primary = items.slice().sort((a,b)=> qualityForPrimary(b)-qualityForPrimary(a))[0];

  // Description : on privilégie celle qui a le plus d'infos (desc + stats)
  const bestText = items.slice().sort((a,b)=> descScore(b) - descScore(a))[0];

  // Image : wiki miniature prioritaire ; sinon heuristique par nom
  const img = bestWikiImage(primary) || bestWikiImage(bestText);
  const mergedEffects = getEffects(bestText).length ? getEffects(bestText) : getEffects(primary);

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
    return vals.sort((a,b)=>{
      const aAny = a==="Any", bAny=b==="Any";
      if (aAny && !bAny) return 1;
      if (!aAny && bAny) return -1;
      return a.localeCompare(b);
    })[0];
  }

  const merged = {
    name: pick(primary.name),
    uniqueName: pick(primary.uniqueName, bestText.uniqueName),
    description: pick(bestText.description, primary.description),
    effectsLines: mergedEffects, // <-- on stocke directement les effets prêts à afficher

    type: pick(primary.type, bestText.type),
    compatibility: pick(primary.compatibility, primary.compatName, bestText.compatibility, bestText.compatName),

    baseDrain: pickMaxInt(primary.baseDrain, bestText.baseDrain),
    fusionLimit: pickMaxInt(primary.fusionLimit, bestText.fusionLimit),

    rarity: pickRarity(primary.rarity, primary.rarityString, bestText.rarity, bestText.rarityString),
    polarity: pickPolarity(primary.polarity, primary.polarityName, bestText.polarity, bestText.polarityName),

    set: pick(primary.set, bestText.set),

    // image finale (wiki/guess) — on ne garde PAS le CDN
    wikiImage: img,
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
  for (const [,items] of groups) out.push(mergeGroup(items));
  return out;
}

/* ---------------- UI helpers ---------------- */
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
  const img = m.wikiImage || guessWikiUrl(m.name || "") || MOD_PLACEHOLDER;
  const pol = canonPolarity(m.polarity || "");
  const rar = rarityKey(m.rarity || "");
  const compat = m.compatibility || m.type || "";
  const lines = Array.isArray(m.effectsLines) && m.effectsLines.length
    ? m.effectsLines
    : effectsFromDescription(m).length ? effectsFromDescription(m) : effectsFromLevelStats(m);

  return `
  <div class="mod-card">
    <div class="mod-cover">
      <img src="${escapeHtml(img)}" alt="${escapeHtml(m.name)}" loading="lazy" decoding="async">
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

/* ---------------- Filtres & tri ---------------- */
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

  arr = arr.filter(m => {
    const ex = (() => {
      const name = norm(m.name);
      const type = norm(m.type);
      const uniq = norm(m.uniqueName);
      const isFocus = /focus/i.test(type) || /\/focus\//i.test(uniq) || /focus/i.test(name);
      const isRiven = /riven/i.test(name) || /riven/i.test(type);
      const isSetStub = /set\s*mod/i.test(type) || /^set\s*mod$/i.test(name);
      const emptyish = !(m.description && m.description.trim().length) && !(m.effectsLines && m.effectsLines.length);
      return (isFocus || isRiven || (isSetStub && emptyish));
    })();
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
        m.name, m.description, (m.effectsLines||[]).join(" "), m.type, m.compatibility, m.uniqueName
      ].map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

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

  // si une image guessed 404, fallback placeholder
  grid.querySelectorAll(".mod-cover img").forEach(img=>{
    img.addEventListener("error", ()=>{ img.src = MOD_PLACEHOLDER; }, { once:true });
  });
}

/* ---------------- Fetch + boot ---------------- */
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
    const merged = mergeByName(raw); // wiki-only + effets complétés
    state.all = merged;

    buildTypeOptions(state.all);

    $("#q").value = "";
    $("#sort").value = "name";
    $("#inc-riven").checked = false;
    $("#inc-focus").checked = false;
    $("#inc-setstub").checked = false;

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

    status.textContent = `Mods loaded: ${state.all.length} (EN, wiki-only images + merged effects)`;
    applyFilters();
  } catch (e) {
    console.error("[mods] error:", e);
    status.textContent = "Error while loading mods.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
