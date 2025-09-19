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

/* -------------------------- Endpoint statique JSON ------------------------ */
// GET /merged/warframe  -> renvoie le JSON fusionné brut
app.get('/merged/warframe', async (req, res) => {
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

    const type = String(req.query.type || '').toLowerCase();
    if (type) filtered = filtered.filter((e) => String(e.type || '').toLowerCase() === type);

    // selection de champs (optionnelle)
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

/** Détail par nom exact (case-insensitive) */
app.get('/entities/:name', async (req, res) => {
  try {
    const merged = await loadMergedWarframe();
    const all = Array.isArray(merged?.entities) ? merged.entities : [];
    const name = String(req.params.name || '').toLowerCase();
    const one = all.find((e) => String(e.name || '').toLowerCase() === name);
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
      const name = String(req.params.name || '').toLowerCase();
      const one = all.find(
        (e) => String(e.type || '').toLowerCase() === t && String(e.name || '').toLowerCase() === name
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
