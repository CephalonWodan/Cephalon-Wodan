// server.js (ESM)
import express from 'express';
import {
  getAggregated,
  getSection,
  ALLOWED_PLATFORMS,
  ALLOWED_SECTIONS,
  normalizeLang
} from './lib/worldstate.js';

const app = express();

// CORS simple (utile si tu appelles l'API depuis un site)
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

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

// petit endpoint de santé
app.get('/healthz', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000; // Railway fournit PORT
app.listen(PORT, () => console.log(`Worldstate API listening on :${PORT}`));
