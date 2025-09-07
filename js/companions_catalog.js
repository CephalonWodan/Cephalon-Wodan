// js/companions_catalog.js
// Mise en page type “Warframes” (index.html) + même code couleurs
(() => {
  "use strict";

  /* ----------------- Config ----------------- */
  const EXPORT_URL   = "data/ExportSentinels_en.json"; // Public Export (workflow)
  const FALLBACK_URL = "data/companions.json";         // ancien JSON (LUA)
  // Helpers d’URL (priorité demandée : Wiki -> CDN -> Local)
  const wikiPath = (file) => file ? `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(file)}` : "";
  const cdnImg   = (file) => file ? `https://cdn.warframestat.us/img/${encodeURIComponent(file)}` : "";
  const locImg   = (file) => file ? `img/companions/${encodeURIComponent(file)}` : "";

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const fmtNum = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
  const pct = (v) => (v === null || v === undefined) ? "—" : `${Math.round(v*1000)/10}%`;
  const cleanLF = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const cleanDesc = (s) => escapeHtml(cleanLF(s)).replace(/\n/g, "<br>");

  const coalesce = (obj, keys, def=null) => { for (const k of keys) if (obj && obj[k] != null) return obj[k]; return def; };

  const keyName = (n) => String(n||"").toLowerCase().replace(/[^a-z0-9]+/g, ""); // pour fusion Attacks

  /* -------------- Détection type depuis le uniqueName (Public Export) -------------- */
  function detectType(u) {
    const p = String(u || "");
    if (p.includes("/CatbrowPet/")) return "Kavat";
    if (p.includes("/KubrowPet/"))  return "Kubrow";
    if (p.includes("/CreaturePets/ArmoredInfestedCatbrow")) return "Vulpaphyla";
    if (p.includes("/CreaturePets/HornedInfestedCatbrow"))  return "Vulpaphyla";
    if (p.includes("/CreaturePets/PharaohPredator") || p.includes("/CreaturePets/VizierPredator") || p.includes("/CreaturePets/MedjayPredator")) return "Predasite";
    if (p.includes("/SentinelPowersuits/")) return "Sentinel";
    return "Companion";
  }

  /* -------------- Normalisation EXPORT (Public Export) -------------- */
  function normalizeFromExport(raw){
    const arr = Array.isArray(raw?.ExportSentinels) ? raw.ExportSentinels.slice() : [];
    return arr
      .map(x => {
        const name = x.name || "";
        const type = detectType(x.uniqueName);
        const category = (x.productCategory === "Sentinels") ? "Sentinels" : "Pets";
        return {
          Name: name,
          Type: type,
          Category: category,
          Description: x.description || "",
          Armor:  x.armor ?? 0,
          Health: x.health ?? 0,
          Shield: x.shield ?? 0,
          Energy: x.power ?? 0,
          Attacks: null // fusionnée depuis LUA juste après
        };
      })
      .sort(byName);
  }

  /* -------------- Normalisation ancien JSON (LUA -> wiki) -------------- */
  function normalizeFromLua(raw){
    let coll = raw && (raw.Companions || raw.ExportSentinels || raw.sentinals || raw); // permissif
    if (!coll) return [];

    let arr;
    if (Array.isArray(coll)) {
      arr = coll.slice();
    } else {
      arr = Object.entries(coll).map(([k,v]) => (v.Name ? v : { ...v, Name: v.Name || k }));
    }
    arr.sort(byName);
    return arr;
  }

  /* -------------- Image tri-source -------------- */
  const MANUAL_IMG = {
    "Venari": "Venari.png",
    "Venari Prime": "VenariPrime.png",
    "Helminth Charger": "HelminthCharger.png",
    "Nautilus": "Nautilus.png",
    "Nautilus Prime": "NautilusPrime.png",
  };

  function buildImageCandidates(item){
    const name = (item.Name || item.name || "").trim();
    const manual = MANUAL_IMG[name];

    const baseNS = (manual || name).replace(/\s+/g, "");   // ChesaKubrow
    const baseUS = (manual || name).replace(/\s+/g, "_");  // Chesa_Kubrow

    const cand = [];
    // 1) Wiki – VERSION SANS UNDERSCORE en premier (réduit les 404)
    cand.push(wikiPath(baseNS + ".png"));
    // 2) Wiki – AVEC underscore
    cand.push(wikiPath(baseUS + ".png"));
    // 3) CDN (deux variantes)
    cand.push(cdnImg(baseNS + ".png"));
    cand.push(cdnImg(baseUS + ".png"));
    // 4) Local (deux variantes)
    cand.push(locImg(baseNS + ".png"));
    cand.push(locImg(baseUS + ".png"));

    const seen = new Set();
    const list = cand.filter(u => u && !seen.has(u) && seen.add(u));

    const placeholder = 'data:image/svg+xml;utf8,'+encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/>
        </linearGradient></defs>
        <rect width="600" height="360" fill="url(#g)"/>
        <rect x="12" y="12" width="576" height="336" rx="24" ry="24" fill="none" stroke="#3d4b63" stroke-width="3"/>
        <text x="50%" y="52%" fill="#6b7b94" font-size="28" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text>
      </svg>`
    );

    // On encode pour les mettre en data-attributes sans risques de sauts de ligne/quotes
    return {
      first: list[0] || placeholder,
      listEnc: list.map(encodeURIComponent).join("|"),
      phEnc: encodeURIComponent(placeholder)
    };
  }

  // Gestion des fallbacks SANS onerror inline (évite les chaînes multi-lignes)
  function attachImgFallback(imgEl){
    const sources = (imgEl.dataset.srcs || "").split("|").filter(Boolean).map(decodeURIComponent);
    let i = 0;
    const placeholder = decodeURIComponent(imgEl.dataset.ph || "") || "";
    function handler(){
      i++;
      if (i < sources.length) {
        imgEl.src = sources[i];
      } else {
        imgEl.removeEventListener("error", handler);
        if (placeholder) imgEl.src = placeholder;
      }
    }
    imgEl.addEventListener("error", handler);
    // si la première est déjà KO au moment d’attacher
    if (!imgEl.complete || imgEl.naturalWidth === 0) {
      // laisse le navigateur déclencher error si besoin
    }
  }

  /* -------------- Attaques (si présentes) -------------- */
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
    const armor  = coalesce(item, ["Armor","armor"], "—");
    const health = coalesce(item, ["Health","health"], "—");
    const shield = coalesce(item, ["Shield","shield"], "—");
    const energy = coalesce(item, ["Energy","energy"], "—");

    const im = buildImageCandidates(item);

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img
              src="${im.first}"
              data-srcs="${im.listEnc}"
              data-ph="${im.phEnc}"
              alt="${escapeHtml(name)}"
              class="w-full h-full object-contain"
            >
          </div>
        </div>

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

    const imgEl = $("#card img");
    if (imgEl) attachImgFallback(imgEl);
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

  /* -------------- Chargement + fusion Attacks -------------- */
  async function loadBoth(){
    // 1) Export officiel
    let exportList = [];
    try {
      const r = await fetch(EXPORT_URL, { cache: "no-store" });
      if (r.ok) exportList = normalizeFromExport(await r.json());
    } catch {}
    // 2) LUA (pour Attacks + éventuels compléments)
    let luaList = [];
    try {
      const r2 = await fetch(FALLBACK_URL, { cache: "no-store" });
      if (r2.ok) luaList = normalizeFromLua(await r2.json());
    } catch {}

    if (!exportList.length && luaList.length) {
      // pas d’export ? on affiche le LUA tel quel (avec ses images aussi via buildImageCandidates)
      return { list: luaList, source: "lua" };
    }

    // map des attaques par nom normalisé
    const attacksByName = new Map();
    for (const it of luaList) {
      const nm = keyName(it.Name || it.name);
      if (!nm) continue;
      const atks = coalesce(it, ["Attacks","attacks"], null);
      if (Array.isArray(atks) && atks.length) attacksByName.set(nm, atks);
    }

    // fusion dans l’export
    const merged = exportList.map(it => {
      const nm = keyName(it.Name);
      const atks = attacksByName.get(nm);
      return atks ? { ...it, Attacks: atks } : it;
    });

    return { list: merged, source: "export" };
  }

  /* -------------- Boot -------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des companions…";

      const { list, source } = await loadBoth();
      if (!list.length){
        status.textContent = "Aucun compagnon trouvé.";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      renderPicker(list);
      renderCard(list[0]);

      const setStatus = (n) => {
        status.textContent = `Companions chargés : ${n} ${source === "export" ? "(Export officiel)" : "(fallback LUA)"}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      };
      setStatus(list.length);

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
      status.textContent = "Erreur de chargement des données.";
      status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
      status.style.background = "rgba(255,0,0,.08)";
      status.style.color = "#ffd1d1";
    }
  })();
})();
