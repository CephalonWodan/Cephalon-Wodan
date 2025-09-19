// routes_merged_static.js (ESM)
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function mountMergedStatic(app) {
  app.get('/merged/warframe', async (req, res) => {
    try {
      const p = resolve(process.cwd(), 'data/merged_warframe.json');
      const txt = await readFile(p, 'utf-8');
      res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
      res.type('application/json').send(txt);
    } catch (e) {
      res.status(404).json({ error: 'merged_warframe.json not found' });
    }
  });
}
