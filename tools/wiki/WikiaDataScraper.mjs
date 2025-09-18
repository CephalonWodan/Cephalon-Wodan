// WikiaDataScraper – base "WFCD-like" adaptée au wiki officiel
// - priorité: action=raw → Special:Export → action=edit
// - headers réalistes + retries/backoff
// - applique un transformer (fn(rawText) -> json)
// Licence: MIT (tu peux l’ajouter dans ton repo)

import fs from 'node:fs/promises';

const WIKI_ORIGIN = 'https://wiki.warframe.com';

const EDIT_URL    = (title) => `${WIKI_ORIGIN}/w/index.php?title=${encodeURIComponent(title)}&action=edit`;
const RAW_URL     = (title) => `${WIKI_ORIGIN}/w/index.php?title=${encodeURIComponent(title)}&action=raw&ctype=text/plain`;
const EXPORT_URL  = (title) => `${WIKI_ORIGIN}/wiki/Special:Export/${encodeURIComponent(title)}`;

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function fetchText(url, tries = 4) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36 Cephalon-Wodan/1.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.8',
    'Referer': 'https://wiki.warframe.com/'
  };
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      await sleep(600 + i*700 + Math.random()*400);
    }
  }
  throw lastErr || new Error('fetch failed');
}

function htmlDecode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export default class WikiaDataScraper {
  constructor(title, label, transformerFn) {
    // title ex: "Module:Warframes/data"
    this.title = title;
    this.label = label;
    this.transformerFn = transformerFn;
  }

  async fetchFromRaw() {
    return await fetchText(RAW_URL(this.title));
  }
  async fetchFromExport() {
    const xml = await fetchText(EXPORT_URL(this.title));
    const m = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/i);
    if (!m) throw new Error('Export <text> not found');
    return m[1];
  }
  async fetchFromEdit() {
    const html = await fetchText(EDIT_URL(this.title));
    const m = html.match(/<textarea[^>]*id=["']wpTextbox1["'][^>]*>([\s\S]*?)<\/textarea>/i);
    if (!m) throw new Error('Edit textarea not found');
    return htmlDecode(m[1]);
  }

  async fetchWikitext() {
    // ordre "gentil" pour éviter 403
    try { return await this.fetchFromRaw(); } catch {}
    try { return await this.fetchFromExport(); } catch {}
    return await this.fetchFromEdit();
  }

  async run(outJsonPath) {
    const raw = await this.fetchWikitext();
    const data = await this.transformerFn(raw);
    await fs.mkdir(outJsonPath.replace(/\\/g, '/').replace(/\/[^/]+$/, ''), { recursive: true });
    await fs.writeFile(outJsonPath, JSON.stringify(data, null, 2), 'utf8');
    return { count: (data && typeof data === 'object') ? Object.keys(data).length : 0, outFile: outJsonPath };
  }
}
