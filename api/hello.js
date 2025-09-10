export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    node: process.version,
    note: "Option C (parser v5) en place"
  });
}
