//build_static_items.mjs

import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT  = path.join(ROOT, "api", "v1", "static");

// ---------- utils ----------
async function ensureDir(d){ await fs.mkdir(d, { recursive:true }); }
const readJson = (p) => fs.readFile(p, "utf8").then(JSON.parse).catch(()=>null);
const cap = s => String(s||"").replace(/[_-]+/g," ").replace(/\b\w/g, m=>m.toUpperCase());
const sumMap = m => !m ? 0 : Object.values(m).reduce((a,b)=>a+(+b||0), 0);

// Damage helpers (robuste à plusieurs variantes d’export)
function toDamageMap(d){
  if (!d) return null;
  if (Array.isArray(d)){
    const out={};
    for (const e of d){
      const k = cap(e?.damageType || e?.type || e?.elemType || e?.name);
      const v = Number(e?.amount ?? e?.value ?? e?.damage ?? e?.dmg);
      if (k && !isNaN(v) && v>0) out[k]=(out[k]||0)+v;
    }
    return Object.keys(out).length ? out : null;
  }
  if (typeof d === "object"){
    const out={};
    for (const k in d){
      const v = Number(d[k]);
      if (!isNaN(v) && v>0) out[cap(k)] = (out[cap(k)]||0)+v;
    }
    return Object.keys(out).length ? out : null;
  }
  return null;
}
function mergeDamageMaps(list){
  const out={};
  list.forEach(m=>{
    const map = toDamageMap(m);
    if (!map) return;
    for (const k in map) out[k]=(out[k]||0)+map[k];
  });
  return Object.keys(out).length ? out : null;
}

function detectUnitKind(x){
  const u = String(x?.uniqueName||"").toLowerCase();
  if (u.includes("mech") || u.includes("necramech")) return "Necramech";
  if (u.includes("archwing") || u.includes("/wing")) return "Archwing";
  if (u.includes("/powersuits/")) return "Warframe";
  return "Other";
}

function classifyWeapon(x){
  const t = `${x.type||""} ${x.productCategory||""} ${x.uniqueName||""}`.toLowerCase();
  if (t.includes("arch-melee") || t.includes("archmelee") || (t.includes("archwing") && t.includes("melee")) || t.includes("/archwing/melee")) return "Archmelee";
  if (t.includes("arch-gun") || t.includes("archgun") || (t.includes("archwing") && (t.includes("gun") || t.includes("rifle") || t.includes("primary"))) || t.includes("/archwing/primary")) return "Archgun";
  return null;
}

// ---------- builders ----------
function buildUnits(exportWarframes, overrides){
  const arr = Array.isArray(exportWarframes?.ExportWarframes) ? exportWarframes.ExportWarframes : [];
  const outArch = [], outMech = [];

  const o = overrides || {};
  for (const x of arr){
    const kind = detectUnitKind(x);
    if (kind!=="Archwing" && kind!=="Necramech") continue;

    const name = x.name || "";
    const add = {
      name, kind,
      stats: {
        health: x.health ?? null,
        shield: x.shield ?? null,
        armor:  x.armor  ?? null,
        energy: x.power  ?? null,
        sprint: x.sprintSpeed ?? null,
        mastery: x.masteryReq ?? null,
        rank30: {
          health: o[name]?.base?.HealthR30 ?? null,
          shield: o[name]?.base?.ShieldR30 ?? null,
          armor:  o[name]?.base?.ArmorR30  ?? null,
          energy: o[name]?.base?.EnergyR30 ?? null
        },
        polarities: Array.isArray(o[name]?.base?.Polarities) ? o[name].base.Polarities : null
      },
      abilities: Array.isArray(o[name]?.abilities) ? o[name].abilities : null,
      description: x.description || ""
    };

    (kind==="Archwing" ? outArch : outMech).push(add);
  }

  outArch.sort((a,b)=>a.name.localeCompare(b.name));
  outMech.sort((a,b)=>a.name.localeCompare(b.name));
  return { archwings: outArch, necramechs: outMech };
}

function damageFromExportWeapon(x){
  const parts = [];
  if (x.damage) parts.push(x.damage);
  if (x.normalAttack?.damage) parts.push(x.normalAttack.damage);
  if (x.areaAttack?.damage) parts.push(x.areaAttack.damage);
  if (x.secondaryAreaAttack?.damage) parts.push(x.secondaryAreaAttack.damage);

  if (Array.isArray(x.damagePerShot) && Array.isArray(x.damageTypes)){
    const m={}; x.damageTypes.forEach((t,i)=>{ const v=Number(x.damagePerShot[i]); if(!isNaN(v)) m[t]=(m[t]||0)+v; });
    parts.push(m);
  }
  if (Array.isArray(x.normalDamage) && Array.isArray(x.damageTypes)){
    const m={}; x.damageTypes.forEach((t,i)=>{ const v=Number(x.normalDamage[i]); if(!isNaN(v)) m[t]=(m[t]||0)+v; });
    parts.push(m);
  }
  return mergeDamageMaps(parts);
}

function buildWeapons(exportWeapons){
  const arr = Array.isArray(exportWeapons?.ExportWeapons) ? exportWeapons.ExportWeapons : [];
  const guns=[], melee=[];
  for (const x of arr){
    const kind = classifyWeapon(x);
    if (!kind) continue;

    const dmgMap = damageFromExportWeapon(x);
    const total  = x.totalDamage ?? sumMap(dmgMap);

    const record = {
      name: x.name || "",
      kind,
      mastery: x.masteryReq ?? null,
      stats: {
        critChance: x.criticalChance ?? x.critChance ?? x.normalAttack?.crit_chance ?? null,
        critMult:   x.criticalMultiplier ?? x.critMultiplier ?? x.normalAttack?.crit_mult ?? null,
        status:     x.statusChance ?? x.procChance ?? x.normalAttack?.status_chance ?? null,
        fireRate:   kind==="Archmelee" ? null : (x.fireRate ?? x.fireRateSecondary ?? x.normalAttack?.fire_rate ?? null),
        attackSpeed:kind==="Archmelee" ? (x.attackSpeed ?? x.fireRate ?? null) : null,
        reload:     x.reloadTime ?? null,
        trigger:    x.trigger || null,
        totalDamage: total ?? null
      },
      damage: dmgMap || null
    };
    (kind==="Archgun" ? guns : melee).push(record);
  }
  guns.sort((a,b)=>a.name.localeCompare(b.name));
  melee.sort((a,b)=>a.name.localeCompare(b.name));
  return { archguns: guns, archmelee: melee };
}

// ---------- main ----------
async function main(){
  await ensureDir(OUT);

  const warframes = await readJson(path.join(DATA, "ExportWarframes_en.json"));
  const overrides = await readJson(path.join(DATA, "aw_overrides.json")); // si présent
  const weapons   = await readJson(path.join(DATA, "ExportWeapons_en.json"));

  const units   = buildUnits(warframes, overrides || {});
  const weap    = buildWeapons(weapons);

  const payloads = [
    ["archwings.json",  units.archwings],
    ["necramechs.json", units.necramechs],
    ["weapons_archgun.json",   weap.archguns],
    ["weapons_archmelee.json", weap.archmelee]
  ];

  for (const [name, data] of payloads){
    await fs.writeFile(path.join(OUT, name), JSON.stringify({
      updated: new Date().toISOString(),
      count: Array.isArray(data) ? data.length : undefined,
      data
    }, null, 2));
  }

  // petit index
  await fs.writeFile(path.join(OUT, "index.json"), JSON.stringify({
    updated: new Date().toISOString(),
    files: payloads.map(([n]) => `/api/v1/static/${n}`)
  }, null, 2));

  console.log(`[static] Built ${payloads.length} files -> /api/v1/static`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
