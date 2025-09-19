// tools/merge_warframe_final.js (ESM) — génère ./data/merged_warframe.json
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

async function J(p){ try { return JSON.parse(await readFile(p,'utf8')); } catch { return null; } }
const stripTags=(s)=> s==null? s : String(s).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();

function cleanEntityName(name){
  if(!name) return name;
  return String(name).replace(/^<[^>]+>\s*/i, '').trim(); // "<ARCHWING> Amesha" -> "Amesha"
}
const typeFrom=(pc,t)=>{
  const p=String(pc||'').toLowerCase(), tt=String(t||'').toLowerCase();
  if (p.includes('spacesuits')||tt.includes('archwing')) return 'archwing';
  if (p.includes('mechsuits')||tt.includes('necramech')||tt.includes('vehicle')) return 'necramech';
  return 'warframe';
};

// Fallback pour Warframes si on n’a pas wiki_ranks.json
const R30_EXCEPTIONS = {
  'Inaros':        { health: 200, shields: 0,   energy: 50 },
  'Inaros Prime':  { health: 200, shields: 0,   energy: 50 },
  'Hildryn':       { health: 100, shields: 500, energy: 0  },
  'Hildryn Prime': { health: 100, shields: 500, energy: 0  },
  'Lavos':         { health: 100, shields: 100, energy: 0  }
};
function computeRank30FromR0(statsR0, frameName) {
  if (!statsR0) return null;
  const ex = frameName ? R30_EXCEPTIONS[frameName] : null;
  const incHealth  = ex?.health  ?? (statsR0.health  != null ? 100 : null);
  const incShields = ex?.shields ?? (statsR0.shields != null ? 100 : null);
  let   incEnergy;
  if (ex?.energy != null) incEnergy = ex.energy;
  else if (statsR0.energy == null) incEnergy = null;
  else if (statsR0.energy >= 200)  incEnergy = 100;
  else                             incEnergy = 50;
  const add = (v, inc) => (inc == null || v == null) ? (v ?? null) : (v + inc);
  return {
    health:      add(statsR0.health, incHealth),
    shields:     add(statsR0.shields, incShields),
    energy:      add(statsR0.energy, incEnergy),
    armor:       statsR0.armor ?? null,
    sprintSpeed: statsR0.sprintSpeed ?? null,
    masteryReq:  statsR0.masteryReq ?? 0
  };
}

// ---- abilities helpers ----
function indexAbilities(abilitiesJson){
  const byName=new Map(), byPath=new Map();
  const arr = Array.isArray(abilitiesJson)? abilitiesJson : (abilitiesJson?.abilities||[]);
  for(const a of arr||[]){
    const nm=String(a.name||a.Name||'').trim();
    const p =String(a.path||a.Path||'').trim();
    if(nm) byName.set(nm.toLowerCase(), a);
    if(p)  byPath.set(p, a);
  }
  return {byName,byPath};
}
const affFR2EN = (s)=> {
  s = String(s||'').toLowerCase();
  if (s.includes('strength') || s.includes('force'))        return 'strength';
  if (s.includes('duration') || s.includes('durée'))        return 'duration';
  if (s.includes('range')    || s.includes('portée'))       return 'range';
  if (s.includes('efficiency')|| s.includes('effic'))       return 'efficiency';
  if (s.includes('cooldown'))                               return 'cooldown';
  return null;
};
const mod2key=(m)=>{ m=String(m||'').toUpperCase();
  if(m.includes('STRENGTH'))   return 'strength';
  if(m.includes('DURATION'))   return 'duration';
  if(m.includes('RANGE'))      return 'range';
  if(m.includes('EFFICIENCY')) return 'efficiency';
  return null;
};
function buildSummary(details){
  if(!details) return null;
  const s = {
    costType: details.summary?.CostType ?? null,
    costEnergy: details.summary?.costEnergy ?? null,
    strength: null, duration: null, range: null, efficiency: null,
    affectedBy: []
  };
  for(const a of (details.summary?.affectedBy||details.summary?.AffectedBy||[])){
    const k=affFR2EN(a); if(k && !s.affectedBy.includes(k)) s.affectedBy.push(k);
  }
  for(const r of (Array.isArray(details.rows)? details.rows: [])){
    const k = mod2key(r.modifier);
    if(!k) continue;
    if(s[k]==null) s[k]=r.mainNumeric??null;
    if(!s.affectedBy.includes(k)) s.affectedBy.push(k);
  }
  return s;
}
function cleanRows(details){
  const rows = Array.isArray(details?.rows)? details.rows: [];
  return rows.map(r=>({
    label: stripTags(r.label),
    filledLabel: stripTags(r.filledLabel),
    modifier: r.modifier ?? null,
    values: r.values ?? null,
    mainNumeric: r.mainNumeric ?? null
  }));
}
function mapFrameEntryList(wfAbilities, frameName){
  let list = [];
  if (Array.isArray(wfAbilities)) {
    list = wfAbilities.filter(e => String(e.Powersuit||e.Warframe||e.name||'').toLowerCase() === String(frameName).toLowerCase());
  } else if (wfAbilities && wfAbilities[frameName]) {
    list = wfAbilities[frameName]?.abilities || [];
  }
  return list.map(ab => ({
    slot: Number(ab.SlotKey ?? ab.slot ?? ab.Slot ?? null) || null,
    name: String(ab.Name || ab.name || '').trim(),
    path: ab.InternalName || ab.path || ab.Path || null,
    subsumable: (typeof ab.Subsumable === 'boolean') ? ab.Subsumable
               : (typeof ab.subsumable === 'boolean') ? ab.subsumable
               : null,
    augments: (() => {
      let ag = ab.Augments ?? ab.augments ?? null;
      if (typeof ag === 'string') ag = ag.split(',').map(s=>s.trim()).filter(Boolean);
      return Array.isArray(ag) ? ag : [];
    })(),
    desc: ab.Description || ab.desc || ab.description || null,
    cost: ab.Cost ?? null,
    costType: ab.CostType ?? null,
  })).filter(x=>x.name);
}

// ---- aw_overrides helpers ----
function applyAwBaseFromOverride(baseS, baseR, pol, awo){
  if(!awo?.base) return {stats:baseS, statsR30:baseR, polarities:pol, aura:null};
  const b=awo.base;
  const S={...baseS}, R={...baseR};
  if(b.Energy!=null){ S.energy=b.Energy; R.energy=b.EnergyR30??R.energy; }
  if(b.Health!=null){ S.health=b.Health; R.health=b.HealthR30??R.health; }
  if(b.Shield!=null){ S.shields=b.Shield; R.shields=b.ShieldR30??R.shields; }
  if(b.Armor!=