/* =========================================================
   HUB.JS v13 (patch)
   - API Railway /api/:platform?lang=xx
   - Ticker ETA pour cycles, fissures, sortie, archon, baro
   - Filtres fissures (tier + difficulté)
   - Duviri Circuit : affichage des choix (pas d'état/ETA)
   - Bounties (Ostrons / Solaris / Entrati) depuis syndicateMissions
   - Invasions : retrait du badge Infested (inutile ici)
   - Primes : les "chips" dorées sont neutralisées via CSS avec .nochips
   ========================================================= */

const API_BASE = window.API_BASE || 'https://cephalon-wodan-production.up.railway.app';
let LAST = { agg: null };

const els = {
  now: document.getElementById('now'),
  platform: document.getElementById('platform'),
  lang: document.getElementById('lang'),

  // Cycles
  cyclesList: document.getElementById('cycles-list'),
  ctxCycles: document.getElementById('ctx-cycles'),

  // Fissures
  fissuresList: document.getElementById('fissures-list'),
  fTier: document.getElementById('fissure-tier'),
  fHard: document.getElementById('fissure-hard'),
  ctxFissures: document.getElementById('ctx-fissures'),

  // Sortie
  sortie: document.getElementById('sortie'),

  // Archon
  archon: document.getElementById('archon'),

  // Duviri
  duviri: document.getElementById('duviri-circuit'),
  ctxDuviri: document.getElementById('ctx-duviri'),

  // Nightwave
  nightwave: document.getElementById('nightwave-list'),
  ctxNightwave: document.getElementById('ctx-nightwave'),

  // Baro
  baroStatus: document.getElementById('baro-status'),
  baroInv: document.getElementById('baro-inventory'),
  ctxBaro: document.getElementById('ctx-baro'),

  // Invasions
  invList: document.getElementById('invasions-list'),
  ctxInv: document.getElementById('ctx-invasions'),

  // Bounties
  bounty: document.getElementById('bounty-content'),
  ctxBounties: document.getElementById('ctx-bounties'),
};

/* ------------------ Utils ------------------ */
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDT(d) {
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
  const sp = createEl('span', 'eta');
  sp.dataset.expiry = expiry;
  return sp;
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

/* ------------------ Renders ------------------ */
function renderCycles(data) {
  const { earthCycle, cetusCycle, vallisCycle, cambionCycle, duviriCycle } = data || {};
  const list = els.cyclesList;
  if (!list) return;
  list.innerHTML = '';

  const rows = [
    ['Earth',   earthCycle,  (c)=>c?.isDay ? 'day' : 'night'],
    ['Cetus',   cetusCycle,  (c)=>c?.isDay ? 'day' : 'night'],
    ['Vallis',  vallisCycle, (c)=>c?.isWarm ? 'warm' : 'cold'],
    ['Cambion', cambionCycle,(c)=>c?.state || '—'],
    ['Duviri',  duviriCycle, (c)=>c?.state || '—'],
  ];

  let count = 0;
  for (const [label, c, stateFn] of rows) {
    if (!c || !c.expiry) continue;
    count++;
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    left.append(createEl('span', 'inv-node', label));
    left.append(createEl('span', 'wf-badge', stateFn(c)));
    const right = createEl('div', 'right');
    right.append(makeEta(c.expiry));
    li.append(left, right);
    list.append(li);
  }
  if (els.ctxCycles) els.ctxCycles.textContent = count ? `${count} actifs` : '—';
}

/* ------------ Fissures ------------ */
function filterFissures(raw) {
  const tier = els.fTier?.value || 'all';
  const hard = els.fHard?.value || 'all';
  return raw.filter(f => {
    if (tier !== 'all' && (f.tier || '').toLowerCase() !== tier) return false;
    if (hard !== 'all') {
      const isHard = !!f.isHard;
      if (hard === 'normal' && isHard) return false;
      if (hard === 'hard' && !isHard) return false;
    }
    return true;
  });
}
function renderFissures(data) {
  const list = els.fissuresList;
  if (!list) return;
  const fiss = Array.isArray(data?.fissures) ? data.fissures : [];
  const filtered = filterFissures(fiss);
  list.innerHTML = '';
  if (els.ctxFissures) els.ctxFissures.textContent = `${filtered.length}/${fiss.length} actives`;

  for (const f of filtered) {
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    left.append(createEl('span', `wf-chip tier-${(f.tier||'').toLowerCase()}`, f.tier || '—'));
    left.append(createEl('span', `wf-chip ${f.isHard ? 'tag-hard' : 'tag-normal'}`, f.isHard ? 'Steel Path' : 'Normal'));
    if (f.missionType) left.append(createEl('span', 'wf-chip', f.missionType));

    const right = createEl('div', 'right');
    if (f.node) right.append(createEl('span', 'muted', f.node));
    if (f.expiry) right.append(makeEta(f.expiry));

    li.append(left, right);
    list.append(li);
  }
}

/* ------------ Sortie ------------ */
function renderSortie(data) {
  const host = els.sortie;
  if (!host) return;
  const s = data?.sortie;
  host.innerHTML = '';
  if (!s) return;

  const box = createEl('div', 'wf-box');
  const h = createEl('div', 'wf-box__head');
  if (s.boss) h.append(createEl('span', 'wf-chip', s.boss));
  if (s.faction) h.append(createEl('span', 'wf-chip', s.faction));
  if (s.expiry) h.append(makeEta(s.expiry));
  box.append(h);

  if (Array.isArray(s.variants)) {
    const ul = createEl('ul', 'wf-list');
    for (const v of s.variants) {
      const li = createEl('li', 'wf-row');
      const left = createEl('div', 'left');
      if (v.missionType || v.type) left.append(createEl('span', 'wf-chip', v.missionType || v.type));
      if (v.modifier) left.append(createEl('span', 'wf-chip', v.modifier));
      if (v.node) left.append(createEl('span', 'wf-chip', v.node));
      li.append(left, createEl('div', 'right'));
      ul.append(li);
    }
    box.append(ul);
  }
  host.append(box);
}

/* ------------ Archon Hunt ------------ */
function renderArchon(data) {
  const host = els.archon;
  if (!host) return;
  const a = data?.archonHunt;
  host.innerHTML = '';
  if (!a) return;

  const box = createEl('div', 'wf-box');
  const h = createEl('div', 'wf-box__head');
  if (a.boss) h.append(createEl('span', 'wf-chip', a.boss));
  if (a.faction) h.append(createEl('span', 'wf-chip', a.faction));
  if (a.expiry) h.append(makeEta(a.expiry));
  box.append(h);

  if (Array.isArray(a.missions)) {
    const ul = createEl('ul', 'wf-list');
    for (const m of a.missions) {
      const li = createEl('li', 'wf-row');
      const left = createEl('div', 'left');
      if (m.type) left.append(createEl('span', 'wf-chip', m.type));
      if (m.node) left.append(createEl('span', 'wf-chip', m.node));
      li.append(left, createEl('div', 'right'));
      ul.append(li);
    }
    box.append(ul);
  }
  host.append(box);
}

/* ------------ Duviri Circuit (choix) ------------ */
function renderDuviri(data) {
  const host = els.duviri;
  if (!host) return;
  const c = data?.duviriCycle;
  host.innerHTML = '';
  if (!c) return;

  const grp = (title, arr) => {
    const g = createEl('div', 'circuit-group');
    g.append(createEl('div', 'title', title));
    const chips = createEl('div', 'chips');
    if (Array.isArray(arr)) for (const name of arr) chips.append(createEl('span', 'wf-chip', name));
    g.append(chips);
    return g;
  };

  const wrap = createEl('div', 'circuit');
  wrap.append(grp('Normal', c.choices?.normal));
  wrap.append(grp('Steel Path', c.choices?.steel));
  host.append(wrap);

  const n = (c.choices?.normal || []).length;
  const m = (c.choices?.steel || []).length;
  if (els.ctxDuviri) els.ctxDuviri.textContent = `${n} normal • ${m} hard`;
}

/* ------------ Nightwave ------------ */
function renderNightwave(data) {
  const host = els.nightwave;
  if (!host) return;
  const n = data?.nightwave;
  host.innerHTML = '';
  if (!n || !Array.isArray(n.activeChallenges)) {
    if (els.ctxNightwave) els.ctxNightwave.textContent = '—';
    return;
  }

  if (els.ctxNightwave) els.ctxNightwave.textContent = `${n.activeChallenges.length} actifs`;
  const ul = host; // déjà une <ul>
  for (const ch of n.activeChallenges) {
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    left.append(createEl('strong', null, ch.title || ch.id || '—'));
    if (ch.isElite) left.append(createEl('span', 'wf-badge', 'Elite'));
    if (ch.desc) left.append(createEl('div', 'muted', ch.desc));
    li.append(left, createEl('div', 'right'));
    ul.append(li);
  }
}

/* ------------ Baro ------------ */
function renderBaro(data) {
  const st = els.baroStatus, invEl = els.baroInv;
  if (!st || !invEl) return;
  const b = data?.voidTrader;
  st.innerHTML = '';
  invEl.innerHTML = '';
  if (!b) {
    if (els.ctxBaro) els.ctxBaro.textContent = '—';
    return;
  }

  const p = createEl('p');
  if (b.active) {
    p.append(createEl('strong', null, 'Baro est là'));
    p.append(createEl('span', 'muted', ' — départ dans '));
    p.append(makeEta(b.expiry || b.endString));
  } else {
    p.append(createEl('strong', null, 'Prochaine arrivée'));
    p.append(createEl('span', 'muted', ' — dans '));
    p.append(makeEta(b.activation || b.startString));
  }
  st.append(p);

  const inv = Array.isArray(b.inventory) ? b.inventory : [];
  if (inv.length === 0) {
    invEl.append(createEl('li', 'muted', b.active ? 'Inventaire indisponible' : ''));
  } else {
    for (const it of inv) {
      const li = createEl('li', 'wf-row');
      li.append(createEl('div', 'left', it.item || it.uniqueName || '—'));
      invEl.append(li);
    }
  }
}

/* ------------ Invasions ------------ */
function rewardToText(rw) {
  if (!rw) return '';
  const parts = [];
  if (Array.isArray(rw.countedItems)) {
    for (const ci of rw.countedItems) {
      const count = (ci.count ?? 1);
      const name = ci.type || ci.key || 'Item';
      parts.push(`${count}× ${name}`);
    }
  }
  if (rw.credits) parts.push(`${rw.credits.toLocaleString()}c`);
  if (Array.isArray(rw.items)) parts.push(...rw.items);
  return parts.join(', ');
}
function renderInvasions(data) {
  const list = els.invList;
  if (!list) return;
  const inv = Array.isArray(data?.invasions) ? data.invasions : [];
  list.innerHTML = '';
  if (els.ctxInv) els.ctxInv.textContent = `${inv.length} actives`;

  if (!inv.length) {
    list.append(createEl('li', 'muted', 'Aucune invasion active'));
    return;
  }

  for (const v of inv) {
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    const right = createEl('div', 'right');

    const head = createEl('div', 'inv-head');
    head.append(createEl('span', 'inv-node', v.node || '—'));
    if (v.desc) head.append(createEl('span','inv-desc', v.desc));
    left.append(head);

    const vs = createEl('div', 'inv-vs');
    const fAtt = (v.attacker?.faction || '').trim() || 'Attacker';
    const fDef = (v.defender?.faction || '').trim() || 'Defender';
    vs.append(createEl('span', 'inv-fac inv-att', fAtt));
    vs.append(createEl('span', 'muted', 'vs'));
    vs.append(createEl('span', 'inv-fac inv-def', fDef));
    /* NOTE: le badge "Infested" est volontairement non-rendu */
    left.append(vs);

    const rew = createEl('div','inv-rew');
    const attRw = rewardToText(v.attacker?.reward);
    const defRw = rewardToText(v.defender?.reward);
    if (attRw) rew.append(createEl('small', null, `Attacker: ${attRw}`));
    if (defRw) rew.append(createEl('small', null, `Defender: ${defRw}`));
    if (rew.childNodes.length) left.append(rew);

    const barWrap = createEl('div', 'wf-bar');
    const barFill = createEl('div', 'wf-bar__fill');
    const pct = typeof v.completion === 'number'
      ? Math.max(0, Math.min(100, v.completion))
      : 0;
    barFill.style.width = `${pct}%`;
    barWrap.append(barFill);
    left.append(barWrap);

    const lbl = createEl('span', 'wf-bar__label', v.completed ? 'Terminé' : `${pct.toFixed(2)}%`);
    right.append(lbl);

    li.append(left, right);
    list.append(li);
  }
}

/* ------------ Bounties (Ostrons / Solaris / Entrati) ------------ */
function syndicateToZone(s) {
  const k = (s || '').toLowerCase();
  // On conserve uniquement ces 3 zones
  if (k.includes('ostron')) return 'Cetus';
  if (k.includes('solaris')) return 'Orb Vallis';
  if (k.includes('entrati')) return 'Cambion Drift';
  return null;
}
function levelRangeToText(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return null;
  const [a,b] = arr;
  return `${a}-${b}`;
}
function sumStanding(stages) {
  if (!Array.isArray(stages)) return 0;
  return stages.reduce((acc, s) => acc + (s?.standing || 0), 0);
}
function renderBounties(data) {
  const host = els.bounty;
  if (!host) return;
  const sms = Array.isArray(data?.syndicateMissions) ? data.syndicateMissions : [];
  host.innerHTML = '';

  // neutralise les "chips" dorées localement (lisibilité)
  host.classList.add('nochips');

  // filtre 3 zones
  const filtered = sms.filter(sm => !!syndicateToZone(sm.syndicate));

  if (!filtered.length) {
    host.textContent = 'Aucune prime active';
    if (els.ctxBounties) els.ctxBounties.textContent = '—';
    return;
  }

  // contexte (comptes)
  const counts = { 'Cetus':0, 'Orb Vallis':0, 'Cambion Drift':0 };
  for (const j of filtered) counts[syndicateToZone(j.syndicate)]++;
  if (els.ctxBounties) {
    const c = [];
    if (counts['Cetus']) c.push(`Cetus: ${counts['Cetus']}`);
    if (counts['Orb Vallis']) c.push(`Orb Vallis: ${counts['Orb Vallis']}`);
    if (counts['Cambion Drift']) c.push(`Cambion Drift: ${counts['Cambion Drift']}`);
    els.ctxBounties.textContent = c.join(' • ');
  }

  // groupes par zone
  for (const j of filtered) {
    const zone = syndicateToZone(j.syndicate);
    const wrap = createEl('div', 'bounty-group');

    const title = createEl('div', 'bounty-title');
    title.append(createEl('strong', null, zone));
    if (j.expiry) title.append(makeEta(j.expiry));
    wrap.append(title);

    if (Array.isArray(j.jobs)) {
      for (const jb of j.jobs) {
        const row = createEl('div', 'bounty-row');

        const type = jb.type || jb.jobType;
        if (type) row.append(createEl('span', 'wf-chip', type));

        const levelTxt = levelRangeToText(jb.enemyLevels);
        if (levelTxt) row.append(createEl('span', 'wf-chip', `Lv ${levelTxt}`));

        const standingTotal = sumStanding(jb.standingStages);
        if (standingTotal) row.append(createEl('span', 'wf-chip', `${standingTotal} Standing`));

        const mr = jb.minMR || 0;
        if (mr > 0) row.append(createEl('span', 'wf-chip', `MR ${mr}+`));

        if (Array.isArray(jb.rewardPool) && jb.rewardPool.length) {
          const pool = createEl('div', 'bounty-pool');
          pool.textContent = jb.rewardPool.slice(0, 8).join(' • ');
          row.append(pool);
        }

        if (j.expiry) row.append(makeEta(j.expiry));
        wrap.append(row);
      }
    }
    host.append(wrap);
  }
}

/* ------------------ ETA Ticker ------------------ */
function tickETAs() {
  const etas = document.querySelectorAll('[data-expiry]');
  for (const el of etas) setEta(el, el.dataset.expiry);
}
setInterval(tickETAs, 1000);

/* ------------------ Compact Layout ------------------ */
function compactLayout() {
  // laissé volontairement léger (le span est géré par CSS + ordre HTML)
}

/* ------------------ Load & Wire ------------------ */
async function loadAndRender() {
  const platform = els.platform?.value || 'pc';
  const lang = els.lang?.value || 'fr';

  try {
    const agg = await fetchAgg(platform, lang);
    LAST.agg = agg;

    if (els.now) els.now.textContent = fmtDT(new Date());

    renderCycles(agg);
    renderFissures(agg);
    renderSortie(agg);
    renderArchon(agg);
    renderDuviri(agg);
    renderNightwave(agg);
    renderBaro(agg);
    renderInvasions(agg);
    renderBounties(agg);

    tickETAs();
    compactLayout();
  } catch (e) {
    console.error('hub load error', e);
  }
}

/* — Filtres fissures → re-render local sans refetch */
if (els.fTier) els.fTier.addEventListener('change', () => LAST.agg && renderFissures(LAST.agg));
if (els.fHard) els.fHard.addEventListener('change', () => LAST.agg && renderFissures(LAST.agg));

if (els.platform) els.platform.addEventListener('change', loadAndRender);
if (els.lang) els.lang.addEventListener('change', loadAndRender);
window.addEventListener('load', compactLayout);
loadAndRender();
