// ===============================
// Hub Warframe – JS complet
// Plateforme + Langue + Timers
// Source: api.warframestat.us
// ===============================

// --- Stockage des préférences (plateforme/langue)
const LS_KEY = "wfHubSettings";
function loadSettings(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? {}; } catch { return {}; } }
function saveSettings(s){ localStorage.setItem(LS_KEY, JSON.stringify(s)); }

// Détecte langue navigateur pour 1er passage
const navLang = (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";

// État initial
let settings = Object.assign({ platform: "pc", lang: navLang }, loadSettings());

// Sélecteurs UI
const $platform = document.querySelector("#platform");
const $lang = document.querySelector("#lang");
if ($platform) $platform.value = settings.platform;
if ($lang) $lang.value = settings.lang;

// Helpers UI / API
const el = (sel) => document.querySelector(sel);
const API = (p) => `https://api.warframestat.us/${settings.platform}/${p}?language=${settings.lang}`;

function makeDateFormatter(){
  return new Intl.DateTimeFormat(settings.lang === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Paris"
  });
}
let fmt = makeDateFormatter();

// Durée → "1j 12:34:56"
function left(ms){
  if (ms <= 0) return settings.lang === "fr" ? "expiré" : "expired";
  const s = Math.floor(ms/1000);
  const d = Math.floor(s/86400);
  const h = Math.floor((s%86400)/3600);
  const m = Math.floor((s%3600)/60);
  const ss = s%60;
  const dh = d ? `${d}j ` : "";
  return dh + String(h).padStart(2,"0")+":" + String(m).padStart(2,"0")+":" + String(ss).padStart(2,"0");
}
function until(expiryIso){ return left(new Date(expiryIso) - new Date()); }

function li(inner){ const n=document.createElement("li"); n.innerHTML = inner; return n; }

async function get(p){
  const r = await fetch(API(p), { cache: "no-store" });
  if (!r.ok) throw new Error(`${p} ${r.status}`);
  return r.json();
}

function setContextBadges(){
  const ctx = `${settings.platform.toUpperCase()} • ${settings.lang.toUpperCase()}`;
  ["cycles","bounties","fissures","alerts","nightwave","sorties","baro"].forEach(id=>{
    const e = el(`#ctx-${id}`); if (e) e.textContent = ctx;
  });
}

async function drawNow(){ const n = el("#now"); if (n) n.textContent = fmt.format(new Date()); }

// ===============================
// Sections
// ===============================

async function drawCycles(){
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

  const ul = el("#cycles-list");
  if (!ul) return;
  ul.innerHTML = "";
  rows.forEach(([name,state,exp])=>{
    ul.append(li(
      `<div class="row">
         <span><strong>${name}</strong> <span class="pill">${state}</span></span>
         <span class="timer" data-exp="${exp}">${until(exp)}</span>
       </div>`
    ));
  });
}

async function drawBounties(){
  const data = await get("syndicateMissions"); // Konzu/Solaris/Entrati/Zariman quand dispo
  const bySyn = {};
  for (const s of data) bySyn[s.syndicate] = s;

  // Tabs (Cetus / Vallis / Deimos / Zariman)
  const tabs = document.querySelectorAll(".tabs button");
  if (!tabs.length) return;

  tabs.forEach(btn => btn.onclick = () => {
    tabs.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    render(btn.dataset.syn);
  });

  // Conserver l'onglet actif si déjà choisi
  const current = document.querySelector(".tabs button.active")?.dataset.syn || "Cetus";
  tabs.forEach(b => { if (b.dataset.syn === current) b.classList.add("active"); });
  if (!document.querySelector(".tabs button.active")) tabs[0].classList.add("active");

  render(document.querySelector(".tabs button.active").dataset.syn);

  function render(key){
    const root = el("#bounty-content");
    if (!root) return;
    root.innerHTML = "";
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
  }
}

async function drawFissures(){
  const fiss = await get("fissures");
  const ul = el("#fissures-list");
  if (!ul) return;
  ul.innerHTML = "";
  fiss.sort((a,b)=> new Date(a.expiry) - new Date(b.expiry));
  fiss.forEach(f=>{
    ul.append(li(
      `<div class="row">
         <span><strong>${f.tier}</strong> <span class="pill">${f.missionType}</span> <span class="small">${f.node}</span></span>
         <span class="timer" data-exp="${f.expiry}">${until(f.expiry)}</span>
       </div>`
    ));
  });
}

async function drawAlertsInvasions(){
  const [alerts, inv] = await Promise.all([ get("alerts"), get("invasions") ]);

  const aul = el("#alerts-list");
  if (aul){
    aul.innerHTML = "";
    alerts.forEach(a=>{
      aul.append(li(
        `<div class="row">
           <span><strong>${a.mission.type}</strong> <span class="small">${a.mission.node}</span></span>
           <span class="timer" data-exp="${a.expiry}">${until(a.expiry)}</span>
         </div>`
      ));
    });
  }

  const iul = el("#invasions-list");
  if (iul){
    iul.innerHTML = "";
    inv.forEach(i=>{
      const prog = Math.round(i.completion ?? 0);
      iul.append(li(
        `<div class="row">
           <span><strong>${i.desc || i.node}</strong> <span class="small">${i.attackingFaction} vs ${i.defendingFaction}</span></span>
           <span>${prog}%</span>
         </div>`
      ));
    });
  }
}

async function drawNightwave(){
  const nw = await get("nightwave");
  const ul = el("#nightwave-list");
  if (!ul) return;
  ul.innerHTML = "";
  (nw?.activeChallenges ?? []).forEach(c=>{
    ul.append(li(
      `<div class="row">
         <span><strong>${c.title || c.challenge}</strong> <span class="small">${c.desc || ""}</span></span>
         <span class="timer" data-exp="${c.expiry}">${until(c.expiry)}</span>
       </div>`
    ));
  });
}

async function drawSortiesArchon(){
  const [s, a] = await Promise.all([ get("sortie"), get("archonHunt") ]);
  const S = el("#sortie"), A = el("#archon");

  if (S) S.innerHTML = renderRot(s, settings.lang==="fr" ? "Sortie" : "Sortie");
  if (A) A.innerHTML = renderRot(a, settings.lang==="fr" ? "Archon Hunt" : "Archon Hunt");

  function renderRot(x, title){
    if(!x || !x.variants) return `<p class="small">${title} — ${settings.lang==="fr"?"indisponible":"unavailable"}.</p>`;
    const parts = x.variants.map(v=>`<li>${v.missionType} — <span class="small">${v.node}</span> — <span class="pill">${v.modifier}</span></li>`).join("");
    const lab = settings.lang==="fr" ? "Expire dans" : "Expires in";
    return `<h3>${title}</h3><ul>${parts}</ul><p class="small">${lab} : <span class="timer" data-exp="${x.expiry}">${until(x.expiry)}</span></p>`;
  }
}

async function drawBaro(){
  const b = await get("voidTrader");
  const root = el("#baro-status");
  const inv  = el("#baro-inventory");
  if (!root || !inv) return;

  root.innerHTML = "";
  inv.innerHTML  = "";

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
}

// ===============================
// Boucle / Timers / Refresh
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

// Listeners des switchers
if ($platform) {
  $platform.addEventListener("change", async () => {
    settings.platform = $platform.value;
    saveSettings(settings);
    await renderAll();
  });
}
if ($lang) {
  $lang.addEventListener("change", async () => {
    settings.lang = $lang.value;
    saveSettings(settings);
    fmt = makeDateFormatter(); // rafraîchit le formateur
    await renderAll();
  });
}

// Démarrage
await renderAll();
drawNow();
setInterval(drawNow, 1000);     // horloge locale
setInterval(tickTimers, 1000);  // compte à rebours
setInterval(renderAll, 60_000); // re-fetch ~toutes les 60s
console.log("Hub prêt.", settings);
