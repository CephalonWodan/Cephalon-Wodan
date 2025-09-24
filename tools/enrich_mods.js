// tools/enrich_mods.js
// Inputs (tous sous ./data) :
//   - ExportUpgrades_en.json
//   - modwarframestat.json
//   - overframe-mods.json
//   - overframe-modsets.json
// Outputs :
//   - data/enriched_mods.json
//   - data/enriched_mods_report.json
//   - data/enriched_mods.csv

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve('data');
const P_EXPORT = path.join(DATA_DIR, 'ExportUpgrades_en.json');
const P_WSTAT  = path.join(DATA_DIR, 'modwarframestat.json');
const P_OFMODS = path.join(DATA_DIR, 'overframe-mods.json');
const P_OFSETS = path.join(DATA_DIR, 'overframe-modsets.json');

const OUT_JSON = path.join(DATA_DIR, 'enriched_mods.json');
const OUT_REP  = path.join(DATA_DIR, 'enriched_mods_report.json');
const OUT_CSV  = path.join(DATA_DIR, 'enriched_mods.csv');

const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf-8'));
const asArray  = v => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);

const norm = s => String(s ?? '').trim();
const clean = s =>
  norm(s)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/–/g, '-')
    .trim();

const slugify = s =>
  clean(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const keyName = s =>
  clean(s).toLowerCase().replace(/[\s\-–_'"`]+/g, ' ').replace(/\s+/g, ' ');

// provenance helper
function takeFirst(dst, srcs, field, srcNames, prov) {
  for (let i = 0; i < srcs.length; i++) {
    const v = srcs[i]?.[field];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      dst[field] = v;
      prov[field] = srcNames[i];
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Load sources
// ---------------------------------------------------------------------------
const S_export = readJSON(P_EXPORT);                // array-ish
const S_wstat  = readJSON(P_WSTAT);                 // array-ish
const S_ofmods = readJSON(P_OFMODS);                // array-ish
const S_ofsets = readJSON(P_OFSETS);                // array-ish

const A_export = asArray(S_export);
const A_wstat  = asArray(S_wstat);
const A_ofmods = asArray(S_ofmods);
const A_ofsets = asArray(S_ofSETS);

// ---------------------------------------------------------------------------
// Indexation par nom normalisé
// ---------------------------------------------------------------------------
const nameOfExport = u => u?.name || u?.upgradeName || u?.displayName || null;
const nameOfOf     = m => m?.name || m?.title || m?.displayName || null;
const nameOfWstat  = m => m?.name || m?.displayName || null;

const mapExport = new Map();
for (const u of A_export) {
  const n = nameOfExport(u);
  if (n) mapExport.set(keyName(n), u);
}

const mapWstat = new Map();
for (const m of A_wstat) {
  const n = nameOfWstat(m);
  if (n) mapWstat.set(keyName(n), m);
}

const mapOf = new Map();
for (const m of A_ofmods) {
  const n = nameOfOf(m);
  if (n) mapOf.set(keyName(n), m);
}

// Sets (OF)
const setByMod = new Map();
const setMeta  = new Map();
for (const s of A_ofsets) {
  const setName = s?.name || s?.title || s?.setName;
  if (!setName) continue;
  const members = asArray(s.mods || s.members || s.items).map(String);
  for (const m of members) setByMod.set(keyName(m), setName);
  setMeta.set(setName, {
    name: setName,
    size: members.length || null,
    bonus: s?.bonus || s?.description || s?.effect || null,
  });
}

// Union des clefs (par nom)
const allKeys = new Set([...mapExport.keys(), ...mapWstat.keys(), ...mapOf.keys()]);

// ---------------------------------------------------------------------------
// Extraction levelStats (texte par rang) depuis ExportUpgrades
// ---------------------------------------------------------------------------
function extractLevelStats(exp) {
  const res = [];
  if (!exp) return res;

  // cas fréquents: levelStats: [{ stats: ["text", ...] }, ...]
  const levels = asArray(exp.levelStats || exp.stats || exp.effects);
  if (levels.length && levels[0] && (levels[0].stats || levels[0].text)) {
    for (const lv of levels) {
      const arr = Array.isArray(lv?.stats) ? lv.stats : (lv?.text ? [lv.text] : []);
      if (arr.length) res.push({ stats: arr.map(String) });
    }
    return res;
  }

  // fallback : upgradeEntries/values/… — on agglomère en texte
  const entries = asArray(exp.upgradeEntries || exp.values);
  if (entries.length) {
    const txt = entries.map(e => {
      const n = e?.name || e?.stat || e?.attribute || e?.type || 'Effect';
      const v = e?.value ?? (Array.isArray(e?.values) ? e.values.join('/') : '');
      return `${n}: ${v}`;
    }).filter(Boolean);
    if (txt.length) res.push({ stats: [txt.join(' • ')] });
  }
  return res;
}

// Augment detector (plus robuste)
function isAugment({ of, wstat, name, desc }) {
  const s = (name + ' ' + (desc||'')).toLowerCase();
  if (/\baugment\b/.test(s)) return true;
  if (of?.tags && of.tags.some(t => /augment/i.test(String(t)))) return true;
  if (/augment/i.test(String(wstat?.type||''))) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------
const result = [];
const report = [];

for (const k of Array.from(allKeys).sort()) {
  const of   = mapOf.get(k)     || null;
  const exp  = mapExport.get(k) || null;
  const ws   = mapWstat.get(k)  || null;

  const name = clean(of?.name || of?.title || exp?.name || exp?.upgradeName || ws?.name);
  if (!name) continue;

  const prov = {};
  const out  = {
    // id = ID Overframe si possible (sinon slug)
    slug: of?.slug || slugify(name),
  };
  out.id = of?.id ? String(of.id) : out.slug;
  out.name = name;

  // classes/categories
  out.categories = ['mod'];

  // Champs « factuals »
  takeFirst(out, [{ type: of?.type || of?.tag }, ws], 'type', ['overframe', 'warframestat'], prov);
  takeFirst(out, [{ compatName: of?.compatName || of?.compat }, ws], 'compatName', ['overframe', 'warframestat'], prov);
  takeFirst(out, [ws, of], 'rarity', ['warframestat', 'overframe'], prov);
  takeFirst(out, [{ polarity: of?.polarity ?? of?.polaritySymbol }, ws], 'polarity', ['overframe', 'warframestat'], prov);
  takeFirst(out, [{ baseDrain: of?.baseDrain ?? of?.drain }, ws], 'baseDrain', ['overframe', 'warframestat'], prov);
  takeFirst(out, [ws], 'fusionLimit', ['warframestat'], prov);
  takeFirst(out, [ws], 'drops', ['warframestat'], prov);

  // Description la plus riche
  takeFirst(out, [of, exp], 'description', ['overframe', 'export'], prov);

  // set
  const setName = setByMod.get(k);
  if (setName) {
    out.set = setMeta.get(setName) || { name: setName };
    prov.set = 'overframe-modsets';
  }

  // levelStats
  const levels = extractLevelStats(exp);
  if (levels.length) { out.levelStats = levels; prov.levelStats = 'export'; }

  // isAugment
  out.isAugment = isAugment({ of, wstat: ws, name, desc: out.description });
  prov.isAugment = 'derived';

  // tags (facultatif mais utile au filtrage)
  if (Array.isArray(of?.tags) && of.tags.length) { out.tags = of.tags; prov.tags = 'overframe'; }

  // type normalisation simple (ex: "Mod" -> "Warframe Mod" si compatName est présent)
  if (!out.type) {
    if (out.compatName) out.type = 'Warframe Mod';
    else out.type = 'Mod';
  }

  // rapport
  report.push({
    slug: out.slug,
    name: out.name,
    provenance: prov,
    mergedFrom: {
      overframe: !!of,
      export: !!exp,
      warframestat: !!ws,
    }
  });

  result.push(out);
}

// tri alpha par name
result.sort((a,b)=>a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------------------
fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), 'utf-8');
fs.writeFileSync(OUT_REP,  JSON.stringify(report,  null, 2), 'utf-8');

// CSV léger
const headers = ['id','slug','name','type','compatName','rarity','polarity','baseDrain','fusionLimit','isAugment','set.name','set.size'];
const csv = [headers.join(',')];
for (const m of result) {
  const row = [
    m.id, m.slug, m.name, m.type||'', m.compatName||'', m.rarity||'', m.polarity||'',
    m.baseDrain ?? '', m.fusionLimit ?? '', m.isAugment ? '1':'0',
    m.set?.name || '', m.set?.size ?? ''
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
  csv.push(row);
}
fs.writeFileSync(OUT_CSV, csv.join('\n'), 'utf-8');

console.log(`OK → ${OUT_JSON} (${result.length} mods)`);
console.log(`OK → ${OUT_REP}`);
console.log(`OK → ${OUT_CSV}`);
