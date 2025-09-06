// js/companions_catalog.js
// Mise en page type “Warframes” (index.html) + même code couleurs

(() => {
  "use strict";

  /* ----------------- Config ----------------- */
  const DATA_URL = "data/companions.json"; // ton JSON dérivé du LUA (wiki officiel)
  const WIKI_IMG = (file) => file ? `https://wiki.warframe.com/images/${encodeURIComponent(file)}` : "";
  // Fallback #2: CDN WarframeStat si le même nom existe
  const CDN_IMG  = (fileOrName) => fileOrName ? `https://cdn.warframestat.us/img/${encodeURIComponent(fileOrName)}` : "";
  // Fallback #3: repo local (au cas où tu mets des PNG dans /img/companions/)
  const LOCAL_IMG = (fileOrName) => fileOrName ? `img/companions/${encodeURIComponent(fileOrName)}` : "";

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const fmtNum = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
  const pct = (v) => (v === null || v === undefined) ? "—" : `${Math.round(v*1000)/10}%`;

  function cleanDesc(s){
    return escapeHtml(String(s||""))
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n/g, "<br>");
  }

  function coalesce(obj, keys, def=null) {
    for (const k of keys) if (obj && obj[k] != null) return obj[k];
    return def;
  }

  /* -------------- Normalisation liste -------------- */
  function normalizeList(raw){
    // Supporte { Companions: { "Name": {...}, ... } } OU { Companions: [ {...}, ... ] }
    let coll = raw && raw.Companions ? raw.Companions : raw;
    if (!coll) return [];

    let arr;
    if (Array.isArray(coll)) {
      arr = coll.slice();
    } else {
      arr = Object.entries(coll).map(([k,v]) => (v.Name ? v : { ...v, Name: v.Name || k }));
    }
    // trie nom
    arr.sort(byName);
    return arr;
  }

  /* -------------- Image tri-source -------------- */
  function imageFor(item){
    const file = coalesce(item, ["Image","image"], "");
    const name = coalesce(item, ["Name","name"], "");
    // ordre de priorité demandé : Wiki -> CDN -> Local
    const sources = [
      WIKI_IMG(file),
      CDN_IMG(file || `${name}.png`),
      LOCAL_IMG(file || `${name}.png`)
    ].filter(Boolean);

    // data:svg placeholder pour éviter un gros flash “No Image”
    const ph = 'data:image/svg+xml;utf8,'+encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/></linearGradient></defs><rect width="600" height="360" fill="url(#g)"/><rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/><text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text></svg>`
    );

    // on laisse le navigateur tomber de l’un à l’autre
    return { src: sources[0] || ph, fallbacks: sources.slice(1), placeholder: ph };
  }

  /* -------------- Attaques (intégrées sous les stats) -------------- */
  function sumDamage(dmg){
    if (!dmg || typeof dmg !== "object") return null;
    let total = 0;
    for (const k in dmg) {
      const v = Number(dmg[k]); if (!isNaN(v)) total += v;
    }
    return total || null;
  }

  function attacksBlock(item){
    const atks = coalesce(item, ["Attacks","attacks"], null);
    if (!Array.isArray(atks) || !atks.length) return "";
    const lines = atks.map(a => {
      const name  = a.AttackName || a.name || "Attack";
      const dmgT  = sumDamage(a.Damage || a.damage);
      const critC = a.CritChance != null ? pct(a.CritChance) : null;
      const critM = a.CritMultiplier != null ? `×${a.CritMultiplier}` : null;
      const stat  = a.StatusChance != null ? pct(a.StatusChance) : null;

      const parts = [];
      if (dmgT != null) parts.push(`Dégâts ${dmgT}`);
      if (critC) parts.push(`Crit ${critC}${critM ? " " + critM : ""}`);
      if (stat)  parts.push(`Statut ${stat}`);

      return `• ${escapeHtml(name)} — ${parts.join(" · ")}`;
    });

    return `
      <div class="mt-4">
        <div class="text-sm muted mb-1">Attaques</div>
        <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
          ${lines.map(l => `<div class="py-1">${l}</div>`).join("")}
        </div>
      </div>`;
  }

  /* -------------- UI helpers -------------- */
  const statBox = (label, value) => `
    <div class="stat">
      <div class="text-[10px] uppercase tracking-wide text-slate-200">${escapeHtml(label)}</div>
      <div class="text-lg font-semibold">${escapeHtml(fmtNum(value))}</div>
    </div>`;

  function chips(item){
    const cat  = coalesce(item, ["Category","category"], "");
    const type = coalesce(item, ["Type","type"], "");
    const mk = (t) => t ? `<span class="badge">${escapeHtml(t)}</span>` : "";
    return [mk(cat), mk(type)].filter(Boolean).join(" ");
  }

  function renderCard(item){
    const name = coalesce(item, ["Name","name"], "—");
    const desc = coalesce(item, ["Description","description"], "");
    const armor = coalesce(item, ["Armor","armor"], "—");
    const health = coalesce(item, ["Health","health"], "—");
    const shield = coalesce(item, ["Shield","shield"], "—");
    const energy = coalesce(item, ["Energy","energy"], "—");

    const img = imageFor(item);

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Colonne image -->
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img src="${img.src}" alt="${escapeHtml(name)}" class="w-full h-full object-contain"
                 onerror="(function(el){ if(!el._f){ el._f=1; el.src='${img.fallbacks[0]||img.placeholder}'; } else if(!el._f2 && '${img.fallbacks[1]||""}') { el._f2=1; el.src='${img.fallbacks[1]}'; } })(this)">
          </div>
        </div>

        <!-- Colonne contenu -->
        <div class="flex-1 flex flex-col gap-4">
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <h2 class="text-xl font-semibold">${escapeHtml(name)}</h2>
              <div class="mt-2 flex flex-wrap gap-2">${chips(item)}</div>
              <p class="mt-2 text-[var(--muted)]">${cleanDesc(desc)}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${statBox("ARMOR", armor)}
            ${statBox("HEALTH", health)}
            ${statBox("SHIELD", shield)}
            ${statBox("ENERGY", energy)}
          </div>

          ${attacksBlock(item)}
        </div>
      </div>
    `;
  }

  function renderPicker(list){
    const pick = $("#picker");
    pick.innerHTML = "";
    list.forEach((it, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = coalesce(it, ["Name","name"], "—");
      pick.appendChild(o);
    });
    pick.value = "0";
  }

  /* -------------- Boot -------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des companions…";

      const r = await fetch(DATA_URL, { cache: "no-store" });
      const raw = await r.json();
      const list = normalizeList(raw);

      if (!list.length){
        status.textContent = "Aucun compagnon trouvé.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // UI
      renderPicker(list);
      renderCard(list[0]);

      const setStatus = (n) => {
        status.textContent = `Companions chargés : ${n}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      };
      setStatus(list.length);

      // interactions
      $("#picker").addEventListener("change", (e)=>{
        const idx = parseInt(e.target.value, 10);
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
        if (filtered.length) renderCard(filtered[Math.min(idx, filtered.length-1)]);
      });

      $("#search").addEventListener("input", ()=>{
        const q = norm($("#search").value).toLowerCase();
        const filtered = q ? list.filter(x => (x.Name||"").toLowerCase().includes(q)) : list;
        renderPicker(filtered);
        if (filtered.length) renderCard(filtered[0]);
        setStatus(`Affichage : ${filtered.length} résultat(s)`);
      });

    } catch(e){
      console.error("[companions] load error:", e);
      status.textContent = "Erreur de chargement des companions.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
