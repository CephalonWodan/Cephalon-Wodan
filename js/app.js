console.log("app.js chargé");

/* =========================
   CONFIG
========================= */
const WF_URL = "https://api.warframestat.us/warframes";
const ABILITIES_URL = "data/abilities.json"; // place ton fichier ici

/* =========================
   Utils & normalisation
========================= */
const $ = (sel) => document.querySelector(sel);
const val = (x) => (x === null || x === undefined || x === '' ? '—' : String(x));
const byName = (a,b) => (a.name||'').localeCompare(b.name||'');

// index abilities par Warframe (avec variantes Prime/Umbra)
const ABX = { byFrame: {} };
const norm = (s) => String(s||"").trim();
const variantFallbacks = (name) => {
  if(!name) return [];
  const base = name.replace(/\s+Prime\b/i,"").trim();
  const list = [];
  if(name !== base) list.push(base);
  if(name === "Excalibur Umbra") list.push("Excalibur");
  return list;
};

// tri par SlotKey si présent
function sortBySlot(arr){ arr.sort((x,y)=> (x.SlotKey ?? 99) - (y.SlotKey ?? 99)); return arr; }

// Umbra : Radial Blind -> Radial Howl si disponible
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

// format coût robuste
function fmtCost(a){
  const costEnergy = a.Cost ?? a.EnergyCost ?? a.CostEnergy ?? a.energyCost;
  const costShield = a.CostShield ?? a.ShieldCost;
  const costTime   = a.CostTime ?? a.Duration ?? a.duration;
  if (costShield != null) return `${costShield} Bouclier`;
  if (costTime != null)   return `${costTime} Temps`;
  if (costEnergy != null) return `${costEnergy} Énergie`;
  return "—";
}
const cleanDesc = (s) => (s||"").replace(/\\r?\\n/g," ").replace(/<[^>]+>/g,"").trim();

/* =========================
   Rendu UI
========================= */
function stat(label, v){
  return `
    <div class="stat">
      <div class="label">${label}</div>
      <div class="value">${val(v)}</div>
    </div>`;
}

function renderCard(wf, abilityIndex=0){
  const root = $('#card');
  const abilities = wf.abilities || [];
  const a = abilities[abilityIndex] || {};

  const tabs = abilities.map((ab, i) =>
    `<button class="btn-tab ${i===abilityIndex?'active':''}" data-abi="${i}">${i+1}. ${ab.Name || ab.name || '—'}</button>`
  ).join(' ');

  const html = `
    <div class="flex flex-col md:flex-row gap-6">
      <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
        <div class="w-[220px] h-[220px] wf-img overflow-hidden flex items-center justify-center">
          ${wf.image ? `<img src="${wf.image}" alt="${wf.name}" class="w-full h-full object-contain">` : `<div class="muted">Aucune image</div>`}
        </div>
      </div>

      <div class="flex-1 flex flex-col gap-4">
        <div class="flex items-start gap-4">
          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-semibold">${wf.name}</h2>
            <p class="muted mt-2">${wf.description || ''}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          ${stat('HP', wf.stats.health)}
          ${stat('SHIELD', wf.stats.shield)}
          ${stat('ARMOR', wf.stats.armor)}
          ${stat('ENERGY', wf.stats.energy)}
          ${stat('SPRINT', wf.stats.sprintSpeed)}
        </div>

        <div class="mt-2">
          ${abilities.length ? `<div class="flex flex-wrap gap-2 mb-3">${tabs}</div>` : ''}

          <div class="card p-4">
            <div class="font-semibold">${a.Name || a.name || '—'}</div>
            <p class="muted mt-1">${cleanDesc(a.Description || a.description || '')}</p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div class="pill"><div class="k">Coût</div><div class="v">${fmtCost(a)}</div></div>
              <div class="pill"><div class="k">Puissance</div><div class="v">${val(a.Power || a.Strength || a.strength)}</div></div>
              <div class="pill"><div class="k">Durée</div><div class="v">${val(a.Duration || a.duration)}</div></div>
              <div class="pill"><div class="k">Portée</div><div class="v">${val(a.Range || a.range)}</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  root.innerHTML = html;
  root.querySelectorAll('[data-abi]').forEach(btn => {
    btn.addEventListener('click', () => renderCard(wf, parseInt(btn.dataset.abi, 10)));
  });
}

function renderPicker(list){
  const el = $('#picker');
  el.innerHTML = '';
  list.forEach((wf, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = wf.name;
    el.appendChild(opt);
  });
  el.value = '0';
}

/* =========================
   Pipeline de données
========================= */
function normalizeWF(rec){
  const img = rec.imageName ? `https://cdn.warframestat.us/img/${rec.imageName}` : null;
  return {
    name: rec.name || '',
    description: rec.description || '',
    image: img,
    stats: {
      health: rec.health ?? '—',
      shield: rec.shield ?? '—',
      armor: rec.armor ?? '—',
      energy: rec.power ?? rec.energy ?? '—',
      sprintSpeed: rec.sprintSpeed ?? '—',
    },
    abilities: getAbilitiesFor(rec.name),
  };
}

let ALL = [];
let FILTERED = [];

async function loadAll(){
  const status = $('#status');
  try{
    status.textContent = 'Chargement des Warframes…';

    const [warframes, abiRaw] = await Promise.all([
      fetch(WF_URL).then(r=>r.json()),
      // cache-buster pour éviter GitHub Pages cache agressif
      fetch(`${ABILITIES_URL}?v=1`).then(r=>r.json()).catch(()=>[])
    ]);

    // index abilities
    ABX.byFrame = (Array.isArray(abiRaw) ? abiRaw : []).reduce((acc, a) => {
      const key = norm(a.Powersuit || a.Warframe || a.Frame || a.name);
      if (!key) return acc;
      (acc[key] ??= []).push(a);
      return acc;
    }, {});
    for (const k in ABX.byFrame) sortBySlot(ABX.byFrame[k]);

    // warframes (sans archwing/necramech)
    ALL = warframes
      .filter(wf => wf.type === 'Warframe' && !['Bonewidow','Voidrig'].includes(wf.name))
      .map(normalizeWF)
      .sort(byName);

    FILTERED = ALL.slice();

    status.textContent = `Dataset chargé: ${ALL.length} Warframes`;
    renderPicker(FILTERED);
    if(FILTERED.length) renderCard(FILTERED[0], 0);

    // picker & search
    $('#picker').addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      if (FILTERED[idx]) renderCard(FILTERED[idx], 0);
    });

    $('#search').addEventListener('input', () => {
      const q = ($('#search').value || '').trim().toLowerCase();
      FILTERED = !q ? ALL : ALL.filter(x => x.name.toLowerCase().includes(q));
      renderPicker(FILTERED);
      if(FILTERED.length) renderCard(FILTERED[0], 0);
      status.textContent = `Affichage: ${FILTERED.length} résultat(s)`;
    });

  }catch(e){
    console.error(e);
    status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
    status.style.background = "rgba(255,86,86,.08)";
    status.style.color = "#ffd9d9";
    status.textContent = "Erreur de chargement.";
  }
}

loadAll();
