// tools/wiki/WikiaDataScraper.mjs
// Priorité stricte : ?action=raw  → Special:Export → ?action=edit
// Node 20+ (fetch global). Pas de proxy. Backoff léger sur 403/429/503.

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; Cephalon-Wodan/1.0; +https://github.com/CephalonWodan/Cephalon-Wodan)',
  'Accept': 'text/plain,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Connection': 'keep-alive',
  'Referer': 'https://wiki.warframe.com/',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchText(url, headers = DEFAULT_HEADERS) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }
  return res.text();
}

async function fetchWithRetries(url, {
  tries = 4,
  baseDelayMs = 800,
  headers = DEFAULT_HEADERS,
} = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetchText(url, headers);
    } catch (e) {
      lastErr = e;
      // on ne réessaie que sur 403/429/503
      if (![403, 429, 503].includes(e.status)) break;
      const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 250);
      await sleep(delay);
    }
  }
  throw lastErr;
}

export default class WikiaDataScraper {
  /**
   * @param {string} title - Titre exact de la page/module (ex: "Module:Warframes/data")
   */
  constructor(title) {
    this.title = title;
  }

  // 1) route publique la plus “safe”
  urlRaw() {
    return `https://wiki.warframe.com/w/${encodeURIComponent(this.title)}?action=raw&ctype=text/plain`;
  }

  // 2) export XML (le wikitext est dans <text>…</text>)
  urlExport() {
    return `https://wiki.warframe.com/wiki/Special:Export/${encodeURIComponent(this.title)}`;
  }

  // 3) dernier recours : source d’édition (textarea)
  urlEdit() {
    return `https://wiki.warframe.com/w/${encodeURIComponent(this.title)}?action=edit`;
  }

  static extractFromExport(xml) {
    const m = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/i);
    return m ? m[1] : null;
  }

  async fetchFromRaw() {
    return fetchWithRetries(this.urlRaw(), {
      tries: 4,
      baseDelayMs: 700,
      headers: { ...DEFAULT_HEADERS, Accept: 'text/plain,*/*;q=0.8' },
    });
  }

  async fetchFromExport() {
    const xml = await fetchWithRetries(this.urlExport(), {
      tries: 4,
      baseDelayMs: 900,
      headers: { ...DEFAULT_HEADERS, Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.1' },
    });
    const txt = WikiaDataScraper.extractFromExport(xml);
    if (!txt) {
      const e = new Error('Export XML returned no <text> content');
      e.status = 200;
      throw e;
    }
    return txt;
  }

  async fetchFromEdit() {
    const html = await fetchWithRetries(this.urlEdit(), {
      tries: 3,
      baseDelayMs: 1200,
      headers: { ...DEFAULT_HEADERS, Accept: 'text/html,*/*;q=0.8' },
    });
    const m =
      html.match(/<textarea[^>]*id=["']wpTextbox1["'][^>]*>([\s\S]*?)<\/textarea>/i) ||
      html.match(/<textarea[^>]*name=["']wpTextbox1["'][^>]*>([\s\S]*?)<\/textarea>/i);
    if (!m) {
      const e = new Error('Edit page did not contain wpTextbox1');
      e.status = 200;
      throw e;
    }
    // decode minimal
    return m[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Récupère le wikitext en respectant la priorité:
   * RAW → EXPORT → EDIT (dernier recours)
   */
  async fetchWikitext() {
    try { return await this.fetchFromRaw(); } catch {}
    try { return await this.fetchFromExport(); } catch {}
    return this.fetchFromEdit();
  }

  /**
   * @param {(wikitext: string) => any} transformer
   * @returns {Promise<any>}
   */
  async run(transformer) {
    const wikitext = await this.fetchWikitext();
    return transformer(wikitext);
  }
}
