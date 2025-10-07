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
  const s={
    costType:   det.summary?.CostType ?? det.summary?.costType ?? null, // <- préserve les 2 casses
    costEnergy: det.summary?.costEnergy ?? null,
    strength:null, duration:null, range:null, efficiency:null, affectedBy:[]
  };
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

// --- helpers Wiki: robustesse sur les clés aura/polarities ---
function getWikiEntry(wikiaMap, canon){
  const lc = String(canon||'').toLowerCase();
  const base = lc.replace(/\s+(prime|umbra)\b/i,'').trim();
  return wikiaMap.get(lc) || wikiaMap.get(base) || null;
}
function extractPolFromWiki(w0){
  // polarities: peut être Array ou dans un objet { slots:[], polarities:[], aura: "" }
  let polarities = [];
  let aura = null;

  const polyObj = (w0 && typeof w0 === 'object') ? (
    Array.isArray(w0.polarities) ? { slots:w0.polarities } :
    (w0.polarities && typeof w0.polarities === 'object') ? w0.polarities : null
  ) : null;

  if (polyObj) {
    const slots = Array.isArray(polyObj.slots) ? polyObj.slots
               : Array.isArray(polyObj.polarities) ? polyObj.polarities : [];
    polarities = Array.isArray(slots) ? slots.slice() : [];
    aura = polyObj.aura ?? polyObj.auraPolarity ?? null;
  } else {
    // anciennes clés à plat
    polarities = Array.isArray(w0?.polarities) ? w0.polarities.slice() : [];
    aura = w0?.aura ?? w0?.auraPolarity ?? w0?.Aura ?? w0?.AuraPolarity ?? null;
  }

  if (!Array.isArray(polarities)) polarities = [];
  if (aura != null && typeof aura !== 'string') aura = String(aura);
  return { polarities, aura };
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
  const wikiaMap=new Map();
  if(Array.isArray(wikia)) for(const x of wikia){ wikiaMap.set(String(x.name||'').toLowerCase(), x); }

  const entities=[];

  for(const x of exportAll.ExportWarframes){
    const rawName=x.name||x.Name; if(!rawName) continue;
    const name=rawName, canon=cleanEntityName(rawName), type=typeFrom(x.productCategory, x.type);

    const w0 = getWikiEntry(wikiaMap, canon);
    let baseStats = {
      health:      w0?.stats?.health ?? x.health ?? x.Health ?? null,
      shields:     w0?.stats?.shield ?? x.shield ?? x.Shield ?? null,
      energy:      w0?.stats?.energy ?? x.power  ?? x.Power  ?? null,
      armor:       w0?.stats?.armor  ?? x.armor  ?? x.Armor  ?? null,
      sprintSpeed: w0?.stats?.sprintSpeed ?? x.sprintSpeed ?? x.SprintSpeed ?? null,
      masteryReq:  x.masteryReq ?? x.MasteryReq ?? 0
    };
    let baseStatsRank30=null;

    // Polarities & Aura — UNIQUEMENT depuis Warframes_wikia.json (formes variées robustes)
    let { polarities, aura } = extractPolFromWiki(w0);

    // --- EXILUS UNIQUEMENT depuis polarity_overrides.json ---
    let exilus = null;
    let exilusPolarity = null;
    {
      const k1 = canon;
      const k2 = canon.toLowerCase();
      const base = canon.replace(/\s+(Prime|Umbra)\b/i,'').trim();
      const k3 = base;
      const k4 = base.toLowerCase();
      const exOv = polOverrides[k1] || polOverrides[k2] || polOverrides[k3] || polOverrides[k4] || null;
      if (exOv && typeof exOv === 'object') {
        if (exOv.exilus !== undefined) exilus = !!exOv.exilus;
        if (typeof exOv.exilusPolarity === 'string' && exOv.exilusPolarity.trim() !== '') {
          exilusPolarity = exOv.exilusPolarity.trim();
        }
      }
    }
    // --------------------------------------------------------

    const awo = awOverrides[canon] || awOverrides[canon.toLowerCase()];
    if(type!=='warframe' && awo){
      const applied = applyAwBaseFromOverride(baseStats, {}, polarities, awo);
      baseStats = applied.stats;
      baseStatsRank30 = applied.statsR30;
      polarities = applied.polarities;
      if(applied.aura!=null) aura=applied.aura;
    }

    const wfList = mapFrameEntryList(wfAbilities, canon);
    let raw=[];
    if(type==='warframe' && wfList.length){
      raw = wfList.map(a=>({slot:a.slot, name:a.name, path:a.path}));
    } else if(Array.isArray(x.abilities) && x.abilities.length){
      raw = x.abilities.map((ab,i)=>({
        slot: Number(ab.SlotKey ?? ab.slot ?? ab.Slot ?? (i+1)),
        name: String(ab.abilityName || ab.name || ab.Name || '').trim(),
        path: ab.abilityUniqueName || ab.path || ab.Path || null
      }));
    } else {
      const names = byFrameList[canon] || byFrameList[canon.toLowerCase()] || [];
      raw = names.map((n,i)=>({slot:i+1, name:n, path:null}));
    }
    raw.sort((a,b)=>(a.slot||999)-(b.slot||999));

    const abilitiesOut = raw.map(a=>{
      const meta = wfList.find(m => (m.slot===a.slot) || (m.name.toLowerCase()===a.name.toLowerCase()));
      const nameA = meta?.name || a.name;
      let desc = stripTags(meta?.desc) || null;
      let subsumable = (typeof meta?.subsumable === 'boolean') ? meta.subsumable : null;
      let aug = Array.isArray(meta?.augments) ? meta.augments : [];
      if(!desc){
        const exAb=(x.abilities||[]).find(z => String(z.abilityName||z.name||'').toLowerCase()===nameA.toLowerCase());
        if(exAb) desc = stripTags(exAb.description || exAb.desc || null);
      }
      const det = (meta?.path && A.byPath.get(meta.path))
               || (a.path && A.byPath.get(a.path))
               || A.byName.get(nameA.toLowerCase())
               || null;
      const summary = buildSummary(det);
      const rows    = cleanRows(det);
      if(type!=='warframe' && awo?.abilities){
        const o = awo.abilities.find(z => String(z.name||'').toLowerCase()===nameA.toLowerCase());
        if(o){
          const sum = summary || { costType:null,costEnergy:null,strength:null,duration:null,range:null,efficiency:null,affectedBy:[] };
          if(o.cost!=null){ if(sum.costEnergy==null) sum.costEnergy=o.cost; if(sum.costType==null) sum.costType='Energy'; }
          if(o.stats){
            const map={Strength:'strength',Duration:'duration',Range:'range',Efficiency:'efficiency'};
            for(const k of Object.keys(map)){
              if(o.stats[k]!=null && sum[map[k]]==null){ sum[map[k]]=o.stats[k]; if(!sum.affectedBy.includes(map[k])) sum.affectedBy.push(map[k]); }
            }
            if(o.stats.Misc && sum.misc==null) sum.misc=o.stats.Misc;
          }
          if(!desc && o.desc) desc = stripTags(o.desc);
          return { name:nameA, description:desc, subsumable:null, augments:[], summary:sum, rows };
        }
      }
      return { name:nameA, description:desc, subsumable, augments:aug, summary, rows };
    });

    if(type==='warframe'){
      const wk = wikiByName && wikiByName[canon];
      if(wk){
        const r0=wk.r0||{}, r30=wk.r30||{};
        baseStats={
          health: r0.health ?? baseStats.health,
          shields:r0.shields?? baseStats.shields,
          energy: r0.energy ?? baseStats.energy,
          armor:  r0.armor  ?? baseStats.armor,
          sprintSpeed: r0.sprintSpeed ?? baseStats.sprintSpeed,
          masteryReq: baseStats.masteryReq ?? 0
        };
        baseStatsRank30={
          health: r30.health ?? null,
          shields:r30.shields?? null,
          energy: r30.energy ?? null,
          armor:  r30.armor  ?? baseStats.armor ?? null,
          sprintSpeed: r30.sprintSpeed ?? baseStats.sprintSpeed ?? null,
          masteryReq: baseStats.masteryReq ?? 0
        };
      } else {
        baseStatsRank30 = computeRank30FromR0(baseStats, canon);
      }
    }

    const description=stripTags(w0?.description ?? x.description ?? null);
    const passive=(type==='warframe') ? stripTags(w0?.passive ?? x.passiveDescription ?? null) : null;

    entities.push({
      name,
      type,
      description,
      passive,
      baseStats,
      baseStatsRank30,
      polarities,
      aura: aura ?? null,
      exilus,                 // ← uniquement depuis polarity_overrides.json
      exilusPolarity,         // ← uniquement depuis polarity_overrides.json
      abilities: abilitiesOut
    });
  }

  // --- TRI ALPHABÉTIQUE AVANT L'ÉCRITURE ---
  entities.sort((a, b) =>
    cleanEntityName(a.name).localeCompare(
      cleanEntityName(b.name), 'fr', { sensitivity: 'base' }
    )
  );

  await writeFile(outPath, JSON.stringify({ generatedAt:new Date().toISOString(), count:entities.length, entities }, null, 2),'utf8');
  console.log(`[merge] OK -> ${outPath} (${entities.length} entities)`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
