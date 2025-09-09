//refresh_worldstate.mjs

import { promises as fs } from "fs";
import path from "path";

const OUT = path.join(process.cwd(), "api", "v1", "worldstate");
const PLATFORMS = ["pc","ps4","xb1","swi"];
const LANGS = ["en","fr"];

async function ensureDir(d){ await fs.mkdir(d, { recursive:true }); }

async function fetchJson(url){
  const res = await fetch(url, { headers:{ "user-agent":"Cephalon-Wodan-API/1.0" }});
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function main(){
  await ensureDir(OUT);
  const index = [];

  for (const p of PLATFORMS){
    for (const lang of LANGS){
      const url = `https://api.warframestat.us/${p}?language=${lang}`;
      try{
        const json = await fetchJson(url);
        const file = path.join(OUT, `${p}.${lang}.json`);
        await fs.writeFile(file, JSON.stringify(json, null, 2));
        index.push({ file: `${p}.${lang}.json`, url: `/api/v1/worldstate/${p}.${lang}.json`, platform:p, lang, updated: new Date().toISOString() });
        console.log(`[ws] ${p}.${lang} OK`);
      }catch(e){
        console.warn(`[ws] skip ${p}.${lang}: ${e.message}`);
      }
    }
  }

  await fs.writeFile(path.join(OUT, "index.json"), JSON.stringify({
    updated: new Date().toISOString(),
    files: index
  }, null, 2));
}

main().catch(e=>{ console.error(e); process.exit(1); });
