/* =========================================================
   HUB.JS — affichage Hub (division Primes en 3 cartes)
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

  // === nouveaux conteneurs pour Primes
  bountyCetus:   document.getElementById('bounty-cetus'),
  bountyVallis:  document.getElementById('bounty-vallis'),
  bountyCambion: document.getElementById('bounty-cambion'),
  ctxCetus:   document.getElementById('ctx-bounties-cetus'),
  ctxVallis:  document.getElementById('ctx-bounties-vallis'),
  ctxCambion: document.getElementById('ctx-bounties-cambion'),
};

/* ===== Debug (optionnel via ?debug=1) ===== */
const DEBUG = new URLSearchParams(location.search).has('debug') || localStorage.getItem('hubDebug')==='1';
let dbg;
function dbgInit(){ if(!DEBUG) return;
  dbg=document.createElement('div'); dbg.id='hub-debug';
  dbg.innerHTML='<div class="hd-head">Hub Debug</div><div class="hd-body"></div>';
  document.body.appendChild(dbg);
}
function dbgLog(x){ if(DEBUG&&dbg){ dbg.querySelector('.hd-body').innerHTML=Array.isArray(x)?x.join('<br/>'):String(x); }}

/* ===== Utils ===== */
const pad=n=>String(n).padStart(2,'0');
const fmtDT=d=>{const t=new Date(d);return `${pad(t.getDate())}/${pad(t.getMonth()+1)}/${t.getFullYear()} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`};
/* ETA j/h/m/s */
function fmtETA(ms){
  if(!ms||ms<0) return '0s';
  const s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
  const parts=[]; if(d>0) parts.push(`${d}j`); if(h>0) parts.push(`${h}h`); if(m>0) parts.push(`${m}m`); parts.push(`${ss}s`);
  return parts.join(' ');
}
function createEl(tag,cls,txt){const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e;}
const normPlatform=v=>(v||'pc').toLowerCase().trim();
const normLang=v=>(v||'fr').toLowerCase().trim();
async function fetchAgg(p,l){
  const url=`${API_BASE}/api/${normPlatform(p)}?lang=${encodeURIComponent(normLang(l))}`;
  const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(`fetch ${r.status}`); return r.json();
}

/* ETA ticking */
function makeEta(expiryIso,label=''){const s=createEl('span','wf-eta'); if(label) s.append(createEl('span','label',label)); const v=createEl('span','value','—'); v.dataset.exp=String(new Date(expiryIso).getTime()); s.append(v); return s;}
function tickETAs(){const now=Date.now(); document.querySelectorAll('.wf-eta .value[data-exp]').forEach(n=>{n.textContent=fmtETA(Number(n.dataset.exp||0)-now);});}
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
  if(els.ctxCycles) els.ctxCycles.textContent=n?`${n} actifs`:'—';
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
  const cyc=d?.duviriCycle||{}; const arr=Array.isArray(cyc.choices)?cyc.choices:[];
  const normal=arr.find(c=>(c.category||'').toLowerCase()==='normal');
  const hard=arr.find(c=>(c.category||'').toLowerCase()==='hard');
  const wrap=createEl('div','circuit-wrap');

  const grp=(label,items)=>{const g=createEl('div','circuit-group');
    g.append(createEl('div','circuit-title',label));
    const chips=createEl('div','chips');
    (items||[]).forEach(n=>chips.append(createEl('span','wf-chip',n)));
    if(!items||!items.length) chips.append(createEl('span','muted','—'));
    g.append(chips);return g;};

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
  p.append(makeEta(arriving?b.activation:b.expiry,'')); els.baroStatus.append(p);
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
function lvlTxt(levels){ if(!Array.isArray(levels)||!levels.length) return '—'; const mi=Math.min(...levels), ma=Math.max(...levels); return `${mi}-${ma}`; }
const sum=a=>(a||[]).reduce((x,y)=>x+(+y||0),0);
function shorten(pool,limit=5){
  if(!pool) return '';
  if(Array.isArray(pool)){const s=pool.slice(0,limit).join(', '); return pool.length>limit?`${s}…`:s;}
  if(typeof pool==='string') return pool;
  if(typeof pool==='object'){const k=Object.keys(pool); const s=k.slice(0,limit).join(', '); return k.length>limit?`${s}…`:s;}
  return '';
}

/* === PRIMES réparties en 3 cartes */
function renderBounties(d){
  const sms = Array.isArray(d?.syndicateMissions) ? d.syndicateMissions : [];

  // Préparer les zones (host + contexte)
  const zones = {
    'Cetus': { el: els.bountyCetus, ctx: els.ctxCetus, jobs: [], expiry: null },
    'Orb Vallis': { el: els.bountyVallis, ctx: els.ctxVallis, jobs: [], expiry: null },
    'Cambion Drift': { el: els.bountyCambion, ctx: els.ctxCambion, jobs: [], expiry: null },
  };
  // Clear
  Object.values(zones).forEach(z => { if(z.el){ z.el.innerHTML=''; } if(z.ctx){ z.ctx.textContent='—'; } });

  // Dispatcher par syndicat
  sms.forEach(sm=>{
    const s = (sm.syndicate||'').toLowerCase();
    let Z = null;
    if(s.includes('ostron')) Z='Cetus';
    else if(s.includes('solaris')) Z='Orb Vallis';
    else if(s.includes('entrati')) Z='Cambion Drift';
    if(!Z) return;
    const zone = zones[Z];
    if(!zone) return;
    if(sm.expiry) zone.expiry = zone.expiry || sm.expiry; // garder un expiry de groupe si dispo
    (sm.jobs||[]).forEach(j=>zone.jobs.push(j));
  });

  // Rendu de chaque carte
  Object.entries(zones).forEach(([name,zone])=>{
    const host=zone.el; const ctx=zone.ctx;
    if(!host) return;

    if(!zone.jobs.length){
      host.textContent = 'Aucune prime active';
      if(ctx) ctx.textContent='—';
      return;
    }
    if(ctx) ctx.textContent = `${zone.jobs.length}`;

    // En-tête optionnelle ETA de la zone
    if(zone.expiry){
      const head = createEl('div','circuit-head');
      head.append(makeEta(zone.expiry,''));
      host.append(head);
    }

    const ul = createEl('ul','wf-list no-pad');
    zone.jobs.forEach(j=>{
      const li=createEl('li','wf-row'), L=createEl('div','left'), R=createEl('div','right');
      const type=j.type||j.jobType||'Bounty', lv=lvlTxt(j.enemyLevels), st=sum(j.standingStages), mr=+j.minMR||0;
      L.append(createEl('span','wf-chip',type));
      if(lv!=='—') L.append(createEl('span','wf-chip',`Lv ${lv}`));
      if(st) L.append(createEl('span','wf-chip',`${st} Standing`));
      if(mr>0) L.append(createEl('span','wf-chip',`MR ${mr}+`));
      const rewards=shorten(j.rewardPool||j.rewards?.pool||j.rewards?.rewardPool,5);
      R.append(createEl('span','wf-badge',rewards||'—'));
      if(j.expiry && (!zone.expiry || j.expiry!==zone.expiry)) R.append(makeEta(j.expiry,''));
      li.append(L,R); ul.append(li);
    });
    host.append(ul);
  });
}

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
      dbgLog([`<b>platform/lang:</b> ${platform} / ${lang}`,
              `<b>counts:</b> ${Object.entries(counts).map(([k,v])=>`${k}:${v}`).join(' | ')}`]);
    }
  }catch(e){
    console.error('hub load error',e);
    if(DEBUG) dbgLog(`<b>error:</b> ${e?.message||e}`);
  }
}

/* Listeners */
els.fTier && els.fTier.addEventListener('change',loadAndRender);
els.fHard && els.fHard.addEventListener('change',loadAndRender);
els.platform && els.platform.addEventListener('change',loadAndRender);
els.lang && els.lang.addEventListener('change',loadAndRender);

loadAndRender();
