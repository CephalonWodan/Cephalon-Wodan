// Transformer "WFCD-like (lite)" pour Module:Warframes/data
// Extrait les champs utiles : Subsumed, Progenitor, Polarities, AuraPolarity,
// Abilities (4), InternalName, Intro version, etc.

function pickString(block, field) {
  const re = new RegExp(`${field}\\s*=\\s*"([^"]*)"`, 'i');
  const m = block.match(re);
  return m ? m[1].trim() : null;
}
function pickNumber(block, field) {
  const re = new RegExp(`${field}\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
  const m = block.match(re);
  return m ? Number(m[1]) : null;
}
function pickArrayStrings(block, field) {
  // e.g. Polarities = { "V", "D" }
  const re = new RegExp(`${field}\\s*=\\s*\\{([\\s\\S]*?)\\}`, 'i');
  const m = block.match(re);
  if (!m) return null;
  const inner = m[1];
  const items = [...inner.matchAll(/"([^"]+)"/g)].map(x => x[1].trim());
  return items.length ? items : null;
}
function pickAbilities(block) {
  const re = /\bAbilities\s*=\s*\{([^\}]+)\}/i;
  const m = block.match(re);
  if (!m) return null;
  const inner = m[1];
  const items = [...inner.matchAll(/"([^"]+)"/g)].map(x => x[1].trim());
  return items.length ? items : null;
}

export default async function transformWarframe(rawText) {
  const out = {};
  const entryRe = /\[\s*"([^"]+)"\s*\]\s*=\s*\{([\s\S]*?)\}\s*,?/g;
  let m;
  while ((m = entryRe.exec(rawText)) !== null) {
    const name = m[1].trim();
    const body = m[2];

    const record = {};
    record.name         = pickString(body, 'Name') || name;
    record.link         = pickString(body, 'Link') || null;
    record.internalName = pickString(body, 'InternalName');
    record.introduced   = pickString(body, 'Introduced');
    record.passive      = pickString(body, 'Passive');

    record.auraPolarity = pickString(body, 'AuraPolarity');
    record.polarities   = pickArrayStrings(body, 'Polarities') || [];
    record.abilities    = pickAbilities(body) || [];

    record.subsumed     = pickString(body, 'Subsumed');
    record.progenitor   = pickString(body, 'Progenitor');

    record.armor  = pickNumber(body, 'Armor');
    record.health = pickNumber(body, 'Health');
    record.shield = pickNumber(body, 'Shield');
    record.sprint = pickNumber(body, 'Sprint');

    // garde seulement si utile
    if (
      record.subsumed || record.progenitor ||
      record.polarities.length || record.auraPolarity ||
      record.abilities.length
    ) {
      out[name] = record;
    }
  }
  return out;
}