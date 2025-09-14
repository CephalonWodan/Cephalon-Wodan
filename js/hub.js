/* =========================================================
   HUB.JS v9 — Cephalon Wodan
   - Consomme l'API Railway /api/:platform?lang=xx
   - Rendu : cycles, fissures, sortie, archon, duviri circuit,
             nightwave, baro, invasions, bounties
   ========================================================= */

const API_BASE = window.API_BASE || 'https://cephalon-wodan-production.up.railway.app';

const els = {
  now: document.getElementById('now'),
  platform: document.getElementById('platform'),
  lang: document.getElementById('lang'),

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
};

function fmtDT(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const dt = new Date(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}
function fmtETA(ms) {
  if (!ms || ms < 0) return '—';
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

function renderNow() {
  els.now.textContent = fmtDT(Date.now());
}

/* ========== RENDER : CYCLES ========== */
function renderCycles(data) {
  const { earthCycle, cetusCycle, vallisCycle, cambionCycle, duviriCycle } = data || {};
  els.cyclesList.innerHTML = '';

  const cycles = [
    ['Earth', earthCycle, (c)=>c?.isDay ? 'day' : 'night'],
    ['Cetus', cetusCycle, (c)=>c?.isDay ? 'day' : 'night'],
    ['Vallis', vallisCycle, (c)=>c?.isWarm ? 'warm' : 'cold'],
    ['Cambion', cambionCycle, (c)=>c?.state || '—'],
    ['Duviri', duviriCycle, (c)=>c?.state || '—'],
  ];

  let count = 0;
  for (const [label, c, stateFn] of cycles) {
    if (!c || !c.expiry) continue;
    count++;
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    left.append(createEl('span', 'inv-node', `${label}`));
    left.append(createEl('span', 'wf-badge', stateFn(c)));
    const right = createEl('div', 'right');
    const ms = new Date(c.expiry).getTime() - Date.now();
    const eta = createEl('span', 'wf-eta');
    eta.append(createEl('span', 'label', 'Expire dans '));
    eta.append(createEl('span', 'value', fmtETA(ms)));
    right.append(eta);
    li.append(left, right);
    els.cyclesList.append(li);
  }
  els.ctxCycles.textContent = count ? `${count} actifs` : '—';
}

/* ========== RENDER : FISSURES ========== */
function renderFissures(data) {
  const list = data?.fissures || [];
  els.fissuresList.innerHTML = '';
  els.ctxFissures.textContent = `${list.length} actives`;

  for (const f of list) {
    const li = createEl('li', 'wf-row');
    const left = createEl('div', 'left');
    const right = createEl('div', 'right');

    left.append(createEl('span', 'inv-node', f.node || '—'));
    left.append(createEl('span', `wf-chip tier-${(f.tier||'').toLowerCase()}`, f.tier || '—'));
    left.append(createEl('span', `wf-chip ${f.isHard ? 'tag-hard' : 'tag-normal'}`, f.isHard ? 'Steel Path' : 'Normal'));
    left.append(createEl('span', 'wf-chip', f.missionType || '—'));

    const ms = new Date(f.expiry).getTime() - Date.now();
    const eta = createEl('span', 'wf-eta');
    eta.append(createEl('span', 'label', 'Expire dans '));
    eta.append(createEl('span', 'value', fmtETA(ms)));
    right.append(eta);

    li.append(left, right);
    els.fissuresList.append(li);
  }
}

/* ========== RENDER : SORTIE / ARCHON ========== */
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
  const ms = new Date(s.expiry).getTime() - Date.now();
  const eta = createEl('span', 'wf-eta');
  eta.append(createEl('span', 'label', 'Expire dans '));
  eta.append(createEl('span', 'value', fmtETA(ms)));
  head.append(eta);

  const variants = createEl('div', 'sortie-variants');
  for (const v of s.variants) {
    const row = createEl('div', 'wf-row');
    const l = createEl('div', 'left');
    l.append(createEl('span', 'wf-chip', v.missionType || v.type || '—'));
    if (v.modifier) l.append(createEl('span', 'wf-chip', v.modifier));
    if (v.node) l.append(createEl('span', 'wf-chip', v.node));
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
  const ms = new Date(a.expiry).getTime() - Date.now();
  const eta = createEl('span', 'wf-eta');
  eta.append(createEl('span', 'label', 'Expire dans '));
  eta.append(createEl('span', 'value', fmtETA(ms)));
  head.append(eta);

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

/* ========== RENDER : DUVIRI CIRCUIT (NOUVEAU) ========== */
function renderDuviri(data) {
  const d = data?.duviriCycle || {};
  els.duviri.innerHTML = '';

  // En-tête (état + ETA)
  const head = createEl('div', 'circuit-head');
  head.append(createEl('span', 'badge-state', `État: ${d.state || '—'}`));
  if (d.expiry) {
    const ms = new Date(d.expiry).getTime() - Date.now();
    const eta = createEl('span', 'wf-eta');
    eta.append(createEl('span', 'label', 'Expire dans '));
    eta.append(createEl('span', 'value', fmtETA(ms)));
    head.append(eta);
  }
  els.duviri.append(head);

  // Groupes Normal / Steel Path selon duviriCycle.choices
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

  // Contexte dans le titre (ex: 3 choix / 5 choix)
  const nCount = (normal?.choices || []).length;
  const hCount = (hard?.choices || []).length;
  if (els.ctxDuviri) {
    const parts = [];
    if (nCount) parts.push(`${nCount} normal`);
    if (hCount) parts.push(`${hCount} hard`);
    els.ctxDuviri.textContent = parts.length ? parts.join(' • ') : '—';
  }
}

/* ========== RENDER : NIGHTWAVE / BARO / INVASIONS / BOUNTIES ========== */
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
    const title = createEl('div', 'nw-title', c.title || '—');
    const desc = createEl('div', 'nw-desc', c.desc || '');
    left.append(title, desc);
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
  const msEnd = new Date(b.expiry).getTime() - Date.now();
  if (msStart > 0) {
    const p = createEl('p');
    p.textContent = `Arrive à ${b.location || '—'} dans `;
    const eta = createEl('span', 'wf-eta'); eta.append(createEl('span', 'value', fmtETA(msStart)));
    p.append(eta);
    els.baroStatus.append(p);
  } else {
    const p = createEl('p');
    p.textContent = `Présent à ${b.location || '—'}, part dans `;
    const eta = createEl('span', 'wf-eta'); eta.append(createEl('span', 'value', fmtETA(msEnd)));
    p.append(eta);
    els.baroStatus.append(p);
  }
  const inv = Array.isArray(b.inventory) ? b.inventory : [];
  for (const it of inv) {
    const li = createEl('li', 'wf-row');
    li.append(createEl('div','left', it.item || it.uniqueName || '—'));
    els.baroInv.append(li);
  }
}
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
function renderBounties() {
  els.bounty.textContent = '—';
}

/* ========== MAIN LOAD ========== */
async function loadAndRender() {
  try {
    renderNow();
    const platform = els.platform.value;
    const lang = els.lang.value;
    const agg = await fetchAgg(platform, lang);
    renderCycles(agg);
    renderFissures(agg);
    renderSortie(agg);
    renderArchon(agg);
    renderDuviri(agg);      // <— Duviri Circuit
    renderNightwave(agg);
    renderBaro(agg);
    renderInvasions(agg);
    renderBounties(agg);
  } catch (e) {
    console.error('hub load error', e);
  }
}

els.platform.addEventListener('change', loadAndRender);
els.lang.addEventListener('change', loadAndRender);
setInterval(renderNow, 1000);
loadAndRender();
