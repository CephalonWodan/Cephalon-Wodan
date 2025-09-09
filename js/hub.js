// js/hub.js
(() => {
  "use strict";

  /* ---------- Base path robuste pour GitHub Project Pages ---------- */
  // /Cephalon-Wodan/hub.html => BASE = "/Cephalon-Wodan"
  const REPO = (location.pathname.split('/')[1] || '').trim();
  const BASE = REPO ? `/${REPO}` : '';
  const api = (p) => `${BASE}/api/v1/${p}`;           // ex: api('worldstate/pc/en.json')

  /* ---------- Utils UI ---------- */
  const $ = (s) => document.querySelector(s);
  const fmt = (v) => (v==null || v==="") ? "—" : String(v);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const toLocal = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso || "—"; }
  };
  const msLeft = (iso) => Math.max(0, new Date(iso).getTime() - Date.now());
  const hhmmss = (ms) => {
    const s = Math.floor(ms/1000);
    const h = Math.floor(s/3600).toString().padStart(2,'0');
    const m = Math.floor((s%3600)/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${h}:${m}:${ss}`;
  };

  /* ---------- Render helpers ---------- */
  function card(title, bodyHtml){
    return `
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">${esc(title)}</h2>
      </div>
      ${bodyHtml || '<div class="text-[var(--muted)]">Aucune donnée.</div>'}
    `;
  }

  /* ---------- Renderers ---------- */
  function renderSortie(ws){
    const host = $("#card-sortie");
    const s = ws.sortie || null;
    if (!s || !s.variants) {
      host.innerHTML = card("Sortie", "");
      return;
    }
    const rows = s.variants.map(v =>
      `<li class="py-1"><b>${esc(v.missionType || v.type || "")}</b> — ${esc(v.node || "")} ${v.modifier ? `— <span class="text-[var(--muted)]">${esc(v.modifier)}</span>` : ""}</li>`
    ).join("");

    host.innerHTML = card("Sortie", `
      <div class="mb-2 text-sm text-[var(--muted)]">
        Boss : ${esc(s.boss || "")} · Faction : ${esc(s.faction || "")}
      </div>
      <ul class="list-disc pl-5">${rows}</ul>
      <div class="mt-3 text-sm">Expire : ${toLocal(s.expiry)} <span class="opacity-70">(${hhmmss(msLeft(s.expiry))})</span></div>
    `);
  }

  function renderArchon(ws){
    const host = $("#card-archon");
    const a = ws.archonHunt || null;
    if (!a || !a.missions) {
      host.innerHTML = card("Archon Hunt", "");
      return;
    }
    const rows = a.missions.map(m =>
      `<li class="py-1"><b>${esc(m.type || "")}</b> — ${esc(m.node || "")}</li>`
    ).join("");
    host.innerHTML = card("Archon Hunt", `
      <ul class="list-disc pl-5">${rows}</ul>
      <div class="mt-3 text-sm">Expire : ${toLocal(a.expiry)} <span class="opacity-70">(${hhmmss(msLeft(a.expiry))})</span></div>
    `);
  }

  function renderFissures(ws){
    const host = $("#card-fissures");
    const list = Array.isArray(ws.fissures) ? ws.fissures.slice() : [];
    if (!list.length){
      host.innerHTML = card("Fissures", "");
      return;
    }
    list.sort((a,b)=> (a.tierNum||0)-(b.tierNum||0) || (a.isStorm?-1:1));
    const rows = list.map(f =>
      `<tr>
         <td class="py-1 pr-3">${esc(f.tier || "")}${f.isStorm ? " (Void Storm)" : ""}</td>
         <td class="py-1 pr-3">${esc(f.missionType || "")}</td>
         <td class="py-1 pr-3">${esc(f.node || "")}</td>
         <td class="py-1 text-right">${hhmmss(msLeft(f.expiry))}</td>
       </tr>`
    ).join("");
    host.innerHTML = card("Fissures", `
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-[var(--muted)]">
            <tr><th class="text-left pr-3 py-1">Relique</th><th class="text-left pr-3 py-1">Mission</th><th class="text-left pr-3 py-1">Noeud</th><th class="text-right py-1">Temps restant</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);
  }

  function renderNightwave(ws){
    const host = $("#card-nightwave");
    const n = ws.nightwave || null;
    if (!n || !n.activeChallenges) { host.innerHTML = card("Nightwave", ""); return; }
    const rows = n.activeChallenges.map(c =>
      `<li class="py-1">
         <b>${esc(c.title || c.desc || "Challenge")}</b>
         ${c.reputation ? `<span class="text-[var(--muted)]">(+${c.reputation})</span>` : ""}
         ${c.expiry ? `<span class="ml-2 opacity-70">${hhmmss(msLeft(c.expiry))}</span>` : ""}
       </li>`
    ).join("");
    host.innerHTML = card("Nightwave", `<ul class="list-disc pl-5">${rows}</ul>`);
  }

  function renderInvasions(ws){
    const host = $("#card-invasions");
    const list = Array.isArray(ws.invasions) ? ws.invasions.filter(i => !i.completed) : [];
    if (!list.length) { host.innerHTML = card("Invasions", ""); return; }
    const rows = list.map(i =>
      `<li class="py-1">
         ${esc(i.node || "")} — <b>${esc(i.attackingFaction || "")}</b> vs <b>${esc(i.defendingFaction || "")}</b>
         <span class="text-[var(--muted)] ml-1">(${fmt(Math.round((i.completion||0)*10)/10)}%)</span>
       </li>`
    ).join("");
    host.innerHTML = card("Invasions", `<ul class="list-disc pl-5">${rows}</ul>`);
  }

  /* ---------- Chargement ---------- */
  async function loadWS(){
    const status = $("#ws-status");
    const plat = $("#ws-platform").value;
    const lang = $("#ws-lang").value;
    const url = api(`worldstate/${plat}/${lang}.json`);

    try{
      status.textContent = `Chargement… (${plat}/${lang})`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ws = await res.json();

      renderSortie(ws);
      renderArchon(ws);
      renderFissures(ws);
      renderNightwave(ws);
      renderInvasions(ws);

      const ts = ws.timestamp || ws.time || new Date().toISOString();
      status.textContent = `OK · snapshot ${toLocal(ts)} · source: ${url}`;
      status.className   = "mb-4 text-sm px-3 py-2 rounded-lg orn";
      status.style.background = "rgba(0,229,255,.08)";
      status.style.color = "#bfefff";
      status.setAttribute("aria-busy","false");
    } catch(e){
      console.error("[hub] worldstate error:", e);
      status.textContent = `Échec de chargement. Vérifie que ${url} existe et que les workflows tournent.`;
      status.className   = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  }

  /* ---------- Events ---------- */
  $("#ws-refresh").addEventListener("click", loadWS);
  $("#ws-platform").addEventListener("change", loadWS);
  $("#ws-lang").addEventListener("change", loadWS);

  // Auto-refresh 60s
  setInterval(loadWS, 60_000);

  // Boot
  loadWS();
})();
