// Transformer "lite": extrait Subsumed + Progenitor depuis le wikitext Lua.
// Assez robuste pour le schéma standard du Module:Warframes/data.

export default async function transformWarframeLite(rawText) {
  const out = {};
  // isole chaque bloc ["Warframe Name"] = { … }
  const entryRe = /\[\s*"([^"]+)"\s*\]\s*=\s*\{([\s\S]*?)\}\s*,?/g;
  let m;
  while ((m = entryRe.exec(rawText)) !== null) {
    const name = m[1].trim();
    const body = m[2];

    const subsumed = pickString(body, 'Subsumed');
    const progenitor = pickString(body, 'Progenitor');

    if (subsumed || progenitor) {
      out[name] = {};
      if (subsumed) out[name].subsumed = subsumed;
      if (progenitor) out[name].progenitor = progenitor;
    }
  }
  return out;
}

function pickString(block, field) {
  const re = new RegExp(`${field}\\s*=\\s*"([^"]*)"`, 'i');
  const m = block.match(re);
  return m ? m[1].trim() : null;
}
