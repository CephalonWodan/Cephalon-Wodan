// js/hub.js — Consomme l'API Railway et remplit le DOM + compte à rebours

// Si besoin, tu peux surcharger ici (ex: window.CEPHALON_API_BASE depuis un <script>)
const API_BASE = (window.CEPHALON_API_BASE || 'https://cephalon-wodan-production.up.railway.app') + '/api';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ====== COUNTDOWN ====== */
const _tickers = new Set();

function formatDuration(ms) {
  if (ms <= 0) return '0s';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  if (m || h || d) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
function startTicker(timeEl, endISO, stopText = 'expiré') {
  const end = Date.parse(endISO);
  if (Number.isNaN(end)) {
    timeEl.textContent = '—';
    return;
  }
  function update() {
    const ms = end - Date.now();
    timeEl.textContent = ms > 0 ? formatDuration(ms) : stopText;
    if (ms <= 0) {
      clearInterval(id);
      _tickers.delete(id);
    }
  }
  update();
  const id = setInterval(update, 1000);
  _tickers.add(id);
}
function bootCountdowns(root = document) {
  for (const id of _tickers) clearInterval(id);
  _tickers.clear();

  root.querySelectorAll('[data-expiry]').forEach((el) => {
    startTicker(el, el.getAttribute('data-expiry'));
  });
  root.querySelectorAll('[data-activation]').forEach((el) => {
    startTicker(el, el.getAttribute('data-activation'), 'commencé');
  });
}

/* ====== HELPERS ====== */
function pill(t) { return `<span class="wf-pill">${t}</span>`; }

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
async function getAggregated(platform, lang) {
  const url = `${API_BASE}/${platform}?lang=${encodeURIComponent(lang)}`;
  return fetchJSON(url);
}

/* ====== RENDERERS ====== */
function renderCycles(ws) {
  const ul = $('#cycles-list');
  const items = [];

  const push = (label, state, expiryISO) => {
    items.push(`
      <li class="wf-row">
        <div><strong>${label}</strong> ${state ? pill(state) : ''}</div>
        <div class="wf-small">
          <time class="wf-countdown" data-expiry="${expiryISO || ''}">—</time>
        </div>
      </li>
    `);
  };

  const e = ws.earthCycle || {};
  if (e) push('Earth', e.isDay ? 'Day' : 'Night', e.expiry);

  const c = ws.cetusCycle || {};
  if (c) push('Cetus', c.isDay ? 'Day' : 'Night', c.expiry);

  const v = ws.vallisCycle || {};
  if (v) push('Vallis', v.isWarm ? 'Warm' : 'Cold', v.expiry);

  const ca = ws.cambionCycle || {};
  if (ca) push('Cambion', ca.state, ca.expiry);

  const d = ws.duviriCycle || {};
  if (d) push('Duviri', d.state, d.expiry);

  ul.innerHTML = items.join('') || '<li class="wf-small">—</li>';
}

function renderFissures(ws) {
  const ul = $('#fissures-list');
  const tier = ($('#fissure-tier')?.value || 'all').toUpperCase();
  const hard = $('#fissure-hard')?.value || 'all';
  let items = Array.isArray(ws.fissures) ? ws.fissures.slice() : [];

  if (tier !== 'ALL') items = items.filter(f => (f.tier || '').toUpperCase() === tier);
  if (hard !== 'all') items = items.filter(f => hard === 'hard' ? !!f.isHard : !f.isHard);

  ul.innerHTML = items.map(f => `
    <li>
      <div class="wf-row">
        <div>
          <strong>${f.node}</strong>
          ${pill(f.tier)}
          ${f.isHard ? pill('Steel Path') : ''}
          ${f.isStorm ? pill('Void Storm') : ''}
        </div>
        <div class="wf-small">Expire dans <time class="wf-countdown" data-expiry="${f.expiry}">—</time></div>
      </div>
      <div class="wf-small">${f.missionType} — ${f.enemy}</div>
    </li>
  `).join('') || '<li class="wf-small">Aucune fissure avec ces filtres</li>';
}

function renderNightwave(ws) {
  const ul = $('#nightwave-list');
  const nw = ws.nightwave || {};
  const acts = Array.isArray(nw.activeChallenges) ? nw.activeChallenges : [];
  ul.innerHTML = acts.slice(0, 12).map(a => `
    <li>
      <div class="wf-row">
        <strong>${a.title}</strong>
        <span class="wf-small"><time class="wf-countdown" data-expiry="${a.expiry}">—</time></span>
      </div>
      <div class="wf-small">${a.desc || ''}</div>
    </li>
  `).join('') || '<li class="wf-small">Rien à afficher</li>';
}

function renderSortie(ws) {
  const host = $('#sortie');
  const s = ws.sortie || {};
  if (!s?.variants || !s.variants.length) {
    host.innerHTML = '<div class="wf-small">Pas de sortie.</div>';
    return;
  }
  host.innerHTML = `
    <div class="wf-col">
      <h3 class="wf-sub">${s.boss || 'Sortie'} ${s.faction ? pill(s.faction) : ''}</h3>
      <ol class="wf-steps">
        ${s.variants.map(v => `<li><strong>${v.missionType}</strong> • ${v.modifier || ''} <span class="wf-small">(@ ${v.node})</span></li>`).join('')}
      </ol>
      <div class="wf-small">Expire dans <time class="wf-countdown" data-expiry="${s.expiry}">—</time></div>
    </div>
  `;
}

function renderArchon(ws) {
  const host = $('#archon');
  const a = ws.archonHunt || {};
  if (!a?.missions || !a.missions.length) {
    host.innerHTML = '<div class="wf-small">Pas d’Archon Hunt visible.</div>';
    return;
  }
  host.innerHTML = `
    <div class="wf-col">
      <h3 class="wf-sub">${a.boss || 'Archon Hunt'} ${a.faction ? pill(a.faction) : ''}</h3>
      <ol class="wf-steps">
        ${a.missions.map(m => `<li><strong>${m.type}</strong> <span class="wf-small">(@ ${m.node})</span></li>`).join('')}
      </ol>
      <div class="wf-small">Expire dans <time class="wf-countdown" data-expiry="${a.expiry}">—</time></div>
    </div>
  `;
}

function renderBaro(ws) {
  const box = $('#baro-status');
  const inv = $('#baro-inventory');
  const b = ws.voidTrader || {};
  if (!b.character) {
    box.innerHTML = '<div class="wf-small">Baro indisponible.</div>';
    inv.innerHTML = '';
    return;
  }
  const now = Date.now();
  const act = Date.parse(b.activation || 0);
  const exp = Date.parse(b.expiry || 0);
  const opened = act && now >= act && exp && now < exp;
  box.innerHTML = `
    <div class="wf-col">
      <h3 class="wf-sub">${b.character}</h3>
      <div class="wf-small">${b.location || ''}</div>
      <div class="wf-small">
        ${opened
          ? `Reste&nbsp;: <time class="wf-countdown" data-expiry="${b.expiry}">—</time>`
          : `Arrive dans&nbsp;: <time class="wf-countdown" data-activation="${b.activation}">—</time>`
        }
      </div>
    </div>
  `;
  const items = Array.isArray(b.inventory) ? b.inventory : [];
  inv.innerHTML = items.map(it => `
    <li class="wf-row">
      <div>${it.item || it.type || 'Item'}</div>
      <div class="wf-small">${it.ducats ?? 0} ducats / ${it.credits ?? 0}c</div>
    </li>
  `).join('') || '<li class="wf-small">Inventaire vide (hors période)</li>';
}

function renderBounties(ws) {
  const host = $('#bounty-content');
  const missions = Array.isArray(ws.syndicateMissions) ? ws.syndicateMissions : [];
  const buckets = { Cetus: [], Fortuna: [], Deimos: [] };

  for (const m of missions) {
    if (/Cetus/i.test(m.syndicate)) buckets.Cetus.push(m);
    else if (/Fortuna|Solaris/i.test(m.syndicate)) buckets.Fortuna.push(m);
    else if (/Entrati|Deimos/i.test(m.syndicate)) buckets.Deimos.push(m);
  }
  const renderBucket = (title, arr) => `
    <h3 class="wf-sub">${title}</h3>
    <ul class="wf-list">
      ${arr.map(b => `<li class="wf-row"><strong>${b.syndicate}</strong><span class="wf-small">Expire dans <time class="wf-countdown" data-expiry="${b.expiry}">—</time></span></li>`).join('') || '<li class="wf-small">—</li>'}
    </ul>
  `;
  host.innerHTML = renderBucket('Cetus', buckets.Cetus)
                 + renderBucket('Fortuna', buckets.Fortuna)
                 + renderBucket('Deimos', buckets.Deimos);
}

/* ====== MAIN ====== */
async function refresh() {
  const platform = $('#platform').value || 'pc';
  const lang = $('#lang').value || 'en';

  const host = new URL(API_BASE).host;
  $('#ctx-cycles').textContent    = `${platform}/${lang} · ${host}`;
  $('#ctx-fissures').textContent  = `${platform}/${lang} · ${host}`;
  $('#ctx-nightwave').textContent = `${platform}/${lang} · ${host}`;
  $('#ctx-sorties').textContent   = `${platform}/${lang} · ${host}`;
  $('#ctx-baro').textContent      = `${platform}/${lang} · ${host}`;
  $('#ctx-bounties').textContent  = `${platform}/${lang} · ${host}`;

  const ws = await getAggregated(platform, lang);

  renderCycles(ws);
  renderFissures(ws);
  renderNightwave(ws);
  renderSortie(ws);
  renderArchon(ws);
  renderBaro(ws);
  renderBounties(ws);

  bootCountdowns(document);
}

function tick() {
  $('#now').textContent = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
}

window.addEventListener('DOMContentLoaded', () => {
  tick();
  setInterval(tick, 1000);

  ['platform','lang','fissure-tier','fissure-hard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => refresh().catch(console.error));
  });

  refresh().catch(err => {
    console.error('Hub refresh error:', err);
    $('#cycles-list').innerHTML = '<li class="wf-small">Erreur chargement API</li>';
  });

  // refresh auto toutes les 2 minutes pour rester proche du hub officiel
  setInterval(() => refresh().catch(console.error), 120000);
});
