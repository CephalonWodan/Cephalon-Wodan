// tools/merge_warframe_final.js (ESM)
// Usage: node tools/merge_warframe_final.js ./data ./data/merged_warframe.json
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

async function J(p){ try { return JSON.parse(await readFile(p,'utf8')); } catch { return null; } }
const stripTags=(s)=> s==null? s : String(s).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const cleanEntityName=(n)=> String(n||'').replace(/^\s*<[^>]+>\s*/,'').trim();
const typeFrom=(pc,t)=> {
  const p=String(pc||'').toLowerCase(), tt=String(t||'').toLowerCase();
  if(p.includes('spacesuits')||tt.includes('archwing')) return 'archwing';
  if(p.includes('mechsuits')||tt.includes('necramech')||tt.includes('vehicle')) return 'necramech';
  return 'warframe';
};

// --- fallbacks R30 (si pas de wiki_ranks) ---
const R30_EXCEPTIONS = {
  'Inaros':        { health: 200, shields: 0,   energy: 50 },
  'Inaros Prime':  { health: 200, shields: 0,   energy: 50 },
  'Hildryn':       { health: 100, shields: 500, energy: 0  },
  'Hildryn Prime': { health: 100, shields: 500, energy: 0  },
  'Lavos':         { health: 100, shields: 100, energy: 0  }
};
function computeRank30FromR0(r0, name){
  if(!r0) return null;
  const ex = R30_EXCEPTIONS[name];
  const incH = ex?.health  ?? (r0.health  != null ? 100 : null);
  const incS = ex?.shields ?? (r0.shields != null ? 100 : null);
  let incE;
  if(ex?.energy != null) incE = ex.energy;
  else if(r0.energy == null) incE = null;
  else if(r0.energy >= 200) incE = 100;
  else incE = 50;
  const add=(v,i)=> (v==null||i==null)? (v??null):(v+i);
  return {
    health: add(r0.health, incH),
    shields: add(r0.shields, incS),
    energy: add(r0.energy, incE),
    armor: r0.armor ?? null,
    sprintSpeed: r0.sprintSpeed ?? null,
    masteryReq: r0.masteryReq ?? 0
  };
}

// --- abilities helpers ---
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
const affFR2EN=(s)=>{ s=String(s||'').toLowerCase();
  if(s.includes('strength')||s.includes('force')) return 'strength';
  if(s.includes('duration')||s.includes('durée')) return 'duration';
  if(s.includes('range')||s.includes('portée')) return 'range';
  if(s.includes('efficiency')||s.includes('effic')) return 'efficiency';
  if(s.includes('cooldown')) return 'cooldown';
  return null;
};
const mod2key=(m)=>{ m=String(m||'').toUpperCase();
  if(m.includes('STRENGTH')) return 'strength';
  if(m.includes('DURATION')) return 'duration';
  if(m.includes('RANGE')) return 'range';
  if(m.includes('EFFICIENCY')) return 'efficiency';
  return null;
};
function buildSummary(det){
  if(!det) return null;
  const s={ costType: det.summary?.CostType ?? null, costEnergy: det.summary?.costEnergy ?? null,
    strength:null, duration:null, range:null, efficiency:null, affectedBy:[] };
  for(const a of (det.summary?.affectedBy||det.summary?.AffectedBy||[])){
    const k=affFR2EN(a); if(k && !s.affectedBy.includes(k)) s.affectedBy.push(k);
  }
  for(const r of (Array.isArray(det.rows)? det.rows: [])){
    const k=mod2key(r.modifier); if(!k) continue;
    if(s[k]==null) s[k]=r.mainNumeric??null;
    if(!s.affectedBy.includes(k)) s.affectedBy.push(k);
  }
  return s;
}
function cleanRows(det){
  const rows = Array.isArray(det?.rows)? det.rows: [];
  return rows.map(r=>({
    label: stripTags(r.label),
    filledLabel: stripTags(r.filledLabel),
    modifier: r.modifier ?? null,
    values: r.values ?? null,
    mainNumeric: r.mainNumeric ?? null
  }));
}
function mapFrameEntryList(wfAbilities, frameName){
  let list=[];
  if (Array.isArray(wfAbilities)) {
    list = wfAbilities.filter(e => String(e.Powersuit||e.Warframe||e.name||'').toLowerCase() === String(frameName).toLowerCase());
  } else if (wfAbilities && wfAbilities[frameName]) {
    list = wfAbilities[frameName]?.abilities || [];
  }
  return list.map(ab=>({
    slot: Number(ab.SlotKey ?? ab.slot ?? ab.Slot ?? null) || null,
    name: String(ab.Name || ab.name || '').trim(),
    path: ab.InternalName || ab.path || ab.Path || null,
    subsumable: (typeof ab.Subsumable === 'boolean') ? ab.Subsumable
             : (typeof ab.subsumable === 'boolean') ? ab.subsumable : null,
    augments: (()=>{ let ag=ab.Augments??ab.augments??null;
      if(typeof ag==='string') ag=ag.split(',').map(s=>s.trim()).filter(Boolean);
      return Array.isArray(ag)? ag: []; })(),
    desc: ab.Description || ab.desc || ab.description || null
  })).filter(x=>x.name);
}

// --- archwing/necramech overrides ---
function applyAwBaseFromOverride(baseS, baseR, pol, awo){
  if(!awo?.base) return {stats:baseS, statsR30:baseR, polarities:pol, aura:null};
  const b=awo.base; const S={...baseS}, R={...baseR};
  if(b.Energy!=null){ S.energy=b.Energy; R.energy=b.EnergyR30??R.energy; }
  if(b.Health!=null){ S.health=b.Health; R.health=b.HealthR30??R.health; }
  if(b.Shield!=null){ S.shields=b.Shield; R.shields=b.ShieldR30??R.shields; }
  if(b.Armor!=null) { S.armor=b.Armor;   R.armor=b.ArmorR30??R.armor; }
  if(b.SprintSpeed!=null){ S.sprintSpeed=b.SprintSpeed; R.sprintSpeed=b.SprintSpeed; }
  if(b.Mastery!=null){ S.masteryReq=b.Mastery; R.masteryReq=b.Mastery; }
  const polOut = Array.isArray(b.Polarities)? b.Polarities : pol;
  const aura = b.Aura ?? null;
  return {stats:S, statsR30:R, polarities:polOut||[], aura};
}

async function main(){
  const dataDir=resolve(process.argv[2]||'./data');
  const outPath=resolve(process.argv[3]||'./data/merged_warframe.json');

  const exportAll   = await J(join(dataDir,'ExportWarframes_en.json'));
  const wikia       = await J(join(dataDir,'Warframes_wikia.json'));              // optional
  const wfAbilities = await J(join(dataDir,'warframe_abilities.json'));           // required
  const abilities   = await J(join(dataDir,'abilities.json'));                    // required
  const awOverrides = await J(join(dataDir,'aw_overrides.json'));                 // required
  const byFrameList = await J(join(dataDir,'abilities_by_warframe.json')) || {};  // optional
  const polOverrides= await J(join(dataDir,'polarity_overrides.json')) || {};     // optional
  const wikiRanks   = await J(join(dataDir,'wiki_ranks.json'));                   // optional
  const wikiByName  = wikiRanks?.byName || null;

  if(!exportAll || !Array.isArray(exportAll.ExportWarframes)) throw new Error('ExportWarframes_en.json invalide');
  if(!wfAbilities) throw new Error('warframe_abilities.json manquant');
  if(!abilities)   throw new Error('abilities.json manquant');
  if(!awOverrides) throw new Error('aw_overrides.json manquant');

  const A = indexAbilities(abilities);
  const wikiaByName=new Map();
  if(Array.isArray(wikia)) for(const x of wikia){ wikiaByName.set(String(x.name).toLowerCase(), x); }

  const entities=[];

  for(const x of exportAll.ExportWarframes){
    const rawName=x.name||x.Name; if(!rawName) continue;
    const name=rawName, canon=cleanEntity
