// /api/[platform]/index.js  (ESM, Vercel Node runtime)
import { getAggregated, ALLOWED_PLATFORMS, normalizeLang } from "../../lib/worldstate.js";

export default async function handler(req, res) {
  // Autoriser uniquement GET/HEAD
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "method not allowed" });
  }

  try {
    const { platform } = req.query; // "pc", "ps4", ...
    const p = String(platform || "").toLowerCase();

    if (!ALLOWED_PLATFORMS.has(p)) {
      return res.status(400).json({ error: "bad platform" });
    }

    // optionnel (si plus tard tu localises des strings)
    const lang = normalizeLang(req.query.lang);

    // cache CDN 60s
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

    const data = await getAggregated(p, lang);

    if (req.method === "HEAD") {
      // Pas de body pour HEAD (optimise un peu)
      return res.status(204).end();
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("index handler error:", err);
    return res.status(502).json({ error: "worldstate upstream unavailable" });
  }
}