// /api/[platform]/index.js  (ESM)
import { getAggregated, ALLOWED_PLATFORMS, normalizeLang } from "../../lib/worldstate.js";

export default async function handler(req, res) {
  try {
    const { platform } = req.query; // "pc", "ps4", ...
    const p = String(platform || "").toLowerCase();
    if (!ALLOWED_PLATFORMS.has(p)) {
      return res.status(400).json({ error: "bad platform" });
    }

    // optionnel
    const lang = normalizeLang(req.query.lang);

    // cache CDN 60s
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

    const data = await getAggregated(p, lang);
    return res.status(200).json(data);
  } catch (err) {
    console.error("index handler error:", err);
    return res.status(502).json({ error: "worldstate upstream unavailable" });
  }
}
