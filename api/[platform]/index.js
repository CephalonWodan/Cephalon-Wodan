import { ALLOWED_PLATFORMS, fetchAggregated, normalizeLang } from "../_lib/worldstate.js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Vary", "Origin");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const plat = String(req.query.platform || "").toLowerCase();
  const lang = normalizeLang(req.query.lang || req.query.language || "en");

  if (!ALLOWED_PLATFORMS.has(plat)) return res.status(400).json({ error: "Unknown platform" });

  try {
    const data = await fetchAggregated(plat, lang);
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "Upstream error", detail: String(err?.message || err) });
  }
}
