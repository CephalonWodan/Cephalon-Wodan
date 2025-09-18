// tools/wiki/WikiaDataScraper.mjs
import { setTimeout as sleep } from 'node:timers/promises';
import https from 'node:https';
import getProxyAgent from './proxyAgent.mjs';

const AGENT = getProxyAgent(); // undefined si aucun proxy configuré

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; CW-WikiScraper/1.0; +https://github.com/CephalonWodan/Cephalon-Wodan)',
  'Accept': 'text/plain,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Connection': 'keep-alive',
  'Referer': 'https://wiki.warframe.com/',
};

function fetchText(url, extraHeaders = {}) {
  const headers = { ...DEFAULT_HEADERS, ...extraHeaders };
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers, agent: AGENT }, (res) => {
      const code = res.statusCode || 0;
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (code >= 200 && code < 300) return resolve(data);
        const e = new Error(`${code} ${res.statusMessage || 'HTTP error'}`);
        e.code = code;
        e.body = data;
        reject(e);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchWithRetries(url, { tries = 4, baseDelayMs = 1500, headers = {} } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt < tries) {
    try {
      return await fetchText(url, headers);
    } catch (err) {
      lastErr = err;
      const code = err.code || 0;
      // on ne backoff que sur 403/429/503
      if ([403, 429, 503].includes(code)) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
        await sleep(delay);
        attempt += 1;
        continue;
      }
      break; // autres erreurs : inutile d’insister
    }
  }
  throw lastErr;
}

export default class WikiaDataScraper {
  /**
   * @param {string} title - Titre exact (ex: "Module:Warframes/data")
   */
  constructor(title) {
    this.title = title;
  }

  // 1) route simple, souvent suffisante
  urlRaw() {
    return `https://wiki.warframe.com/w/${encodeURIComponent(this.title)}?action=raw&ctype=text/plain`;
  }

  // 2) export XML (on y récupère le wikitext)
  urlExport() {
    return `https://wiki.warframe.com/wiki/Special:Export/${encodeURIComponent(this.title)}`;
  }

  // 3) dernier recours : page d’édition (textarea)
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
      baseDelayMs: 1000,
      headers: { Accept: 'text/plain,*/*;q=0.8' },
    });
  }

  async fetchFromExport() {
    const xml = await fetchWithRetries(this.urlExport(), {
      tries: 4,
      baseDelayMs: 1500,
      headers: { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.1' },
    });
    const wikitext = WikiaDataScraper.extractFromExport(xml);
    if (!wikitext) {
      const e = new Error('Export XML returned no <text> content');
      e.code = 'NO_TEXT';
      throw e;
    }
    return wikitext;
  }

  async fetchFromEdit() {
    const html = await fetchWithRetries(this.urlEdit(), {
      tries: 3,
      baseDelayMs: 1800,
      headers: { Accept: 'text/html,*/*;q=0.8' },
    });
    // textarea wpTextbox1
    const m =
      html.match(/<textarea[^>]*id=["']wpTextbox1["'][^>]*>([\s\S]*?)<\/textarea>/i) ||
      html.match(/<textarea[^>]*name=["']wpTextbox1["'][^>]*>([\s\S]*?)<\/textarea>/i);
    if (!m) {
      const e = new Error('Edit page did not contain wpTextbox1');
      e.code = 'NO_TEXTAREA';
      throw e;
    }
    return m[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  async fetchWikitext() {
    // Ordre de fallback : RAW → EXPORT → EDIT
    try {
      return await this.fetchFromRaw();
    } catch {}
    try {
      return await this.fetchFromExport();
    } catch {}
    return this.fetchFromEdit();
  }

  async run(transformer) {
    const wikitext = await this.fetchWikitext();
    return transformer(wikitext);
  }
}
