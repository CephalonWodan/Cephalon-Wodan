/* =========================================================
   Warframe – Aperçu (Classic)  •  app.js (orokin theme)
   Lit https://api.warframestat.us/warframes + data/abilities.json
   et affiche : Coût, Puissance, Durée, Portée (valeurs de base)
   avec “Affecté par Force / Durée / Portée / Efficacité”.
========================================================= */

/* ---------- Config ---------- */
const WF_URL = "https://api.warframestat.us/warframes";
const ABILITIES_URL = "data/abilities.json";

/* ---------- Small utils ---------- */
const val = (x) => (x === null || x === undefined || x === '' ? '—' : String(x));
const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
const norm = (s) => String(s || "").trim();

/* ---------- Abilities index + variantes ---------- */
const ABX = { byFrame: {} };

const variantFallbacks = (name) => {
  if (!name) return [];
  const base = name.replace(/\s+Prime\b/i, "").trim();
  const list = [];
  if (name !== base) list.push(base);
  if (name === "Excalibur Umbra") list.push("Excalibur");
  return list;
};

function sortBySlot(arr) {
  arr.sort((x, y) => (x.SlotKey ?? 99) - (y.SlotKey ?? 99));
  return arr;
}

/* Umbra : Radial Blind -> Radial Howl si dispo */
function massageUmbra(list) {
  if (!Array.isArray(list)) list = [];
  const base = ABX.byFrame["Excalibur"] || [];
  if (!base.length) return list;
  const merged = base.map(a => ({ ...a }));
  const umbraList = ABX.byFrame["Excalibur Umbra"] || [];
  const howl = umbraList.find(x => /Howl/i.test(x.Name || x.name));
  if (howl) {
    const i = merged.findIndex(x => /Radial\s*Blind/i.test(x.Name || x.name));
    if (i >= 0) merged[i] = { ...howl, SlotKey: merged[i].SlotKey ?? howl.SlotKey };
  }
  return merged;
}

function getAbilitiesFor(frameName) {
  const key = norm(frameName);
  let list = ABX.byFrame[key];
  if (!list || !list.length) {
    for (const alt of variantFallbacks(key)) {
      if (ABX.byFrame[alt]?.length) { list = ABX.byFrame[alt]; break; }
    }
  }
  if (key === "Excalibur Umbra") list = massageUmbra(list);
  return (list || []).slice();
}

/* ---------- Coût énergie (fallback robuste) ---------- */
function fmtCost(a) {
  const energy = a.Cost ?? a.EnergyCost ?? a.CostEnergy ?? a.energyCost;
  const shield = a.CostShield ?? a.ShieldCost;
  const time   = a.CostTime ?? a.CastTime ?? a.DurationCost;
  if (shield != null) return `${prettyNum(shield)} Bouclier`;
  if (time   != null)  return `${prettyNum(time)} Temps`;
  if (energy != null)  return `${prettyNum(energy)} Énergie`;
  return "—";
}

/* ---------- Extraction “base values” Puissance / Durée / Portée ---------- */
/* On scanne l’objet d’aptitude (plats + imbriqués + tableaux) et on
   choisit les champs susceptibles d’être la base durée / portée / dégâts.
   Si le RAW change, ça reste tolérant.
*/
function prettyNum(n) {
  const x = Number(n);
  if (!isFinite(x)) return '—';
  if (Math.abs(x) >= 100) return String(Math.round(x));
  return String(Math.round(x * 100) / 100);
}

function flattenNumericFields(obj, path = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;

  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;

    if (typeof v === 'number') {
      out.push({ key: k, path: p, value: v });
    } else if (Array.isArray(v)) {
      // si tableau de nombres -> on prend la 1ère valeur (base)
      if (v.length && typeof v[0] === 'number') {
        out.push({ key: k, path: p, value: v[0] });
      } else {
        v.forEach((item, i) => { out.push(...flattenNumericFields(item, `${p}[${i}]`)); });
      }
    } else if (v && typeof v === 'object') {
      out.push(...flattenNumericFields(v, p));
    }
  }
  return out;
}

function pickField(fields, regexes, blacklistRegexes = []) {
  const bl = blacklistRegexes.length ? new RegExp(blacklistRegexes.join('|'), 'i') : null;
  for (const re of regexes) {
    const hit = fields.find(f => re.test(f.key) || re.test(f.path));
    if (hit && !(bl && (bl.test(hit.key) || bl.test(hit.path)))) return hit;
  }
  return null;
}

function inferUnitFromPath(path, kind) {
  if (kind === 'duration') return 's';               // par défaut secondes
  if (kind === 'range')   return 'm';               // par défaut mètres
  if (kind === 'power') {
    if (/percent|pct|percentage/i.test(path)) return '%';
    if (/multiplier|strength/i.test(path))   return '×';
    return ''; // dégâts ou quantité brute
  }
  return '';
}

function formatValWithUnit(field, fallbackUnit = '') {
  if (!field) return '—';
  const u = inferUnitFromPath(field.path, field.kind) || fallbackUnit;
  const n = prettyNum(field.value);
  return u ? `${n} ${u}` : n;
}

/* Renvoie { powerField, durationField, rangeField } */
function extractBaseFields(ability) {
  const fields = flattenNumericFields(ability);

  // Durée : eviter cooldown / delay / cast time / interval
  const durationField = pickField(
    fields,
    [/^duration$/i, /buff.*duration/i, /duration(?!.*recoil)/i, /time(?!r)/i, /invulnerab.*duration/i],
    [/cooldown|interval|delay|cast/i]
  );
  if (durationField) durationField.kind = 'duration';

  // Portée : range / radius / distance / reach / length
  const rangeField = pickField(
    fields,
    [/^range$/i, /^radius$/i, /radius/i, /range/i, /distance/i, /reach/i, /length/i],
    []
  );
  if (rangeField) rangeField.kind = 'range';

  // Puissance : damage / dps / amount / percent / multiplier (éviter health/shield/armor/energy/etc.)
  const powerField = pickField(
    fields,
    [/^damage$/i, /damage(?!.*reduction)/i, /base.*damage/i, /dps/i, /amount/i, /percent/i, /multiplier/i, /strength/i],
    [/health|shield|armor|energy|cost|duration|time|radius|range|distance/i]
  );
  if (powerField) powerField.kind = 'power';

  return { powerField, durationField, rangeField };
}

/* ---------- Rendu ---------- */
function stat(label, v) {
  return `
    <div class="stat">
      <div class="text-[10px] uppercase tracking-wide text-[color:#7dd6ff]">${label}</div>
      <div class="text-lg font-semibold">${val(v)}</div>
    </div>`;
}

function renderCard(wf, abilityIndex = 0) {
  const root = document.getElementById('card');
  const abilities = wf.abilities || [];
  const a = abilities[abilityIndex] || {};

  const tabs = abilities.map((ab, i) =>
    `<button class="btn-tab ${i === abilityIndex ? 'active' : ''}" data-abi="${i}">${i + 1}. ${ab.Name || ab.name || '—'}</button>`
  ).join(' ');

  // Extraire les valeurs de base
  const { powerField, durationField, rangeField } = extractBaseFields(a);

  // Construire les puces “Affecté par …” (présent si la base existe)
  const chips = [
    powerField   && 'Affecté par Force',
    durationField && 'Affecté par Durée',
    rangeField   && 'Affecté par Portée',
    (fmtCost(a) !== '—') && 'Coût ↔ Efficacité'
  ].filter(Boolean).map(t => `<span class="btn-tab">${t}</span>`).join('');

  const html = `
    <div class="flex flex-col md:flex-row gap-6">
      <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2">
        <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[color:#0e1a23] border border-[color:#2a3f47] flex items-center justify-center">
          ${wf.image ? `<img src="${wf.image}" alt="${wf.name}" class="w-full h-full object-contain">` : `<div class="muted">Aucune image</div>`}
        </div>
      </div>

      <div class="flex-1 flex flex-col gap-4">
        <div class="flex items-start gap-4">
          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-semibold">${wf.name}</h2>
            <p class="text-[color:#9fbac7] mt-2">${wf.description || ''}</p>
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
            <p class="text-[color:#9fbac7] mt-1">${cleanDesc(a.Description || a.description || '')}</p>

            <div class="grid grid-cols-4 gap-3 mt-4">
              <div class="pill">
                <div class="text-[10px] uppercase tracking-wide muted">Coût</div>
                <div class="mt-1 font-medium">${fmtCost(a)}</div>
              </div>
              <div class="pill">
                <div class="text-[10px] uppercase tracking-wide muted">Puissance</div>
                <div class="mt-1 font-medium">${
                  powerField ? formatValWithUnit(powerField) : '—'
                }</div>
              </div>
              <div class="pill">
                <div class="text-[10px] uppercase tracking-wide muted">Durée</div>
                <div class="mt-1 font-medium">${
                  durationField ? formatValWithUnit(durationField, 's') : '—'
                }</div>
              </div>
              <div class="pill">
                <div class="text-[10px] uppercase tracking-wide muted">Portée</div>
                <div class="mt-1 font-medium">${
                  rangeField ? formatValWithUnit(rangeField, 'm') : '—'
                }</div>
              </div>
            </div>

            ${chips ? `<div class="flex flex-wrap gap-2 mt-3">${chips}</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  root.innerHTML = html;
  root.querySelectorAll('[data-abi]').forEach(btn => {
    btn.addEventListener('click', () => renderCard(wf, parseInt(btn.dataset.abi, 10)));
  });
}

function cleanDesc(s) {
  return (s || "").replace(/\r?\n/g, " ").replace(/<[^>]+>/g, "").trim();
}

function renderPicker(list) {
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

/* ---------- Pipeline de données ---------- */
function normalizeWF(rec) {
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

async function loadAll() {
  const status = document.getElementById('status');
  try {
    status.textContent = 'Chargement des Warframes…';
    const [warframes, abiRaw] = await Promise.all([
      fetch(WF_URL).then(r => r.json()),
      fetch(ABILITIES_URL).then(r => r.json()).catch(() => [])
    ]);

    // index abilities
    ABX.byFrame = (Array.isArray(abiRaw) ? abiRaw : []).reduce((acc, a) => {
      const key = norm(a.Powersuit || a.Warframe || a.Frame || a.name);
      if (!key) return acc;
      (acc[key] ??= []).push(a);
      return acc;
    }, {});
    for (const k in ABX.byFrame) sortBySlot(ABX.byFrame[k]);

    // filtrer uniquement Warframes (pas archwings/necramechs)
    const list = warframes
      .filter(wf => wf.type === 'Warframe' && !['Bonewidow', 'Voidrig'].includes(wf.name))
      .map(normalizeWF)
      .sort(byName);

    window.__WF_LIST = list; // debug rapide

    status.textContent = `Dataset chargé: ${list.length} Warframes`;
    renderPicker(list);
    if (list.length) renderCard(list[0], 0);

    // interactions
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
      if (filtered.length) renderCard(filtered[0], 0);
      status.textContent = `Affichage: ${filtered.length} résultat(s)`;
    });

  } catch (e) {
    console.error(e);
    status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
    status.style.color = "#ffd8d8";
    status.style.background = "rgba(255,86,86,.08)";
    status.style.border = "1px solid #ff6060";
    status.textContent = "Erreur de chargement.";
  }
}

loadAll();
