/* js/hub.js */
(() => {
  "use strict";

  /* ------------------------- utils ------------------------- */
  const $ = (s, r=document) => r.querySelector(s);
  const esc = (s) => String(s ?? "")
    .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const arr = (v) => Array.isArray(v) ? v : [];
  const missionsOf = (obj) => arr((obj && (obj.missions || obj.variants)) || []);
  const fissuresOf  = (data) => arr((data && (data.fissures || data.voidFissures)) || []);
  const nightwaveChallenges = (data) =>
    arr((data?.nightwave && (data.nightwave.activeChallenges || data.nightwave.challenges)) || []);
  const invasionsOf = (data) => arr(data?.invasions || []);
  const pct = (v) => (v==null ? "—" : `${Math.round(Number(v)*100)/100}%`);
  const fmtTime = (isoOrMs) => {
    try { return new Date(isoOrMs || Date.now()).toLocaleString(); }
    catch { return ""; }
  };

  /* -------------------- chargement JSON -------------------- */
  async function loadWS(platform, lang) {
    const url = `api/v1/worldstate/${platform}/${lang}.json?t=${Date.now()}`; // no-cache
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // Bandeau: on masque le chemin (pas d'affichage de l'URL)
    const snap = fmtTime(json.timestamp || json.time || json.lastUpdate || Date.now());
    const status = $("#status");
    status.classList.remove("error");
    status.textContent = `OK · snapshot ${snap}`;
    return json;
  }

  /* ------------------------ rendu UI ----------------------- */
  function renderRows(el, rowsHtml) {
    el.innerHTML = rowsHtml && rowsHtml.trim()
      ? rowsHtml
      : `<div class="muted">Aucune donnée.</div>`;
  }

  // Sortie
  function renderSortie(data) {
    const box = $("#sortie");
    const s = data?.sortie || null;
    const list = missionsOf(s);
    const head = s ? `<div class="row"><b>${esc(s.boss || "")}</b> — ${esc(s.faction || "")} · ${esc(s.eta || "")}</div>` : "";
    const rows = list.map(m =>
      `<div class="row">
         ${esc(m.missionType || m.type || "")} — ${esc(m.node || "")}
         ${m.modifier ? ` — <i>${esc(m.modifier)}</i>` : ""}
       </div>`).join("");
    renderRows(box, head + rows);
  }

  // Archon Hunt
  function renderArchon(data) {
    const box = $("#archon");
    const a = data?.archonHunt || null;
    const list = missionsOf(a);
    const head = a ? `<div class="row"><b>${esc(a.boss || "Archon Hunt")}</b> · ${esc(a.eta || "")}</div>` : "";
    const rows = list.map(m =>
      `<div class="row">
         ${esc(m.type || m.missionType || "")} — ${esc(m.node || "")}
       </div>`).join("");
    renderRows(box, head + rows);
  }

  // Fissures
  function renderFissures(data) {
    const box = $("#fissures");
    const list = fissuresOf(data)
      .filter(f => !f.isStorm || f.tier)
      .sort((a,b) => String(a.tier||"").localeCompare(String(b.tier||"")));
    const rows = list.map(f =>
      `<div class="row">
         <b>${esc(f.tierShort || f.tier || "")}</b> — ${esc(f.missionType || "")}
         — ${esc(f.node || "")}
         ${f.enemy ? `— ${esc(f.enemy)}` : ""}
         ${f.eta ? ` · ${esc(f.eta)}` : ""}
       </div>`).join("");
    renderRows(box, rows);
  }

  // Nightwave
  function renderNightwave(data) {
    const box = $("#nightwave");
    const nw = data?.nightwave || {};
    const list = nightwaveChallenges(data);
    const head = (nw.season != null)
      ? `<div class="row"><b>Saison ${esc(nw.season)}</b> · ${esc(nw.eta || "")}</div>` : "";
    const rows = list.map(c => {
      const title = c.title || c.challenge || c.desc || c.asString || "";
      const rep   = (c.reputation ?? 0);          // <-- corrige l’erreur `??` vs `||`
      const flags = [
        c.isElite ? "Elite" : "",
        c.isDaily ? "Daily" : "",
        c.isWeekly ? "Weekly" : ""
      ].filter(Boolean).join(" · ");
      return `<div class="row">• ${esc(title)}${flags ? ` — ${esc(flags)}` : ""} · ${rep} Rep</div>`;
    }).join("");
    renderRows(box, head + rows);
  }

  // Invasions
  function renderInvasions(data) {
    const box = $("#invasions");
    const list = invasionsOf(data).filter(i => !i.completed);
    const rows = list.map(i => {
      const atk = i.attackingFaction || i.attacker?.faction || "Attaque";
      const def = i.defendingFaction || i.defender?.faction || "Défense";
      const node = i.node || "";
      const p = (i.completion != null) ? ` · ${pct(i.completion)}` : "";
      const rewA = (i.attackerReward && (i.attackerReward.itemString || i.attackerReward.asString)) || "";
      const rewD = (i.defenderReward && (i.defenderReward.itemString || i.defenderReward.asString)) || "";
      const rew = (rewA || rewD) ? ` — 🎁 ${esc(rewA || rewD)}` : "";
      return `<div class="row">${esc(node)} — ${esc(atk)} vs ${esc(def)}${p}${rew}</div>`;
    }).join("");
    renderRows(box, rows);
  }

  /* ---------------------- orchestration -------------------- */
  async function refresh() {
    const plat = ($("#plat")?.value || "pc").toLowerCase();
    const lang = ($("#lang")?.value || "en").toLowerCase();
    try {
      $("#status").textContent = "Chargement…";
      const data = await loadWS(plat, lang);

      // Snapshot vide -> messages par défaut
      if (!data || !Object.keys(data).length) {
        const s = $("#status");
        s.classList.add("error");
        s.textContent = "Snapshot vide. Attends la prochaine exécution du workflow.";
        ["sortie","archon","fissures","nightwave","invasions"].forEach(id => {
          const el = $("#"+id);
          if (el) el.innerHTML = `<div class="muted">Aucune donnée.</div>`;
        });
        return;
      }

      renderSortie(data);
      renderArchon(data);
      renderFissures(data);
      renderNightwave(data);
      renderInvasions(data);
      localStorage.setItem("hub.plat", plat);
      localStorage.setItem("hub.lang", lang);
    } catch (e) {
      console.error(e);
      const s = $("#status");
      s.classList.add("error");
      s.textContent = `Échec de chargement (${e.message}). Vérifie /api/v1/worldstate/...`;
      ["sortie","archon","fissures","nightwave","invasions"].forEach(id => {
        const el = $("#"+id);
        if (el) el.innerHTML = `<div class="muted">Aucune donnée.</div>`;
      });
    }
  }

  function initControls() {
    // restaurer dernier choix
    const savedP = localStorage.getItem("hub.plat");
    const savedL = localStorage.getItem("hub.lang");
    if (savedP && $("#plat")) $("#plat").value = savedP.toUpperCase();
    if (savedL && $("#lang")) $("#lang").value = savedL.toUpperCase();

    $("#plat")?.addEventListener("change", refresh);
    $("#lang")?.addEventListener("change", refresh);
    $("#refreshBtn")?.addEventListener("click", refresh);

    // auto-refresh 60 s
    setInterval(refresh, 60_000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initControls();
    refresh();
  });
})();
