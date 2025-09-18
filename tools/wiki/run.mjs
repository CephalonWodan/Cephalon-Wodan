import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WarframesModuleScraper from './scrapers/WarframesModuleScraper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const out = path.join(__dirname, '..', '..', 'data', 'wiki', 'helminth_progenitor.json');
  const scraper = new WarframesModuleScraper();
  const res = await scraper.run(out);
  console.log(`✓ ${scraper.label}: ${res.count} entries -> ${res.outFile}`);
}

main().catch(err => { console.error(err); process.exit(1); });
