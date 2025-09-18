// Minimal WikiaDataScraper – esprit WFCD, adapté Cephalon-Wodan (MIT)
// - priorité: ?action=edit -> extrait le wikitext du <textarea id="wpTextbox1">
// - fallbacks: ?action=raw -> Special:Export
// - headers réalistes + retries/backoff
// - passe le texte brut à un transformer (ex: transformWarframeLite)

import fs from 'node:fs/promises';

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function fetchWithHeaders(url, tries=4) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36 Cephalon-Wodan/1.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.8',
    'Referer': 'https://wiki.warframe.com/'
  };
  for (let i=0; i<tries; i++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.text();
    await sleep(600 + i*700 + Math.random()*400);
  }
  throw new Error(`HTTP fail on ${url}`);
}

export default class WikiaDataScraper {
  constructor(sourceUrl, label, transformerFn) {
    this.sourceUrl = sourceUrl;   // ex: https://wiki.warframe.com/w/Module:Warframes/data?action=edit
    this.label = label;           // ex: "Warframes"
    this.transformerFn = transformerFn;
  }

  async fetchTextEdit(url) {
    const html = await fetchWithHeaders(url);
    const m = html.match(/<textarea[^>]*id=["']wpTextbox1["'][^>]*>([\s\S]*?)<\/textarea>/i);
    if (!m) throw new Error('Edit textarea not found');
    // décodage HTML minimal
    return m[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  }

  async fetchTextRaw(title) {
    const q = new URLSearchParams({ title, action: 'raw', ctype: 'text/plain' }).toString();
    return fetchWithHeaders(`https://wiki.warframe.com/w/index.php?${q}`);
  }

  async fetchTextExport(title) {
    const page = encodeURIComponent(title);
    const xml = await fetchWithHeaders(`https://wiki.warframe.com/wiki/Special:Export/${page}`);
    const m = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/i);
    if (!m) throw new Error('Export <text> not found');
    return m[1];
  }

  async fetchWikitext() {
    // ordre WFCD-like: edit -> raw -> export
    // sourceUrl = …Module:Warframes/data?action=edit
    try {
      return await this.fetchTextEdit(this.sourceUrl);
    } catch {
      // extraire le title depuis l’URL ?action=edit
      const u = new URL(this.sourceUrl);
      const title = u.searchParams.get('title') || u.pathname.split('/w/')[1]?.split('?')[0];
      if (!title) throw new Error('Cannot derive title from URL');

      try { return await this.fetchTextRaw(title); }
      catch { return await this.fetchTextExport(title); }
    }
  }

  async run(outJsonPath) {
    const raw = await this.fetchWikitext();
    const data = await this.transformerFn(raw);
    await fs.mkdir(new URL('file:' + outJsonPath).pathname.replace(/\\/g,'/').replace(/\/[^/]+$/, ''), { recursive: true }).catch(()=>{});
    await fs.writeFile(outJsonPath, JSON.stringify(data, null, 2), 'utf8');
    return { count: Object.keys(data || {}).length, outFile: outJsonPath };
  }
}
