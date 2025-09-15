/* =========================================================
   HUB.JS v13+
   - ETA: >=24h -> j/h/m/s
   - Masonry
   - Guards (DOM sûr si ID manquant)
   - Platform/lang normalisés en minuscules
   - NEW: Debug panel activable avec ?debug=1 ou localStorage.hubDebug=1
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

  grid: document.querySelector('.wf-grid'),
};

/* ---------- Debug panel (off par défaut) ---------- */
const DEBUG = new URLSearchParams(location.search).has('debug')
  || localStorage.getItem('hubDebug') === '1';

let dbg;
function dbgInit() {
  if (!DEBUG) return;
  dbg = document.createElement('div');
  dbg.id = 'hub-debug';
  dbg.innerHTML = `<div class="hd-head">Hub Debug</div><div class="hd-body"></div>`;
  document.body.appendChild(dbg);
}
function dbgLog(lines) {
  if (!DEBUG || !dbg) return;
  const b = dbg.querySelector('.hd-body');
  b.innerHTML = Array.isArray(lines) ? lines.join('<br/>') : String(lines);
}

/* ---------- Utils ---------- */
function fmtDT(d){
  const pad=n=>String(n).padStart(2,'0');
  const dt=new Date(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

/* ETA avec jours quand >= 24h */
function fmtETA(ms){
  if(!ms || ms < 0) return '0s';
  const totalSeconds = Math.floor(ms/1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

function createEl(tag, cls, txt){ const el=document.createElement(tag); if(cls) el.className=cls; if(txt!=null) el.textContent=txt; return el; }

/* normalisation platform/lang */
function normPlatform(v){ return (v||'pc').toString().trim().toLowerCase(); }
function normLang(v){ return (v||'fr').toString().trim().toLowerCase(); }

async function fetchAgg(platform, lang){
  const p = normPlatform(platform);
  const l = normLang(lang);
  const url = `${API_BASE}/api/${p}?lang=${encodeURIComponent(l)}`;
  if (DEBUG) console.log('[HUB] fetch', url);
  const r = await fetch(url, { cache:'no-store' });
  if(!r.ok) throw new Error(`fetch ${r.status}`);
  return r.json();
}

/* ETA DOM helpers */
function makeEta(expiryIso, label=''){ const s=createEl('span','wf-eta'); if(label) s.append(createEl('span','label',label)); const v=createEl('span','value','—'); v.dataset.exp=String(new Date(expiryIso).getTime()); s.append(v); return s; }
function tickETAs(){ const now=Date.now(); document.querySelectorAll('.wf-eta .value[data-exp]').forEach(n=>{ const ms=Number(n.dataset.exp||0)-now; n.textContent=fmtETA(ms); }); }
setInterval(()=>{ if(els.now) els.now.textContent=fmtDT(Date.now()); tickETAs(); },1000);

/* ---------- Renders (guards inclus) ---------- */
function renderCycles(data){
  if(!els.cyclesList) return;
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
  if(els.ctxCycles) els.ctxCycles.textContent = n? `${n} actifs` : '—';
}

function filterFiss(list){ const tier=(els.fTier?.value||'all').toLowerCase(); const hard=(els.fHard?.value||'all'); return list.filter(f=>{ if(tier!=='all' && (String(f.tier||'').toLowerCase()!==tier)) return false; if(hard==='hard' && !f.isHard) return false; if(hard==='normal' && f.isHard) return false; return true; }); }
function renderFissures(data){
  if(!els.fissuresList) return;
  const all=Array.isArray(data?.fissures)?data.fissures:[]; const list=filterFiss(all);
  els.fissuresList.innerHTML=''; if(els.ctxFissures) els.ctxFissures.textContent=`${list.length}/${all.length} actives`;
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
  if(!els.sortie) return;
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
  if(!els.archon) return;
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
  if(!els.nightwaveList) return;
  const host=els.nightwaveList; host.innerHTML=''; const nw=data?.nightwave;
  if(!nw||!nw.activeChallenges?.length){ if(els.ctxNightwave) els.ctxNightwave.textContent='—'; host.append(createEl('li','muted','Aucun défi actif')); return; }
  if(els.ctxNightwave) els.ctxNightwave.textContent=`${nw.activeChallenges.length} défis`;
  nw.activeChallenges.forEach(c=>{ const li=createEl('li','wf-row'), L=createEl('div','left'), R=createEl('div','right'); L.append(createEl('div','nw-title',c.title||'—')); if(c.desc)L.append(createEl('div','nw-desc',c.desc)); R.append(createEl('span','wf-badge',c.isElite?'Elite':'Normal')); li.append(L,R); host.append(li); });
}

function renderBaro(data){
  if(!els.baroStatus || !els.baroInv) return;
  els.baroStatus.innerHTML=''; els.baroInv.innerHTML='';
  const b=data?.voidTrader; if(!b){ els.baroStatus.textContent='Baro non disponible'; return; }
  const arriving = (new Date(b.activation).getTime() - Date.now()) > 0;
  const p=createEl('p'); p.textContent = arriving ? `Arrive à ${b.location||'—'} dans ` : `Présent à ${b.location||'—'}, part dans `;
  p.append(makeEta(arriving?b.activation:b.expiry,'')); els.baroStatus.append(p);
  (b.inventory||[]).forEach(it=>{ const li=createEl('li','wf-row'); li.append(createEl('div','left',it.item||it.uniqueName||'—')); els.baroInv.append(li); });
}

function rewardText(r){ if(!r) return ''; const a=[]; (r.countedItems||[]).forEach(ci=>a.push(`${ci.count??1}× ${ci.type||ci.key||'Item'}`)); if(r.credits) a.push(`${r.credits.toLocaleString()}c`); if(Array.isArray(r.items)) a.push(...r.items); return a.join(', '); }
function renderInvasions(data){
  if(!els.invList) return;
  const list=Array.isArray(data?.invasions)?data.invasions:[]; els.invList.innerHTML=''; if(els.ctxInv) els.ctxInv.textContent=`${list.length} actives`; if(!list.length){ els.invList.append(createEl('li','muted','Aucune invasion active')); return; }
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
  if(!els.bounty) return;
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

/* ========== Masonry ========== */
function applyMasonry(){
  const grid = els.grid; if(!grid) return;
  const row = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masonry-row')) || 8;
  const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  grid.querySelectorAll('.wf-card').forEach(card=>{
    card.style.gridRowEnd = 'span 1';
    const h = card.getBoundingClientRect().height;
    const rows = Math.ceil((h + gap) / (row + gap));
    card.style.gridRowEnd = `span ${rows}`;
  });
}
const debouncedMasonry=(()=>{ let t=null; return ()=>{ clearTimeout(t); t=setTimeout(applyMasonry,60); }; })();

/* ---------- Main ---------- */
async function loadAndRender(){
  try{
    dbgInit();

    if(els.now) els.now.textContent=fmtDT(Date.now());
    const platform = normPlatform(els.platform?.value);
    const lang = normLang(els.lang?.value);

    const missing = [];
    for (const [k,v] of Object.entries(els)) {
      if (['now','platform','lang','fTier','fHard','grid'].includes(k)) continue;
      if (v == null) missing.push(`#${k.replace(/[A-Z]/g, m => '-'+m.toLowerCase())}`);
    }

    const agg=await fetchAgg(platform, lang);
    LAST.agg=agg;

    renderCycles(agg); renderFissures(agg); renderSortie(agg); renderArchon(agg);
    renderDuviri(agg); renderNightwave(agg); renderBaro(agg); renderInvasions(agg); renderBounties(agg);

    tickETAs();
    debouncedMasonry();

    if (DEBUG) {
      const counts = {
        fissures: (agg.fissures||[]).length,
        invasions: (agg.invasions||[]).length,
        nightwave: (agg.nightwave?.activeChallenges||[]).length,
        sortie: agg.sortie ? 1 : 0,
        archonHunt: agg.archonHunt ? 1 : 0,
        baroInventory: (agg.voidTrader?.inventory||[]).length,
        syndicateMissions: (agg.syndicateMissions||[]).length,
      };
      const lines = [
        `<b>platform/lang:</b> ${platform} / ${lang}`,
        `<b>fetch:</b> OK`,
        `<b>counts:</b> ${Object.entries(counts).map(([k,v])=>`${k}:${v}`).join(' | ')}`,
        missing.length ? `<b>missing IDs:</b> ${missing.join(', ')}` : `<b>missing IDs:</b> none`,
      ];
      dbgLog(lines);
      console.table(counts);
      if (missing.length) console.warn('Missing containers:', missing);
    }
  }catch(e){
    console.error('hub load error', e);
    if (DEBUG) dbgLog([
      `<b>fetch:</b> ERROR`,
      `<b>message:</b> ${e && e.message ? e.message : e}`
    ]);
  }
}

/* Listeners */
if(els.fTier) els.fTier.addEventListener('change',()=>{ LAST.agg&&renderFissures(LAST.agg); debouncedMasonry(); });
if(els.fHard) els.fHard.addEventListener('change',()=>{ LAST.agg&&renderFissures(LAST.agg); debouncedMasonry(); });
if(els.platform) els.platform.addEventListener('change',()=>{ loadAndRender(); });
if(els.lang) els.lang.addEventListener('change',()=>{ loadAndRender(); });
window.addEventListener('resize', debouncedMasonry);

loadAndRender();
