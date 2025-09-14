// js/hub.js — Consomme l'API Railway et remplit le DOM

const API_BASE = 'https://cephalon-wodan-production.up.railway.app/api';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function fmtTime(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
}

function pill(t) {
  return `<span class="wf-pill">${t}</span>`;
}

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function getAggregated(platform, lang) {
  const url = `${API_BASE}/${platform}?lang=${encodeURIComponent(lang)}`;
  return fetchJSON(url);
}

// ---------- RENDERS ----------
function renderCycles(data) {
  const ul = $('#cycles-list');
  const items = [];

  const earth = data.earthCycle || {};
  items.push(`<li class="wf-row"><div><strong>Earth</strong> ${pill(earth.state || '—')}</div><div class="wf-small">${earth.timeLeft || ''}</div></li>`);

  const cetus = data.cetusCycle || {};
  items.push(`<li class="wf-row"><div><strong>Cetus</strong> ${pill(cetus.state || '—')}</div><div class="wf-small">${cetus.timeLeft || ''}</div></li>`);

  const vallis = data.vallisCycle || {};
  items.push(`<li class="wf-row"><div><strong>Vallis</strong> ${pill(vallis.isWarm ? 'warm' : (vallis.state || 'cold'))}</div><div class="wf-small">${vallis.timeLeft || ''}</div></li>`);

  const cambion = data.cambionCycle || {};
  items.push(`<li class="wf-row"><div><strong>Cambion</strong> ${pill(cambion.state || '—')}</div><div class="wf-small">${cambion.timeLeft || ''}</div></li>`);

  const duviri = data.duviriCycle || {};
  items.push(`<li class="wf-row"><div><strong>Duviri</strong> ${pill(duviri.state || '—')}</div><div class="wf-small">${duviri.timeLeft || ''}</div></li>`);

  ul.innerHTML = items.join('');
}

function renderFissures(data) {
  const ul = $('#fissures-list');
  const tier = ($('#fissure-tier')?.value || 'all').toUpperCase();
  const hard = $('#fissure-hard')?.value || 'all';

  let items = Array.isArray(data.fissures) ? data.fissures : [];

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
        <div class="wf-small">Expire: ${fmtTime(f.expiry)}</div>
      </div>
      <div class="wf-small">${f.missionType} — ${f.enemy}</div>
    </li>
  `).join('') || '<li class="wf-small">Aucune fissure avec ces filtres</li>';
}

function renderNightwave(data) {
  const ul = $('#nightwave-list');
  const nw = data.nightwave || {};
  const acts = Array.isArray(nw.activeChallenges) ? nw.activeChallenges : [];

  ul.innerHTML = acts.slice(0, 10).map(a => `
    <li>
      <div class="wf-row">
        <strong>${a.title}</strong>
        <span class="wf-small">${fmtTime(a.expiry)}</span>
      </div>
      <div class="wf-small">${a.desc || ''}</div>
    </li>
  `).join('') || '<li class="wf-small">Rien à afficher</li>';
}

function renderSortie(data) {
  const host = $('#sortie');
  const s = data.sortie || {};
  if (!s.variants || !s.variants.length) {
    host.innerHTML = '<div class="wf-small wf-pad">Pas de sortie.</div>';
    return;
  }
  host.innerHTML = `
    <div class="wf-pad">
      <h3 class="wf-sub">${s.boss || 'Sortie'}</h3>
      <ul class="wf-list">
        ${s.variants.map(v => `<li><strong>${v.missionType}</strong> — ${v.modifier || ''} <span class="wf-small">(${v.node})</span></li>`).join('')}
      </ul>
      <div class="wf-small">Expire: ${fmtTime(s.expiry)}</div>
    </div>
  `;
}

function renderArchon(data) {
  const host = $('#archon');
  const a = data.archonHunt || {};
  if (!a.missions || !a.missions.length) {
    host.innerHTML = '<div class="wf-small wf-pad">Pas d’Archon Hunt visible.</div>';
    return;
  }
  host.innerHTML = `
    <div class="wf-pad">
      <h3 class="wf-sub">${a.boss || 'Archon Hunt'}</h3>
      <ul class="wf-list">
        ${a.missions.map(m => `<li><strong>${m.type}</strong> <span class="wf-small">(${m.node})</span></li>`).join('')}
      </ul>
      <div class="wf-small">Expire: ${fmtTime(a.expiry)}</div>
    </div>
  `;
}

function renderBaro(data) {
  const box = $('#baro-status');
  const inv = $('#baro-inventory');
  const b = data.voidTrader || {};
  if (!b.character) {
    box.innerHTML = '<div class="wf-small wf-pad">Baro indisponible.</div>';
    inv.innerHTML = '';
    return;
  }
  box.innerHTML = `
    <div class="wf-pad">
      <h3 class="wf-sub">${b.character}</h3>
      <div class="wf-small">${b.location || ''}</div>
      <div class="wf-small">Du ${fmtTime(b.activation)} au ${fmtTime(b.expiry)}</div>
    </div>
  `;
  const items = Array.isArray(b.inventory) ? b.inventory : [];
  inv.innerHTML = items.map(it => `
    <li class="wf-row">
      <div>${it.item || it.type || 'Item'}</div>
      <div class="wf-small">${it.ducats ?? ''} ducats / ${it.credits ?? ''}c</div>
    </li>
  `).join('') || '<li class="wf-small">Inventaire vide (hors période)</li>';
}

function renderBounties(data) {
  const host = $('#bounty-content');
  const missions = Array.isArray(data.syndicateMissions) ? data.syndicateMissions : [];
  const buckets = { Cetus: [], Fortuna: [], Deimos: [] };

  for (const m of missions) {
    if (/Cetus/i.test(m.syndicate)) buckets.Cetus.push(m);
    else if (/Fortuna|Solaris/i.test(m.syndicate)) buckets.Fortuna.push(m);
    else if (/Entrati|Deimos/i.test(m.syndicate)) buckets.Deimos.push(m);
  }

  const renderBucket = (title, arr) => `
    <h3 class="wf-sub">${title}</h3>
    <ul class="wf-list">
      ${arr.map(b => `<li><strong>${b.syndicate}</strong> <span class="wf-small">${fmtTime(b.expiry)}</span></li>`).join('') || '<li class="wf-small">—</li>'}
    </ul>
  `;

  host.innerHTML = renderBucket('Cetus', buckets.Cetus)
                 + renderBucket('Fortuna', buckets.Fortuna)
                 + renderBucket('Deimos', buckets.Deimos);
}

// ---------- MAIN ----------
async function refresh() {
  const platform = $('#platform').value || 'pc';
  const lang = $('#lang').value || 'en';

  // contexte affiché
  const host = new URL(API_BASE).host;
  $('#ctx-cycles').textContent    = `${platform}/${lang} · ${host}`;
  $('#ctx-fissures').textContent  = `${platform}/${lang} · ${host}`;
  $('#ctx-nightwave').textContent = `${platform}/${lang} · ${host}`;
  $('#ctx-sorties').textContent   = `${platform}/${lang} · ${host}`;
  $('#ctx-baro').textContent      = `${platform}/${lang} · ${host}`;
  $('#ctx-bounties').textContent  = `${platform}/${lang} · ${host}`;

  const data = await getAggregated(platform, lang);

  renderCycles(data);
  renderFissures(data);
  renderNightwave(data);
  renderSortie(data);
  renderArchon(data);
  renderBaro(data);
  renderBounties(data);
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
});
