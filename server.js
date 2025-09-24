// server.js (ESM)
import express from 'express';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  getAggregated,
  getSection,
  ALLOWED_PLATFORMS,
  ALLOWED_SECTIONS,
  normalizeLang
} from './lib/worldstate.js';

const app = express();

/* ---------------------------- CORS très simple ---------------------------- */
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

/* -------------------- Lecture & cache du merged côté app ------------------ */
// On lit data/merged_warframe.json (pas de sous-dossier dans /data)
const MERGED_PATH = resolve(process.cwd(), 'data/merged_warframe.json');

// mini-cache mémoire basé sur mtime
let _mergedCache = { mtimeMs: 0, json: null };

async function loadMergedWarframe() {
  const st = await stat(MERGED_PATH);
  if (!_mergedCache.json || _mergedCache.mtimeMs !== st.mtimeMs) {
    const txt = await readFile(MERGED_PATH, 'utf-8');
    const parsed = JSON.parse(txt);
    _mergedCache = { mtimeMs: st.mtimeMs, json: parsed };
  }
  return _mergedCache.json;
}

/* -------------------- Ajout : loaders Mods & Relics ----------------------- */
const MODS_PATH   = resolve(process.cwd(), 'data/enriched_mods.json');
const RELICS_PATH = resolve(process.cwd(), 'data/enriched_relics.json');

let _modsCache   = { mtimeMs: 0, json: null };
let _relicsCache = { mtimeMs: 0, json: null };

async function loadMods() {
  const st = await stat(MODS_PATH);
  if (!_modsCache.json || _modsCache.mtimeMs !== st.mtimeMs) {
    const txt = await readFile(MODS_PATH, 'utf-8');
    _modsCache = { mtimeMs: st.mtimeMs, json: JSON.parse(txt) };
  }
  return _modsCache.json;
}

async function loadRelics() {
  const st = await stat(RELICS_PATH);
  if (!_relicsCache.json || _relicsCache.mtimeMs !== st.mtimeMs) {
    const txt = await readFile(RELICS_PATH, 'utf-8');
    _relicsCache = { mtimeMs: st.mtimeMs, json: JSON.parse(txt) };
  }
  return _relicsCache.json;
}

/* ------------------------------ Helpers ---------------------------------- */
function paginate(arr, { page = 1, per_page = 25 } = {}) {
  const p = Math.max(1, Number(page) || 1);
  const pp = Math.min(200, Math.max(1, Number(per_page) || 25));
  const total = arr.length;
  const items = arr.slice((p - 1) * pp, (p - 1) * pp + pp);
  return { page: p, per_page: pp, total, total_pages: Math.ceil(total / pp), items };
}

function keywordMatch(q) {
  const qq = String(q || '').trim().toLowerCase();
  if (!qq) return () => true;
  return (o) =>
    [o.name, o.type, o.description, o.passive]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(qq));
}

function pickFields(obj, fieldsCsv) {
  const fields = String(fieldsCsv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!fields.length) return obj;
  const out = {};
  for (const k of fields) if (k in obj) out[k] = obj[k];
  return out;
}

function normName(s) {
  return String(s || '')
    .replace(/<[^>]+>\s*/g, '') // retire "<ARCHWING>", "<NECRAMECH>", etc.
    .trim()
    .toLowerCase();
}

const contains = (a, b) => String(a ?? '').toLowerCase().includes(String(b ?? '').toLowerCase());
const eq       = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

/* -------------------------- Endpoint statique JSON ------------------------ */
// GET /warframe  -> renvoie le JSON fusionné brut
app.get('/warframe', async (req, res) => {
  try {
    const txt = await readFile(MERGED_PATH, 'utf-8');
    res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.type('application/json').send(txt);
  } catch {
    res.status(404).json({ error: 'merged_warframe.json not found' });
  }
});

/* --------------------------- Routeur “entities” --------------------------- */
/** Liste paginée / filtrée
 *  GET /entities?q=&type=warframe|archwing|necramech&page=&per_page=&fields=
 */
app.get('/entities', async (req, res) => {
  try {
    const merged = await loadMergedWarframe(); // { generatedAt, count, entities: [...] }
    const all = Array.isArray(merged?.entities) ? merged.entities : [];

    let filtered = all.filter(keywordMatch(req.query.q));

    // match tolérant (noms / abilities normalisés)
    if (req.query.q) {
      const qn = normName(req.query.q);
      filtered = filtered.filter(
        (e) =>
          normName(e.name).includes(qn) ||
          (e.abilities || []).some((a) => normName(a.name).includes(qn))
      );
    }

    const type = String(req.query.type || '').toLowerCase();
    if (type) filtered = filtered.filter((e) => String(e.type || '').toLowerCase() === type);

    // sélection de champs (optionnelle)
    const fields = req.query.fields;
    const shaped = fields ? filtered.map((e) => pickFields(e, fields)) : filtered;

    const result = paginate(shaped, {
      page: req.query.page,
      per_page: req.query.per_page
    });

    res.set('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
    res.json(result);
  } catch (e) {
    console.error('entities list error:', e);
    res.status(500).json({ error: 'failed to read merged_warframe.json' });
  }
});

/** Détail par nom exact (case-insensitive, tags supprimés) */
app.get('/entities/:name', async (req, res) => {
  try {
    const merged = await loadMergedWarframe();
    const all = Array.isArray(merged?.entities) ? merged.entities : [];
    const key = normName(req.params.name);
    const one = all.find((e) => normName(e.name) === key);
    if (!one) return res.status(404).json({ error: 'not found' });
    res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.json(one);
  } catch (e) {
    console.error('entity detail error:', e);
    res.status(500).json({ error: 'failed to read merged_warframe.json' });
  }
});

/** Alias pratiques par type + nom exact */
for (const [route, t] of [
  ['warframes', 'warframe'],
  ['archwings', 'archwing'],
  ['necramechs', 'necramech']
]) {
  app.get(`/${route}/:name`, async (req, res) => {
    try {
      const merged = await loadMergedWarframe();
      const all = Array.isArray(merged?.entities) ? merged.entities : [];
      const key = normName(req.params.name);
      const one = all.find(
        (e) => String(e.type || '').toLowerCase() === t && normName(e.name) === key
      );
      if (!one) return res.status(404).json({ error: 'not found' });
      res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
      res.json(one);
    } catch (e) {
      console.error(`${route} alias error:`, e);
      res.status(500).json({ error: 'failed to read merged_warframe.json' });
    }
  });
}

/* --------------------------- Nouvelles routes : MODS ---------------------- */
// GET /mods?search=&type=&compat=&polarity=&rarity=&augment=0|1&set=&tag=&limit=
app.get('/mods', async (req, res) => {
  try {
    let mods = await loadMods();

    const q        = req.query.search ?? '';
    const type     = req.query.type;
    const compat   = req.query.compat;
    const pol      = req.query.polarity;
    const rarity   = req.query.rarity;
    const tag      = req.query.tag;
    const setName  = req.query.set;
    const augment  = req.query.augment; // "1"|"0"
    const limit    = Math.min(parseInt(req.query.limit || '0', 10) || 0, 5000);

    if (q)       mods = mods.filter(m => contains(m.name, q));
    if (type)    mods = mods.filter(m => eq(m.type, type));
    if (compat)  mods = mods.filter(m => eq(m.compat, compat));
    if (pol)     mods = mods.filter(m => eq(m.polarity, pol));
    if (rarity)  mods = mods.filter(m => eq(m.rarity, rarity));
    if (tag)     mods = mods.filter(m => (m.tags||[]).some(t => eq(t, tag)));
    if (setName) mods = mods.filter(m => eq(m.set?.name, setName));
    if (augment === '1' || augment === '0') {
      const want = augment === '1';
      mods = mods.filter(m => !!m.isAugment === want);
    }
    if (limit) mods = mods.slice(0, limit);

    res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.json(mods);
  } catch (e) {
    res.status(500).json({ error: 'failed to read enriched_mods.json' });
  }
});

// GET /mods/:slug
app.get('/mods/:slug', async (req, res) => {
  try {
    const mods = await loadMods();
    const m = mods.find(x => x.slug === req.params.slug || x.id === req.params.slug);
    if (!m) return res.status(404).json({ error: 'mod not found' });
    res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.json(m);
  } catch (e) {
    res.status(500).json({ error: 'failed to read enriched_mods.json' });
  }
});

/* ------------------------- Nouvelles routes : RELICS ---------------------- */
// GET /relics?era=&code=&vaulted=1|0&requiem=1|0&refine=Radiant&search=&limit=
app.get('/relics', async (req, res) => {
  try {
    let relics = await loadRelics();

    const era     = req.query.era;
    const code    = req.query.code;
    const vaulted = req.query.vaulted;   // "1"|"0"
    const requiem = req.query.requiem;   // "1"|"0"
    const refine  = req.query.refine;    // Intact|Exceptional|Flawless|Radiant
    const q       = req.query.search ?? '';
    const limit   = Math.min(parseInt(req.query.limit || '0', 10) || 0, 5000);

    if (era)   relics = relics.filter(r => eq(r.era, era));
    if (code)  relics = relics.filter(r => eq(r.code, code));
    if (q)     relics = relics.filter(r => contains(r.name, q));

    if (vaulted === '1' || vaulted === '0') {
      const want = vaulted === '1';
      relics = relics.filter(r => (r.isVaulted === undefined ? false : r.isVaulted) === want);
    }
    if (requiem === '1' || requiem === '0') {
      const want = requiem === '1';
      relics = relics.filter(r => !!r.isRequiem === want);
    }
    if (refine) {
      relics = relics
        .map(r => ({ ...r, rewards: { [refine]: r.rewards?.[refine] || [] } }))
        .filter(r => (r.rewards?.[refine] || []).length > 0);
    }
    if (limit) relics = relics.slice(0, limit);

    res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.json(relics);
  } catch (e) {
    res.status(500).json({ error: 'failed to read enriched_relics.json' });
  }
});

// GET /relics/:era and GET /relics/:era/:code
app.get('/relics/:era/:code?', async (req, res) => {
  try {
    const relics = await loadRelics();
    const { era, code } = req.params;

    if (code) {
      const r = relics.find(x => eq(x.era, era) && eq(x.code, code));
      if (!r) return res.status(404).json({ error: 'relic not found' });
      res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
      return res.json(r);
    }

    const list = relics.filter(x => eq(x.era, era));
    if (!list.length) return res.status(404).json({ error: 'no relics for era' });
    res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'failed to read enriched_relics.json' });
  }
});

/* ---------------------------- Tes routes existantes ----------------------- */
app.get('/api/:platform', async (req, res) => {
  try {
    const p = String(req.params.platform || '').toLowerCase();
    if (!ALLOWED_PLATFORMS.has(p)) {
      return res.status(400).json({ error: 'bad platform' });
    }
    const lang = normalizeLang(req.query.lang);
    const data = await getAggregated(p, lang);
    res.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.json(data);
  } catch (e) {
    console.error('index handler error:', e);
    return res.status(502).json({ error: 'worldstate upstream unavailable' });
  }
});

app.get('/api/:platform/:section', async (req, res) => {
  try {
    const p = String(req.params.platform || '').toLowerCase();
    const s = String(req.params.section || '').trim();
    if (!ALLOWED_PLATFORMS.has(p)) {
      return res.status(400).json({ error: 'bad platform' });
    }
    if (!(ALLOWED_SECTIONS.has(s) || s === 'bounties')) {
      return res.status(404).json({ error: 'unknown section' });
    }
    const lang = normalizeLang(req.query.lang);
    const data = await getSection(p, s, lang);
    res.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.json(data);
  } catch (e) {
    console.error('section handler error:', e);
    return res.status(502).json({ error: 'worldstate upstream unavailable' });
  }
});

/* --------------------------------- Health -------------------------------- */
app.get('/healthz', (req, res) => res.json({ ok: true }));

/* --------------------------------- Start --------------------------------- */
const PORT = process.env.PORT || 3000; // Railway fournit PORT
app.listen(PORT, () => console.log(`Worldstate + Entities API listening on :${PORT}`));
