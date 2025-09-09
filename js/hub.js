(() => {
  "use strict";

  // ---------- Helpers ----------
  const $ = s => document.querySelector(s);
  const BASE = (document.querySelector('base') && document.querySelector('base').href) || location.origin + location.pathname.replace(/[^/]+$/, '');

  const wsUrl = (plat, lang) => new URL(`api/v1/worldstate/${plat}/${lang}.json`, BASE).href;

  function pad(n){ n=Number(n)||0; return n<10? "0"+n : String(n); }
  function fmtETA(ms){
    if (ms <= 0) return "0s";
    const s = Math.floor(ms/1000);
    const d = Math.floor(s/86400);
    const h = Math.floor((s%86400)/3600);
    const m = Math.floor((s%3600)/60);
    const r = s%60;
    if (d>0) return `${d}j ${pad(h)}:${pad(m)}:${pad(r)}`;
    return `${pad(h)}:${pad(m)}:${pad(r)}`;
  }
  function until(iso){ const t=Date.parse(iso||""); return isNaN(t)? 0 : (t-Date.now()); }
  function safeText(v, fallback){ return (v===null || v===undefined || v==="") ? (fallback||"—") : String(v); }
  function setStatus(kind, msg){
    const el=$("#status"); if(!el) return;
    el.className = `card px-3 py-2 mb-4 ${kind}`;
    el.textContent = msg;
  }

  // ---------- Renderers ----------
  function renderSortie(data){
    const host = $("#sortie"); if(!host) return;
    if (!data || !data.expiry){
      host.innerHTML = `<div class="muted">Aucune donnée.</div>`;
      return;
    }
    const ms = until(data.expiry);
    const boss = safeText(data.boss, "Sortie");
    host.innerHTML = `
      <div class="row">
        <div>${boss}</div>
        <div class="eta" data-expiry="${data.expiry}">${fmtETA(ms)}</div>
      </div>
      ${(Array.isArray(data.variants)?data.variants:[])
        .map(v=>`<div class="row"><div class="muted">${safeText(v.missionType,"—")} · ${safeText(v.node,"")}</div><div class="muted">${safeText(v.modifier,"")}</div></div>`)
        .join("")}
    `;
  }

  function renderArchon(data){
    const host = $("#archon"); if(!host) return;
    if (!data || !data.expiry){
      host.innerHTML = `<div class="muted">Aucune donnée.</div>`;
      return;
    }
    const ms = until(data.expiry);
    const boss = safeText(data.boss, "Archon Hunt");
    const node = safeText(data.node, "");
    host.innerHTML = `
      <div class="row">
        <div>${boss} <span class="muted">— ${node}</span></div>
        <div class="eta" data-expiry="${data.expiry}">${fmtETA(ms)}</div>
      </div>
    `;
  }

  function renderFissures(list){
    const host = $("#fissures"); if(!host) return;
    if (!Array.isArray(list) || list.length===0){
      host.innerHTML = `<div class="muted">Aucune donnée.</div>`;
      return;
    }
    // garde les 12 prochaines, tri par temps restant
    const rows = list
      .filter(f=>!f.expired)
      .map(f=>({ ...f, ms: until(f.expiry) }))
      .sort((a,b)=>a.ms-b.ms)
      .slice(0,12)
      .map(f=>{
        const tier = safeText(f.tierShort||f.tier, "");
        const note = f.isStorm? " (Storm)" : (f.isHard? " (SP)" : "");
        const node = safeText(f.node, "");
        const type = safeText(f.missionType, "");
        return `<div class="row">
          <div>${tier}${note} · <span class="muted">${type}</span> · ${node}</div>
          <div class="eta" data-expiry="${f.expiry}">${fmtETA(f.ms)}</div>
        </div>`;
      }).join("");

    host.innerHTML = rows || `<div class="muted">Aucune fissure active.</div>`;
  }

  function renderInvasions(list){
    const host = $("#invasions"); if(!host) return;
    if (!Array.isArray(list)){
      host.innerHTML = `<div class="muted">Aucune donnée.</div>`;
      return;
    }
    const active = list.filter(i=>!i.completed);
    if (active.length===0){
      host.innerHTML = `<div class="muted">Aucune invasion active.</div>`;
      return;
    }
    host.innerHTML = active.slice(0,10).map(i=>{
      const node = safeText(i.node,"");
      const desc = safeText(i.desc,"");
      const eta  = safeText(i.eta,"");
      return `<div class="row">
        <div>${node} <span class="muted">— ${desc}</span></div>
        <div class="eta">${eta}</div>
      </div>`;
    }).join("");
  }

  // Open worlds (cycles + bounties)
  function renderOpenWorlds(ws){
    const host = $("#openworlds"); if(!host) return;
    const blocks = [];

    // Cetus
    if (ws.cetusCycle){
      const c=ws.cetusCycle, ms=until(c.expiry);
      blocks.push(cardWorld(
        "Cetus (Plains of Eidolon)",
        `Cycle: <b>${c.isDay? "Day":"Night"}</b>`,
        c.expiry,
        ms,
        findBounty(ws.syndicateMissions, "Ostrons")
      ));
    }
    // Vallis
    if (ws.vallisCycle){
      const v=ws.vallisCycle, ms=until(v.expiry);
      blocks.push(cardWorld(
        "Orb Vallis",
        `Cycle: <b>${v.isWarm? "Warm":"Cold"}</b>`,
        v.expiry,
        ms,
        findBounty(ws.syndicateMissions, "Solaris United")
      ));
    }
    // Cambion
    if (ws.cambionCycle){
      const k=ws.cambionCycle, ms=until(k.expiry);
      const phase = k.active ? (k.active[0].toUpperCase()+k.active.slice(1)) : (k.isVome? "Vome" : "Fass");
      blocks.push(cardWorld(
        "Cambion Drift",
        `Cycle: <b>${phase}</b>`,
        k.expiry,
        ms,
        findBounty(ws.syndicateMissions, "Entrati")
      ));
    }
    // Zariman (jour/nuit Zariman)
    if (ws.zarimanCycle){
      const z=ws.zarimanCycle, ms=until(z.expiry);
      blocks.push(cardWorld(
        "Zariman",
        `Cycle: <b>${safeText(z.state,"—")}</b>`,
        z.expiry,
        ms,
        findBounty(ws.syndicateMissions, "Zariman Ten Zero")
      ));
    }

    host.innerHTML = blocks.length ? blocks.join("") : `<div class="muted">Aucune donnée.</div>`;
  }

  function findBounty(syndMissions, name){
    const list = Array.isArray(syndMissions)? syndMissions : [];
    const m = list.find(x => (x && (x.syndicate===name)));
    if (!m) return null;
    return {
      name,
      expiry: m.expiry || null,
      jobs: Array.isArray(m.jobs) ? m.jobs.slice(0,5).map(j => {
        const lv = (Array.isArray(j.enemyLevels) && j.enemyLevels.length===2) ? `${j.enemyLevels[0]}-${j.enemyLevels[1]}` : "";
        const t  = j.type || j.jobType || "Bounty";
        return `${t} <span class="muted">(${lv})</span>`;
      }) : []
    };
  }

  function cardWorld(title, cycleText, expiryISO, ms, bounty){
    const eta = `<span class="eta" data-expiry="${expiryISO}">${fmtETA(ms)}</span>`;
    const bountyBlock = bounty ? `
      <div class="mt-2 text-sm">
        <div class="muted">Bounties — expire in ${bounty.expiry ? `<span class="eta" data-expiry="${bounty.expiry}">${fmtETA(until(bounty.expiry))}</span>` : "—"}</div>
        ${bounty.jobs.length ? bounty.jobs.map(j=>`<div class="row"><div>${j}</div></div>`).join("") : `<div class="row"><div class="muted">—</div></div>`}
      </div>` : `<div class="mt-2 text-sm muted">Bounties — non disponible</div>`;

    return `<div class="card p-3">
      <div class="font-semibold mb-1">${title}</div>
      <div>${cycleText} · expire dans ${eta}</div>
      ${bountyBlock}
    </div>`;
  }

  // ---------- Live refresh (countdowns) ----------
  function tickETAs(){
    document.querySelectorAll("[data-expiry]").forEach(el=>{
      const iso = el.getAttribute("data-expiry");
      const ms  = until(iso);
      el.textContent = fmtETA(ms);
    });
  }

  // ---------- Fetch & glue ----------
  async function loadWS(plat, lang){
    const url = wsUrl(plat, lang);
    const r = await fetch(url, { cache:"no-store" });
    if (!r.ok) throw new Error("HTTP "+r.status);
    const j = await r.json();
    return j;
  }

  async function refresh(){
    const plat = $("#platform") ? $("#platform").value : "pc";
    const lang = $("#lang") ? $("#lang").value : "fr";
    setStatus("warn", "Chargement…");

    try{
      const ws = await loadWS(plat, lang);
      const empty = !ws || (Object.keys(ws).length===0);
      if (empty){
        setStatus("warn", "Snapshot vide. Attends le prochain run du workflow.");
      }else{
        setStatus("ok", `Snapshot chargé · Plateforme ${plat.toUpperCase()} · Langue ${lang.toUpperCase()}`);
      }

      renderSortie(ws.sortie);
      renderArchon(ws.archonHunt);
      renderFissures(ws.fissures);
      renderInvasions(ws.invasions);
      renderOpenWorlds(ws);

    }catch(err){
      console.error(err);
      setStatus("err", "Erreur de chargement. Vérifie que api/v1/worldstate/... existe et n’est pas vide.");
      // Efface les panneaux pour éviter des états incohérents
      ["#sortie","#archon","#fissures","#invasions","#openworlds"].forEach(id=>{
        const el=$(id); if(el) el.innerHTML=`<div class="muted">Aucune donnée.</div>`;
      });
    }
  }

  function start(){
    $("#btnRefresh") && $("#btnRefresh").addEventListener("click", refresh);
    $("#platform") && $("#platform").addEventListener("change", refresh);
    $("#lang") && $("#lang").addEventListener("change", refresh);

    refresh();
    setInterval(tickETAs, 1000); // compte à rebours live
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", start)
    : start();

})();
