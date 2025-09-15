/* =========================================================
   HUB.JS v13 — patches:
   - Masonry (remplit les “trous” verticaux)
   - AUCUNE autre logique changée
   ========================================================= */

const API_BASE = window.API_BASE || 'https://cephalon-wodan-production.up.railway.app';
let LAST = { agg: null };

const els = {
  now: document.getElementById('now'),
  platform: document.getElementById('platform'),
  lang: document.getElementById('lang'),

  fTier: document.getElementById('fissure-tier'),
  fHard: document.getElementById('fissure-hard'),

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

  grid: document.querySelector('.wf-grid'), // PATCH masonry
};

/* Utils */
function fmtDT(d){ const pad=n=>String(n).padStart(2,'0'); const dt=new Date(d); return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`; }
function fmtETA(ms){ if(!ms||ms<0) return '0s'; const s=Math.floor(ms/1000); const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const ss=s%60; const a=[]; if(h)a.push(`${h}h`); if(m)a.push(`${m}m`); a.push(`${ss}s`); return a.join(' '); }
function createEl(tag, cls, txt){ const el=document.createElement(tag); if(cls) el.className=cls; if(txt!=null) el.textContent=txt; return el; }
async function fetchAgg(platform, lang){ const r=await fetch(`${API_BASE}/api/${platform}?lang=${encodeURIComponent(lang)}`,{cache:'no-store'}); if(!r.ok) throw new Error(r.status); return r.json(); }

/* ETA */
function makeEta(expiryIso, label=''){ const s=createEl('span','wf-eta'); if(label) s.append(createEl('span','label',label)); const v=createEl('span','value','—'); v.dataset.exp=String(new Date(expiryIso).getTime()); s.append(v); return s; }
function tickETAs(){ const now=Date.now(); document.querySelectorAll('.wf-eta .value[data-exp]').forEach(n=>{ const ms=Number(n.dataset.exp||0)-now; n.textContent=fmtETA(ms); }); }
setInterval(()=>{ const now=els.now; if(now) now.textContent=fmtDT(Date.now()); tickETAs(); },1000);

/* Renders (identiques à ta version précédente — abrégés ici pour concision) */
function renderCycles(data){
  const { earthCycle, cetusCycle, vallisCycle, cambionCycle, duviriCycle } = data || {};
  els.cyclesList.innerHTML='';
  const rows=[
    ['Earth', earthCycle, c=>c?.isDay?'day':'night'],
    ['Cetus', cetusCycle, c=>c?.isDay?'day':'night'],
    ['Vallis', vallisCycle, c=>c?.isWarm?'warm':'cold'],
    ['Cambion', cambionCycle, c=>c?.state||'—'],
    ['Duviri', duviriCycle, c=>c?.state||'—'],
  ];
  let n=0;
  for(const [name,c,st] of rows){
    if(!c||!c.expiry) continue; n++;
    const li=createEl('li','wf-row');
    const left=createEl('div','left');
    left.append(createEl('span','inv-node',name));
    left.append(createEl('span','wf-badge',st(c)));
    const right=createEl('div','right');
    right.append(makeEta(c.expiry,''));
    li.append(left,right);
    els.cyclesList.append(li);
  }
  els.ctxCycles.textContent = n? `${n} actifs` : '—';
}

function filterFiss(list){ const tier=(els.fTier?.value||'all').toLowerCase(); const hard=(els.fHard?.value||'all'); return list.filter(f=>{ if(tier!=='all' && (String(f.tier||'').toLowerCase()!==tier)) return false; if(hard==='hard' && !f.isHard) return false; if(hard==='normal' && f.isHard) return false; return true; }); }
function renderFissures(data){
  const all=Array.isArray(data?.fissures)?data.fissures:[]; const list=filterFiss(all);
  els.fissuresList.innerHTML=''; els.ctxFissures.textContent=`${list.length}/${all.length} actives`;
  for(const f of list){
    const li=createEl('li','wf-row'), L=createEl('div','left'), R=createEl('div','right');
    L.append(createEl('span',`wf-chip tier-${(f.tier||'').toLowerCase()}`,f.tier||'—'));
    L.append(createEl('span',`wf-chip ${f.isHard?'tag-hard':'tag-normal'}`,f.isHard?'Steel Path':'Normal'));
    L.append(createEl('span','wf-chip',f.missionType||'—'));
    R.append(createEl('span','muted',f.node||'—'));
    R.append(makeEta(f.expiry,''));
    li.append(L,R); els.fissuresList.append(li);
  }
}

function renderSortie(data){
  els.sortie.innerHTML=''; const s=data?.sortie; if(!s) return;
  const head=createEl('div','inv-head');
  head.append(createEl('span','inv-node',s.boss||'Sortie'));
  head.append(createEl('span','wf-badge',s.faction||'—'));
  head.append(makeEta(s.expiry,''));
  const box=createEl('div','sortie-variants');
  (s.variants||[]).forEach(v=>{ const r=createEl('div','wf-row'), L=createEl('div','left'); L.append(createEl('span','wf-chip',v.missionType||v.type||'—')); if(v.modifier)L.append(createEl('span','wf-chip',v.modifier)); if(v.node)L.append(createEl('span','wf-chip',v.node)); r.append(L); box.append(r); });
  els.sortie.append(head,box);
}
function renderArchon(data){
  els.archon.innerHTML=''; const a=data?.archonHunt; if(!a) return;
  const head=createEl('div','inv-head');
  head.append(createEl('span','inv-node',a.boss||'Archon Hunt'));
  head.append(createEl('span','wf-badge',a.faction||'—'));
  head.append(makeEta(a.expiry,''));
  const box=createEl('div','sortie-variants');
  (a.missions||[]).forEach(m=>{ const r=createEl('div','wf-row'), L=createEl('div','left'); L.append(createEl('span','wf-chip',m.type||'—')); if(m.node)L.append(createEl('span','wf-chip',m.node)); r.append(L); box.append(r); });
  els.archon.append(head,box);
}

function renderDuviri(data){
  if(!els.duviri) return;
  els.duviri.innerHTML=''; const d=data?.duviriCycle||{};
  const choices=Array.isArray(d.choices)?d.choices:[]; const normal=choices.find(c=>(c.category||'').toLowerCase()==='normal'); const hard=choices.find(c=>(c.category||'').toLowerCase()==='hard');
  const wrap=createEl('div','circuit-wrap');
  const grp=(label,arr)=>{ const g=createEl('div','circuit-group'); g.append(createEl('div','circuit-title',label)); const chips=createEl('div','chips'); (arr||[]).forEach(n=>chips.append(createEl('span','wf-chip',n))); if(!arr||!arr.length) chips.append(createEl('span','muted','—')); g.append(chips); return g; };
  wrap.append(grp('Normal',normal?.choices||[])); wrap.append(grp('Steel Path',hard?.choices||[]));
  els.duviri.append(wrap);
  const n=(normal?.choices||[]).length, h=(hard?.choices||[]).length;
  if(els.ctxDuviri) els.ctxDuviri.textContent = [n?`${n} normal`:null,h?`${h} hard`:null].filter(Boolean).join(' • ') || '—';
}

function renderNightwave(data){
  const host=els.nightwaveList; host.innerHTML=''; const nw=data?.nightwave;
  if(!nw||!nw.activeChallenges?.length){ els.ctxNightwave.textContent='—'; host.append(createEl('li','muted','Aucun défi actif')); return; }
  els.ctxNightwave.textContent=`${nw.activeChallenges.length} défis`;
  nw.activeChallenges.forEach(c=>{ const li=createEl('li','wf-row'), L=createEl('div','left'), R=createEl('div','right'); L.append(createEl('div','nw-title',c.title||'—')); if(c.desc)L.append(createEl('div','nw-desc',c.desc)); R.append(createEl('span','wf-badge',c.isElite?'Elite':'Normal')); li.append(L,R); host.append(li); });
}

function renderBaro(data){
  els.baroStatus.innerHTML=''; els.baroInv.innerHTML='';
  const b=data?.voidTrader; if(!b){ els.baroStatus.textContent='Baro non disponible'; return; }
  const arriving = (new Date(b.activation).getTime() - Date.now()) > 0;
  const p=createEl('p'); p.textContent = arriving ? `Arrive à ${b.location||'—'} dans ` : `Présent à ${b.location||'—'}, part dans `;
  p.append(makeEta(arriving?b.activation:b.expiry,'')); els.baroStatus.append(p);
  (b.inventory||[]).forEach(it=>{ const li=createEl('li','wf-row'); li.append(createEl('div','left',it.item||it.uniqueName||'—')); els.baroInv.append(li); });
}

function rewardText(r){ if(!r) return ''; const a=[]; (r.countedItems||[]).forEach(ci=>a.push(`${ci.count??1}× ${ci.type||ci.key||'Item'}`)); if(r.credits) a.push(`${r.credits.toLocaleString()}c`); if(Array.isArray(r.items)) a.push(...r.items); return a.join(', '); }
function renderInvasions(data){
  const list=Array.isArray(data?.invasions)?data.invasions:[]; els.invList.innerHTML=''; els.ctxInv.textContent=`${list.length} actives`; if(!list.length){ els.invList.append(createEl('li','muted','Aucune invasion active')); return; }
  list.forEach(v=>{
    const li=createEl('li','wf-row'), L=createEl('div','left'), R=createEl('div','right');
    const head=createEl('div','inv-head'); head.append(createEl('span','inv-node',v.node||'—')); if(v.desc) head.append(createEl('span','inv-desc',v.desc)); L.append(head);
    const vs=createEl('div','inv-vs'); const fAtt=(v.attacker?.faction||'').trim()||'Attacker'; const fDef=(v.defender?.faction||'').trim()||'Defender';
    vs.append(createEl('span','inv-fac inv-att',fAtt), createEl('span','muted','vs'), createEl('span','inv-fac inv-def',fDef)); L.append(vs);
    const rew=createEl('div','inv-rew'); const a=rewardText(v.attacker?.reward), d=rewardText(v.defender?.reward); if(a) rew.append(createEl('small',null,`Attacker: ${a}`)); if(d) rew.append(createEl('small',null,`Defender: ${d}`)); if(rew.childNodes.length) L.append(rew);
    const bar=createEl('div','wf-bar'), fill=createEl('div','wf-bar__fill'); const pct=typeof v.completion==='number'?Math.max(0,Math.min(100,v.completion)):0; fill.style.width=`${pct}%`; bar.append(fill); L.append(bar);
    R.append(createEl('span','wf-bar__label', v.completed?'Terminé':`${pct.toFixed(2)}%`));
    li.append(L,R); els.invList.append(li);
  });
}

function syndicateToZone(s){ const k=(s||'').toLowerCase(); if(k.includes('ostron'))return 'Cetus'; if(k.includes('solaris'))return 'Orb Vallis'; if(k.includes('entrati'))return 'Cambion Drift'; return null; }
function lvlTxt(levels){ if(!Array.isArray(levels)||!levels.length) return '—'; const mi=Math.min(...levels), ma=Math.max(...levels); return `${mi}-${ma}`; }
function sum(a){ return (a||[]).reduce((x,y)=>x+(+y||0),0); }
function shorten(pool,limit=5){ if(!pool) return ''; if(Array.isArray(pool)){ const s=pool.slice(0,limit).join(', '); return pool.length>limit?`${s}…`:s; } if(typeof pool==='string') return pool; if(typeof pool==='object'){ const k=Object.keys(pool); const s=k.slice(0,limit).join(', '); return k.length>limit?`${s}…`:s; } return ''; }
function renderBounties(data){
  const sms=Array.isArray(data?.syndicateMissions)?data.syndicateMissions:[]; const host=els.bounty; host.innerHTML='';
  const filtered=sms.filter(sm=>!!syndicateToZone(sm.syndicate)); if(!filtered.length){ host.textContent='Aucune bounty active'; if(els.ctxBounties) els.ctxBounties.textContent='—'; return; }
  const zones=['Cetus','Orb Vallis','Cambion Drift']; const map=new Map();
  filtered.forEach(sm=>{ const z=syndicateToZone(sm.syndicate); if(!map.has(z)) map.set(z,{expiry:sm.expiry||null,jobs:[]}); (sm.jobs||[]).forEach(j=>map.get(z).jobs.push(j)); if(!map.get(z).expiry && sm.expiry) map.get(z).expiry=sm.expiry; });
  if(els.ctxBounties){ const ctx=[]; zones.forEach(z=>{ if(map.has(z)) ctx.push(`${z}: ${map.get(z).jobs.length}`); }); els.ctxBounties.textContent=ctx.join(' • '); }
  zones.forEach(z=>{ if(!map.has(z)) return; const g=map.get(z);
    const head=createEl('div','circuit-head'); head.append(createEl('div','circuit-title',z)); if(g.expiry) head.append(makeEta(g.expiry,'')); host.append(head);
    const ul=createEl('ul','wf-list no-pad');
    g.jobs.forEach(j=>{ const li=createEl('li','wf-row'), L=createEl('div','left'), R=createEl('div','right');
      const type=j.type||j.jobType||'Bounty', lv=lvlTxt(j.enemyLevels), st=sum(j.standingStages), mr=+j.minMR||0;
      L.append(createEl('span','wf-chip',type)); if(lv!=='—') L.append(createEl('span','wf-chip',`Lv ${lv}`)); if(st) L.append(createEl('span','wf-chip',`${st} Standing`)); if(mr>0) L.append(createEl('span','wf-chip',`MR ${mr}+`));
      const rewards=shorten(j.rewardPool||j.rewards?.pool||j.rewards?.rewardPool,5); R.append(createEl('span','wf-badge',rewards||'—')); if(j.expiry && (!g.expiry || j.expiry!==g.expiry)) R.append(makeEta(j.expiry,'')); li.append(L,R); ul.append(li);
    });
    host.append(ul);
  });
}

/* ========== PATCH Masonry ========== */
function applyMasonry(){
  const grid = els.grid; if(!grid) return;
  const row = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masonry-row')) || 8;
  const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  grid.querySelectorAll('.wf-card').forEach(card=>{
    card.style.gridRowEnd = 'span 1';   // reset
    const h = card.getBoundingClientRect().height;
    const rows = Math.ceil((h + gap) / (row + gap));
    card.style.gridRowEnd = `span ${rows}`;
  });
}
const debouncedMasonry=(()=>{ let t=null; return ()=>{ clearTimeout(t); t=setTimeout(applyMasonry,60); }; })();

/* Main */
async function loadAndRender(){
  try{
    if(els.now) els.now.textContent=fmtDT(Date.now());
    const agg=await fetchAgg(els.platform.value, els.lang.value);
    LAST.agg=agg;
    renderCycles(agg); renderFissures(agg); renderSortie(agg); renderArchon(agg);
    renderDuviri(agg); renderNightwave(agg); renderBaro(agg); renderInvasions(agg); renderBounties(agg);
    tickETAs();
    debouncedMasonry();               // PATCH: masonry après rendu
  }catch(e){ console.error('hub load error', e); }
}

if(els.fTier) els.fTier.addEventListener('change',()=>{ LAST.agg&&renderFissures(LAST.agg); debouncedMasonry(); });
if(els.fHard) els.fHard.addEventListener('change',()=>{ LAST.agg&&renderFissures(LAST.agg); debouncedMasonry(); });
els.platform.addEventListener('change', loadAndRender);
els.lang.addEventListener('change', loadAndRender);
window.addEventListener('resize', debouncedMasonry);

loadAndRender();
