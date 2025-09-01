// js/app.js — version 'fallback-details-1'

console.log("app.js chargé");

// ===============================
//  Config (URLs)
// ===============================
const WF_URL = window.WF_URL || "https://api.warframestat.us/warframes";
const ABILITIES_URL = window.ABILITIES_URL || "data/abilities.json?v=3";
const MAP_URL = "data/abilities_by_warframe.json";
const WFA_URL = "data/warframe_abilities.json";

// ===============================
//  Helpers
// ===============================
const val = (x) => (x === null || x === undefined || x === '' ? '—' : String(x));
const byName = (a,b) => (a.name||'').localeCompare(b.name||'');

const norm = (s) => String(s||"").trim();
const stripPrime = (name) => name.replace(/\s+Prime\b/i,"").trim();
const variants = (name) => {
  const base = stripPrime(name);
  const list = [name];
  if (name !== base) list.push(base);
  if (name === "Excalibur Umbra") list.push("Excalibur");
  return list;
};

// ===== Abilities lookups =====
const ABL = {
  rowsByPath: new Map(),     // exact path -> rows[]
  rowsByBasename: new Map(), // last segment -> rows[]
  byFrameName: new Map(),    // frame -> [{ name, slot, internal, rows? }]
};

function basename(p){
  const m = String(p||'').split('/');
  return m[m.length-1] || '';
}

// try to find rows[] from an internal name/path
function findRowsForInternal(internal){
  if (!internal) return null;
  if (ABL.rowsByPath.has(internal)) return ABL.rowsByPath.get(internal);

  const base = basename(internal);
  if (ABL.rowsByBasename.has(base)) return ABL.rowsByBasename.get(base);
  return null;
}

// pretty-print a single row from abilities.json
function renderDetailRow(row){
  const label = row.label || '';
  let value = row.value || '';
  value = String(value).replace(/\s*<br\s*\/?>\s*/gi, '<br>');
  const hint = row.hint ? `<span class="muted text-xs ml-2">${row.hint}</span>` : '';
  return `<div class="flex items-start justify-between gap-3 py-1 border-b border-white/5">
    <div class="text-[13px]">${label}${hint}</div>
    <div class="text-[13px] font-medium text-[var(--ink)] text-right">${value}</div>
  </div>`;
}

// fallback minimal when no rows are available
function renderFallbackRows(abiMeta){
  const out = [];
  if (abiMeta.Cost != null) {
    const typ = abiMeta.CostType || "Énergie";
    out.push({label:"Coût", value:`${abiMeta.Cost} ${typ}`});
  }
  if (abiMeta.Subsumable != null) {
    out.push({label:"Subsumable (Helminth)", value: abiMeta.Subsumable ? "Oui" : "Non"});
  }
  if (Array.isArray(abiMeta.Augments) && abiMeta.Augments.length){
    out.push({label:"Augments", value: abiMeta.Augments.join(", ")});
  }
  if (!out.length){
    out.push({label:"Détails", value:"(données fines manquantes dans abilities.json)"});
  }
  return out.map(renderDetailRow).join("");
}

// small stat pill
function stat(label, v){
  return `
    <div class="stat">
      <div class="label">${label}</div>
      <div class="value">${val(v)}</div>
    </div>`;
}

// ===============================
//  Rendering
// ===============================
function renderCard(wf, slotIndex=0){
  const root = document.getElementById('card');
  const abilities = wf.abilities || [];
  const a = abilities[slotIndex] || {};

  const tabs = abilities.map((ab, i) =>
    `<button class="btn-tab ${i===slotIndex?'active':''}" data-abi="${i}">${i+1}. ${ab.Name || ab.name || '—'}</button>`
  ).join(' ');

  // build detail rows: try abilities.json first, else fallback
  let rowsHTML = "";
  let rows = findRowsForInternal(a.InternalName || a.internal || a.internalName);
  if (rows && rows.length){
    rowsHTML = rows.map(renderDetailRow).join("");
  } else {
    rowsHTML = renderFallbackRows(a);
  }

  const html = `
    <div class="flex flex-col md:flex-row gap-6">
      <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
        <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden wf-img flex items-center justify-center">
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
            <div class="font-semibold mb-1">${a.Name || a.name || '—'}</div>
            <p class="muted">${(a.Description || a.description || '').replace(/\r?\n/g,' ')}</p>

            <div class="mt-4 space-y-1">
              ${rowsHTML}
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

// ===============================
//  Normalisation Warframes
// ===============================
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
    abilities: [], // remplie plus tard
  };
}

// build ability list for a frame using warframe_abilities.json (has InternalName + SlotKey)
function getFrameAbilitiesMeta(frameName, WFAbyFrame){
  for (const candidate of variants(frameName)){
    if (WFAbyFrame.has(candidate)) return WFAbyFrame.get(candidate);
  }
  return [];
}

// ===============================
//  Boot / Data Pipeline
// ===============================
async function loadAll(){
  const status = document.getElementById('status');
  try{
    status.textContent = 'Chargement des données…';

    const [warframes, abilityRows, mapByWF, wfaRaw] = await Promise.all([
      fetch(WF_URL).then(r=>r.json()),
      fetch(ABILITIES_URL).then(r=>r.json()).catch(()=>[]),
      fetch(MAP_URL).then(r=>r.json()).catch(()=> ({})),
      fetch(WFA_URL).then(r=>r.json()).catch(()=> []),
    ]);

    // Index rows from abilities.json
    ABL.rowsByPath.clear();
    ABL.rowsByBasename.clear();

    if (Array.isArray(abilityRows)){
      for (const it of abilityRows){
        const p = it.path;
        if (!p) continue;
        ABL.rowsByPath.set(p, it.rows || []);
        ABL.rowsByBasename.set(basename(p), it.rows || []);
      }
    }

    // Index warframe_abilities.json by frame
    const WFAbyFrame = new Map(); // frame -> [{Name, SlotKey, InternalName, Cost, ...}]
    if (Array.isArray(wfaRaw)){
      for (const a of wfaRaw){
        const frame = a.Powersuit || a.Warframe || a.Frame;
        if (!frame) continue;
        (WFAbyFrame.get(frame) ?? WFAbyFrame.set(frame, []).get(frame)).push(a);
      }
      for (const [k, arr] of WFAbyFrame){
        arr.sort((x,y)=> (x.SlotKey ?? 99) - (y.SlotKey ?? 99));
      }
    }

    // filter frames list
    const list = warframes
      .filter(wf => wf.type === 'Warframe' && !['Bonewidow','Voidrig'].includes(wf.name))
      .map(normalizeWF)
      .sort(byName);

    // attach abilities per frame using WFA meta
    for (const wf of list){
      const metaList = getFrameAbilitiesMeta(wf.name, WFAbyFrame);
      wf.abilities = metaList.map(x => ({
        Name: x.Name, Description: x.Description, SlotKey: x.SlotKey,
        InternalName: x.InternalName, Cost: x.Cost, CostType: x.CostType,
        Subsumable: x.Subsumable, Augments: x.Augments || [],
      }));
    }

    window.__WF_LIST = list; // debug

    status.textContent = `Dataset chargé: ${list.length} Warframes`;
    renderPicker(list);
    if(list.length) renderCard(list[0], 0);

    // picker & search
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

    // diagnostic console: list frames with missing detailed rows
    const missing = [];
    for (const wf of list){
      const miss = wf.abilities.filter(a => !findRowsForInternal(a.InternalName));
      if (miss.length === wf.abilities.length){
        missing.push(wf.name);
      }
    }
    if (missing.length){
      console.warn("Avertissement: pas de 'abilities.json' détaillé pour:", missing.join(", "));
    }

  }catch(e){
    console.error(e);
    status.className = "mb-4 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg";
    status.textContent = "Erreur de chargement.";
  }
}

document.addEventListener('DOMContentLoaded', loadAll);
