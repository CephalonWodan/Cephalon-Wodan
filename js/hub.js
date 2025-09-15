/* =========================================================
   HUB.JS — rendu Hub (robuste)
   ========================================================= */

const API_BASE = 'https://cephalon-wodan-production.up.railway.app';

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

  grid: document.querySelector('.wf-grid'),
};

/* ===== Debug optionnel ===== */
const DEBUG = new URLSearchParams(location.search).has('debug') || localStorage.getItem('hubDebug')==='1';
let dbg;
function dbgInit(){ if(!DEBUG) return;
  dbg=document.createElement('div'); dbg.id='hub-debug';
  dbg.innerHTML='<div class="hd-head">Hub Debug</div><div class="hd-body"></div>';
  document.body.appendChild(dbg);
}
function dbgLog(lines){ if(DEBUG && dbg){ dbg.querySelector('.hd-body').innerHTML = Array.isArray(lines)?lines.join('<br/>'):String(lines); }}

/* ===== Utils ===== */
function pad(n){return String(n).padStart(2,'0')}
function fmtDT(d){const t=new Date(d);return `${pad(t.getDate())}/${pad(t.getMonth()+1)}/${t.getFullYear()} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`}
/* ETA avec j/h/m/s si ≥ 24h */
function fmtETA(ms){
  if(!ms||ms<0) return '0s';
  const s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
  const parts=[]; if(d>0) parts.push(`${d}j`); if(h>0) parts.push(`${h}h`); if(m>0) parts.push(`${m}m`); parts.push(`${ss}s`);
  return parts.join(' ');
}
function createEl(tag,cls,txt){const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e;}
function normPlatform(v){return (v||'pc').toLowerCase().trim()}
function normLang(v){return (v||'fr').toLowerCase().trim()}
async function fetchAgg(p,l){
  const url=`${API_BASE}/api/${normPlatform(p)}?lang=${encodeURIComponent(normLang(l))}`;
  const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(`fetch ${r.status}`);
  return r.json();
}

/* ETA ticking */
function makeEta(expiryIso,label=''){const span=createEl('span','wf-eta'); if(label) span.append(createEl('span','label',label)); const v=createEl('span','value','—'); v.dataset.exp=String(new Date(expiryIso).getTime()); span.append(v); return span;}
function tickETAs(){const now=Date.now(); document.querySelectorAll('.wf-eta .value[data-exp]').forEach(n=>{const ms=Number(n.dataset.exp||0)-now; n.textContent=fmtETA(ms);});}
setInterval(()=>{ if(els.now) els.now.textContent=fmtDT(Date.now()); tickETAs(); },1000);

/* ===== Renders ===== */
function renderCycles(d){
  if(!els.cyclesList) return;
  const {earthCycle,cetusCycle,vallisCycle,cambionCycle,duviriCycle}=d||{};
  els.cyclesList.innerHTML='';
  const rows=[
    ['Earth',earthCycle,c=>c?.isDay?'day':'night'],
    ['Cetus',cetusCycle,c=>c?.isDay?'day':'night'],
    ['Vallis',vallisCycle,c=>c?.isWarm?'warm':'cold'],
    ['Cambion',cambionCycle,c=>c?.state||'—'],
    ['Duviri',duviriCycle,c=>c?.state||'—'],
  ];
  let n=0;
  for(const [name,c,st] of rows){
    if(!c||!c.expiry) continue; n++;
    const li=createEl('li','wf-row');
    const L=createEl('div','left'); L.append(createEl('span','inv-node',name)); L.append(createEl('span','wf-badge',st(c)));
    const R=createEl('div','right'); R.append(makeEta(c.expiry,''));
    li.append(L,R); els.cyclesList.append(li);
  }
  if(els.ctxCycles) els.ctxCycles.textContent = n?`${n} actifs`:'—';
}

function filterFiss(list){
  const tier=(els.fTier?.value||'all').toLowerCase();
  const hard=(els.fHard?.value||'all');
  return list.filter(f=>{
    if(tier!=='all' && String(f.tier||'').toLowerCase()!==tier) return false;
    if(hard==='hard' && !f.isHard) return false;
    if(hard==='normal' && f.isHard) return false;
    return true;
  });
}
function renderFissures(d){
  if(!els.fissuresList) return;
  const all=Array.isArray(d?.fissures)?d.fissures:[];
  const list=filterFiss(all);
  els.fissuresList.innerHTML='';
  if(els.ctxFissures) els.ctxFissures.textContent=`${list.length}/${all.length} actives`;
  for(const f of list){
    const li=createEl('li','wf-row');
    const L=createEl('div','left');
    L.append(createEl('span',`wf-chip tier-${(f.tier||'').toLowerCase()}`,f.tier||'—'));
    L.append(createEl('span',`wf-chip ${f.isHard?'tag-hard':'tag-normal'}`,f.isHard?'Steel Path':'Normal'));
    L.append(createEl('span','wf-chip',f.missionType||'—'));
    const R=createEl('div','right');
    R.append(createEl('span','muted',f.node||'—'));
    R.append(makeEta(f.expiry,''));
    li.append(L,R); els.fissuresList.append(li);
  }
}

function renderSortie(d){
  if(!els.sortie) return; els.sortie.innerHTML='';
  const s=d?.sortie; if(!s) return;
  const head=createEl('div','inv-head');
  head.append(createEl('span','inv-node',s.boss||'Sortie'));
  head.append(createEl('span','wf-badge',s.faction||'—'));
  head.append(makeEta(s.expiry,''));
  const box=createEl('div','sortie-variants');
  (s.variants||[]).forEach(v=>{
    const r=createEl('div','wf-row'),L=createEl('div','left');
    L.append(createEl('span','wf-chip',v.missionType||v.type||'—'));
    if(v.modifier) L.append(createEl('span','wf-chip',v.modifier));
    if(v.node) L.append(createEl('span','wf-chip',v.node));
    r.append(L); box.append(r);
  });
  els.sortie.append(head,box);
}

function renderArchon(d){
  if(!els.archon) return; els.archon.innerHTML='';
  const a=d?.archonHunt; if(!a) return;
  const head=createEl('div','inv-head');
  head.append(createEl('span','inv-node',a.boss||'Archon Hunt'));
  head.append(createEl('span','wf-badge',a.faction||'—'));
  head.append(makeEta(a.expiry,''));
  const box=createEl('div','sortie-variants');
  (a.missions||[]).forEach(m=>{
    const r=createEl('div','wf-row'),L=createEl('div','left');
    L.append(createEl('span','wf-chip',m.type||'—'));
    if(m.node) L.append(createEl('span','wf-chip',m.node));
    r.append(L); box.append(r);
  });
  els.archon.append(head,box);
}

function renderDuviri(d){
  if(!els.duviri) return; els.duviri.innerHTML='';
  const cyc=d?.duviriCycle||{};
  const arr=Array.isArray(cyc.choices)?cyc.choices:[];
  const normal=arr.find(c=>(c.category||'').toLowerCase()==='normal');
  const hard=arr.find(c=>(c.category||'').toLowerCase()==='hard');
  const wrap=createEl('div','circuit-wrap');

  const grp=(label,items)=>{ const g=createEl('div','circuit-group');
    g.append(createEl('div','circuit-title',label));
    const chips=createEl('div','chips');
    (items||[]).forEach(n=>chips.append(createEl('span','wf-chip',n)));
    if(!items||!items.length) chips.append(createEl('span','muted','—'));
    g.append(chips); return g;
  };

  wrap.append(grp('Normal',normal?.choices||[]));
  wrap.append(grp('Steel Path',hard?.choices||[]));
  els.duviri.append(wrap);

  const n=(normal?.choices||[]).length, h=(hard?.choices||[]).length;
  if(els.ctxDuviri) els.ctxDuviri.textContent=[n?`${n} normal`:null,h?`${h} hard`:null].filter(Boolean).join(' • ')||'—';
}

function renderNightwave(d){
  if(!els.nightwaveList) return; const host=els.nightwaveList; host.innerHTML='';
  const nw=d?.nightwave;
  if(!nw||!nw.activeChallenges?.length){ if(els.ctxNightwave) els.ctxNightwave.textContent='—'; host.append(createEl('li','muted','Aucun défi actif')); return; }
  if(els.ctxNightwave) els.ctxNightwave.textContent=`${nw.activeChallenges.length} défis`;
  nw.activeChallenges.forEach(c=>{
    const li=createEl('li','wf-row');
    const L=createEl('div','left');
    L.append(createEl('div','nw-title',c.title||'—'));
    if(c.desc) L.append(createEl('div','nw-desc',c.desc));
    const R=createEl('div','right'); R.append(createEl('span','wf-badge',c.isElite?'Elite':'Normal'));
    li.append(L,R); host.append(li);
  });
}

function renderBaro(d){
  if(!els.baroStatus||!els.baroInv) return;
  els.baroStatus.innerHTML=''; els.baroInv.innerHTML='';
  const b=d?.voidTrader; if(!b){ els.baroStatus.textContent='Baro non disponible'; return; }
  const arriving=(new Date(b.activation).getTime()-Date.now())>0;
  const p=createEl('p');
  p.textContent=arriving?`Arrive à ${b.location||'—'} dans `:`Présent à ${b.location||'—'}, part dans `;
  p.append(makeEta(arriving?b.activation:b.expiry,''));
  els.baroStatus.append(p);
  (b.inventory||[]).forEach(it=>{
    const li=createEl('li','wf-row'); li.append(createEl('div','left',it.item||it.uniqueName||'—')); els.baroInv.append(li);
  });
}

function rewardText(r){ if(!r) return '';
  const a=[]; (r.countedItems||[]).forEach(ci=>a.push(`${ci.count??1}× ${ci.type||ci.key||'Item'}`));
  if(r.credits) a.push(`${r.credits.toLocaleString()}c`);
  if(Array.isArray(r.items)) a.push(...r.items);
  return a.join(', ');
}
function renderInvasions(d){
  if(!els.invList) return; const list=Array.isArray(d?.invasions)?d.invasions:[]; els.invList.innerHTML='';
  if(els.ctxInv) els.ctxInv.textContent=`${list.length} actives`;
  if(!list.length){ els.invList.append(createEl('li','muted','Aucune invasion active')); return; }
  list.forEach(v=>{
    const li=createEl('li','wf-row');
    const L=createEl('div','left');
    const head=createEl('div','inv-head');
    head.append(createEl('span','inv-node',v.node||'—'));
    if(v.desc) head.append(createEl('span','inv-desc',v.desc));
    L.append(head);

    const vs=createEl('div','inv-vs');
    const fAtt=(v.attacker?.faction||'').trim()||'Attacker';
    const fDef=(v.defender?.faction||'').trim()||'Defender';
    const att=createEl('span','inv-fac inv-att',fAtt);
    const def=createEl('span','inv-fac inv-def',fDef);
    if(fAtt.toLowerCase()==='infested') att.classList.add('inv-infested');
    if(fDef.toLowerCase()==='infested') def.classList.add('inv-infested');
    vs.append(att,createEl('span','muted','vs'),def);
    L.append(vs);

    const rew=createEl('div','inv-rew');
    const ra=rewardText(v.attacker?.reward), rd=rewardText(v.defender?.reward);
    if(ra) rew.append(createEl('small',null,`Attacker: ${ra}`));
    if(rd) rew.append(createEl('small',null,`Defender: ${rd}`));
    if(rew.childNodes.length) L.append(rew);

    const R=createEl('div','right');
    const bar=createEl('div','wf-bar'), fill=createEl('div','wf-bar__fill');
    const pct=typeof v.completion==='number'?Math.max(0,Math.min(100,v.completion)):0;
    fill.style.width=`${pct}%`; bar.append(fill); L.append(bar);
    R.append(createEl('span','wf-bar__label',v.completed?'Terminé':`${pct.toFixed(2)}%`));

    li.append(L,R); els.invList.append(li);
  });
}

function syndicateToZone(s){const k=(s||'').toLowerCase(); if(k.includes('ostron'))return 'Cetus'; if(k.includes('solaris'))return 'Orb Vallis'; if(k.includes('entrati'))return 'Cambion Drift'; return null;}
function lvlTxt(levels){ if(!Array.isArray(levels)||!levels.length) return '—'; const mi=Math.min(...levels), ma=Math.max(...levels); return `${mi}-${ma}`; }
function sum(a){ return (a||[]).reduce((x,y)=>x+(+y||0),0); }
function shorten(pool,limit=5){
  if(!pool) return ''; if(Array.isArray(pool)){const s=pool.slice(0,limit).join(', '); return pool.length>limit?`${s}…`:s;}
  if(typeof pool==='string') return pool;
  if(typeof pool==='object'){const k=Object.keys(pool); const s=k.slice(0,limit).join(', '); return k.length>limit?`${s}…`:s;}
  return '';
}
function renderBounties(d){
  if(!els.bounty) return; els.bounty.innerHTML='';
  const sms=Array.isArray(d?.syndicateMissions)?d.syndicateMissions:[];
  const filt=sms.filter(sm=>!!syndicateToZone(sm.syndicate));
  if(!filt.length){ els.bounty.textContent='Aucune bounty active'; if(els.ctxBounties) els.ctxBounties.textContent='—'; return; }

  const zones=['Cetus','Orb Vallis','Cambion Drift']; const map=new Map();
  filt.forEach(sm=>{
    const z=syndicateToZone(sm.syndicate);
    if(!map.has(z)) map.set(z,{expiry:sm.expiry||null,jobs:[]});
    (sm.jobs||[]).forEach(j=>map.get(z).jobs.push(j));
    if(!map.get(z).expiry && sm.expiry) map.get(z).expiry=sm.expiry;
  });

  if(els.ctxBounties){
    const ctx=[]; zones.forEach(z=>{ if(map.has(z)) ctx.push(`${z}: ${map.get(z).jobs.length}`); });
    els.ctxBounties.textContent=ctx.join(' • ');
  }

  zones.forEach(z=>{
    if(!map.has(z)) return; const g=map.get(z);
    const head=createEl('div','circuit-head'); head.append(createEl('div','circuit-title',z));
    if(g.expiry) head.append(makeEta(g.expiry,'')); els.bounty.append(head);

    const ul=createEl('ul','wf-list no-pad');
    g.jobs.forEach(j=>{
      const li=createEl('li','wf-row'), L=createEl('div','left'), R=createEl('div','right');
      const type=j.type||j.jobType||'Bounty', lv=lvlTxt(j.enemyLevels), st=sum(j.standingStages), mr=+j.minMR||0;
      L.append(createEl('span','wf-chip',type));
      if(lv!=='—') L.append(createEl('span','wf-chip',`Lv ${lv}`));
      if(st) L.append(createEl('span','wf-chip',`${st} Standing`));
      if(mr>0) L.append(createEl('span','wf-chip',`MR ${mr}+`));
      const rewards=shorten(j.rewardPool||j.rewards?.pool||j.rewards?.rewardPool,5);
      R.append(createEl('span','wf-badge',rewards||'—'));
      if(j.expiry && (!g.expiry || j.expiry!==g.expiry)) R.append(makeEta(j.expiry,''));
      li.append(L,R); ul.append(li);
    });
    els.bounty.append(ul);
  });
}

/* ===== Masonry sûr + auto-fallback ===== */
function applyMasonry(){
  const grid=els.grid; if(!grid) return;

  // Activer masonry
  grid.style.gridAutoRows = 'var(--masonry-row)';

  requestAnimationFrame(()=>{
    const row=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masonry-row'))||8;
    const gap=parseFloat(getComputedStyle(grid).rowGap)||0;
    const cards=[...grid.querySelectorAll('.wf-card')];

    let span1=0;
    cards.forEach(card=>{
      card.style.gridRowEnd='span 1';
      const h=card.getBoundingClientRect().height;
      const rows=Math.ceil((h+gap)/(row+gap));
      card.style.gridRowEnd=`span ${Math.max(1,rows)}`;
      if(rows<=1) span1++;
    });

    // Si trop de cartes restent à 1 ligne => fallback stable
    if(cards.length && span1/cards.length>0.7){
      grid.style.gridAutoRows='auto';
      cards.forEach(c=>c.style.gridRowEnd='auto');
      if(DEBUG) console.warn('[HUB] Masonry fallback: auto (span=1 détecté)');
    }
  });
}
const debouncedMasonry=(()=>{let t=null;return()=>{clearTimeout(t);t=setTimeout(applyMasonry,80);};})();

/* Recalc si la taille d'une carte change (ETA, filtres, etc.) */
const ro = new ResizeObserver(debouncedMasonry);
window.addEventListener('load', ()=>{ document.querySelectorAll('.wf-card').forEach(el=>ro.observe(el)); });

/* ===== Main ===== */
async function loadAndRender(){
  try{
    dbgInit();
    if(els.now) els.now.textContent=fmtDT(Date.now());

    const platform=els.platform?els.platform.value:'pc';
    const lang=els.lang?els.lang.value:'fr';

    const agg=await fetchAgg(platform,lang);

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
    debouncedMasonry();

    if(DEBUG){
      const counts={
        fissures:(agg.fissures||[]).length,
        invasions:(agg.invasions||[]).length,
        nightwave:(agg.nightwave?.activeChallenges||[]).length,
        sortie:agg.sortie?1:0,
        archonHunt:agg.archonHunt?1:0,
        baroInventory:(agg.voidTrader?.inventory||[]).length,
        syndicateMissions:(agg.syndicateMissions||[]).length,
      };
      dbgLog([
        `<b>platform/lang:</b> ${platform} / ${lang}`,
        `<b>counts:</b> ${Object.entries(counts).map(([k,v])=>`${k}:${v}`).join(' | ')}`
      ]);
    }
  }catch(e){
    console.error('hub load error',e);
    if(DEBUG) dbgLog(`<b>error:</b> ${e?.message||e}`);
  }
}

/* Listeners (filtres & sélecteurs) */
els.fTier && els.fTier.addEventListener('change',()=>{ loadAndRender(); });
els.fHard && els.fHard.addEventListener('change',()=>{ loadAndRender(); });
els.platform && els.platform.addEventListener('change',()=>{ loadAndRender(); });
els.lang && els.lang.addEventListener('change',()=>{ loadAndRender(); });
window.addEventListener('resize', debouncedMasonry);

loadAndRender();
