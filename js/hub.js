// ===============================
// Warframe Hub – hub.js (complet)
// Sources: Live (warframestat.us) / Vercel (API perso) / Local (Pages)
// Includes: fallback auto pour Vercel .js (legacy builds)
// ===============================

// ---- Préférences (plateforme / langue / source)
const LS_KEY = "wfHubSettings";
function loadSettings(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? {}; } catch { return {}; } }
function saveSettings(s){ localStorage.setItem(LS_KEY, JSON.stringify(s)); }

const navLang = (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
let settings = Object.assign({ platform: "pc", lang: navLang, source: "live" }, loadSettings());

// ---- Éléments UI
const $platform = document.querySelector("#platform");
const $lang     = document.querySelector("#lang");
const $source   = document.querySelector("#source");

if ($platform) $platform.value = settings.platform;
if ($lang)     $lang.value     = settings.lang;
if ($source)   $source.value   = settings.source;

// ---- Helpers UI / format
const el = (sel) => document.querySelector(sel);
function li(inner){ const n=document.createElement("li"); n.innerHTML=inner; return n; }

function makeDateFormatter(){
  return new Intl.DateTimeFormat(settings.lang === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Paris"
  });
}
let fmt = makeDateFormatter();

function left(ms){
  if (ms <= 0) return settings.lang === "fr" ? "expiré" : "expired";
  const s = Math.floor(ms/1000), d = Math.floor(s/86400);
  const h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60), ss = s%60;
  return (d? d+"j ":"") + String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0");
}
function until(expiryIso){ return left(new Date(expiryIso) - new Date()); }

// ===============================
// SOURCES & FETCH
// ===============================

// Ton domaine Vercel (API perso)
const VERCEL_BASE = "https://cephalon-wodan.vercel.app/api";

// petit helper fetch JSON (avec gestion de statut)
async function fetchJSON(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

// URL builder (Vercel “propre”)
function buildURLClean(section) {
  const sec = String(section).replace(/\/?$/, "");
  return `${VERCEL_BASE}/${settings.platform}/${sec}`; // /api/pc/fissures
}

// URL builder (Vercel “legacy .js + query”)
function buildURLLegacy(section) {
  // /api/[platform]/[section].js?platform=pc&section=fissures
  const u = new URL(`${VERCEL_BASE}/[platform]/[section].js`);
  u.searchParams.set("platform", settings.platform);
  u.searchParams.set("section", String(section).replace(/\/?$/, ""));
  return u.toString();
}

// Cache simple pour la source "local"
let localCache = { platform: null, data: null, at: 0 };

async function get(section){
  // Bounties: seulement via Live (warframestat.us)
  if (section === "syndicateMissions" && settings.source !== "live") {
    throw new Error("syndicateMissions non disponible sur cette source");
  }

  if (settings.source === "live") {
    // WarframeStatus préfère un slash final → évite les 301
    const pathSlash = String(section).replace(/\/?$/, "/");
    const url = `https://api.warframestat.us/${settings.platform}/${pathSlash}?language=${settings.lang}`;
    return fetchJSON(url, { cache: "no-store" });
  }

  if (settings.source === "vercel") {
    // 1) on tente le routage “propre”
    try {
      return await fetchJSON(buildURLClean(section), { cache: "no-store" });
    } catch (e) {
      if (String(e.message) !== "404") throw e;
      // 2) fallback auto sur le format “.js + query”
      return fetchJSON(buildURLLegacy(section), { cache: "no-store" });
    }
  }

  // Source locale: on charge une fois le JSON agrégé puis on renvoie la propriété
  if (localCache.platform !== settings.platform || Date.now() - localCache.at > 60_000) {
    const r = await fetch(`/data/worldstate/${settings.platform}.json`, { cache: "no-store" });
    if (!r.ok) throw new Error("local worldstate "+r.status);
    localCache = { platform: settings.platform, data: await r.json(), at: Date.now() };
  }
  const data = localCache.data?.[section];
  if (typeof data === "undefined") throw new Error(`section "${section}" introuvable dans local worldstate`);
  return data;
}

// ===============================
// Badges / Now
// ===============================
function setContextBadges(){
  const src = settings.source === "vercel" ? "VERCEL" : settings.source === "live" ? "LIVE" : "LOCAL";
  const ctx = `${settings.platform.toUpperCase()} • ${settings.lang.toUpperCase()} • ${src}`;
  ["cycles","bounties","fissures","alerts","nightwave","sorties","baro"].forEach(id=>{
    const e = el(`#ctx-${id}`); if (e) e.textContent = ctx;
  });
}

async function drawNow(){ const n = el("#now"); if (n) n.textContent = fmt.format(new Date()); }

// ===============================
// RENDUS SECTIONS
// ===============================
async function drawCycles(){
  const root = el("#cycles-list"); if (!root) return;
  root.innerHTML = "";
  try{
    const [cetus, vallis, cambion, duviri, earth] = await Promise.all([
      get("cetusCycle"), get("vallisCycle"), get("cambionCycle"), get("duviriCycle"), get("earthCycle")
    ]);

    const t = {
      day:   settings.lang === "fr" ? "Jour" : "Day",
      night: settings.lang === "fr" ? "Nuit" : "Night",
      warm:  settings.lang === "fr" ? "Chaud" : "Warm",
      cold:  settings.lang === "fr" ? "Froid" : "Cold",
    };

    const rows = [
      ["Cetus",  cetus.isDay  ? t.day  : t.night, cetus.expiry],
      ["Vallis", vallis.isWarm? t.warm : t.cold,  vallis.expiry],
      ["Deimos", cambion.active,                    cambion.expiry], // vome/fass
      ["Duviri", duviri.state,                      duviri.expiry],
      ["Earth",  earth.isDay ? t.day : t.night,     earth.expiry],
    ];

    rows.forEach(([name,state,exp])=>{
      root.append(li(
        `<div class="row">
           <span><strong>${name}</strong> <span class="pill">${state}</span></span>
           <span class="timer" data-exp="${exp}">${until(exp)}</span>
         </div>`
      ));
    });
  } catch(e){
    root.innerHTML = `<p class="small">Cycles indisponibles (${e.message})</p>`;
  }
}

async function drawBounties(){
  const root = el("#bounty-content"); if (!root) return;
  root.innerHTML = "";

  // Tabs
  const tabs = document.querySelectorAll(".tabs button");
  tabs.forEach(btn => btn.onclick = () => {
    tabs.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    render(btn.dataset.syn);
  });
  if (!document.querySelector(".tabs button.active") && tabs[0]) tabs[0].classList.add("active");

  async function render(key){
    root.innerHTML = "";
    if (settings.source !== "live") {
      root.innerHTML = `<p class="small">Primes non disponibles sur cette source. Passe sur <strong>Live</strong>.</p>`;
      return;
    }
    try{
      const data = await get("syndicateMissions"); // live only
      const bySyn = {}; for (const s of data) bySyn[s.syndicate] = s;
      const syn = bySyn[key];
      if (!syn || !syn.jobs?.length){
        root.innerHTML = `<p class="small">${settings.lang==="fr"?"Aucune prime disponible":"No bounty available"} — ${key}</p>`;
        return;
      }
      const list = document.createElement("ul");
      syn.jobs.forEach(j=>{
        const stages = j.stages?.length ? `${j.stages.length} ${settings.lang==="fr"?"étapes":"stages"}` : "—";
        list.append(li(
          `<div class="row">
             <span><strong>${j.type || j.jobType || (settings.lang==="fr"?"Prime":"Bounty")}</strong> <span class="pill">${stages}</span></span>
             <span class="timer" data-exp="${j.expiry}">${until(j.expiry)}</span>
           </div>
           <div class="small">${settings.lang==="fr"?"Niveau":"Level"}: ${j.levelRange?.join("–") ?? "?"} — ${j.nodes?.join(", ") ?? ""}</div>`
        ));
      });
      root.append(list);
    } catch(e){
      root.innerHTML = `<p class="small">Erreur bounties (${e.message})</p>`;
    }
  }

  const current = document.querySelector(".tabs button.active")?.dataset.syn || "Cetus";
  render(current);
}

async function drawFissures(){
  const ul = el("#fissures-list"); if (!ul) return;
  ul.innerHTML = "";
  try{
    const fiss = await get("fissures");
    fiss.sort((a,b)=> new Date(a.expiry) - new Date(b.expiry));
    fiss.forEach(f=>{
      ul.append(li(
        `<div class="row">
           <span><strong>${f.tier}</strong> <span class="pill">${f.missionType}</span> <span class="small">${f.node}</span></span>
           <span class="timer" data-exp="${f.expiry}">${until(f.expiry)}</span>
         </div>`
      ));
    });
  } catch(e){
    ul.innerHTML = `<p class="small">Fissures indisponibles (${e.message})</p>`;
  }
}

async function drawAlertsInvasions(){
  const aul = el("#alerts-list");
  const iul = el("#invasions-list");
  if (aul) aul.innerHTML = "";
  if (iul) iul.innerHTML = "";

  try{
    const [alerts, inv] = await Promise.all([ get("alerts"), get("invasions") ]);

    if (aul){
      alerts.forEach(a=>{
        const exp = a.expiry || a.Expiry || a.expiryTime;
        aul.append(li(
          `<div class="row">
             <span><strong>${a.mission?.type || a.missionType || "Alert"}</strong> <span class="small">${a.mission?.node || a.node || ""}</span></span>
             <span class="timer" data-exp="${exp}">${until(exp)}</span>
           </div>`
        ));
      });
    }

    if (iul){
      inv.forEach(i=>{
        const prog = Math.round(i.completion ?? 0);
        iul.append(li(
          `<div class="row">
             <span><strong>${i.desc || i.node || "Invasion"}</strong> <span class="small">${i.attackingFaction} vs ${i.defendingFaction}</span></span>
             <span>${prog}%</span>
           </div>`
        ));
      });
    }
  } catch(e){
    if (aul) aul.innerHTML = `<p class="small">Alertes indisponibles (${e.message})</p>`;
    if (iul) iul.innerHTML = `<p class="small">Invasions indisponibles (${e.message})</p>`;
  }
}

async function drawNightwave(){
  const ul = el("#nightwave-list"); if (!ul) return;
  ul.innerHTML = "";
  try{
    const nw = await get("nightwave");
    (nw?.activeChallenges ?? []).forEach(c=>{
      ul.append(li(
        `<div class="row">
           <span><strong>${c.title || c.challenge}</strong> <span class="small">${c.desc || ""}</span></span>
           <span class="timer" data-exp="${c.expiry}">${until(c.expiry)}</span>
         </div>`
      ));
    });
    if (!(nw?.activeChallenges?.length)) {
      ul.innerHTML = `<p class="small">${settings.lang==="fr"?"Aucun défi actif":"No active challenges"}</p>`;
    }
  } catch(e){
    ul.innerHTML = `<p class="small">Nightwave indisponible (${e.message})</p>`;
  }
}

async function drawSortiesArchon(){
  const S = el("#sortie"), A = el("#archon");
  if (S) S.innerHTML = "";
  if (A) A.innerHTML = "";

  function renderRot(x, title){
    if(!x || !x.variants) return `<p class="small">${title} — ${settings.lang==="fr"?"indisponible":"unavailable"}.</p>`;
    const parts = x.variants.map(v=>`<li>${v.missionType} — <span class="small">${v.node}</span> — <span class="pill">${v.modifier}</span></li>`).join("");
    const lab = settings.lang==="fr" ? "Expire dans" : "Expires in";
    return `<h3>${title}</h3><ul>${parts}</ul><p class="small">${lab} : <span class="timer" data-exp="${x.expiry}">${until(x.expiry)}</span></p>`;
  }

  try{
    const [s, a] = await Promise.all([ get("sortie"), get("archonHunt") ]);
    if (S) S.innerHTML = renderRot(s, settings.lang==="fr" ? "Sortie" : "Sortie");
    if (A) A.innerHTML = renderRot(a, settings.lang==="fr" ? "Archon Hunt" : "Archon Hunt");
  } catch(e){
    if (S) S.innerHTML = `<p class="small">Sortie indisponible (${e.message})</p>`;
    if (A) A.innerHTML = `<p class="small">Archon Hunt indisponible (${e.message})</p>`;
  }
}

async function drawBaro(){
  const root = el("#baro-status");
  const inv  = el("#baro-inventory");
  if (!root || !inv) return;
  root.innerHTML = ""; inv.innerHTML = "";

  try{
    const b = await get("voidTrader");
    const now = new Date();
    const arriving = new Date(b.activation) > now && new Date(b.expiry) > now && !b.active;

    if (b.active){
      const untilLab = settings.lang==="fr" ? "Ferme dans" : "Closes in";
      root.innerHTML =
        `<div class="row">
           <span>${settings.lang==="fr"?"Présent à":"At"} <strong>${b.location}</strong></span>
           <span class="timer" data-exp="${b.expiry}">${until(b.expiry)}</span>
         </div>
         <p class="small">${untilLab}…</p>`;
      (b.inventory||[]).forEach(it=>{
        inv.append(li(
          `<div class="row">
             <span>${it.item}</span>
             <span class="small">${it.ducats} 🥇 / ${it.credits.toLocaleString()} 💰</span>
           </div>`
        ));
      });
      if (!(b.inventory||[]).length){
        inv.innerHTML = `<p class="small">${settings.lang==="fr"?"Inventaire non publié":"No inventory listed"}</p>`;
      }
    } else if (arriving){
      const lab = settings.lang==="fr" ? "Arrive à" : "Arrives at";
      root.innerHTML =
        `<div class="row">
           <span>${lab} <strong>${b.location || "Relais"}</strong></span>
           <span class="timer" data-exp="${b.activation}">${until(b.activation)}</span>
         </div>`;
    } else {
      root.innerHTML = `<p class="small">${settings.lang==="fr"?"Info Baro indisponible.":"Baro info unavailable."}</p>`;
    }
  } catch(e){
    root.innerHTML = `<p class="small">Baro indisponible (${e.message})</p>`;
  }
}

// ===============================
// Boucles / Timers / Refresh
// ===============================
async function tickTimers(){
  document.querySelectorAll(".timer").forEach(t=>{
    const exp = t.getAttribute("data-exp");
    if (exp) t.textContent = until(exp);
  });
}

async function renderAll(){
  setContextBadges();
  await Promise.allSettled([
    drawCycles(),
    drawBounties(),
    drawFissures(),
    drawAlertsInvasions(),
    drawNightwave(),
    drawSortiesArchon(),
    drawBaro(),
  ]);
}

// ---- Listeners
if ($platform) {
  $platform.addEventListener("change", async () => {
    settings.platform = $platform.value;
    saveSettings(settings);
    localCache = { platform: null, data: null, at: 0 };
    await renderAll();
  });
}
if ($lang) {
  $lang.addEventListener("change", async () => {
    settings.lang = $lang.value;
    saveSettings(settings);
    fmt = makeDateFormatter();
    await renderAll();
  });
}
if ($source) {
  $source.addEventListener("change", async () => {
    settings.source = $source.value;
    saveSettings(settings);
    localCache = { platform: null, data: null, at: 0 };
    await renderAll();
  });
}

// ---- Démarrage
await renderAll();
drawNow();
setInterval(drawNow, 1000);     // horloge locale
setInterval(tickTimers, 1000);  // compte à rebours
setInterval(renderAll, 60_000); // re-fetch périodique
console.log("Hub prêt.", settings);
