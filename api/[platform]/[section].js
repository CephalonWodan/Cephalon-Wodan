import {
  getSection,
  ALLOWED_PLATFORMS,
  ALLOWED_SECTIONS,
  normalizeLang,
  getParserMeta
} from '../../lib/worldstate.js';

export default async function handler(req, res) {
  try {
    const { platform, section } = req.query;
    const p = String(platform || '').toLowerCase();
    const s = String(section || '').trim();
    const debug = 'debug' in req.query;

    if (!ALLOWED_PLATFORMS.has(p)) {
      return res.status(400).json({ error: 'bad platform' });
    }
    if (!(ALLOWED_SECTIONS.has(s) || s === 'bounties')) {
      return res.status(404).json({ error: 'unknown section' });
    }

    const lang = normalizeLang(req.query.lang);

    if (debug) res.setHeader('Cache-Control', 'no-store');
    else res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

    const data = await getSection(p, s, lang);

    const meta = getParserMeta();
    if (meta) {
      res.setHeader('X-WS-Parser', meta.path);
      res.setHeader('X-WS-Lang', meta.locale);
      res.setHeader('X-WS-LangLoaded', String(!!meta.hasLanguage));
      res.setHeader('X-WS-SourceLen', String(meta.len ?? 0));
      if (meta.firstError) res.setHeader('X-WS-FirstError', String(meta.firstError));
    }

    if (debug) return res.status(200).json({ data, _meta: meta });
    return res.status(200).json(data);
  } catch (err) {
    console.error('section handler error:', err);
    return res.status(502).json({ error: 'worldstate upstream unavailable' });
  }
}
