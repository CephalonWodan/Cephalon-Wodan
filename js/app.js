"use strict";

/* =========================
   CONFIG
========================= */
const WF_URL = "https://api.warframestat.us/warframes";
const ABILITIES_URL = "./data/warframe_abilities.json";

/* =========================
   Utils & normalisation
========================= */
const val = (x) => (x === null || x === undefined || x === '' ? '—' : String(x));
const byName = (a,b) => (a.name||'').localeCompare(b.name||'');

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
function sortBySlot(arr){ arr.sort((x,y)=> (x.SlotKey ?? 99) - (y.SlotKey ?? 99)); return arr; }

/* =========================
   Extraction Puissance / Durée / Portée
========================= */
const toLowerMap = (o) => {
  const m = {}; for(const [k,v] of Object.entries(o||{})) m[k.toLowerCase()] = v; return m;
};
const firstProp = (m, names) => {
  for (const n of names){ const v = m[n.toLowerCase()]; if (v !== undefined && v !== null) return v; }
  return undefined;
};
const asText = (v, unit="") => {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const nums = v.map(Number).filter(n=>!Number.isNaN(n));
    if (nums.length) {
      const min = Math.min(...nums), max = Math.max(...nums);
      return (min===max ? `${min}${unit}` : `${min}–${max}${unit}`);
    }
    return String(v.join(" / "));
  }
  if (typeof v === "number") return `${v}${unit}`;
  const s = String(v).trim();
  if (!unit || /[%sm]/i.test(s)) return s;
  return `${s}${unit}`;
};

function parseFromText(desc){
  const out = {};
  const t = String(desc||"");
  const mPct = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (mPct) out.strength = `${mPct[1]}%`;
  const mDur = t.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|second(?:e|es)?)/i);
  if (mDur) out.duration = `${mDur[1]}s`;
  const mRange = t.match(/(\d+(?:\.\d+)?)\s*(?:m|mètre|mètres|meter|meters)\b/i);
  if (mRange) out.range = `${mRange[1]}m`;
  if (!out.strength){
    const mDmg = t.match(/(\d+(?:\.\d+)?)\s*(?:dégâts|damage)/i);
    if (mDmg) out.strength = `${mDmg[1]} dégâts`;
  }
  return out;
}

function buildMetrics(ability){
  const m = toLowerMap(ability||{});
  const costEnergy = firstProp(m, ["cost","energycost","costenergy","energy"]);
  const costShield = firstProp(m, ["costshield","shieldcost"]);
  const costTime   = firstProp(m, ["costtime","duration","time"]);
  let cost = "—";
  if (costShield != null) cost = asText(costShield, " Bouclier");
  else if (costTime != null) cost = asText(costTime, "s");
  else if (costEnergy != null) cost = asText(costEnergy, " Énergie");

  let strength = firstProp(m, ["strength","power","damage","dégâts","amount","value","heal","healing","multiplier","chance"]);
  let duration = firstProp(m, ["duration","durée","time","seconds","timeduration"]);
  let range    = firstProp(m, ["range","radius","rayon","distance","reach","aoeradius"]);

  const sTxt = asText(strength, typeof strength==="number" ? "" : "");
  const dTxt = asText(duration, typeof duration==="number" ? "s" : "");
  const rTxt = asText(range,    typeof range==="number"    ? "m" : "");

  const fromDesc = parseFromText(ability.Description || ability.description);

  return {
    cost,
    strength: sTxt || fromDesc.strength || "—",
    duration: dTxt || fromDesc.duration || "—",
    range:    rTxt || fromDesc.range    || "—",
  };
}

/* =========================
   Rendu UI
========================= */
function stat(label, v){
  return `
    <div class="stat">
      <div class="text-[10px] uppercase tracking-wide text-white/70">${label}</div>
      <div class="text-lg font-semibold">${val(v)}</div>
    </div>`;
}

function renderCard(wf, abilityIndex=0){
  const root = document.getElementById('card');
  const abilities = wf.abilities || [];
  const a = abilities[abilityIndex] || {};
  const metrics = buildMetrics(a);

  const tabs = abilities.map((ab, i) =>
    `<button class="btn-tab ${i===abilityIndex?'active':''}" data-abi="${i}">${i+1}. ${ab.Name || ab.name || '—'}</button>`
  ).join(' ');

  const html = `
    <div class="flex flex-col md:flex-row gap-6">
      <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
        <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
          ${wf.image ? `<img src="${wf.image}" alt="${wf.name}" class="w-full h-full object-contain">` : `<div class="muted">Aucune image</div>`}
        </div>
      </div>

      <div class="flex-1 flex flex-col gap-4">
        <div class="flex items-start gap-4">
          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-semibold">${wf.name}</h2>
            <p class="mt-2 muted">${wf.description || ''}</p>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-3">
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
            <p class="mt-1">${String(a.Description || a.description || '').replace(/\r?\n/g,' ').trim()}</p>

            <div class="grid grid-cols-4 gap-3 mt-4">
              <div class="pill">
                <div class="text-[10px] uppercase tracking-wide text-white/70">Coût</div>
                <div class="mt-1 font-medium">${metrics.cost}</div>
              </div>
              <div class="pill">
                <div class="text-[10px] uppercase tracking-wide text-white/70">Puissance</div>
                <div class="mt-1 font-medium">${metrics.strength}</div>
              </div>
              <div class="pill">
                <div class="text-[10px] uppercase tracking-wide text-white/70">Durée</div>
                <div class="mt-1 font-medium">${metrics.duration}</div>
              </div>
              <div class="pill">
                <div class="text-[10px] uppercase tracking-wide text-white/70">Portée</div>
                <div class="mt-1 font-medium">${metrics.range}</div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <span class="chip">Affecté par <strong>&nbsp;Force</strong></span>
              <span class="chip">Affecté par <strong>&nbsp;Durée</strong></span>
              <span class="chip">Affecté par <strong>&nbsp;Portée</strong></span>
              <span class="chip">Coût → <strong>&nbsp;Efficacité</strong></span>
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
  const el = document.getElementById('picker');
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
  return (list || []).slice().sort((x,y)=> (x.SlotKey ?? 99) - (y.SlotKey ?? 99));
}

async function loadAll(){
  const status = document.getElementById('status');
  try{
    status.textContent = 'Chargement des Warframes…';
    const [warframes, abiRaw] = await Promise.all([
      fetch(WF_URL).then(r=>r.json()),
      fetch(ABILITIES_URL).then(r=>r.json()).catch(()=>[])
    ]);

    // index abilities
    ABX.byFrame = (Array.isArray(abiRaw) ? abiRaw : []).reduce((acc, a) => {
      const key = norm(a.Powersuit || a.Warframe || a.Frame || a.name);
      if (!key) return acc;
      (acc[key] ??= []).push(a);
      return acc;
    }, {});
    for (const k in ABX.byFrame) sortBySlot(ABX.byFrame[k]);

    const list = warframes
      .filter(wf => wf.type === 'Warframe' && !['Bonewidow','Voidrig'].includes(wf.name))
      .map(normalizeWF)
      .sort(byName);

    window.__WF_LIST = list;

    status.textContent = `Dataset chargé: ${list.length} Warframes`;
    renderPicker(list);
    if(list.length) renderCard(list[0], 0);

    document.getElementById('picker').addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      const q = (document.getElementById('search').value || '').trim().toLowerCase();
      const filtered = !q ? list : list.filter(x => x.name.toLowerCase().includes(q));
      renderCard(filtered[idx], 0);
    });
    document.getElementById('search').addEventListener('input', () => {
      const q = (document.getElementById('search').value || '').trim().toLowerCase();
      const filtered = !q ? list : list.filter(x => x.name.toLowerCase().includes(q));
      renderPicker(filtered);
      if(filtered.length) renderCard(filtered[0], 0);
      status.textContent = `Affichage: ${filtered.length} résultat(s)`;
    });

  }catch(e){
    console.error(e);
    status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
    status.style.background = "rgba(255,0,0,.08)";
    status.style.color = "#ffd2d2";
    status.textContent = "Erreur de chargement.";
  }
}

loadAll();
