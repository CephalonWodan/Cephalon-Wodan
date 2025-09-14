// hub.js — consomme l'API et remplit la page

// Choisis automatiquement Railway par défaut.
// 'vercel' => ton ancien backend Vercel ; 'local' => /api sur le même domaine.
function apiBaseFor(source) {
  switch (source) {
    case 'vercel': return 'https://cephalon-wodan.vercel.app/api';
    case 'local':  return `${location.origin}/api`;
    case 'live':
    default:       return 'https://cephalon-wodan-production.up.railway.app/api';
  }
}

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function getAggregated(apiBase, platform='pc', lang='en') {
  return fetchJSON(`${apiBase}/${platform}?lang=${encodeURIComponent(lang)}`);
}

// --------- RENDER HELPERS ---------
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

function fmtTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
}
function pill(text) {
  return `<span class="pill">${text}</span>`;
}

// Cycles
function renderCycles(data) {
  const ul = $('#cycles-list');
  const parts = [];

  const earth = data.earthCycle ?? {};
  parts.push(`<li class="row"><div><strong>Earth</strong> ${pill(earth.state || '–')}</div><div class="small timer">${earth.timeLeft || ''}</div></li>`);

  const cetus = data.cetusCycle ?? {};
  parts.push(`<li class="row"><div><strong>Cetus</strong> ${pill(cetus.state || '–')}</div><div class="small timer">${cetus.timeLeft || ''}</div></li>`);

  const vallis = data.vallisCycle ?? {};
  parts.push(`<li class="row"><div><strong>Vallis</strong> ${pill(vallis.isWarm ? 'warm' : (vallis.state || 'cold'))}</div><div class="small timer">${vallis.timeLeft || ''}</div></li>`);

  const cambion = data.cambionCycle ?? {};
  parts.push(`<li class="row"><div><strong>Cambion</strong> ${pill(cambion.state || '–')}</div><div class="small timer">${cambion.timeLeft || ''}</div></li>`);

  const duviri = data.duviriCycle ?? {};
  parts.push(`<li class="row"><div><strong>Duviri</strong> ${pill(duviri.state || '–')}</div><div class="small timer">${duviri.timeLeft || ''}</div></li>`);

  ul.innerHTML = parts.join('');
}

// Fissures + filtres
function renderFissures(data) {
  const ul = $('#fissures-list');
  const tier = $('#fissure-tier').value; // all, lith, meso, neo, axi
  const hard = $('#fissure-hard').value; // all, normal, hard

  let items = Array.isArray(data.fissures) ? data.fissures : [];

  if (tier !== 'all') {
    const T = tier.toUpperCase();
    items = items.filter(f => (f.tier || '').toUpperCase() === T);
  }
  if (hard !== 'all') {
    items = items.filter(f => (hard === 'hard') ? !!f.isHard : !f.isHard);
  }

  ul.innerHTML = items.map(f => `
    <li>
      <div class="row">
        <div>
          <strong>${f.node}</strong> ${pill(f.tier)} ${f.isHard ? pill('Steel Path') : ''}
        </div>
        <div class="small">${fmtTime(f.expiry)}</div>
      </div>
      <div class="small">${f.missionType} – ${f.enemy}</div>
    </li>
  `).join('') || '<li class="small">Aucune fissure avec ces filtres</li>';
}

// Nightwave
function renderNightwave(data) {
  const ul = $('#nightwave-list');
  const nw = data.nightwave || {};
  const acts = Array.isArray(nw.activeChallenges) ? nw.activeChallenges : [];
  ul.innerHTML = acts.slice(0, 10).map(a => `
    <li>
      <div class="row">
        <strong>${a.title}</strong>
        <span class="small">${fmtTime(a.expiry)}</span>
      </div>
      <div class="small">${a.desc || ''}</div>
    </li>
  `).join('') || '<li class="small">Rien à afficher</li>';
}

// Sortie
function renderSortie(data) {
  const box = $('#sortie');
  const s = data.sortie || {};
  if (!s.variants || !s.variants.length) {
    box.innerHTML = '<div class="small" style="padding:10px">Pas de sortie.</div>';
    return;
  }
  box.innerHTML = `
    <div style="padding:10px">
      <h3>${s.boss || 'Sortie'}</h3>
      <ul class="list">
        ${s.variants.map(v => `<li><strong>${v.missionType}</strong> — ${v.modifier || ''} <span class="small">(${v.node})</span></li>`).join('')}
      </ul>
      <div class="small">Expire: ${fmtTime(s.expiry)}</div>
    </div>
  `;
}

// Archon Hunt
function renderArchon(data) {
  const box = $('#archon');
  const a = data.archonHunt || {};
  if (!a.missions || !a.missions.length) {
    box.innerHTML = '<div class="small" style="padding:10px">Pas d’Archon Hunt visible.</div>';
    return;
  }
  box.innerHTML = `
    <div style="padding:10px">
      <h3>${a.boss || 'Archon Hunt'}</h3>
      <ul class="list">
        ${a.missions.map(m => `<li><strong>${m.type}</strong> <span class="small">(${m.node})</span></li>`).join('')}
      </ul>
      <div class="small">Expire: ${fmtTime(a.expiry)}</div>
    </div>
  `;
}

// Baro
function renderBaro(data) {
  const box = $('#baro-status');
  const inv = $('#baro-inventory');
  const b = data.voidTrader || {};
  if (!b.character) {
    box.innerHTML = '<div class="small" style="padding:10px">Baro indisponible.</div>';
    inv.innerHTML = '';
    return;
  }
  box.innerHTML = `
    <div style="padding:10px">
      <h3>${b.character}</h3>
      <div class="small">${b.location || ''}</div>
      <div class="small">Du ${fmtTime(b.activation)} au ${fmtTime(b.expiry)}</div>
    </div>
  `;
  const items = Array.isArray(b.inventory) ? b.inventory : [];
  inv.innerHTML = items.map(it => `<li class="row"><div>${it.item || it.type || 'Item'}</div><div class="small">${it.ducats ?? ''} ducats / ${it.credits ?? ''}c</div></li>`).join('') ||
                  '<li class="small">Inventaire vide (hors période)</li>';
}

// (Optionnel) Primes basiques
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
    <h3 class="sub">${title}</h3>
    <ul class="list">${(arr||[]).map(b => `<li><strong>${b.syndicate}</strong> <span class="small">${fmtTime(b.expiry)}</span></li>`).join('') || '<li class="small">—</li>'}</ul>
  `;
  host.innerHTML = renderBucket('Cetus', buckets.Cetus) + renderBucket('Fortuna', buckets.Fortuna) + renderBucket('Deimos', buckets.Deimos);
}

// --------- MAIN WIRING ---------
async function refresh() {
  const platform = $('#platform').value || 'pc';
  const lang = $('#lang').value || 'en';
  const source = ($('#source')?.value || 'live');
  const API = apiBaseFor(source);

  $('#ctx-cycles').textContent    = `${platform}/${lang} · ${new URL(API).host}`;
  $('#ctx-fissures').textContent  = `${platform}/${lang} · ${new URL(API).host}`;
  $('#ctx-nightwave').textContent = `${platform}/${lang} · ${new URL(API).host}`;
  $('#ctx-sorties').textContent   = `${platform}/${lang} · ${new URL(API).host}`;
  $('#ctx-baro').textContent      = `${platform}/${lang} · ${new URL(API).host}`;
  $('#ctx-bounties').textContent  = `${platform}/${lang} · ${new URL(API).host}`;

  const data = await getAggregated(API, platform, lang);

  renderCycles(data);
  renderFissures(data);
  renderNightwave(data);
  renderSortie(data);
  renderArchon(data);
  renderBaro(data);
  renderBounties(data);
}

function tickClock() {
  $('#now').textContent = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
}

// Events
window.addEventListener('DOMContentLoaded', () => {
  tickClock();
  setInterval(tickClock, 1000);

  // Valeurs par défaut
  if ($('#source')) $('#source').value = 'live';

  // Recharge quand on change de plateforme/langue/filtres
  ['platform','lang','source','fissure-tier','fissure-hard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => refresh().catch(console.error));
  });

  refresh().catch(err => {
    console.error('Hub refresh error:', err);
    // Petit fallback visuel
    $('#cycles-list').innerHTML = '<li class="small">Erreur de chargement API</li>';
  });
});
