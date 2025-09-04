// js/arcanes_catalog.js
// Catalogue Arcanes — illustre chaque arcane (local -> wiki -> placeholder)

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const norm = (s) => String(s || "").trim();
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// --- Préférences d’affichage
const STATE = {
  list: [],
  filtered: [],
  page: 1,
  perPage: 24,
  q: "",
  sort: "name",
};

// Emplacement pour d’éventuelles images locales (optionnel, tu peux les ajouter plus tard)
const LOCAL_DIR = new URL("img/arcanes/", document.baseURI).href;

// Couleurs par rareté (pour le placeholder et les puces)
const RARITY_COLORS = {
  Legendary: "#d4af37",
  Rare: "#f39c12",
  Uncommon: "#58b3e2",
  Common: "#7dd3fc",
};

// -------- Helpers d’accès de champs (le JSON peut être en CamelCase ou lower-case)
const get = (obj, keys, def = "") => {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return def;
};
const getName        = (m) => get(m, ["name", "Name"], "");
const getType        = (m) => get(m, ["type", "Type"], "");
const getDesc        = (m) => get(m, ["description", "Description"], "");
const getCriteria    = (m) => get(m, ["criteria", "Criteria"], "");
const getRarity      = (m) => get(m, ["rarity", "Rarity"], "");
const getImageFile   = (m) => get(m, ["image", "Image"], "");      // ex: ArcaneAcceleration.png
const getIconFile    = (m) => get(m, ["icon", "Icon"], "");        // ex: ArcaneAcceleration64x.png
const getWikiThumb   = (m) => get(m, ["wikiaThumbnail", "wikiathumbnail", "wikia_thumbnail", "thumbnail"], "");

// -------- Normalisation d’URL wiki (et upscale)
function normalizeUrl(u) {
  if (!u) return "";
  return u.startsWith("//") ? "https:" + u : u;
}
function upscaleWikiThumb(url, size = 512) {
  if (!url) return "";
  let out = normalizeUrl(url);
  out = out.replace(/scale-to-width-down\/\d+/i, `scale-to-width-down/${size}`);
  if (!/scale-to-width-down\/\d+/i.test(out) && /\/latest/i.test(out)) {
    out = out.replace(/\/latest(\/?)(\?[^#]*)?$/i, (m, slash, qs = "") => `/latest${slash ? "" : "/"}scale-to-width-down/${size}${qs || ""}`);
  }
  return out;
}

// -------- Placeholder SVG si aucune image n’est trouvée
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

// -------- Construction des sources d’image pour un arcane
// Priorité: 1) local (Image puis Icon)  2) wiki thumbnail upscalé  3) placeholder
function imageSourcesForArcane(m, apiByName) {
  const name = getName(m);
  const rarity = getRarity(m);
  const localImage = getImageFile(m);
  const localIcon  = getIconFile(m);

  const local1 = localImage ? (LOCAL_DIR + localImage) : "";
  const local2 = localIcon  ? (LOCAL_DIR + localIcon)  : "";

  // Enrichissement via l’API /arcanes : wikiaThumbnail + fallback
  const apiRec = apiByName.get(name.toLowerCase());
  const apiThumb = apiRec ? (apiRec.wikiaThumbnail || apiRec.wikiathumbnail || apiRec.thumbnail || apiRec.image || "") : "";

  const wiki = upscaleWikiThumb(getWikiThumb(m) || apiThumb, 640);

  const primary = local1 || local2 || wiki || placeholderArcane(name, rarity);
  const fallback = local2 || wiki || placeholderArcane(name, rarity);

  return { primary, fallback };
}

// -------- Carte UI
function rarityBadge(r) {
  const hex = RARITY_COLORS[r] || "rgba(255,255,255,.18)";
  return `<span class="badge" style="border-color:${hex};color:${hex}">${escapeHtml(r || "—")}</span>`;
}
function typeBadge(t) {
  return `<span class="badge">${escapeHtml(t || "—")}</span>`;
}
function criteriaRow(c) {
  if (!c) return "";
  return `<div class="kv"><div class="k">Trigger</div><div class="v">${escapeHtml(c)}</div></div>`;
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
            <div class="title truncate">${escapeHtml(name)}</div>
            <div class="meta">${type ? escapeHtml(type) : ""}</div>
          </div>
          <div class="shrink-0 flex items-center gap-2">
            ${rarityBadge(rar)}${type ? typeBadge(type) : ""}
          </div>
        </div>
        ${crit ? `<div class="mt-2">${criteriaRow(crit)}</div>` : ""}
        ${desc ? `<p class="desc mt-2">${escapeHtml(desc)}</p>` : ""}
      </div>
    </div>
  `;
}

// -------- Rendu + pagination minimaliste
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
  STATE.page = 1;
  render();
}

// -------- Chargement des données (local JSON + API pour thumbs wiki)
async function loadLocalArcanes() {
  try {
    const r = await fetch("data/arcanes_list.json", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    // data attendu: tableau d’objets
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
async function loadApiArcanes() {
  try {
    const r = await fetch("https://api.warframestat.us/arcanes?language=en", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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

// -------- Boot
(async function boot() {
  const status = $("#status");
  try {
    status.textContent = "Chargement des arcanes…";

    const [localList, apiList] = await Promise.all([loadLocalArcanes(), loadApiArcanes()]);
    STATE.list = localList;
    STATE.apiByName = mapByNameCaseInsensitive(apiList);

    // UI
    $("#q").addEventListener("input", applyFilters);
    $("#sort").addEventListener("change", applyFilters);
    $("#prev").addEventListener("click", () => { STATE.page--; render(); });
    $("#next").addEventListener("click", () => { STATE.page++; render(); });

    // Init contrôles
    $("#q").value = "";
    $("#sort").value = "name";

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
