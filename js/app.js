/* ===================================================================
   app.js — Aperçu Warframes (theme "orokin")
   - Charge les Warframes (api.warframestat.us)
   - Charge /data/abilities.json (export de ton parser LUA)
   - Map robuste des champs pour Coût / Puissance / Durée / Portée
   - Variantes: Prime -> base ; Umbra -> remplace Radial Blind par Howl
   =================================================================== */

console.log("app.js chargé");

/* =========================
   CONFIG
========================= */
const WF_URL = "https://api.warframestat.us/warframes";
const ABILITIES_URL = "data/abilities.json?v=3";   // mets à jour le v=… si tu changes le fichier

/* =========================
   Helpers
========================= */
const val = (x) => (x === null || x === undefined || x === "" ? "—" : String(x));
const byName = (a,b) => (a.name||"").localeCompare(b.name||"");
const norm = (s) => String(s || "").trim();
const cleanDesc = (s) => (s || "").replace(/\r?\n/g, " ").replace(/<[^>]+>/g, "").trim();

// petite aide: essaye une liste de clés jusqu'à en trouver une non-vide
function firstKey(o, keys) {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/* =========================
   Abilities index + variantes
========================= */
const ABX = { byFrame: {} };

function variantFallbacks(name){
  if (!name) return [];
  const base = name.replace(/\s+Prime\b/i, "").trim();
  const list = [];
  if (name !== base) list.push(base);
  if (name === "Excalibur Umbra") list.push("Excalibur");
  return list;
}
function sortBySlot(arr){ arr.sort((x,y)=> (x.SlotKey ?? 99) - (y.SlotKey ?? 99)); return arr; }

function massageUmbra(list){
  if (!Array.isArray(list)) list = [];
  const base = ABX.byFrame["Excalibur"] || [];
  if (!base.length) return list;
  const merged = base.map(a => ({...a}));
  const umbraList = ABX.byFrame["Excalibur Umbra"] || [];
  const howl = umbraList.find(x=>/Howl/i.test(x.Name || x.name));
  if (howl) {
    const i = merged.findIndex(x=>/Radial\s*Blind/i.test(x.Name || x.name));
    if (i>=0) merged[i] = {...howl, SlotKey: merged[i].SlotKey ?? howl.SlotKey};
  }
  return merged;
}

function getAbilitiesFor(frameName){
  const key = norm(frameName);
  let list = ABX.byFrame[key];
  if (!list || !list.length){
    for (const alt of variantFallbacks(key)){
      if (ABX.byFrame[alt]?.length){ list = ABX.byFrame[alt]; break; }
    }
  }
  if (key === "Excalibur Umbra") list = massageUmbra(list);
  return (list || []).slice();
}

/* =========================
   Extraction valeurs de base
========================= */
// Coût: essaie Energie / Bouclier / Temps
function fmtCost(a){
  const energy = firstKey(a, ["Cost","EnergyCost","CostEnergy","energyCost"]);
  const shield = firstKey(a, ["CostShield","ShieldCost"]);
  const time   = firstKey(a, ["CostTime","DurationCost"]);
  if (shield != null) return `${shield} Bouclier`;
  if (time   != null) return `${time} Temps`;
  if (energy != null) return `${energy} Énergie`;
  return "—";
}
// Puissance / Durée / Portée (clés tolérantes)
function baseStrength(a){
  const v = firstKey(a, ["Strength","Power","Damage","BaseStrength","BasePower","BaseDamage"]);
  return val(v);
}
function baseDuration(a){
  const v = firstKey(a, ["BaseDuration","Duration","Time"]);
  return val(v);
}
function baseRange(a){
  const v = firstKey(a, [
    "BaseRange","Range","Radius","Distance","Length","ConeRange","BeamRange","ExplosionRadius"
  ]);
  return val(v);
}

/* =========================
   Chargement abilities.json
========================= */
async function loadAbilities(url){
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch abilities: ${res.status}`);
  let data = await res.json();

  // si le fichier a une racine { abilities: [...] }
  if (!Array.isArray(data)) {
    if (Array.isArray(data.abilities)) data = data.abilities;
    else if (Array.isArray(data.items)) data = data.items;
    else data = [];
  }

  ABX.byFrame = data.reduce((acc, a) => {
    // accepte plusieurs alias: Powersuit | Warframe | Frame | name
    const key = norm(a.Powersuit || a.Warframe || a.Frame || a.name);
    if (!key) return acc;
    (acc[key] ??= []).push(a);
    return acc;
  }, {});
  for (const k in ABX.byFrame) sortBySlot(ABX.byFrame[k]);

  console.log("[abilities] frames indexées:", Object.keys(ABX.byFrame).length);
}

/* =========================
   Rendu UI
========================= */
function stat(label, v){
  return `
    <div class="stat">
      <div class="text-[10px] uppercase tracking-wide text-slate-400">${label}</div>
      <div class="text-lg font-semibold">${val(v)}</div>
    </div>`;
}

function renderCard(wf, abilityIndex=0){
  const root = document.getElementById("card");
  const abilities = wf.abilities || [];
  const a = abilities[abilityIndex] || {};

  const tabs = abilities.map((ab, i) =>
    `<button class="btn-tab ${i===abilityIndex?'active':''}" data-abi="${i}">
       ${i+1}. ${ab.Name || ab.name || "—"}
     </button>`
  ).join(" ");

  const pills = `
    <div class="pill">
      <div class="text-[10px] uppercase tracking-wide muted">Coût</div>
      <div class="mt-1 font-medium">${fmtCost(a)}</div>
    </div>
    <div class="pill">
      <div class="text-[10px] uppercase tracking-wide muted">Puissance</div>
      <div class="mt-1 font-medium">${baseStrength(a)}</div>
    </div>
    <div class="pill">
      <div class="text-[10px] uppercase tracking-wide muted">Durée</div>
      <div class="mt-1 font-medium">${baseDuration(a)}</div>
    </div>
    <div class="pill">
      <div class="text-[10px] uppercase tracking-wide muted">Portée</div>
      <div class="mt-1 font-medium">${baseRange(a)}</div>
    </div>
  `;

  const html = `
    <div class="flex flex-col md:flex-row gap-6">
      <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
        <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-slate-900/40 border border-[rgba(255,215,0,.25)] flex items-center justify-center orn">
          ${wf.image ? `<img src="${wf.image}" alt="${wf.name}" class="w-full h-full object-contain">` : `<div class="muted">Aucune image</div>`}
        </div>
      </div>

      <div class="flex-1 flex flex-col gap-4">
        <div class="flex items-start gap-4">
          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-semibold">${wf.name}</h2>
            <p class="text-slate-300 mt-2">${wf.description || ""}</p>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-3">
          ${stat("HP", wf.stats.health)}
          ${stat("SHIELD", wf.stats.shield)}
          ${stat("ARMOR", wf.stats.armor)}
          ${stat("ENERGY", wf.stats.energy)}
          ${stat("SPRINT", wf.stats.sprintSpeed)}
        </div>

        <div class="mt-2">
          ${abilities.length ? `<div class="flex flex-wrap gap-2 mb-3">${tabs}</div>` : ""}

          <div class="card p-4">
            <div class="font-semibold">${a.Name || a.name || "—"}</div>
            <p class="text-slate-300 mt-1">${cleanDesc(a.Description || a.description || "")}</p>

            <div class="grid grid-cols-4 gap-3 mt-4">
              ${pills}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  root.innerHTML = html;
  root.querySelectorAll("[data-abi]").forEach(btn => {
    btn.addEventListener("click", () => renderCard(wf, parseInt(btn.dataset.abi, 10)));
  });
}

function renderPicker(list){
  const el = document.getElementById("picker");
  el.innerHTML = "";
  list.forEach((wf, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = wf.name;
    el.appendChild(opt);
  });
  if (list.length) el.value = "0";
}

/* =========================
   Pipeline de données
========================= */
function normalizeWF(rec){
  const img = rec.imageName ? `https://cdn.warframestat.us/img/${rec.imageName}` : null;
  return {
    name: rec.name || "",
    description: rec.description || "",
    image: img,
    stats: {
      health: rec.health ?? "—",
      shield: rec.shield ?? "—",
      armor: rec.armor ?? "—",
      energy: rec.power ?? rec.energy ?? "—",
      sprintSpeed: rec.sprintSpeed ?? "—",
    },
    abilities: getAbilitiesFor(rec.name),
  };
}

let ALL = [];
let FILTERED = [];

async function loadAll(){
  const status = document.getElementById("status");
  try{
    status.textContent = "Chargement des pouvoirs…";
    await loadAbilities(ABILITIES_URL);

    status.textContent = "Chargement des Warframes…";
    const warframes = await fetch(WF_URL, { cache: "no-store" }).then(r=>r.json());

    const list = warframes
      .filter(wf => wf.type === "Warframe" && !["Bonewidow","Voidrig"].includes(wf.name))
      .map(normalizeWF)
      .sort(byName);

    ALL = list;
    FILTERED = list.slice();

    status.textContent = `Dataset chargé: ${FILTERED.length} Warframes`;
    renderPicker(FILTERED);
    if(FILTERED.length) renderCard(FILTERED[0], 0);

    // événements
    document.getElementById("picker").addEventListener("change", (e) => {
      const idx = parseInt(e.target.value, 10);
      if (FILTERED[idx]) renderCard(FILTERED[idx], 0);
    });

    document.getElementById("search").addEventListener("input", () => {
      const q = (document.getElementById("search").value || "").trim().toLowerCase();
      FILTERED = !q ? ALL : ALL.filter(x => x.name.toLowerCase().includes(q));
      renderPicker(FILTERED);
      if(FILTERED.length) renderCard(FILTERED[0], 0);
      status.textContent = `Affichage: ${FILTERED.length} résultat(s)`;
    });

  }catch(e){
    console.error(e);
    status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
    status.style.color = "#ffb4b4";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.border = "1px solid rgba(255,0,0,.25)";
    status.textContent = "Erreur de chargement.";
  }
}

loadAll();
