// js/mods_catalog.js
// Catalogue complet des Mods depuis l'API WFCD : https://api.warframestat.us/mods/?language=fr

const API = "https://api.warframestat.us/mods/?language=fr";
const CDN = (img) => img ? `https://cdn.warframestat.us/img/${img}` : null;

const state = {
  all: [],
  filtered: [],
  page: 1,
  perPage: 48
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const norm = (s) => String(s || "").trim();
const txt  = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

function getQueryParam(name, def="") {
  const u = new URL(location.href);
  return u.searchParams.get(name) || def;
}

// ---------- Détection de catégories ----------
function isAura(m) {
  const t = m.type || "";
  const u = m.uniqueName || "";
  return /aura/i.test(t) || /\/Mods\/Auras?\//i.test(u);
}
function isWarframe(m) {
  const t = m.type || "";
  const u = m.uniqueName || "";
  return /warframe/i.test(t) || /\/Mods\/Warframe\//i.test(u);
}
function isWeaponType(m, kind) {
  const t = (m.type || "").toLowerCase();
  return t.includes(kind); // "primary", "secondary", "melee"
}
function isCompanion(m) {
  const t = (m.type || "").toLowerCase();
  return t.includes("companion") || t.includes("sentinel");
}
function isArchwing(m) {
  const u = (m.uniqueName || "").toLowerCase();
  return u.includes("/archwing/");
}
function isNecramech(m) {
  const u = (m.uniqueName || "").toLowerCase();
  return u.includes("/mech/") || u.includes("/necramech/");
}
function isExilus(m) {
  if (m.isUtility === true) return true;
  if (Array.isArray(m.tags) && m.tags.some(x => /exilus/i.test(x))) return true;
  if (/exilus/i.test(m.description || "")) return true;
  return false;
}
function isAugment(m) {
  const desc = m.description || "";
  const compat = m.compatName || "";
  return /augment/i.test(desc) || (!!compat && /augment/i.test(desc || "") || /augment/i.test(m.name || ""));
}

function categoryOf(m){
  if (isAura(m)) return "Aura";
  if (isWarframe(m) && isAugment(m)) return "WarframeAugment";
  if (isWarframe(m) && isExilus(m))  return "WarframeExilus";
  if (isWarframe(m))                 return "Warframe";
  if (isWeaponType(m, "primary"))    return "Primary";
  if (isWeaponType(m, "secondary"))  return "Secondary";
  if (isWeaponType(m, "melee"))      return "Melee";
  if (isCompanion(m))                return "Companion";
  if (isArchwing(m))                 return "Archwing";
  if (isNecramech(m))                return "Necramech";
  return "Other";
}

// ---------- UI helpers ----------
function chip(text) {
  return `<span class="chip orn" style="border-color:#D4AF37;color:#D4AF37;background:rgba(212,175,55,.06)">${text}</span>`;
}
function rarityOrder(r) {
  switch ((r||"").toLowerCase()) {
    case "common": return 1;
    case "uncommon": return 2;
    case "rare": return 3;
    case "legendary": return 4;
    default: return 99;
  }
}
function polarityOrder(p) {
  const map = { Madurai:1, Vazarin:2, Naramon:3, Zenurik:4, Unairu:5, Penjaga:6 };
  return map[p] || 99;
}

// Une carte "mod"
function modCard(m) {
  const name = m.name || "Mod";
  const img  = CDN(m.imageName);
  const rar  = m.rarity ? `<span class="muted">${m.rarity}</span>` : "";
  const pol  = m.polarity ? chip(m.polarity) : "";
  const rank = (m.fusionLimit != null) ? `<span class="muted">R${m.fusionLimit}</span>` : "";
  const compat = m.compatName ? chip(m.compatName) : "";
  const cat = categoryOf(m);
  const catLabel = {
    Aura: "Aura",
    WarframeAugment: "Warframe (Augment)",
    WarframeExilus: "Warframe (Exilus)",
    Warframe: "Warframe",
    Primary: "Primaire",
    Secondary: "Secondaire",
    Melee: "Mêlée",
    Companion: "Compagnon",
    Archwing: "Archwing",
    Necramech: "Necramech",
    Other: "Autre"
  }[cat];

  return `
    <div class="rounded-2xl border border-[rgba(255,255,255,.08)] bg-[var(--panel-2)] p-3 flex gap-3">
      <div class="w-[64px] h-[64px] rounded-lg bg-[rgba(255,255,255,.04)] border border-[rgba(255,255,255,.06)] flex items-center justify-center shrink-0 overflow-hidden">
        ${ img ? `<img src="${img}" alt="${name}" class="w-full h-full object-contain">`
               : `<div class="text-xs muted text-center px-1">Pas<br> d’icône</div>` }
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-semibold truncate">${name}</div>
            <div class="text-xs muted">${catLabel}${m.type ? ` • ${m.type}` : ""}</div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${compat}
            ${pol}
            ${rar}
            ${rank}
          </div>
        </div>
        ${ m.description ? `<div class="text-sm text-[var(--muted)] mt-1">${m.description}</div>` : "" }
      </div>
    </div>
  `;
}

// ---------- Rendu principal ----------
function applyFilters() {
  const q   = norm($("#q").value).toLowerCase();
  const cat = $("#cat").value;
  const pol = $("#pol").value;
  const rar = $("#rar").value;
  const sort= $("#sort").value;

  let arr = state.all.slice();

  // filtre catégorie
  if (cat) {
    arr = arr.filter(m => categoryOf(m) === cat);
  }
  // filtre polarité
  if (pol) {
    arr = arr.filter(m => (m.polarity||"") === pol);
  }
  // filtre rareté
  if (rar) {
    arr = arr.filter(m => (m.rarity||"") === rar);
  }
  // recherche texte
  if (q) {
    arr = arr.filter(m => {
      const hay = [
        m.name, m.description, m.type, m.compatName, m.uniqueName
      ].map(norm).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  // tri
  arr.sort((a,b) => {
    if (sort === "rarity") {
      return rarityOrder(a.rarity) - rarityOrder(b.rarity) || (a.name||"").localeCompare(b.name||"");
    } else if (sort === "polarity") {
      return polarityOrder(a.polarity) - polarityOrder(b.polarity) || (a.name||"").localeCompare(b.name||"");
    } else if (sort === "drain") {
      return (a.fusionLimit ?? 0) - (b.fusionLimit ?? 0) || (a.name||"").localeCompare(b.name||"");
    } else if (sort === "compat") {
      return (a.compatName||"").localeCompare(b.compatName||"") || (a.name||"").localeCompare(b.name||"");
    }
    // default: name
    return (a.name||"").localeCompare(b.name||"");
  });

  state.filtered = arr;
  state.page = 1;
  renderPage();
}

function renderPage() {
  const res = $("#results");
  const pageinfo = $("#pageinfo");
  const total = state.filtered.length;
  const pages = Math.max(1, Math.ceil(total / state.perPage));
  state.page = Math.min(Math.max(1, state.page), pages);

  // grille responsive
  res.className = "grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  const start = (state.page - 1) * state.perPage;
  const slice = state.filtered.slice(start, start + state.perPage);

  if (!total) {
    res.innerHTML = `<div class="muted">Aucun mod ne correspond aux filtres.</div>`;
  } else {
    res.innerHTML = slice.map(modCard).join("");
  }

  $("#prev").disabled = (state.page <= 1);
  $("#next").disabled = (state.page >= pages);
  pageinfo.textContent = `Page ${state.page} / ${pages} — ${total} mod(s)`;
}

// ---------- Boot ----------
(async function boot(){
  const status = $("#status");
  try {
    // Pré-remplir la recherche à partir de ?q= dans l’URL (optionnel)
    $("#q").value = getQueryParam("q", "");

    const mods = await fetch(API).then(r => r.json());
    state.all = Array.isArray(mods) ? mods : [];
    status.textContent = `Mods chargés : ${state.all.length}`;

    // listeners
    ["q","cat","pol","rar","sort"].forEach(id => {
      $( "#" + id ).addEventListener("input", applyFilters);
      $( "#" + id ).addEventListener("change", applyFilters);
    });

    $("#prev").addEventListener("click", () => { state.page--; renderPage(); });
    $("#next").addEventListener("click", () => { state.page++; renderPage(); });

    // 1er rendu
    applyFilters();
  } catch (e) {
    console.error(e);
    status.textContent = "Erreur de chargement des mods.";
    status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd1d1";
  }
})();
