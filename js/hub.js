// js/hub.js  (v3)
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $  = (s, r=document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[m]));
  const pad2 = n => String(n).padStart(2, '0');

  const state = {
    plat: 'pc',
    lang: 'fr',
    autoTimer: null
  };

  // relative to hub.html (=> /Cephalon-Wodan/api/v1/worldstate/…)
  const localWS = (plat, lang) => `api/v1/worldstate/${plat}/${lang}.json`;
  const liveWS  = (plat, lang) => `https://api.warframestat.us/${plat}?language=${lang}`;

  const nowISO = () => new Date().toISOString().replace('T',' ').slice(0, 19);

  const left = (expiry) => {
    const t = Date.parse(expiry||''); if (isNaN(t)) return '';
    let ms = t - Date.now(); if (ms < 0) return 'expiré';
    const m = Math.floor(ms/60000); const h = Math.floor(m/60); const d = Math.floor(h/24);
    if (d>0) return `${d}j ${h%24}h`;
    if (h>0) return `${h}h ${m%60}m`;
    return `${m}m`;
  };

  const safeArr = v => Array.isArray(v) ? v : [];

  const showStatus = (type, msg) => {
    const el = $('#status'); if (!el) return;
    el.className = 'mb-4 text-sm px-3 py-2 rounded-lg orn';
    el.style.background = type==='ok'   ? 'rgba(0,229,255,.08)'
                        : type==='warn' ? 'rgba(255,196,0,.08)'
                        :                 'rgba(255,0,0,.08)';
    el.style.color = type==='ok'   ? '#bfefff'
                  : type==='warn' ? '#ffe7a3'
                  :                 '#ffd1d1';
    el.textContent = msg;
  };

  async function fetchJSON(url) {
    const res = await fetch(url, {cache:'no-store'});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function loadWS(plat, lang) {
    // 1) snapshot local
    try {
      const j = await fetchJSON(localWS(plat, lang));
      if (j && Object.keys(j).length) {
        return {data:j, source:'snapshot'};
      }
      // fichier vide: on tente live
    } catch (e) {
      // 404 ou autre -> on tente live
    }
    // 2) fallback live
    const live = await fetchJSON(liveWS(plat, lang));
    return {data: live, source:'live'};
  }

  /* ---------- renderers ---------- */

  function renderSortie(ws) {
    const box = $('#sortie .body'); if (!box) return;
    const s = ws.sortie || ws.Sortie || null;
    if (!s || s.variants && s.variants.length === 0) return box.innerHTML = '<div class="muted">Aucune donnée.</div>';
    const v = safeArr(s.variants).map(x =>
      `<div class="py-1">• ${esc(x.missionType || x.mission || '')} — ${esc(x.node || '')} <span class="muted">(${esc(x.modifier || '')})</span></div>`
    ).join('');
    box.innerHTML = `
      <div class="font-medium mb-1">${esc(s.boss || '')} — ${esc(s.faction || '')} <span class="muted">(${left(s.expiry)})</span></div>
      ${v || '<div class="muted">—</div>'}
    `;
  }

  function renderArchon(ws) {
    const box = $('#archon .body'); if (!box) return;
    const a = ws.archonHunt || null;
    if (!a || !a.variants) return box.innerHTML = '<div class="muted">Aucune donnée.</div>';
    const v = safeArr(a.variants).map(x =>
      `<div class="py-1">• ${esc(x.node || '')} — ${esc(x.missionType || '')}</div>`
    ).join('');
    box.innerHTML = `
      <div class="font-medium mb-1">${esc(a.boss || 'Archon Hunt')} <span class="muted">(${left(a.expiry)})</span></div>
      ${v || '<div class="muted">—</div>'}
    `;
  }

  function renderFissures(ws) {
    const box = $('#fissures .body'); if (!box) return;
    const list = safeArr(ws.fissures).filter(f => !f.isStorm && !f.isHard);
    if (!list.length) return box.innerHTML = '<div class="muted">Aucune donnée.</div>';
    box.innerHTML = list.slice(0, 10).map(f =>
      `<div class="py-1">• T${esc(f.tierNum ?? '')} — ${esc(f.missionType || '')} — ${esc(f.node || '')} <span class="muted">(${left(f.expiry)})</span></div>`
    ).join('');
  }

  function renderNightwave(ws) {
    const box = $('#nightwave .body'); if (!box) return;
    const nw = ws.nightwave || null;
    if (!nw || !nw.active) return box.innerHTML = '<div class="muted">Aucune donnée.</div>';
    const ch = safeArr(nw.challenges).map(c =>
      `<div class="py-1">• ${esc(c.title || c.desc || '')}</div>`
    ).join('');
    box.innerHTML = ch || '<div class="muted">—</div>';
  }

  function renderInvasions(ws) {
    const box = $('#invasions .body'); if (!box) return;
    const list = safeArr(ws.invasions).filter(i => !i.completed);
    if (!list.length) return box.innerHTML = '<div class="muted">Aucune donnée.</div>';
    box.innerHTML = list.slice(0, 6).map(i =>
      `<div class="py-1">• ${esc(i.node || '')} — ${esc(i.desc || '')}</div>`
    ).join('');
  }

  /* ---------- refresh ---------- */

  async function refresh() {
    // éléments nécessaires
    const platSel = $('#plat'), langSel = $('#lang');
    if (platSel) state.plat = (platSel.value || 'pc').toLowerCase();
    if (langSel) state.lang = (langSel.value || 'fr').toLowerCase();

    try {
      showStatus('warn', 'Chargement…');
      const {data, source} = await loadWS(state.plat, state.lang);
      // header
      const whenEl = $('#when');
      const srcEl  = $('#src');
      if (whenEl) whenEl.textContent = nowISO();
      if (srcEl)  srcEl.textContent  = (source === 'snapshot' ? 'snapshot local' : 'API live');

      // rendu
      renderSortie(data);
      renderArchon(data);
      renderFissures(data);
      renderNightwave(data);
      renderInvasions(data);

      showStatus('ok', `OK • ${state.plat.toUpperCase()} • ${state.lang.toUpperCase()} • ${source === 'snapshot' ? 'snapshot' : 'live'}`);
    } catch (e) {
      console.error(e);
      showStatus('err', `Erreur : ${e.message}`);
      // vide les panneaux pour éviter du vieux contenu
      for (const id of ['sortie','archon','fissures','nightwave','invasions']) {
        const b = $(`#${id} .body`); if (b) b.innerHTML = '<div class="muted">—</div>';
      }
    }
  }

  /* ---------- boot ---------- */

  function start() {
    // valeurs par défaut UI si présents
    if ($('#plat')) $('#plat').value = state.plat.toUpperCase();
    if ($('#lang')) $('#lang').value = state.lang.toUpperCase();

    $('#btn-refresh')?.addEventListener('click', refresh);
    $('#plat')?.addEventListener('change', refresh);
    $('#lang')?.addEventListener('change', refresh);

    refresh();

    // auto refresh 60s
    clearInterval(state.autoTimer);
    state.autoTimer = setInterval(refresh, 60000);
  }

  document.addEventListener('DOMContentLoaded', start);
})();
