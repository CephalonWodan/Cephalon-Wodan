/* =========================================================
   HUB.JS v13 — Cephalon Wodan (patch minimal)
   ========================================================= */

const API_BASE = window.API_BASE || 'https://cephalon-wodan-production.up.railway.app';
let LAST = { agg: null };

const els = {
  now: document.getElementById('now'),
  platform: document.getElementById('platform'),
  lang: document.getElementById('lang'),

  cyclesList: document.getElementById('cycles-list'),
  ctxCycles: document.getElementById('ctx-cycles'),

  fissuresList: document.getElementById('fissures-list'),
  fTier: document.getElementById('fissure-tier'),
  fHard: document.getElementById('fissure-hard'),
  ctxFissures: document.getElementById('ctx-fissures'),

  sortie: document.getElementById('sortie'),

  archon: document.getElementById('archon'),

  duviri: document.getElementById('duviri-circuit'),
  ctxDuviri: document.getElementById('ctx-duviri'),

  nightwave: document.getElementById('nightwave-list'),
  ctxNightwave: document.getElementById('ctx-nightwave'),

  baroStatus: document.getElementById('baro-status'),
  baroInv: document.getElementById('baro-inventory'),
  ctxBaro: document.getElementById('ctx-baro'),

  invList: document.getElementById('invasions-list'),
  ctxInv: document.getElementById('ctx-invasions'),

  bounty: document.getElementById('bounty-content'),
  ctxBounties: document.getElementById('ctx-bounties'),
};

/* ------------------ Utils ------------------ */
function fmtDT(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const dt = new Date(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}
function fmtETA(ms) {
  if (!ms || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${ss}s`);
  return parts.join(' ');
}
function createEl(tag, cls, txt) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (txt != null) el.textContent = txt;
  return el;
}
function makeEta(expiry) {
  const el = createEl('span', 'eta');
  el.dataset.expiry = expiry;
  return el;
}
function setEta(el, expiry) {
  const ms = new Date(expiry).getTime() - Date.now();
  el.textContent = `expire dans ${fmtETA(ms)}`;
}

/* ------------------ Fetch ------------------ */
async function fetchAgg(platform, lang) {
  const url = `${API_BASE}/api/${platform}?lang=${lang}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* ------------------ Renders (reprennent ta logique v13) ------------------ */
// …………………………………………
// (Garde ici ton rendu cycles, fissures, sortie, archon, duviri, nightwave)
// …………………………………………

/* ------------ Baro (PATCH: ETA sur dates ISO) ------------ */
function renderBaro(data) {
  const b = data?.voidTrader;
  els.baroStatus.innerHTML = '';
  els.baroInv.innerHTML = '';
  if (!b) return;

  const p = createEl('p');
  if (b.active) {
    p.append(createEl('strong', null, 'Baro est là'));
    p.append(createEl('span', 'muted', ` — depart dans `));
    // PATCH: utiliser b.expiry (ISO) pour l’ETA
    if (b.expiry) p.append(makeEta(b.expiry));
    els.baroStatus.append(p);
  } else {
    p.append(createEl('strong', null, 'Prochaine arrivée'));
    p.append(createEl('span', 'muted', ' — dans '));
    // PATCH: utiliser b.activation (ISO) pour l’ETA
    if (b.activation) p.append(makeEta(b.activation));
    els.baroStatus.append(p);
  }
  const inv = Array.isArray(b.inventory) ? b.inventory : [];
  for (const it of inv) {
    const li = createEl('li', 'wf-row');
    li.append(createEl('div','left', it.item || it.uniqueName || '—'));
    els.baroInv.append(li);
  }
}

/* ------------ Invasions (garde ta logique — pas de suppression ici) ------------ */
// …………………………………………
// (Garde ton rendu invasions v13 tel quel — l’encadré “Infested” sera masqué côté CSS)
// …………………………………………

/* ------------ Bounties (garde ta logique v13) ------------ */
// …………………………………………
// (Aucune modif JS — les “chips dorées” sont neutralisées côté CSS dans la section Primes)
// …………………………………………

/* ------------------ ETA ticker ------------------ */
function tickETAs() {
  const etas = document.querySelectorAll('[data-expiry]');
  for (const el of etas) setEta(el, el.dataset.expiry);
}
setInterval(tickETAs, 1000);

/* ------------------ Main ------------------ */
async function loadAndRender() {
  try {
    els.now.textContent = fmtDT(Date.now());
    const platform = els.platform.value;
    const lang = els.lang.value;
    const agg = await fetchAgg(platform, lang);
    LAST.agg = agg;

    // Appelle ici tes fonctions de rendu v13
    // ex:
    // renderCycles(agg); renderFissures(agg); renderSortie(agg); renderArchon(agg);
    // renderDuviri(agg); renderNightwave(agg); renderBaro(agg); renderInvasions(agg); renderBounties(agg);

    tickETAs();
  } catch (e) {
    console.error('hub load error', e);
  }
}

/* — Filtres fissures → re-render local */
if (els.fTier) els.fTier.addEventListener('change', () => LAST.agg && renderFissures(LAST.agg));
if (els.fHard) els.fHard.addEventListener('change', () => LAST.agg && renderFissures(LAST.agg));

els.platform.addEventListener('change', loadAndRender);
els.lang.addEventListener('change', loadAndRender);
loadAndRender();
