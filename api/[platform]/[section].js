// api/[platform]/[section].js
import { getWorldstate, sendJSON, handleOPTIONS } from "../../lib/worldstate.js";

export default async function handler(req, res) {
  if (handleOPTIONS(req, res)) return;
  try {
    const { platform, section } = req.query;
    const data = await getWorldstate(platform);
    if (!(section in data)) return sendJSON(res, { error: "unknown section" }, 404);
    sendJSON(res, data[section], 200);
  } catch (e) {
    console.error("WS section error:", e);
    sendJSON(res, { error: String(e) }, 500);
  }
}
