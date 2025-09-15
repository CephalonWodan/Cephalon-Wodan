/* ========================================================= 
   HUB.JS v12 — Cephalon Wodan (patch)
   - API Railway /api/:platform?lang=xx
   - Ticker ETA pour cycles, fissures, sortie, archon, baro
   - Filtres fissures (tier + difficulté)
   - Duviri Circuit : affichage des choix (pas d'état/ETA)
   - Bounties (Cetus/Vallis/Cambion/…) depuis syndicateMissions
   - Compactage de layout (span + hide) pour réduire les trous
   ========================================================= */

const API_BASE = window.API_BASE || 'https://cephalon-wodan-production.up.railway.app';
let LAST = { agg: null }; // mémorise la dernière réponse pour re-filtrer sans re-fetch

const els = {
  now: document.getElementById('now'),
  platform: document.getElementById('platform'),
  lang: document.getElementById('lang'),

  // Filtres fissures
  fTier: document.getElementById('fissure-tier'),
  fHard: document.getElementById('fissure-hard'),

  // Sections
  cyclesList: document.getElementById('cycles-list'),
  ctxCycles: document.getElementById('ctx-cycles'),

  fissuresList: document.getElementById('fissures-list'),
  ctxFissures: document.getElementById('ctx-fissures'),

  sortie: document.getElementById('sortie'),
  archon: document.getElementById('archon'),

  duviri: document.getElementById('duviri-circuit'),
  ctxDuviri: document.getElementById('ctx-duviri'),

  nightwaveList: document.getElementById('nightwave-list'),
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
async function fetchAgg(platform, lang) {
  const url = `${API_BASE}/api/${platform}?lang=${encodeURIComponent(lang)}`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`agg ${platform} ${r.status}`);
  return await r.json();
}

/* ---------- petites utils bounty ---------- */
function sum(arr) {
  return Array.isArray(arr) ? arr.reduce((a,b)=>a + (Number(b)||0), 0) : 0;
}
function lvlRangeTxtFromArray(levels) {
  if (!Array.isArray(levels) || levels.length === 0) return '—';
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '—';
  return (min === max) ? String(min) : `${min}-${max}`;
}
function shortenRewards(pool, max = 5) {
  if (!Array.isArray(pool) || pool.length === 0) return '—';
  const score = (s='') => {
    const t = s.toLowerCase();
    if (t.includes('aya')) return 10;
    if (t.includes('blueprint')) return 9;
    if (t.includes('lens')) return 8;
    if (t.includes('endo')) return 7;
    if (t.includes('credit')) return 6;
    if (t.includes('matrix')) return 5;
    if (t.includes('arcane')) return 4;
    return 0;
  };
  const ranked = pool
    .map(s => String(s))
    .map(s => ({ s, sc: score(s) }))
    .sort((a,b) => b.sc - a.sc || a.s.localeCompare(b.s));
  return ranked.slice(0, max).map(x => x.s).join(', ');
}
function syndicateToZone(s) {
  const k = (s || '').toLowerCase();
  if (k.includes('ostron')) return 'Cetus';
  if (k.includes('solaris')) return 'Orb Vallis';
  if (k.includes('entrati')) return 'Cambion Drift';
  if (k.includes('cavia')) return 'Albrecht’s Labs';
  if (k.includes('holdfast') || k.includes('zarium') || k.includes('zariman')) return 'Zariman';
  if (k.includes('hex')) return 'Whispers in the Walls';
  return s || 'Syndicate';
}

/* ------------------ Ticker ETA ------------------ */
function makeEta(expiryIso, labelText = 'Expire dans ') {
  const wrap = createEl('span', 'wf-eta');
  const label = createEl('span', 'label', labelText);
  const value = createEl('span', 'value', '—');
  const ts = new Date(expiryIso).getTime();
  value.dataset.exp = String(Number.isFinite(ts) ? ts : 0);
  wrap.append(label, value);
  return wrap;
}
function tickETAs() {
  const now = Date.now();
  document.querySelectorAll('.wf-eta .value[data-exp]').forEach((node) => {
    const exp = Number(node.dataset.exp || '0');
    const ms = exp - now;
    node.textContent = fmtETA(ms);
  });
}
setInterval(() => {
  els.now.textContent = fmtDT(Date.now());
  tickETAs();
}, 1000);

/* ------------------ Renders ------------------ */
function renderCycles(data) {
  const { earthCycle, cetusCycle, vallisCycle, cambionCycle, duviriCycle } = data || {};
  els.cyclesList.innerHTML = '';

  const cycles = [
    ['Earth',   earthCycle,  (c)=>c?.isDay ? 'day' : 'night'],
    ['Cetus',   cetusCycle,  (c)=>c?.isDay ? 'day' : 'night'],
    ['Vallis',  vallisCycle, (c)=>c?.isWarm ? 'warm' : 'cold'],
    ['Cambion', cambionCycle,(c)=>c?.state || '—'],
    ['Duviri',  duviriCycle, (c)=>c?.state || '—'],
  ];

  let count = 0;
  for (const [label, c, stateFn] of cycles) {
    if (!c || !c.expiry) continue;
    count++;
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    left.append(createEl('span', 'inv-node', label));
    left.append(createEl('span', 'wf-badge', stateFn(c)));

    const right = createEl('div', 'right');
    right.append(makeEta(c.expiry));
    li.append(left, right);
    els.cyclesList.append(li);
  }
  els.ctxCycles.textContent = count ? `${count} actifs` : '—';
}

/* ------------ Fissures + filtres ------------ */
function tierNumToKey(n) {
  // secours si f.tier est absent : 1 Lith, 2 Meso, 3 Neo, 4 Axi, 5 Requiem, 6 Omnia
  const map = { 1:'lith', 2:'meso', 3:'neo', 4:'axi', 5:'requiem', 6:'omnia' };
  return map[Number(n)] || '';
}
function normalizeTierKey(f) {
  const s = String(f?.tier || '').trim().toLowerCase();
  if (s) return s; 
  return tierNumToKey(f?.tierNum);
}
function applyFissureFilters(list) {
  const tierSel = (els.fTier?.value || 'all').toLowerCase();   // 'all'|'lith'|...
  const hardSel = (els.fHard?.value || 'all');                 // 'all'|'normal'|'hard'
  return list.filter((f) => {
    const tKey = normalizeTierKey(f);
    const tierOk = tierSel === 'all' || (tKey === tierSel);
    let hardOk = true;
    if (hardSel === 'hard') hardOk = !!f.isHard;
    else if (hardSel === 'normal') hardOk = !f.isHard;
    return tierOk && hardOk;
  });
}
function renderFissures(data) {
  const all = Array.isArray(data?.fissures) ? data.fissures : [];
  const list = applyFissureFilters(all);

  els.fissuresList.innerHTML = '';
  els.ctxFissures.textContent = `${list.length}/${all.length} actives`;

  for (const f of list) {
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    const right = createEl('div', 'right');

    const tKey = normalizeTierKey(f);
    const tierClass = tKey ? ` tier-${tKey}` : '';

    left.append(createEl('span', 'inv-node', f.node || '—'));
    left.append(createEl('span', `wf-chip${tierClass}`, f.tier || (tKey ? tKey.toUpperCase() : '—')));
    left.append(createEl('span', `wf-chip ${f.isHard ? 'tag-hard' : 'tag-normal'}`, f.isHard ? 'Steel Path' : 'Normal'));
    left.append(createEl('span', 'wf-chip', f.missionType || '—'));

    right.append(makeEta(f.expiry));
    li.append(left, right);
    els.fissuresList.append(li);
  }
}

/* ------------ Sortie / Archon ------------ */
function renderSortie(data) {
  const s = data?.sortie;
  els.sortie.innerHTML = '';
  if (!s || !s.variants?.length) {
    els.sortie.textContent = 'Aucune sortie active';
    return;
  }
  const head = createEl('div', 'inv-head');
  head.append(createEl('span', 'inv-node', s.boss || 'Sortie'));
  head.append(createEl('span', 'wf-badge', s.faction || '—'));
  head.append(makeEta(s.expiry));

  const variants = createEl('div', 'sortie-variants');
  for (const v of s.variants) {
    const row = createEl('div', 'wf-row');
    const l = createEl('div', 'left');
    l.append(createEl('span', 'wf-chip', v.missionType || v.type || '—'));
    if (v.modifier) l.append(createEl('span', 'wf-chip', v.modifier));
    if (v.node)     l.append(createEl('span', 'wf-chip', v.node));
    row.append(l);
    variants.append(row);
  }
  els.sortie.append(head, variants);
}
function renderArchon(data) {
  const a = data?.archonHunt;
  els.archon.innerHTML = '';
  if (!a || !a.missions?.length) {
    els.archon.textContent = 'Aucune Archon Hunt active';
    return;
  }
  const head = createEl('div', 'inv-head');
  head.append(createEl('span', 'inv-node', a.boss || 'Archon Hunt'));
  head.append(createEl('span', 'wf-badge', a.faction || '—'));
  head.append(makeEta(a.expiry));

  const variants = createEl('div', 'sortie-variants');
  for (const m of a.missions) {
    const row = createEl('div', 'wf-row');
    const l = createEl('div', 'left');
    l.append(createEl('span', 'wf-chip', m.type || '—'));
    if (m.node) l.append(createEl('span', 'wf-chip', m.node));
    row.append(l);
    variants.append(row);
  }
  els.archon.append(head, variants);
}

/* ------------ Duviri (choices only) ------------ */
function renderDuviri(data) {
  const d = data?.duviriCycle || {};
  els.duviri.innerHTML = '';

  const choices = Array.isArray(d.choices) ? d.choices : [];
  const normal = choices.find(c => (c.category || '').toLowerCase() === 'normal');
  const hard   = choices.find(c => (c.category || '').toLowerCase() === 'hard');

  function group(label, arr) {
    const wrap = createEl('div', 'circuit-group');
    wrap.append(createEl('div', 'circuit-title', label));
    const chips = createEl('div', 'chips');
    if (arr && Array.isArray(arr) && arr.length) {
      for (const name of arr) chips.append(createEl('span', 'wf-chip', name));
    } else {
      chips.append(createEl('span', 'muted', '—'));
    }
    wrap.append(chips);
    return wrap;
  }

  const container = createEl('div', 'circuit-wrap');
  container.append(group('Normal', normal?.choices || []));
  container.append(group('Steel Path', hard?.choices || []));
  els.duviri.append(container);

  const nCount = (normal?.choices || []).length;
  const hCount = (hard?.choices || []).length;
  if (els.ctxDuviri) {
    const parts = [];
    if (nCount) parts.push(`${nCount} normal`);
    if (hCount) parts.push(`${hCount} hard`);
    els.ctxDuviri.textContent = parts.length ? parts.join(' • ') : '—';
  }
}

/* ------------ Nightwave / Baro ------------ */
function renderNightwave(data) {
  els.nightwaveList.innerHTML = '';
  const nw = data?.nightwave;
  if (!nw || !nw.activeChallenges?.length) {
    els.ctxNightwave.textContent = '—';
    els.nightwaveList.append(createEl('li', 'muted', 'Aucun défi actif'));
    return;
  }
  els.ctxNightwave.textContent = `${nw.activeChallenges.length} défis`;
  for (const c of nw.activeChallenges) {
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    left.append(createEl('div', 'nw-title', c.title || '—'));
    left.append(createEl('div', 'nw-desc', c.desc || ''));
    const right = createEl('div', 'right');
    right.append(createEl('span', 'wf-badge', c.isElite ? 'Elite' : 'Normal'));
    li.append(left, right);
    els.nightwaveList.append(li);
  }
}
function renderBaro(data) {
  els.baroStatus.innerHTML = '';
  els.baroInv.innerHTML = '';
  const b = data?.voidTrader;
  if (!b) {
    els.baroStatus.textContent = 'Baro non disponible';
    return;
  }
  const msStart = new Date(b.activation).getTime() - Date.now();
  if (msStart > 0) {
    const p = createEl('p');
    p.textContent = `Arrive à ${b.location || '—'} dans `;
    p.append(makeEta(b.activation, ''));
    els.baroStatus.append(p);
  } else {
    const p = createEl('p');
    p.textContent = `Présent à ${b.location || '—'}, part dans `;
    p.append(makeEta(b.expiry, ''));
    els.baroStatus.append(p);
  }
  const inv = Array.isArray(b.inventory) ? b.inventory : [];
  for (const it of inv) {
    const li = createEl('li', 'wf-row');
    li.append(createEl('div','left', it.item || it.uniqueName || '—'));
    els.baroInv.append(li);
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
  const inv = Array.isArray(data?.invasions) ? data.invasions : [];
  els.invList.innerHTML = '';
  els.ctxInv.textContent = `${inv.length} actives`;
  if (!inv.length) {
    els.invList.append(createEl('li', 'muted', 'Aucune invasion active'));
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
    const att = createEl('span', 'inv-fac inv-att', fAtt);
    const def = createEl('span', 'inv-fac inv-def', fDef);
    vs.append(att, createEl('span', 'muted', 'vs'), def);
    if (v.vsInfestation) vs.append(createEl('span','inv-fac inv-infested','Infested'));
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

    const lbl = createEl('span','wf-bar__label', `${pct.toFixed(2)}%`);
    right.append(lbl);

    if (v.completed) lbl.textContent = 'Terminé';
    li.append(left, right);
    els.invList.append(li);
  }
}

/* ------------ Bounties (Cetus/Vallis/Cambion/…) ------------ */
function renderBounties(data) {
  const sms = Array.isArray(data?.syndicateMissions) ? data.syndicateMissions : [];
  const host = els.bounty;
  host.innerHTML = '';

  if (!sms.length) {
    host.textContent = 'Aucune bounty active';
    if (els.ctxBounties) els.ctxBounties.textContent = '—';
    return;
  }

  // Regroupe par "zone" dérivée du nom de syndicat
  const byZone = new Map(); // zone -> { title, expiry, jobs: [] }
  for (const sm of sms) {
    const zone = syndicateToZone(sm.syndicate);
    if (!byZone.has(zone)) {
      byZone.set(zone, { title: zone, expiry: sm.expiry || null, jobs: [] });
    }
    const g = byZone.get(zone);
    // expire de groupe (si plusieurs SM pour la même zone, garde la plus proche)
    if (!g.expiry) g.expiry = sm.expiry || null;
    const jobs = Array.isArray(sm.jobs) ? sm.jobs : [];
    g.jobs.push(...jobs);
  }

  // Contexte (ex: Cetus: 6 • Orb Vallis: 6 • Cambion Drift: 8)
  const ctxParts = [];
  for (const [zone, g] of byZone.entries()) {
    ctxParts.push(`${zone}: ${g.jobs.length}`);
  }
  if (els.ctxBounties) els.ctxBounties.textContent = ctxParts.join(' • ');

  // Rendu
  for (const [zone, g] of byZone.entries()) {
    const head = createEl('div', 'circuit-head');
    head.append(createEl('div', 'circuit-title', g.title));
    if (g.expiry) head.append(makeEta(g.expiry));
    host.append(head);

    if (!g.jobs.length) {
      host.append(createEl('div', 'muted', '—'));
      continue;
    }

    const list = document.createElement('ul');
    list.className = 'wf-list no-pad';

    for (const j of g.jobs) {
      const li = createEl('li', 'wf-row');
      const left = createEl('div', 'left');
      const right = createEl('div', 'right');

      // Type
      const type = j.type || j.jobType || 'Bounty';

      // Niveaux (enemyLevels[])
      const levelTxt = lvlRangeTxtFromArray(j.enemyLevels);

      // Standing total (standingStages[])
      const standingTotal = sum(j.standingStages);
      const mr = Number(j.minMR || 0);

      const chips = [];
      chips.push(createEl('span', 'wf-chip', type));
      if (levelTxt !== '—') chips.push(createEl('span', 'wf-chip', `Lv ${levelTxt}`));
      if (standingTotal) chips.push(createEl('span', 'wf-chip', `${standingTotal} Standing`));
      if (mr > 0) chips.push(createEl('span', 'wf-chip', `MR ${mr}+`));
      // timeBound ?
      if (j.timeBound) chips.push(createEl('span', 'wf-chip', `Time: ${j.timeBound}`));
      chips.forEach(ch => left.append(ch));

      // Rewards (aperçu)
      const rewards = shortenRewards(j.rewardPool, 5);
      right.append(createEl('span', 'wf-badge', rewards));

      // ETA si différent de l'expiry de groupe
      if (j.expiry && j.expiry !== g.expiry) {
        right.append(makeEta(j.expiry, ''));
      }

      li.append(left, right);
      list.append(li);
    }

    host.append(list);
  }
}

/* ------------------ Compactage layout ------------------ */
function _len(sel) { try { return document.querySelectorAll(sel).length; } catch { return 0; } }
function _empty(el) { return !el || !el.textContent || el.textContent.trim().length === 0; }

function compactLayout() {
  const grid = document.querySelector('.wf-grid');
  if (!grid) return;

  grid.querySelectorAll('.wf-card').forEach(c => {
    c.classList.remove('col-span-2', 'col-span-3', 'hidden');
  });

  const cardFiss   = els.fissuresList?.closest('.wf-card');
  const cardNight  = els.nightwaveList?.closest('.wf-card');
  const cardBaro   = els.baroStatus?.closest('.wf-card');
  const cardInv    = els.invList?.closest('.wf-card');
  const cardPrimes = els.bounty?.closest('.wf-card');

  if (cardPrimes && _empty(els.bounty)) cardPrimes.classList.add('hidden');
  if (cardBaro) {
    const hasInv = _len('#baro-inventory > li') > 0;
    const hasStatus = !_empty(els.baroStatus);
    if (!hasInv && !hasStatus) cardBaro.classList.add('hidden');
  }

  const w = window.innerWidth;
  if (w >= 1200) {
    if (cardFiss) cardFiss.classList.add('col-span-2');
    if (cardInv && _len('#invasions-list > li') >= 6) cardInv.classList.add('col-span-2');
    if (cardNight && _len('#nightwave-list > li') >= 6) cardNight.classList.add('col-span-2');
  }
}
function debounce(fn, t = 200){ let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a), t); }; }
window.addEventListener('resize', debounce(compactLayout, 200));

/* ------------------ Main ------------------ */
async function loadAndRender() {
  try {
    els.now.textContent = fmtDT(Date.now());
    const platform = els.platform.value;
    const lang = els.lang.value;
    const agg = await fetchAgg(platform, lang);
    LAST.agg = agg;

    renderCycles(agg);
    renderFissures(agg);   // respecte filtres courants
    renderSortie(agg);
    renderArchon(agg);
    renderDuviri(agg);
    renderNightwave(agg);
    renderBaro(agg);
    renderInvasions(agg);
    renderBounties(agg);

    tickETAs();      // 1er tick immédiat
    compactLayout(); // puis compactage
  } catch (e) {
    console.error('hub load error', e);
  }
}

/* — Filtres fissures → re-render local sans refetch */
if (els.fTier) els.fTier.addEventListener('change', () => LAST.agg && renderFissures(LAST.agg));
if (els.fHard) els.fHard.addEventListener('change', () => LAST.agg && renderFissures(LAST.agg));

els.platform.addEventListener('change', loadAndRender);
els.lang.addEventListener('change', loadAndRender);
window.addEventListener('load', compactLayout);
loadAndRender();
