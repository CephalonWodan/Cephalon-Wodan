// /api/[platform]/[section].js  (ESM, Vercel Node runtime)
import {
  getSection,
  ALLOWED_PLATFORMS,
  ALLOWED_SECTIONS,
  normalizeLang,
} from "../../lib/worldstate.js";

export default async function handler(req, res) {
  // Autoriser uniquement GET/HEAD
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "method not allowed" });
  }

  try {
    const { platform, section } = req.query;

    const p = String(platform || "").toLowerCase(); // "pc", "ps4", "xb1", "swi", "mob"
    const s = String(section || "").trim();         // ex: "fissures", "sortie", "bounties"

    if (!ALLOWED_PLATFORMS.has(p)) {
      return res.status(400).json({ error: "bad platform" });
    }
    if (!(ALLOWED_SECTIONS.has(s) || s === "bounties")) {
      return res.status(404).json({ error: "unknown section" });
    }

    // Optionnel (utile si plus tard tu localises des strings)
    const lang = normalizeLang(req.query.lang);

    // Cache CDN 60s + SWR
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

    const data = await getSection(p, s, lang);

    if (req.method === "HEAD") {
      // HEAD: pas de corps
      return res.status(204).end();
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("section handler error:", err);
    return res.status(502).json({ error: "worldstate upstream unavailable" });
  }
}