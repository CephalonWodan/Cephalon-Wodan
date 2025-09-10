// api/[platform]/[section].js
import {
  ALLOWED_PLATFORMS,
  ALLOWED_SECTIONS,
  getSection,
  normalizeLang,
} from "../../lib/worldstate.js"; // ⬅️ deux niveaux

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const plat = String(req.query.platform || "").trim().toLowerCase();
    let   sec  = String(req.query.section  || "")
                  .trim()
                  .replace(/\/+$/, "")              // retire trailing slash
                  .replace(/\.(js|json)$/i, "")     // retire extension héritée
                  .toLowerCase();

    if (!sec) return res.status(400).json({ error: "Missing section" });

    // Alias convivial
    if (sec === "bounties") sec = "syndicateMissions";

    const lang = normalizeLang(req.query.lang || req.query.language || "en");

    if (!ALLOWED_PLATFORMS.has(plat)) {
      return res.status(400).json({ error: "Unknown platform" });
    }
    if (!ALLOWED_SECTIONS.has(sec)) {
      return res.status(404).json({ error: "Unknown section" });
    }

    const data = await getSection(plat, sec, lang);

    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    console.error("section handler error:", err);
    const msg = String(err?.message || err || "");
    const isTimeout = /aborted|AbortError|timeout/i.test(msg);
    const code = isTimeout ? 504 : 502;
    res.setHeader("content-type", "application/json; charset=utf-8");
    return res.status(code).json({ error: "Upstream error", detail: msg });
  }
}
