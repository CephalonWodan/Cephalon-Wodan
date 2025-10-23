// routes_merged_static.js (ESM) — version étendue (patchée)
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
      .then((txt) => {
        cache.value = JSON.parse(txt);
        cache.mtimeMs = st.mtimeMs;
        cache.loading = null;
        return cache.value;
      })
      .catch((e) => {
        cache.loading = null;
        throw e;
      });
    return cache.loading;
  };
};

const loadMergedWarframe = cachedJson(DATA('merged_warframe.json'));
const loadMods = cachedJson(DATA('enriched_mods.json'));
const loadRelics = cachedJson(DATA('enriched_relics.json'));
const loadWeapons = cachedJson(DATA('enriched_weapons.json'));
const loadShards = cachedJson(DATA('archonshards.json'));
const send = (res, data) => {
  res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
  res.type('application/json').send(data);
};
const contains = (a, b) =>
  String(a ?? '').toLowerCase().includes(String(b ?? '').toLowerCase());
const eq = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

// Utils de normalisation pour les entités (warframe/archwing/necramech)
const norm = (s) => String(s || '').replace(/<[^>]+>\s*/g, '').trim().toLowerCase();
const byType = (arr, t) =>
  arr.filter((e) => String(e?.type || '').toLowerCase() === String(t || '').toLowerCase());

export function mountMergedStatic(app) {
  /* ---------------------------- JSON fusionné brut ---------------------------- */
  app.get('/warframe', async (req, res) => {
    try {
      send(res, JSON.stringify(await loadMergedWarframe()));
    } catch {
      res.status(404).json({ error: 'merged_warframe.json not found' });
    }
  });

  /* ----------------------------------- MODS ---------------------------------- */
  app.get('/mods', async (req, res) => {
    try {
      const q = req.query.search ?? '';
      const type = req.query.type;
      const compat = req.query.compat;
      const pol = req.query.polarity;
      const rarity = req.query.rarity;
      const tag = req.query.tag;
      const set = req.query.set;
      const aug = req.query.augment;
      const limit = Math.min(+req.query.limit || 0, 5000);

      let mods = await loadMods();
      if (q) mods = mods.filter((m) => contains(m.name, q));
      if (type) mods = mods.filter((m) => eq(m.type, type));
      if (compat) mods = mods.filter((m) => eq(m.compat, compat));
      if (pol) mods = mods.filter((m) => eq(m.polarity, pol));
      if (rarity) mods = mods.filter((m) => eq(m.rarity, rarity));
      if (tag) mods = mods.filter((m) => (m.tags || []).some((t) => eq(t, tag)));
      if (set) mods = mods.filter((m) => eq(m.set?.name, set));
      if (aug === '1' || aug === '0') {
        const want = aug === '1';
        mods = mods.filter((m) => !!m.isAugment === want);
      }
      if (limit) mods = mods.slice(0, limit);
      send(res, JSON.stringify(mods));
    } catch {
      res.status(500).json({ error: 'failed to load enriched_mods.json' });
    }
  });

  app.get('/mods/:slug', async (req, res) => {
    try {
      const mods = await loadMods();
      const m = mods.find((x) => x.slug === req.params.slug || x.id === req.params.slug);
      if (!m) return res.status(404).json({ error: 'mod not found' });
      send(res, JSON.stringify(m));
    } catch {
      res.status(500).json({ error: 'failed to load enriched_mods.json' });
    }
  });

  /* ---------------------------------- ARCHONSHARDS --------------------------------- */
  app.get('/archonshards/:name', async (req, res) => {
    try {
      const shards = await loadShards();
      const query = String(req.params.name || '').toLowerCase();
      // Recherche par clé ou par nom de couleur (valeur)
      const keyMatch = Object.keys(shards).find(k => k.toLowerCase() === query);
      const shardData = keyMatch 
        ? shards[keyMatch] 
        : Object.values(shards).find(s => String(s.value || '').toLowerCase() === query);
      if (!shardData) {
        return res.status(404).json({ error: 'archon shard not found' });
      }
      send(res, JSON.stringify(shardData));
    } catch {
      res.status(500).json({ error: 'failed to load archonshards.json' });
    }
  });

  /* ---------------------------------- RELICS --------------------------------- */
  app.get('/relics', async (req, res) => {
    try {
      const era = req.query.era;
      const code = req.query.code;
      const vaulted = req.query.vaulted;
      const requiem = req.query.requiem;
      const refine = req.query.refine;
      const q = req.query.search ?? '';
      const limit = Math.min(+req.query.limit || 0, 5000);

      let relics = await loadRelics();
      if (era) relics = relics.filter((r) => eq(r.era, era));
      if (code) relics = relics.filter((r) => eq(r.code, code));
      if (q) relics = relics.filter((r) => contains(r.name, q));
      if (vaulted === '1' || vaulted === '0') {
        const want = vaulted === '1';
        relics = relics.filter((r) => (r.isVaulted ?? false) === want);
      }
      if (requiem === '1' || requiem === '0') {
        const want = requiem === '1';
        relics = relics.filter((r) => !!r.isRequiem === want);
      }
      if (refine) {
        relics = relics
          .map((r) => ({ ...r, rewards: { [refine]: r.rewards?.[refine] || [] } }))
          .filter((r) => (r.rewards?.[refine] || []).length > 0);
      }
      if (limit) relics = relics.slice(0, limit);
      send(res, JSON.stringify(relics));
    } catch {
      res.status(500).json({ error: 'failed to load enriched_relics.json' });
    }
  });

  app.get('/relics/:era/:code?', async (req, res) => {
    try {
      const relics = await loadRelics();
      const { era, code } = req.params;
      const out = code
        ? relics.find((r) => eq(r.era, era) && eq(r.code, code)) || null
        : relics.filter((r) => eq(r.era, era));
      if (!out || (Array.isArray(out) && !out.length))
        return res.status(404).json({ error: 'relic(s) not found' });
      send(res, JSON.stringify(out));
    } catch {
      res.status(500).json({ error: 'failed to load enriched_relics.json' });
    }
  });

  /* ------------------- PRIMARY / SECONDARY/ MELEE/ ARCHMELEE / ARCHGUN / ZAW / KITGUN ------------------- */
  // LISTES
  app.get('/weapons', async (req, res) => {
    try {
      // Added filtering by search, subtype, type, and limit
      const q = req.query.search ?? '';
      const subtype = req.query.subtype;
      const type = req.query.type;
      const limit = Math.min(+req.query.limit || 0, 5000);

      let items = await loadWeapons();
      if (q) items = items.filter((i) => contains(i.name, q));
      if (subtype) items = items.filter((i) => eq(i.subtype, subtype));
      if (type) items = items.filter((i) => eq(i.type, type));
      if (limit) items = items.slice(0, limit);
      res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
      res.json(items);
    } catch {
      res.status(500).json({ error: 'failed to load enriched_weapons.json' });
    }
  });

  app.get('/weapons/:slug', async (req, res) => {
    try {
      const items = await loadWeapons();
      const it = items.find(x => x.slug === req.params.slug || String(x.id) === req.params.slug);
      if (!it) return res.status(404).json({ error: 'weapon not found' });
      res.set('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
      res.json(it);
    } catch {
      res.status(500).json({ error: 'failed to load enriched_weapons.json' });
    }
  });

  /* ------------------- WARFRAMES / ARCHWINGS / NECRAMECHS ------------------- */
  // LISTES
  app.get('/warframes', async (req, res) => {
    try {
      const data = await loadMergedWarframe(); // { entities: [...] }
      let items = byType(data.entities || [], 'warframe');
      const q = String(req.query.search || '').trim();
      if (q) items = items.filter((e) => norm(e.name).includes(norm(q)));
      const limit = Math.min(+req.query.limit || 0, 5000);
      if (limit) items = items.slice(0, limit);
      send(res, JSON.stringify(items));
    } catch {
      res.status(500).json({ error: 'failed to load merged_warframe.json' });
    }
  });

  app.get('/archwings', async (req, res) => {
    try {
      const data = await loadMergedWarframe();
      let items = byType(data.entities || [], 'archwing');
      const q = String(req.query.search || '').trim();
      if (q) items = items.filter((e) => norm(e.name).includes(norm(q)));
      const limit = Math.min(+req.query.limit || 0, 5000);
      if (limit) items = items.slice(0, limit);
      send(res, JSON.stringify(items));
    } catch {
      res.status(500).json({ error: 'failed to load merged_warframe.json' });
    }
  });

  app.get('/necramechs', async (req, res) => {
    try {
      const data = await loadMergedWarframe();
      let items = byType(data.entities || [], 'necramech');
      const q = String(req.query.search || '').trim();
      if (q) items = items.filter((e) => norm(e.name).includes(norm(q)));
      const limit = Math.min(+req.query.limit || 0, 5000);
      if (limit) items = items.slice(0, limit);
      send(res, JSON.stringify(items));
    } catch {
      res.status(500).json({ error: 'failed to load merged_warframe.json' });
    }
  });

  // DÉTAILS
  app.get('/warframes/:name', async (req, res) => {
    try {
      const data = await loadMergedWarframe();
      const key = norm(req.params.name);
      const one = (data.entities || []).find(
        (e) => norm(e.name) === key && norm(e.type) === 'warframe'
      );
      if (!one) return res.status(404).json({ error: 'not found' });
      send(res, JSON.stringify(one));
    } catch {
      res.status(500).json({ error: 'failed to load merged_warframe.json' });
    }
  });

  app.get('/archwings/:name', async (req, res) => {
    try {
      const data = await loadMergedWarframe();
      const key = norm(req.params.name);
      const one = (data.entities || []).find(
        (e) => norm(e.name) === key && norm(e.type) === 'archwing'
      );
      if (!one) return res.status(404).json({ error: 'not found' });
      send(res, JSON.stringify(one));
    } catch {
      res.status(500).json({ error: 'failed to load merged_warframe.json' });
    }
  });

  app.get('/necramechs/:name', async (req, res) => {
    try {
      const data = await loadMergedWarframe();
      const key = norm(req.params.name);
      const one = (data.entities || []).find(
        (e) => norm(e.name) === key && norm(e.type) === 'necramech'
      );
      if (!one) return res.status(404).json({ error: 'not found' });
      send(res, JSON.stringify(one));
    } catch {
      res.status(500).json({ error: 'failed to load merged_warframe.json' });
    }
  });
}
