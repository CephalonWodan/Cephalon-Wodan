import { getWorldstate, sendJSON, handleOPTIONS } from "../../_lib/worldstate.js";

export default async function handler(req, res) {
  if (handleOPTIONS(req, res)) return;
  try {
    const { platform } = req.query; // "pc" | "ps4" | "xb1" | "swi"
    const data = await getWorldstate(platform);
    sendJSON(res, data, 200);
  } catch (e) {
    sendJSON(res, { error: String(e) }, 500);
  }
}
