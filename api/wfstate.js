import { getAggregated, ALLOWED_PLATFORMS } from '../lib/worldstate.js';

export default async function handler(req, res) {
  const platform = (typeof req.query.platform === 'string' && ALLOWED_PLATFORMS.has(req.query.platform))
    ? req.query.platform
    : 'pc';
  try {
    const data = await getAggregated(platform);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch or parse worldstate',
      details: err?.message || String(err),
    });
  }
}
