// tools/merge_warframe_v3.js (ESM)
// FINAL: builds `data/merged_warframe.json` by default.
//
// Inputs (all in ./data):
// - ExportWarframes_en.json           (base frames/archwings/necramechs)
// - abilities.json                    (primary detailed ability dataset)   [IMPORTANT]
// - warframe_abilities.json           (per-frame abilities: SlotKey, Subsumable, Augments, optional path)
// - abilities_by_warframe.json        (fallback list of ability names per frame)
// - polarity_overrides.json           (if polarities empty/null -> use overrides[name])
// - aw_overrides.json                 (Archwing/Necramech overrides: base + abilities by name)
// Optional:
// - progenitors.json                  (map Warframe -> progenitor element; used when present)
//
// Usage: node tools/merge_warframe_v3.js ./data ./data/merged_warframe.json

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

function slugify(s) {
  return String(s || 'unknown')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
async function loadJsonSafe(path) {
  try { return JSON.parse(await readFile(path, 'utf-8')); }
  catch { return null; }
}
function coalesce(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return v;
  }
  return undefined;
}
function kindFromProductCategory(pc, type) {
  const p = String(pc || '').toLowerCase();
  const t = String(type || '').toLowerCase();
  if (p.includes('spacesuits') || t.includes('archwing')) return 'archwing';
  if (p.includes('mechsuits') || t.includes('necramech') || t.includes('vehicle')) return 'necramech';
  return 'warframe';
}

function extractBaseStats(x) {
  const hp = coalesce(x.health, x.Health, x.baseHealth);
  const sh = coalesce(x.shield, x.shields, x.Shield, x.baseShield);
  const en = coalesce(x.power, x.energy, x.Power, x.baseEnergy);
  const ar = coalesce(x.armor, x.Armor, x.Armour, x.baseArmor);
  const sp = coalesce(x.sprintSpeed, x.SprintSpeed, x.sprint);
  const mr = coalesce(x.masteryReq, x.MasteryReq, x.masteryRank);
  return { health: hp, shields: sh, energy: en, armor: ar, sprintSpeed: sp, masteryReq: mr };
}
function extractBaseStatsR30(x) {
  const hp = coalesce(x.HealthR30, x.healthR30);
  const sh = coalesce(x.ShieldR30, x.shieldR30);
  const en = coalesce(x.EnergyR30, x.energyR30, x.PowerR30, x.powerR30);
  const ar = coalesce(x.ArmorR30, x.armourR30, x.armorR30);
  // sprint speed doesn't change at 30; reuse same
  const sp = coalesce(x.sprintSpeed, x.SprintSpeed, x.sprint);
  const mr = coalesce(x.Mastery, x.masteryReq, x.MasteryReq, x.masteryRank, 0);
  return { health: hp, shields: sh, energy: en, armor: ar, sprintSpeed: sp, masteryReq: mr };
}

function stripTags(s) {
  if (s == null) return s;
  return String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeAffected(label) {
  const L = String(label || '').toLowerCase();
  if (/strength|force/.test(L)) return 'strength';
  if (/duration|durée/.test(L)) return 'duration';
  if (/range|portée/.test(L)) return 'range';
  if (/efficiency|efficacit/.test(L)) return 'efficiency';
  return null;
}
function normalizeModifier(mod) {
  const m = String(mod || '').toUpperCase();
  if (m.includes('STRENGTH')) return 'strength';
  if (m.includes('DURATION')) return 'duration';
  if (m.includes('RANGE')) return 'range';
  if (m.includes('EFFICIENCY')) return 'efficiency';
  return null;
}

function buildAbilityIndices(abilitiesJson) {
  const byName = new Map();
  const byPath = new Map();
  if (!abilitiesJson) return { byName, byPath };
  const arr = Array.isArray(abilitiesJson) ? abilitiesJson : (abilitiesJson.abilities || []);
  for (const a of arr || []) {
    const nm = String(a.name || a.Name || '').trim();
    const path = String(a.path || a.Path || '').trim();
    if (nm) byName.set(nm.toLowerCase(), a);
    if (path) byPath.set(path, a);
  }
  return { byName, byPath };
}

function buildSummaryFromDetails(details) {
  if (!details) return null;
  const summary = {
    costType: details.summary?.CostType ?? null,
    costEnergy: details.summary?.costEnergy ?? null,
    strength: null, duration: null, range: null, efficiency: null,
    affectedBy: []
  };
  const aff = details.summary?.affectedBy || details.summary?.AffectedBy || [];
  for (const a of aff) {
    const n = normalizeAffected(a);
    if (n && !summary.affectedBy.includes(n)) summary.affectedBy.push(n);
  }
  const rows = Array.isArray(details.rows) ? details.rows : [];
  for (const r of rows) {
    const key = normalizeModifier(r.modifier);
    if (!key) continue;
    if (summary[key] == null) summary[key] = r.mainNumeric ?? null;
    if (!summary.affectedBy.includes(key)) summary.affectedBy.push(key);
  }
  return summary;
}

function parseFrameAbilitiesEntry(entry) {
  if (!entry) return null;
  const abilities = entry.abilities || entry.Abilities || entry.ability || [];
  const map = { bySlot: new Map(), byName: new Map() };
  for (const ab of abilities) {
    const slot = Number(ab?.SlotKey ?? ab?.slot ?? ab?.Slot ?? null) || null;
    const nm = String(ab?.name || ab?.Name || '').trim();
    const subs = ab?.Subsumable ?? ab?.subsumable ?? ab?.helminth;
    let aug = ab?.Augments ?? ab?.augments ?? null;
    if (typeof aug === 'string') aug = aug.split(',').map(s => s.trim()).filter(Boolean);
    if (!Array.isArray(aug)) aug = [];
    const path = ab?.path || ab?.Path || null;
    const info = { subsumable: typeof subs === 'boolean' ? subs : null, augments: aug, path, slot, name: nm };
    if (slot) map.bySlot.set(slot, info);
    if (nm) map.byName.set(nm.toLowerCase(), info);
  }
  return map;
}

function overrideBaseFromAW(baseStats, baseStatsR30, polarities, override) {
  if (!override) return { baseStats, baseStatsR30, polarities };
  const b = override.base || {};
  const out = { ...baseStats };
  const outR = { ...baseStatsR30 };
  if (b.Energy != null) out.energy = b.Energy;
  if (b.Health != null) out.health = b.Health;
  if (b.Shield != null) out.shields = b.Shield;
  if (b.Armor != null) out.armor = b.Armor;
  if (b.SprintSpeed != null) { out.sprintSpeed = b.SprintSpeed; outR.sprintSpeed = b.SprintSpeed; }
  if (b.Mastery != null) { out.masteryReq = b.Mastery; outR.masteryReq = b.Mastery; }
  // R30 fields
  if (b.EnergyR30 != null) outR.energy = b.EnergyR30;
  if (b.HealthR30 != null) outR.health = b.HealthR30;
  if (b.ShieldR30 != null) outR.shields = b.ShieldR30;
  if (b.ArmorR30 != null) outR.armor = b.ArmorR30;
  const pol = Array.isArray(b.Polarities) ? b.Polarities : polarities;
  return { baseStats: out, baseStatsR30: outR, polarities: pol || [] };
}

function applyAbilityOverrideFromAW(abilityObj, ov) {
  if (!ov) return abilityObj;
  const copy = { ...abilityObj, summary: abilityObj.summary || { costType: null, costEnergy: null, strength: null, duration: null, range: null, efficiency: null, affectedBy: [] } };
  if (ov.desc) copy.description = stripTags(ov.desc);
  if (ov.cost != null) {
    copy.summary.costEnergy = ov.cost; // keep string if like '75 + 10/s'
    copy.summary.costType = 'Energy';
  }
  const st = ov.stats || {};
  const map = { Strength: 'strength', Duration: 'duration', Range: 'range', Efficiency: 'efficiency' };
  for (const k of Object.keys(map)) {
    const dst = map[k];
    if (st[k] != null && copy.summary[dst] == null) copy.summary[dst] = st[k];
    if (st[k] != null && !copy.summary.affectedBy.includes(dst)) copy.summary.affectedBy.push(dst);
  }
  if (st.Misc) copy.summary.misc = st.Misc;
  return copy;
}

async function main() {
  const dataDir = resolve(process.argv[2] || './data');
  const outPath = resolve(process.argv[3] || './data/merged_warframe.json');

  const exportWarframes = await loadJsonSafe(join(dataDir, 'ExportWarframes_en.json')) || [];
  const abilitiesJson = await loadJsonSafe(join(dataDir, 'abilities.json')) || null;
  const warframeAbilities = await loadJsonSafe(join(dataDir, 'warframe_abilities.json')) || null;
  const abilitiesByFrame = await loadJsonSafe(join(dataDir, 'abilities_by_warframe.json')) || {};
  const polarityOverrides = await loadJsonSafe(join(dataDir, 'polarity_overrides.json')) || {};
  const awOverrides = await loadJsonSafe(join(dataDir, 'aw_overrides.json')) || {};
  const progenitors = await loadJsonSafe(join(dataDir, 'progenitors.json')) || {};

  const abilityIdx = buildAbilityIndices(abilitiesJson);

  const entities = [];

  for (const x of exportWarframes) {
    const type = kindFromProductCategory(x.productCategory, x.type);
    const name = coalesce(x.name, x.Name);
    if (!name) continue;
    const slug = slugify(name);

    let baseStats = extractBaseStats(x);
    let baseStatsR30 = extractBaseStatsR30(x);

    // Polarities with override when empty
    let polarities = Array.isArray(x.polarities) ? x.polarities : null;
    if (!polarities || polarities.length === 0) {
      const ov = polarityOverrides[name] || polarityOverrides[name?.toLowerCase()] || null;
      if (Array.isArray(ov) && ov.length) polarities = ov; else polarities = [];
    }

    // Apply Archwing/Necramech overrides if present (or frames if file has them)
    const awOv = awOverrides[name] || awOverrides[String(name).toLowerCase()] || null;
    if (awOv) {
      const res = overrideBaseFromAW(baseStats, baseStatsR30, polarities, awOv);
      baseStats = res.baseStats; baseStatsR30 = res.baseStatsR30; polarities = res.polarities;
    }

    // Abilities raw (prefer SlotKey)
    let raw = [];
    if (Array.isArray(x.abilities)) {
      for (const ab of x.abilities) {
        const nm = ab?.name || ab?.Name;
        const slot = Number(ab?.SlotKey ?? ab?.slot ?? ab?.Slot ?? null) || null;
        const path = ab?.path || ab?.Path || null;
        if (nm) raw.push({ name: nm, slot, path });
      }
    }
    // Merge frame abilities meta (Subsumable, Augments, path)
    let frameEntry = null;
    if (warframeAbilities) {
      if (Array.isArray(warframeAbilities)) {
        frameEntry = warframeAbilities.find(e => String(e.name || e.Name).toLowerCase() === String(name).toLowerCase()) || null;
      } else if (typeof warframeAbilities === 'object') {
        frameEntry = warframeAbilities[name] || warframeAbilities[String(name).toLowerCase()] || null;
      }
    }
    const frameMap = parseFrameAbilitiesEntry(frameEntry);

    // Fallback to abilities_by_warframe
    if (!raw.length) {
      const list = abilitiesByFrame[name] || abilitiesByFrame[String(name).toLowerCase()] || [];
      raw = list.map((n, i) => ({ name: n, slot: i + 1, path: null }));
    }
    raw = raw.map((a, i) => ({ name: a.name, slot: a.slot || (i + 1), path: a.path || null }));
    raw.sort((a, b) => (a.slot || 999) - (b.slot || 999));

    const abilities = raw.map((a) => {
      let subsumable = null, augments = [], explicitPath = null;
      if (frameMap) {
        const bySlot = frameMap.bySlot.get(a.slot);
        const byName = frameMap.byName.get(String(a.name).toLowerCase());
        const info = bySlot || byName || null;
        if (info) {
          subsumable = typeof info.subsumable === 'boolean' ? info.subsumable : null;
          augments = Array.isArray(info.augments) ? info.augments : [];
          explicitPath = info.path || null;
        }
      }
      let details = abilityIdx.byName.get(String(a.name).toLowerCase()) || null;
      if (!details && (explicitPath || a.path)) {
        details = abilityIdx.byPath.get(explicitPath || a.path) || null;
      }
      let description = details?.description ?? details?.Description ?? null;
      description = stripTags(description);
      let summary = buildSummaryFromDetails(details);
      // Apply AW ability overrides by name
      if (awOv && Array.isArray(awOv.abilities)) {
        const ov = awOv.abilities.find(u => String(u.name).toLowerCase() === String(a.name).toLowerCase());
        if (ov) {
          const tmp = applyAbilityOverrideFromAW({ name: a.name, description, subsumable, augments, details, summary }, ov);
          description = tmp.description; summary = tmp.summary;
        }
      }
      return { name: a.name, description, subsumable, augments, details, summary };
    });

    entities.push({
      name,
      type,
      progenitor: progenitors[name] ?? progenitors[String(name).toLowerCase()] ?? null,
      description: stripTags(coalesce(x.description, x.Description) || null),
      passive: stripTags(coalesce(x.passiveDescription, x.passive) || null),
      baseStats,
      baseStatsRank30: baseStatsR30,
      polarities,
      aura: x.aura || null,
      abilities,
      _ref: { uniqueName: x.uniqueName, productCategory: x.productCategory, type: x.type }
    });
  }

  await writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), count: entities.length, entities }, null, 2), 'utf-8');
  console.log(`Merged ${entities.length} entities -> ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
