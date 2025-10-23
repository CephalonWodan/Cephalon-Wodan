// tools/worldstate_custom_parser.mjs
// Parser autonome du worldstate brut (toutes plateformes) → JSON normalisé
// - conserve la structure d'origine
// - normalise toutes les dates MongoDB-like et ObjectId
// - ajoute des méta-infos par plateforme

const PLATFORM_HOST = {
  pc:  'content.warframe.com',
  ps4: 'content-ps4.warframe.com',
  xb1: 'content-xb1.warframe.com',
  swi: 'content-swi.warframe.com',
  mob: 'content-mob.warframe.com',
};

const ALL_PLATFORMS = Object.keys(PLATFORM_HOST);

// ---------- utils date/id ----------------------------------------------------

function toMillis(x) {
  // supporte { $date: { $numberLong: "..." } }, { $date: "..." }, number, string ISO
  if (!x) return null;

  // { $date: { $numberLong: "1699999999999" } }
  if (typeof x === 'object' && '$date' in x) {
    const d = x.$date;
    if (d && typeof d === 'object' && '$numberLong' in d) {
      const n = Number(d.$numberLong);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof d === 'string' || typeof d === 'number') {
      const n = Date.parse(d);
      return Number.isFinite(n) ? n : null;
    }
  }

  // { sec: 1700000000, usec/nsec… } (parfois)
  if (typeof x === 'object' && 'sec' in x) {
    const n = Number(x.sec) * 1000;
    return Number.isFinite(n) ? n : null;
  }

  if (typeof x === 'number') {
    // seconds or millis? assume ≥ 10^12 means millis
    if (x > 1e12) return x;
    if (x > 1e9)  return Math.round(x * 1000);
  }

  if (typeof x === 'string') {
    // ISO / RFC date
    const n = Date.parse(x);
    if (Number.isFinite(n)) return n;
    // numeric string
    const nx = Number(x);
    if (Number.isFinite(nx)) {
      return nx > 1e12 ? nx : Math.round(nx * 1000);
    }
  }

  return null;
}

function normDateField(v) {
  const ms = toMillis(v);
  return ms ? { date: new Date(ms).toISOString(), millis: ms } : null;
}

function isPlainObject(o) {
  return o && typeof o === 'object' && !Array.isArray(o);
}

// Parcours récursif :
// - remplace { $oid } -> id
// - remplace { $date } unitairement si le champ s'appelle "activation"/"expiry"… ou convertit partout si pattern détecté
// - garde les champs originaux dans *_raw si conversion effectuée (optionnel ici : non, on allège)
function deepNormalize(node) {
  if (Array.isArray(node)) {
    return node.map(deepNormalize);
  }
  if (!isPlainObject(node)) {
    return node;
  }

  const out = {};
  for (const [k, v] of Object.entries(node)) {
    // ObjectId
    if (isPlainObject(v) && '$oid' in v && typeof v.$oid === 'string') {
      out[k === '_id' ? 'id' : k] = v.$oid;
      continue;
    }

    // Dates "standard" du worldstate
    if (['activation','expiry','start','end','startDate','endDate','next','previous','timestamp','date'].includes(k)) {
      const nd = normDateField(v);
      if (nd) { out[k] = nd.date; out[k + 'Ms'] = nd.millis; continue; }
    }

    // Champs timeLeft en texte -> on laisse tel quel
    // Dans certains objets, toute valeur { $date: ... } doit devenir ISO
    if (isPlainObject(v) && '$date' in v) {
      const nd = normDateField(v);
      if (nd) { out[k] = nd.date; out[k + 'Ms'] = nd.millis; continue; }
    }

    // Parcours récursif
    out[k] = deepNormalize(v);
  }
  return out;
}

// ---------- fetch ------------------------------------------------------------

function wsUrl(platform) {
  const host = PLATFORM_HOST[platform] || PLATFORM_HOST.pc;
  return `https://${host}/dynamic/worldState.php`;
}

async function fetchWorldstateText(platform) {
  const r = await fetch(wsUrl(platform), {
    cache: 'no-store',
    headers: {
      'user-agent': 'Cephalon-Wodan/1.0 (+custom-worldstate-parser)',
      'accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${platform}`);
  return r.text();
}

function safeJsonParse(t) {
  try { return JSON.parse(t); } catch { return null; }
}

async function fetchAndParsePlatform(platform) {
  const startedAt = Date.now();
  const rawText = await fetchWorldstateText(platform);
  const raw = safeJsonParse(rawText);
  if (!raw || typeof raw !== 'object') {
    return {
      platform, ok: false,
      error: 'Invalid JSON',
      _meta: { startedAt, durationMs: Date.now() - startedAt, bytes: (rawText||'').length }
    };
  }
  const normalized = deepNormalize(raw);
  return {
    platform,
    ok: true,
    data: normalized,
    _meta: {
      startedAt,
      durationMs: Date.now() - startedAt,
      bytes: (rawText || '').length,
      source: wsUrl(platform),
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function fetchAllWorldstates(platforms = ALL_PLATFORMS) {
  const jobs = platforms.map(p => fetchAndParsePlatform(p).catch(e => ({
    platform: p, ok: false, error: String(e?.message || e)
  })));
  const results = await Promise.all(jobs);

  const out = { _meta: { generatedAt: new Date().toISOString(), platforms } };
  for (const r of results) {
    out[r.platform] = r.ok ? r.data : { _error: r.error || 'fetch/parse failed' };
  }
  return out;
}

// ---------- CLI -------------------------------------------------------------
// Usage: node tools/worldstate_custom_parser.mjs > out.json
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const data = await fetchAllWorldstates();
      process.stdout.write(JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[worldstate] fatal:', e);
      process.exit(1);
    }
  })();
}
