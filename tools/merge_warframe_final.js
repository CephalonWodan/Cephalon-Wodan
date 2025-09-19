// tools/merge_warframe_final.js (ESM)
// Génère: ./data/merged_warframe.json

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

async function J(p){ try { return JSON.parse(await readFile(p,'utf8')); } catch { return null; } }
const stripTags=(s)=> s==null? s : String(s).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();

// ---------- helpers ----------
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

// Exceptions ponctuelles sur l'incrément R30 (facile à étendre)
const R30_EXCEPTIONS = {
  'Inaros':        { health: 200, shields: 0,   energy: 50 },
  'Inaros Prime':  { health: 200, shields: 0,   energy: 50 },
  'Hildryn':       { health: 100, shields: 500, energy: 0  },
  'Hildryn Prime': { health: 100, shields: 500, energy: 0  },
  'Lavos':         { health: 100, shields: 100, energy: 0  }
};
// Règles par défaut (wiki): +100 HP, +100 Shields, +50 Energy (ou +100 si pool élevé ≥200)
// Armor & SprintSpeed inchangés
function computeRank30FromR0(statsR0, frameName) {
  if (!statsR0) return null;
  const ex = frameName ? R30_EXCEPTIONS[frameName] : null;

  const incHealth  = ex?.health  ?? (statsR0.health  != null ? 100 : null);
  const incShields = ex?.shields ?? (statsR0.shields != null ? 100 : null);
  let   incEnergy;
  if (ex?.energy != null) {
    incEnergy = ex.energy;
  } else if (statsR0.energy == null) {
    incEnergy = null;
  } else if (statsR0.energy >= 200) {
    incEnergy = 100;
  } else {
    incEnergy = 50;
  }

  const add = (v, inc) => (inc == null || v == null) ? (v ?? null) : (v + inc);

  return {
    health:      add(statsR0.health, incHealth),
    shields:     add(statsR0.shields, incShields),
    energy:      add(statsR0.energy, incEnergy),
    armor:       statsR0.armor ?? null,
    sprintSpeed: statsR0.sprintSpeed ?? null,
    masteryReq:  statsR0.masteryReq ?? null
  };
}

// ---------- abilities.json helpers ----------
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
  if (s.includes('strength') || s.includes('force'))       return 'strength';
  if (s.includes('duration') || s.includes('durée'))       return 'duration';
  if (s.includes('range')    || s.includes('portée'))      return 'range';
  if (s.includes('efficiency')|| s.includes('effic'))      return 'efficiency';
  if (s.includes('cooldown'))                              return 'cooldown';
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

// ---------- warframe_abilities.json helper ----------
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

// ---------- aw_overrides.json helpers ----------
function applyAwBaseFromOverride(baseS, baseR, pol, awo){
  if(!awo?.base) return {stats:baseS, statsR30:baseR, polarities:pol, aura:null};
  const b=awo.base;
  const S={...baseS}, R={...baseR};
  if(b.Energy!=null){ S.energy=b.Energy; R.energy=b.EnergyR30??R.energy; }
  if(b.Health!=null){ S.health=b.Health; R.health=b.HealthR30??R.health; }
  if(b.Shield!=null){ S.shields=b.Shield; R.shields=b.ShieldR30??R.shields; }
  if(b.Armor!=null) { S.armor=b.Armor;   R.armor=b.ArmorR30??R.armor; }
  if(b.SprintSpeed!=null){ S.sprintSpeed=b.SprintSpeed; R.sprintSpeed=b.SprintSpeed; }
  if(b.Mastery!=null){ S.masteryReq=b.Mastery; R.masteryReq=b.Mastery; }
  const polOut = Array.isArray(b.Polarities)? b.Polarities : pol;
  const aura = b.Aura ?? null; // Archwings n'ont pas d'aura par défaut
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

  if(!exportAll || !Array.isArray(exportAll.ExportWarframes)) {
    console.error('ExportWarframes_en.json invalide'); process.exit(1);
  }
  if(!wfAbilities){ console.error('warframe_abilities.json manquant'); process.exit(1); }
  if(!abilities){ console.error('abilities.json manquant'); process.exit(1); }
  if(!awOverrides){ console.error('aw_overrides.json manquant'); process.exit(1); }

  const A = indexAbilities(abilities);
  const wikiaByName = new Map();
  if (Array.isArray(wikia)) for(const x of wikia){ wikiaByName.set(String(x.name).toLowerCase(), x); }

  const entities = [];

  for(const x of exportAll.ExportWarframes){
    const rawName = x.name || x.Name; if(!rawName) continue;
    const name = rawName;
    const canon = cleanEntityName(rawName);
    const type = typeFrom(x.productCategory, x.type);

    // ---------- base R0 ----------
    const w0 = wikiaByName.get(canon.toLowerCase()); // Warframes uniquement
    let baseStats = {
      health:      w0?.stats?.health ?? x.health ?? x.Health ?? null,
      shields:     w0?.stats?.shield ?? x.shield ?? x.Shield ?? null,
      energy:      w0?.stats?.energy ?? x.power  ?? x.Power  ?? null,
      armor:       w0?.stats?.armor  ?? x.armor  ?? x.Armor  ?? null,
      sprintSpeed: w0?.stats?.sprintSpeed ?? x.sprintSpeed ?? x.SprintSpeed ?? null,
      masteryReq:  x.masteryReq ?? x.MasteryReq ?? 0
    };
    let baseStatsRank30 = null;
    let polarities = Array.isArray(w0?.polarities) ? w0.polarities.slice() : null;
    let aura = w0?.aura ?? null;

    if((!polarities || polarities.length===0) && polOverrides[canon]) {
      const ov = polOverrides[canon];
      if(Array.isArray(ov)) polarities = ov;
      if(Array.isArray(ov?.polarities)) polarities = ov.polarities;
      if(ov?.aura) aura = ov.aura;
    }
    if(!Array.isArray(polarities)) polarities = [];

    // ---------- Archwing/Necramech: overrides de vérité ----------
    const awo = awOverrides[canon] || awOverrides[canon.toLowerCase()];
    if (type !== 'warframe' && awo) {
      const applied = applyAwBaseFromOverride(baseStats, {}, polarities, awo);
      baseStats = applied.stats;
      baseStatsRank30 = applied.statsR30;
      polarities = applied.polarities;
      if (applied.aura != null) aura = applied.aura;
    }

    // ---------- Abilities ----------
    const wfList = mapFrameEntryList(wfAbilities, canon);
    let raw = [];
    if (type === 'warframe' && wfList.length) {
      raw = wfList.map(a => ({ slot: a.slot, name: a.name, path: a.path }));
    } else if (Array.isArray(x.abilities) && x.abilities.length) {
      raw = x.abilities.map((ab,i)=>({
        slot: Number(ab.SlotKey ?? ab.slot ?? ab.Slot ?? (i+1)),
        name: String(ab.abilityName || ab.name || ab.Name || '').trim(),
        path: ab.abilityUniqueName || ab.path || ab.Path || null
      }));
    } else {
      const names = byFrameList[canon] || byFrameList[canon.toLowerCase()] || [];
      raw = names.map((n,i)=>({ slot:i+1, name:n, path:null }));
    }
    raw.sort((a,b)=>(a.slot||999)-(b.slot||999));

    const abilitiesOut = raw.map(a=>{
      const meta = wfList.find(m => (m.slot===a.slot) || (m.name.toLowerCase()===a.name.toLowerCase()));
      const nameA = meta?.name || a.name;
      let desc = stripTags(meta?.desc) || null;
      let subsumable = (typeof meta?.subsumable === 'boolean') ? meta.subsumable : null;
      let aug = Array.isArray(meta?.augments) ? meta.augments : [];

      if(!desc){
        const exAb = (x.abilities||[]).find(z => String(z.abilityName||z.name||'').toLowerCase() === nameA.toLowerCase());
        if(exAb) desc = stripTags(exAb.description || exAb.desc || null);
      }

      const det = (meta?.path && A.byPath.get(meta.path))
               || (a.path && A.byPath.get(a.path))
               || A.byName.get(nameA.toLowerCase())
               || null;
      const summary = buildSummary(det);
      const rows    = cleanRows(det);

      // Pas besoin d'injecter overrides ability pour Warframes
      if (type !== 'warframe' && awo?.abilities) {
        const o = awo.abilities.find(z => String(z.name||'').toLowerCase()===nameA.toLowerCase());
        if(o){
          const sum = summary || { costType:null,costEnergy:null,strength:null,duration:null,range:null,efficiency:null,affectedBy:[] };
          if(o.cost!=null){ sum.costEnergy = sum.costEnergy ?? o.cost; sum.costType = sum.costType ?? 'Energy'; }
          if(o.stats){
            const map={Strength:'strength',Duration:'duration',Range:'range',Efficiency:'efficiency'};
            for(const k of Object.keys(map)){
              if(o.stats[k]!=null && sum[map[k]]==null){ sum[map[k]]=o.stats[k]; if(!sum.affectedBy.includes(map[k])) sum.affectedBy.push(map[k]); }
            }
            if(o.stats.Misc) sum.misc = sum.misc ?? o.stats.Misc;
          }
          if(!desc && o.desc) desc = stripTags(o.desc);
          return { name: nameA, description: desc, subsumable: null, augments: [], summary: sum, rows };
        }
      }

      return { name: nameA, description: desc, subsumable, augments: aug, summary, rows };
    });

    // ---------- baseStatsRank30 (Warframes calculé) ----------
    if (type === 'warframe') baseStatsRank30 = computeRank30FromR0(baseStats, canon);

    const description = stripTags(w0?.description ?? x.description ?? null);
    const passive = (type === 'warframe')
      ? stripTags(w0?.passive ?? x.passiveDescription ?? null)
      : null;

    entities.push({
      name,
      type,
      description,
      passive,
      baseStats,
      baseStatsRank30,
      polarities,
      aura: aura ?? null,
      abilities: abilitiesOut
    });
  }

  await writeFile(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: entities.length,
    entities
  }, null, 2), 'utf8');

  console.log(`[merge] OK -> ${outPath} (${entities.length} entities)`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
