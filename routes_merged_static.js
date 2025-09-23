// routes_merged_static.js (ESM) — version étendue
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA = (p) => resolve(process.cwd(), 'data', p);
const cachedJson = (absPath) => {
  let cache = { mtimeMs: 0, value: null, loading: null };
  return async () => {
    const st = await stat(absPath);
    if (st.mtimeMs === cache.mtimeMs && cache.value) return cache.value;
    if (cache.loading) return cache.loading;
    cache.loading = readFile(absPath, 'utf-8')
      .then(txt => {
        cache.value = JSON.parse(txt);
        cache.mtimeMs = st.mtimeMs;
        cache.loading = null;
        return cache.value;
      })
      .catch(e => { cache.loading = null; throw e; });
    return cache.loading;
  };
};

const loadMergedWarframe = cachedJson(DATA('merged_warframe.json'));
const loadMods          = cachedJson(DATA('enriched_mods.json'));
const loadRelics        = cachedJson(DATA('enriched_relics.json'));

const send = (res, data) => {
  res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
  res.type('application/json').send(data);
};
const contains = (a,b) => String(a??'').toLowerCase().includes(String(b??'').toLowerCase());
const eq = (a,b) => String(a??'').toLowerCase() === String(b??'').toLowerCase();

export function mountMergedStatic(app) {
  // existant
  app.get('/merged/warframe', async (req, res) => {
    try { send(res, JSON.stringify(await loadMergedWarframe())); }
    catch { res.status(404).json({ error: 'merged_warframe.json not found' }); }
  });

  // MODS
  app.get('/mods', async (req, res) => {
    try {
      const q=req.query.search??'', type=req.query.type, compat=req.query.compat,
            pol=req.query.polarity, rarity=req.query.rarity, tag=req.query.tag,
            set=req.query.set, aug=req.query.augment, limit=Math.min(+req.query.limit||0,5000);
      let mods = await loadMods();
      if (q)     mods = mods.filter(m => contains(m.name, q));
      if (type)  mods = mods.filter(m => eq(m.type, type));
      if (compat)mods = mods.filter(m => eq(m.compat, compat));
      if (pol)   mods = mods.filter(m => eq(m.polarity, pol));
      if (rarity)mods = mods.filter(m => eq(m.rarity, rarity));
      if (tag)   mods = mods.filter(m => (m.tags||[]).some(t=>eq(t,tag)));
      if (set)   mods = mods.filter(m => eq(m.set?.name, set));
      if (aug==='1'||aug==='0'){ const w=aug==='1'; mods=mods.filter(m=>!!m.isAugment===w); }
      if (limit) mods = mods.slice(0, limit);
      send(res, JSON.stringify(mods));
    } catch { res.status(500).json({ error: 'failed to load enriched_mods.json' }); }
  });

  app.get('/mods/:slug', async (req, res) => {
    try {
      const mods = await loadMods();
      const m = mods.find(x => x.slug===req.params.slug || x.id===req.params.slug);
      if (!m) return res.status(404).json({ error: 'mod not found' });
      send(res, JSON.stringify(m));
    } catch { res.status(500).json({ error: 'failed to load enriched_mods.json' }); }
  });

  // RELICS
  app.get('/relics', async (req, res) => {
    try {
      const era=req.query.era, code=req.query.code, vaulted=req.query.vaulted,
            requiem=req.query.requiem, refine=req.query.refine, q=req.query.search??'',
            limit=Math.min(+req.query.limit||0,5000);
      let relics = await loadRelics();
      if (era)     relics = relics.filter(r=>eq(r.era, era));
      if (code)    relics = relics.filter(r=>eq(r.code, code));
      if (q)       relics = relics.filter(r=>contains(r.name, q));
      if (vaulted==='1'||vaulted==='0'){ const w=vaulted==='1'; relics=relics.filter(r=>(r.isVaulted??false)===w); }
      if (requiem==='1'||requiem==='0'){ const w=requiem==='1'; relics=relics.filter(r=>!!r.isRequiem===w); }
      if (refine)  relics = relics.map(r=>({...r,rewards:{[refine]:r.rewards?.[refine]||[]}}))
                                  .filter(r=>(r.rewards?.[refine]||[]).length>0);
      if (limit)   relics = relics.slice(0, limit);
      send(res, JSON.stringify(relics));
    } catch { res.status(500).json({ error: 'failed to load enriched_relics.json' }); }
  });

  app.get('/relics/:era/:code?', async (req, res) => {
    try {
      const relics = await loadRelics();
      const { era, code } = req.params;
      const out = code
        ? relics.find(r=>eq(r.era,era)&&eq(r.code,code)) || null
        : relics.filter(r=>eq(r.era,era));
      if (!out || (Array.isArray(out)&&!out.length)) return res.status(404).json({ error: 'relic(s) not found' });
      send(res, JSON.stringify(out));
    } catch { res.status(500).json({ error: 'failed to load enriched_relics.json' }); }
  });
}