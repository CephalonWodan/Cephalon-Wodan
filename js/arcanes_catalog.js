// js/arcanes_catalog.js
// Catalogue Arcanes — filtres latéraux + images + rendu <DT_...> → icône inline

/* ================== Text Icons (DT_...) → <img> inline ================== */
const ICON_BASE = new URL("img/symbol/", document.baseURI).href; // ton dossier /img/symbol/

// Mapping minimal : chaque balise -> nom de fichier PNG (aucun label/pastille)
const DT_ICONS = {
  // Physiques
  DT_IMPACT_COLOR:     "ImpactSymbol.png",
  DT_PUNCTURE_COLOR:   "PunctureSymbol.png",
  DT_SLASH_COLOR:      "SlashSymbol.png",

  // Élémentaires
  DT_FIRE_COLOR:       "HeatSymbol.png",
  DT_FREEZE_COLOR:     "ColdSymbol.png",
  DT_ELECTRICITY_COLOR:"ElectricitySymbol.png",
  DT_POISON_COLOR:     "ToxinSymbol.png",
  DT_TOXIN_COLOR:      "ToxinSymbol.png",

  // Combinés
  DT_GAS_COLOR:        "GasSymbol.png",
  DT_MAGNETIC_COLOR:   "MagneticSymbol.png",
  DT_RADIATION_COLOR:  "RadiationSymbol.png",
  DT_VIRAL_COLOR:      "ViralSymbol.png",
  DT_CORROSIVE_COLOR:  "CorrosiveSymbol.png",
  DT_BLAST_COLOR:      "BlastSymbol.png",
  DT_EXPLOSION_COLOR:  "BlastSymbol.png",

  // Divers / Void
  DT_RADIANT_COLOR:    "VoidSymbol.png",
  DT_SENTIENT_COLOR:   "SentientSymbol.png",
  DT_RESIST_COLOR:     "ResistSymbol.png",
  DT_POSITIVE_COLOR:   "PositiveSymbol.png",
  DT_NEGATIVE_COLOR:   "NegativeSymbol.png",
};

// Rend un texte en remplaçant les <DT_...> par une icône inline,
// en absorbant les espaces/retours autour pour éviter les sauts visuels.
function renderTextIcons(input){
  let s = String(input ?? "");

  /* ====== AJOUTER SOUS le bloc DT / renderTextIcons ====== */
// Normalise le texte avant rendu (enlève <br>, LINE_SEPARATOR, CRLF)
function normalizeForIcons(input) {
  return String(input ?? "")
    .replace(/\r\n|\r/g, "\n")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n")
    .replace(/\n{2,}/g, "\n");
}

  // normalise les séparateurs
  s = s.replace(/\r\n?|\r/g, "\n")
       .replace(/<\s*LINE_SEPARATOR\s*>/gi, "\n");

  // échappe tout le HTML (sécurité)
  s = s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // remplace les tokens (forme brute ou encodée), en “mangeant” le blanc autour
  s = s.replace(/\s*(?:&lt;|<)\s*(DT_[A-Z_]+)\s*(?:&gt;|>)\s*/g, (_, key) => {
    const file = DT_ICONS[key];
    if (!file) return "";
    const src = ICON_BASE + file;
    return `<img src="${src}" alt="" style="display:inline-block;width:1.05em;height:1.05em;vertical-align:-0.2em;margin:0 .25em;object-fit:contain;">`;
  });

  // compacte les espaces et pose les <br> pour les retours réels
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/\n/g, "<br>");
  return s.trim();
}

/* ================== Utils / état ================== */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const norm = (s) => String(s || "").trim();
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STATE = {
  list: [],
  filtered: [],
  page: 1,
  perPage: 24,
  q: "",
  sort: "name",
  types: new Set(),
  rarities: new Set(),
  apiByName: new Map(),
};

// Couleurs par rareté (pour puces / compteurs)
const RARITY_COLORS = {
  Legendary: "#d4af37",
  Rare: "#f39c12",
  Uncommon: "#58b3e2",
  Common: "#7dd3fc",
};

// ---- getters champs (compat LUA JSON)
const get = (obj, keys, def = "") => { for (const k of keys) if (obj && obj[k] != null) return obj[k]; return def; };
const getName     = (m) => get(m, ["name", "Name"], "");
const getType     = (m) => get(m, ["type", "Type"], "");
const getDesc     = (m) => get(m, ["description", "Description"], "");
const getCriteria = (m) => get(m, ["criteria", "Criteria"], "");
const getRarity   = (m) => get(m, ["rarity", "Rarity"], "");
const getImage    = (m) => get(m, ["image", "Image"], ""); // ex: ArcaneAcceleration.png
const getIcon     = (m) => get(m, ["icon", "Icon"], "");   // ex: ArcaneAcceleration64x.png

/* ================== API arcanes (pour thumbnails wiki) ================== */
async function loadApiArcanes() {
  try {
    const r = await fetch("https://api.warframestat.us/arcanes?language=en", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function mapByNameCaseInsensitive(list) {
  const m = new Map();
  for (const it of list) {
    const n = norm(it.name || it.Name || "");
    if (!n) continue;
    m.set(n.toLowerCase(), it);
  }
  return m;
}

/* ================== URLs images (wiki) ================== */
function wikiImageUrl(file) {
  if (!file) return "";
  return `https://wiki.warframe.com/images/${encodeURIComponent(file)}`;
}
function normalizeUrl(u) { return u && u.startsWith("//") ? "https:" + u : u || ""; }
function upscaleWikiThumb(url, size = 640) {
  if (!url) return "";
  let out = normalizeUrl(url);
  out = out.replace(/scale-to-width-down\/\d+/i, `scale-to-width-down/${size}`);
  if (!/scale-to-width-down\/\d+/i.test(out) && /\/latest/i.test(out)) {
    out = out.replace(/\/latest(\/?)(\?[^#]*)?$/i, (m, slash, qs = "") => `/latest${slash ? "" : "/"}scale-to-width-down/${size}${qs || ""}`);
  }
  return out;
}

/* ================== Placeholder pour icône manquante ================== */
function placeholderArcane(name, rarity) {
  const hex = RARITY_COLORS[rarity] || "#888";
  const initials = (name || "Arcane").split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase();
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
    <defs>
      <radialGradient id="g" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="#fff" stop-opacity=".18"/>
        <stop offset="100%" stop-color="${hex}"/>
      </radialGradient>
    </defs>
    <circle cx="120" cy="120" r="110" fill="url(#g)" stroke="rgba(0,0,0,.4)" stroke-width="4"/>
    <text x="50%" y="54%" text-anchor="middle" font-family="Inter,system-ui,Arial" font-size="68" fill="#111" opacity="0.85">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ================== Source d'image pour une carte ================== */
function imageSourcesForArcane(m, apiByName) {
  const name   = getName(m);
  const rarity = getRarity(m);
  const img    = getImage(m);
  const ico    = getIcon(m);

  const wikiImg = img ? wikiImageUrl(img) : "";
  const wikiIco = ico ? wikiImageUrl(ico) : "";

  const apiRec  = apiByName.get(name.toLowerCase());
  const apiTn   = apiRec ? (apiRec.wikiaThumbnail || apiRec.wikiathumbnail || apiRec.thumbnail || apiRec.image || "") : "";
  const apiBig  = upscaleWikiThumb(apiTn, 640);

  const primary = wikiImg || wikiIco || apiBig || placeholderArcane(name, rarity);
  const fallback = wikiIco || apiBig || placeholderArcane(name, rarity);

  return { primary, fallback };
}

/* ================== UI helpers ================== */
function rarityBadge(r) {
  const hex = RARITY_COLORS[r] || "rgba(255,255,255,.18)";
  return `<span class="badge" style="border-color:${hex};color:${hex}">${escapeHtml(r || "—")}</span>`;
}
function typeBadge(t) { return `<span class="badge">${escapeHtml(t || "—")}</span>`; }
function criteriaRow(c) {
  if (!c) return "";
  return `
    <div class="kv">
      <div class="k">TRIGGER</div>
      <div class="v">${renderTextIcons(normalizeForIcons(c))}</div>
    </div>`;
}

function cardArcane(m, apiByName) {
  const name = getName(m);
  const type = getType(m);
  const desc = getDesc(m);
  const crit = getCriteria(m);
  const rar  = getRarity(m);

  const { primary, fallback } = imageSourcesForArcane(m, apiByName);

  return `
    <div class="arcane-card orn">
      <div class="arcane-cover">
        <img src="${escapeHtml(primary)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async"
             onerror="this.onerror=null; this.src='${escapeHtml(fallback)}';">
      </div>
      <div class="arcane-body">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="title">${escapeHtml(name)}</div>
            <div class="meta">${type ? escapeHtml(type) : ""}</div>
          </div>
          <div class="shrink-0 flex items-center gap-2">
            ${rarityBadge(rar)}${type ? typeBadge(type) : ""}
          </div>
        </div>
        ${crit ? `<div class="mt-2">${criteriaRow(crit)}</div>` : ""}
        ${desc ? `<p class="desc mt-2">${renderTextIcons(normalizeForIcons(desc))}</p>` : "" }
      </div>
    </div>
  `;
}

/* ================== Filtres latéraux ================== */
function renderSideFilters(distinctTypes, distinctRarities) {
  // Types
  const hostT = $("#f-type");
  hostT.innerHTML = distinctTypes.map(t => {
    const id = `t-${t.replace(/\s+/g, "_")}`;
    const checked = STATE.types.has(t) ? "checked" : "";
    return `
      <label for="${id}" class="filter-pill cursor-pointer">
        <input id="${id}" type="checkbox" value="${escapeHtml(t)}" ${checked}>
        <span>${escapeHtml(t)}</span>
      </label>`;
  }).join("");

  distinctTypes.forEach(t => {
    const el = $(`#t-${t.replace(/\s+/g, "_")}`);
    el.addEventListener("change", () => {
      if (el.checked) STATE.types.add(t);
      else STATE.types.delete(t);
      STATE.page = 1; applyFilters();
    });
  });

  // Rareté
  const hostR = $("#f-rarity");
  hostR.innerHTML = distinctRarities.map(r => {
    const id = `r-${r}`;
    const checked = STATE.rarities.has(r) ? "checked" : "";
    const hex = RARITY_COLORS[r] || "rgba(255,255,255,.5)";
    return `
      <label for="${id}" class="filter-pill cursor-pointer" style="color:${hex};border-color:${hex}99">
        <input id="${id}" type="checkbox" value="${escapeHtml(r)}" ${checked}>
        <span>${escapeHtml(r)}</span>
      </label>`;
  }).join("");

  distinctRarities.forEach(r => {
    const el = $(`#r-${r}`);
    el.addEventListener("change", () => {
      if (el.checked) STATE.rarities.add(r);
      else STATE.rarities.delete(r);
      STATE.page = 1; applyFilters();
    });
  });
}

function renderActiveChips() {
  const wrap = $("#active-filters");
  const chips = [];
  if (STATE.q) chips.push({ k:"q", label:`Text: "${escapeHtml(STATE.q)}"` });
  if (STATE.types.size) chips.push({ k:"types", label:`Types: ${[...STATE.types].join(", ")}` });
  if (STATE.rarities.size) chips.push({ k:"rarities", label:`Rarity: ${[...STATE.rarities].join(", ")}` });

  wrap.innerHTML = chips.length
    ? chips.map((c,i)=>`<button class="badge gold" data-chip="${c.k}|${i}">${c.label} ✕</button>`).join("")
    : "";

  wrap.querySelectorAll("[data-chip]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const [k] = btn.dataset.chip.split("|");
      if (k==="q") { STATE.q=""; $("#q").value=""; }
      if (k==="types") { STATE.types.clear(); }
      if (k==="rarities") { STATE.rarities.clear(); }
      STATE.page = 1; applyFilters();
    });
  });
}

/* ================== Rendu + pagination ================== */
function render() {
  const total = STATE.filtered.length;
  const pages = Math.max(1, Math.ceil(total / STATE.perPage));
  STATE.page = Math.min(Math.max(1, STATE.page), pages);

  $("#pageinfo").textContent = `Page ${STATE.page} / ${pages}`;
  $("#prev").disabled = STATE.page <= 1;
  $("#next").disabled = STATE.page >= pages;
  $("#count").textContent = `${total} arcane(s)`;

  const start = (STATE.page - 1) * STATE.perPage;
  const slice = STATE.filtered.slice(start, start + STATE.perPage);

  const grid = $("#results");
  grid.className = "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  grid.innerHTML = slice.map(m => cardArcane(m, STATE.apiByName || new Map())).join("");
}

function applyFilters() {
  const q = STATE.q = norm($("#q").value).toLowerCase();
  const sort = STATE.sort = $("#sort").value;

  let arr = STATE.list.slice();

  if (STATE.types.size)    arr = arr.filter(m => STATE.types.has(getType(m)));
  if (STATE.rarities.size) arr = arr.filter(m => STATE.rarities.has(getRarity(m)));

  if (q) {
    arr = arr.filter((m) => {
      const hay = [
        getName(m), getType(m), getDesc(m), getCriteria(m), getRarity(m)
      ].map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  arr.sort((a, b) => {
    if (sort === "rarity") return getRarity(a).localeCompare(getRarity(b)) || getName(a).localeCompare(getName(b));
    return getName(a).localeCompare(getName(b));
  });

  STATE.filtered = arr;
  renderActiveChips();
  render();
}

/* ================== Données locales + API thumbnails ================== */
async function loadLocalArcanes() {
  try {
    const r = await fetch("data/arcanes_list.json", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

/* ================== Boot ================== */
(async function boot() {
  const status = $("#status");
  try {
    status.textContent = "Chargement des arcanes…";

    const [localList, apiList] = await Promise.all([loadLocalArcanes(), loadApiArcanes()]);
    STATE.list = localList;
    STATE.apiByName = mapByNameCaseInsensitive(apiList);

    const distinctTypes = Array.from(new Set(STATE.list.map(getType))).filter(Boolean).sort();
    const distinctRarities = ["Common","Uncommon","Rare","Legendary"].filter(r => STATE.list.some(m => getRarity(m) === r));

    renderSideFilters(distinctTypes, distinctRarities);

    $("#q").addEventListener("input", () => { STATE.page = 1; applyFilters(); });
    $("#sort").addEventListener("change", () => { STATE.page = 1; applyFilters(); });
    $("#reset").addEventListener("click", () => {
      STATE.q = ""; $("#q").value = "";
      STATE.sort = "name"; $("#sort").value = "name";
      STATE.types.clear(); STATE.rarities.clear();
      STATE.page = 1;
      renderSideFilters(distinctTypes, distinctRarities);
      applyFilters();
    });
    $("#prev").addEventListener("click", () => { STATE.page--; render(); });
    $("#next").addEventListener("click", () => { STATE.page++; render(); });

    applyFilters();
    status.textContent = `Arcanes chargés : ${STATE.list.length}`;
  } catch (e) {
    console.error("[arcanes] load error:", e);
    status.textContent = "Erreur de chargement des arcanes.";
    status.className = "mt-2 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
