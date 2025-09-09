/* js/hub.js (compatible avec hub.html: ws-status, ws-platform, ws-lang, ws-refresh, card-*) */
(() => {
  "use strict";

  /* ----------------- Helpers DOM ----------------- */
  const $id = (id) => document.getElementById(id) || null;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const arr = (v) => Array.isArray(v) ? v : [];
  const missionsOf = (obj) => arr((obj && (obj.missions || obj.variants)) || []);
  const fissuresOf  = (data) => arr((data && (data.fissures || data.voidFissures)) || []);
  const nightwaveChallenges = (data) =>
    arr((data?.nightwave && (data.nightwave.activeChallenges || data.nightwave.challenges)) || []);
  const invasionsOf = (data) => arr(data?.invasions || []);
  const pct = (v) => (v==null ? "—" : `${Math.round(Number(v)*100)/100}%`);
  const fmtTime = (isoOrMs) => { try { return new Date(isoOrMs || Date.now()).toLocaleString(); } catch { return ""; } };
  const setText = (el, txt) => { if (el) el.textContent = txt; };
  const addCls  = (el, c) => { if (el) el.classList && el.classList.add(c); };
  const delCls  = (el, c) => { if (el) el.classList && el.classList.remove(c); };

  /* ----------------- Mini UI helpers ----------------- */
  function card(title, bodyHtml){
    return `
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">${esc(title)}</h2>
      </div>
      ${bodyHtml && bodyHtml.trim() ? bodyHtml : '<div class="text-[var(--muted)]">Aucune donnée.</div>'}
    `;
  }
  function renderInto(id, html){ const host=$id(id); if(host) host.innerHTML = html; }

  /* ----------------- Chargement JSON ----------------- */
  async function loadWS(platform, lang) {
    const url = `api/v1/worldstate/${platform}/${lang}.json?t=${Date.now()}`; // cache-buster
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // Bandeau (on masque l’URL source)
    const snap = fmtTime(json.timestamp || json.time || json.lastUpdate || Date.now());
    const st = $id("ws-status");
    delCls(st, "error");
    setText(st, `OK · snapshot ${snap}`);
    return json;
  }

  /* ----------------- Renderers ----------------- */
  function renderSortie(ws){
    const s = ws?.sortie || null;
    const list = missionsOf(s);
    const head = s ? `<div class="mb-2 text-sm text-[var(--muted)]">Boss: ${esc(s.boss||"")} · Faction: ${esc(s.faction||"")} ${s.eta?`· ${esc(s.eta)}`:""}</div>` : "";
    const rows = list.map(v =>
      `<li class="py-1"><b>${esc(v.missionType || v.type || "")}</b> — ${esc(v.node || "")}${v.modifier?` — <i>${esc(v.modifier)}</i>`:""}</li>`
    ).join("");
    renderInto("card-sortie", card("Sortie", head + (rows?`<ul class="list-disc pl-5">${rows}</ul>`:"")));
  }

  function renderArchon(ws){
    const a = ws?.archonHunt || null;
    const list = missionsOf(a);
    const head = a ? `<div class="mb-2 text-sm text-[var(--muted)]">${esc(a.boss||"Archon Hunt")} ${a.eta?`· ${esc(a.eta)}`:""}</div>` : "";
    const rows = list.map(m => `<li class="py-1"><b>${esc(m.type || m.missionType || "")}</b> — ${esc(m.node || "")}</li>`).join("");
    renderInto("card-archon", card("Archon Hunt", head + (rows?`<ul class="list-disc pl-5">${rows}</ul>`:"")));
  }

  function renderFissures(ws){
    const list = fissuresOf(ws)
      .filter(f => !f.isStorm || f.tier)
      .sort((a,b) => String(a.tier||"").localeCompare(String(b.tier||"")));
    const rows = list.map(f =>
      `<tr>
        <td class="py-1 pr-3">${esc(f.tierShort || f.tier || "")}${f.isStorm ? " (Void Storm)" : ""}</td>
        <td class="py-1 pr-3">${esc(f.missionType || "")}</td>
        <td class="py-1 pr-3">${esc(f.node || "")}</td>
        <td class="py-1">${f.eta ? esc(f.eta) : ""}</td>
      </tr>`
    ).join("");
    renderInto("card-fissures", card("Fissures",
      rows ? `<div class="overflow-x-auto"><table class="min-w-full text-sm">
        <thead class="text-[var(--muted)]"><tr>
          <th class="text-left pr-3 py-1">Relique</th>
          <th class="text-left pr-3 py-1">Mission</th>
          <th class="text-left pr-3 py-1">Noeud</th>
          <th class="text-left py-1">ETA</th>
        </tr></thead><tbody>${rows}</tbody></table></div>` : ""
    ));
  }

  function renderNightwave(ws){
    const nw = ws?.nightwave || {};
    const list = nightwaveChallenges(ws);
    const head = (nw.season != null)
      ? `<div class="mb-2 text-sm text-[var(--muted)]">Saison ${esc(nw.season)} ${nw.eta?`· ${esc(nw.eta)}`:""}</div>` : "";
    const rows = list.map(c=>{
      const title = c.title || c.challenge || c.desc || c.asString || "Challenge";
      const rep   = (c.reputation ?? 0);
      const tags  = [c.isElite&&"Elite", c.isDaily&&"Daily", c.isWeekly&&"Weekly"].filter(Boolean).join(" · ");
      return `<li class="py-1">• ${esc(title)}${tags?` — ${esc(tags)}`:""} · +${rep} Rep</li>`;
    }).join("");
    renderInto("card-nightwave", card("Nightwave", head + (rows?`<ul class="list-disc pl-5">${rows}</ul>`:"")));
  }

  function renderInvasions(ws){
    const list = invasionsOf(ws).filter(i => !i.completed);
    const rows = list.map(i=>{
      const atk = i.attackingFaction || i.attacker?.faction || "Attaque";
      const def = i.defendingFaction || i.defender?.faction || "Défense";
      const node = i.node || "";
      const p = (i.completion != null) ? ` · ${pct(i.completion)}` : "";
      const rewA = (i.attackerReward && (i.attackerReward.itemString || i.attackerReward.asString)) || "";
      const rewD = (i.defenderReward && (i.defenderReward.itemString || i.defenderReward.asString)) || "";
      const rew = (rewA || rewD) ? ` — 🎁 ${esc(rewA || rewD)}` : "";
      return `<li class="py-1">${esc(node)} — <b>${esc(atk)}</b> vs <b>${esc(def)}</b>${p}${rew}</li>`;
    }).join("");
    renderInto("card-invasions", card("Invasions", rows?`<ul class="list-disc pl-5">${rows}</ul>`:""));
  }

  /* ----------------- Orchestration ----------------- */
  async function refresh(){
    const platSel = $id("ws-platform");
    const langSel = $id("ws-lang");
    const plat = (platSel?.value || "pc").toLowerCase();
    const lang = (langSel?.value || "en").toLowerCase();

    const st = $id("ws-status");
    setText(st, "Chargement…"); delCls(st, "error");

    try{
      const data = await loadWS(plat, lang);

      // Snapshot vide => messages par défaut
      if (!data || !Object.keys(data).length){
        addCls(st, "error");
        setText(st, "Snapshot vide. Attends le prochain run du workflow.");
        ["card-sortie","card-archon","card-fissures","card-nightwave","card-invasions"].forEach(id=>{
          renderInto(id, card(id.replace("card-","").toUpperCase(), ""));
        });
        return;
      }

      renderSortie(data);
      renderArchon(data);
      renderFissures(data);
      renderNightwave(data);
      renderInvasions(data);

      try{ localStorage.setItem("hub.plat", platSel?.value || "pc"); }catch{}
      try{ localStorage.setItem("hub.lang", langSel?.value || "en"); }catch{}
    } catch(e){
      console.error(e);
      addCls(st, "error");
      setText(st, `Échec de chargement (${e.message}). Vérifie /api/v1/worldstate/...`);
      ["card-sortie","card-archon","card-fissures","card-nightwave","card-invasions"].forEach(id=>{
        renderInto(id, card(id.replace("card-","").toUpperCase(), ""));
      });
    }
  }

  function initControls(){
    const platSel = $id("ws-platform");
    const langSel = $id("ws-lang");
    // Restorer dernier choix
    try{
      const p = localStorage.getItem("hub.plat"); if (p && platSel) platSel.value = p;
      const l = localStorage.getItem("hub.lang"); if (l && langSel) langSel.value = l;
    }catch{}
    platSel?.addEventListener("change", refresh);
    langSel?.addEventListener("change", refresh);
    $id("ws-refresh")?.addEventListener("click", refresh);
    setInterval(refresh, 60_000); // auto-refresh
  }

  function start(){ initControls(); refresh(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once:true });
  } else {
    start(); // script chargé via defer
  }
})();
