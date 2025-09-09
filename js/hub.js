(() => {
  "use strict";

  const $ = (s,root=document)=>root.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const fmtDate = s => s ? new Date(s).toLocaleString() : "—";

  const platSel = $("#plat");
  const langSel = $("#lang");
  const btn = $("#btn");
  const st = $("#status");

  function urlFor(p,l){
    return `api/v1/worldstate/${p}/${l}.json`;
  }

  function setStatus(kind, msg){
    st.textContent = msg;
    st.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
    if(kind==="ok"){ st.style.background="rgba(0,229,255,.08)"; st.style.color="#bfefff"; }
    else if(kind==="warn"){ st.style.background="rgba(255,180,0,.08)"; st.style.color="#ffe3a1"; }
    else { st.style.background="rgba(255,0,0,.08)"; st.style.color="#ffd1d1"; }
  }

  async function loadSnapshot(p,l){
    const u = urlFor(p,l);
    const res = await fetch(u,{cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    return res.json();
  }

  function renderSortie(d){
    const host = $("#card-sortie .body");
    if(!d){ host.innerHTML = `<span class="muted">Aucune donnée.</span>`; return; }
    const v = (d.variants||[]).map(x=>`<li>${esc(x.node)} — ${esc(x.missionType)} — ${esc(x.modifier)}</li>`).join("");
    host.innerHTML = `
      <div class="text-sm">Boss: <b>${esc(d.boss)}</b> • Faction: ${esc(d.faction)} • Exp: ${esc(fmtDate(d.expiry))}</div>
      <ul class="list-disc ml-6 mt-2">${v||"<li>—</li>"}</ul>
    `;
  }
  function renderArchon(d){
    const host = $("#card-archon .body");
    if(!d){ host.innerHTML = `<span class="muted">Aucune donnée.</span>`; return; }
    const v = (d.missions||[]).map(m=>`<li>${esc(m.node)} — ${esc(m.type)}</li>`).join("");
    host.innerHTML = `
      <div class="text-sm">Boss: <b>${esc(d.boss)}</b> • Exp: ${esc(fmtDate(d.expiry))}</div>
      <ul class="list-disc ml-6 mt-2">${v||"<li>—</li>"}</ul>
    `;
  }
  function renderFissures(a){
    const host = $("#card-fiss .body");
    if(!a || !a.length){ host.innerHTML = `<span class="muted">Aucune donnée.</span>`; return; }
    host.innerHTML = a.map(f=>`<div class="py-1">${esc(f.tier)} • ${esc(f.missionType)} • ${esc(f.node)} • Exp: ${esc(fmtDate(f.expiry))}${f.isHard?" • Steel Path":""}${f.isStorm?" • Storm":""}</div>`).join("");
  }
  function renderInvasions(a){
    const host = $("#card-inv .body");
    if(!a || !a.length){ host.innerHTML = `<span class="muted">Aucune donnée.</span>`; return; }
    host.innerHTML = a.map(i=>`<div class="py-1">${esc(i.node)} — ${esc(i.attacker)} vs ${esc(i.defender)} • ${i.completion??0}% • ${esc(i.reward||"—")}</div>`).join("");
  }
  function renderNightwave(n){
    const host = $("#card-nw .body");
    if(!n){ host.innerHTML = `<span class="muted">Aucune donnée.</span>`; return; }
    const ch = (n.activeChallenges||[]).map(c=>`<li>${esc(c.title||c.id)} — ${esc(c.desc||"")} • Exp: ${esc(fmtDate(c.expiry))} • +${c.standing??0}</li>`).join("");
    host.innerHTML = `
      <div class="text-sm">Saison: ${n.season??"?"} • Actif: ${n.active?"Oui":"Non"} • Exp: ${esc(fmtDate(n.expiry))}</div>
      <div class="mt-2 font-medium">Défis:</div>
      <ul class="list-disc ml-6">${ch||"<li>—</li>"}</ul>
    `;
  }

  async function refresh(){
    const p = platSel.value.toLowerCase();
    const l = langSel.value.toLowerCase();
    try{
      setStatus("warn", `Chargement du snapshot ${p.toUpperCase()}/${l.toUpperCase()}…`);
      const data = await loadSnapshot(p,l);
      if(!data || Object.keys(data).length===0){
        setStatus("warn", "Snapshot vide. Attend le prochain run du workflow.");
      } else {
        setStatus("ok", `OK • Snapshot ${p.toUpperCase()}/${l.toUpperCase()} • généré: ${fmtDate(data.generatedAt)}`);
      }
      renderSortie(data.sortie);
      renderArchon(data.archon);
      renderFissures(data.fissures);
      renderNightwave(data.nightwave);
      renderInvasions(data.invasions);
    } catch(e){
      setStatus("err", `Erreur: ${e.message || e}`);
      ["#card-sortie",".#card-archon","#card-fiss","#card-nw","#card-inv"].forEach(()=>{});
    }
  }

  btn?.addEventListener("click", refresh);
  window.addEventListener("load", refresh);
  setInterval(refresh, 60_000);
})();
