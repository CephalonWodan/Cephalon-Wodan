// js/companions_catalog.js
// Mise en page type “Warframes” (index.html) + même code couleurs
(() => {
  "use strict";

  /* ----------------- Config ----------------- */
  const EXPORT_URL   = "data/ExportSentinels_en.json"; // Public Export (workflow)
  const FALLBACK_URL = "data/companions.json";         // ton ancien JSON (LUA)
  // URL helpers (priorité demandée : Wiki /images -> Wiki FilePath -> CDN -> Local)
  const WIKI_IMG_IMAGES  = (file) => file ? `https://wiki.warframe.com/images/${encodeURIComponent(file)}` : "";
  const WIKI_IMG_FILEPATH= (file) => file ? `https://wiki.warframe.com/w/Special:FilePath/${encodeURIComponent(file)}` : "";
  const CDN_IMG          = (file) => file ? `https://cdn.warframestat.us/img/${encodeURIComponent(file)}` : "";
  const LOCAL_IMG        = (file) => file ? `img/companions/${encodeURIComponent(file)}` : "";

  /* ----------------- Utils ----------------- */
  const $  = (s) => document.querySelector(s);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':"&quot;","'":"&#39;"}[c]));
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.Name || a.name || "").localeCompare(b.Name || b.name || "");
  const fmtNum = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
  const pct = (v) => (v === null || v === undefined) ? "—" : `${Math.round(v*1000)/10}%`;
  const cleanLF = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");

  function cleanDesc(s){
    return escapeHtml(cleanLF(s)).replace(/\n/g, "<br>");
  }

  function coalesce(obj, keys, def=null) {
    for (const k of keys) if (obj && obj[k] != null) return obj[k];
    return def;
  }

  /* -------------- Détection type depuis le uniqueName (Public Export) -------------- */
  function detectType(u) {
    const p = String(u || "");
    if (p.includes("/CatbrowPet/")) return "Kavat";
    if (p.includes("/KubrowPet/"))  return "Kubrow";
    if (p.includes("/CreaturePets/ArmoredInfestedCatbrow")) return "Vulpaphyla";
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
          Attacks: null, // pas fourni par le Public Export
          // on placera une propriété Image plus tard si le LUA en apporte
        };
      })
      .sort(byName);
  }

  /* -------------- Normalisation ancien JSON (LUA -> wiki) -------------- */
  function normalizeFromLua(raw){
    let coll = raw && raw.Companions ? raw.Companions : raw;
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

  // Corrections manuelles si un nom ne correspond pas du tout au fichier
  const MANUAL_IMG = {
    "Venari": "Venari.png",
    "Venari Prime": "VenariPrime.png",
    "Helminth Charger": "HelminthCharger.png",
    "Nautilus": "Nautilus.png",
    "Nautilus Prime": "NautilusPrime.png",
  };

  // génère les variantes d’URL pour un nom de fichier
  function mkUrlsForFile(file){
    return [
      WIKI_IMG_IMAGES(file),       // 1) wiki /images/<file>
      WIKI_IMG_FILEPATH(file),     // 2) wiki Special:FilePath/<file>
      CDN_IMG(file),               // 3) cdn
      LOCAL_IMG(file),             // 4) local
    ].filter(Boolean);
  }

  function buildImageCandidates(item){
    const explicit = coalesce(item, ["Image","image"], "");
    const name = (item.Name || item.name || "").trim();
    const manual = MANUAL_IMG[name];

    const baseUS = (manual || explicit || name).replace(/\s+/g, "_"); // ex: “Sly Vulpaphyla” -> “Sly_Vulpaphyla”
    const baseNS = (manual || explicit || name).replace(/\s+/g, "");  // ex: “Sly Vulpaphyla” -> “SlyVulpaphyla”
    const EXTS = [".png", ".webp", ".jpg", ".jpeg"];

    const cand = [];
    const pushUnique = (u) => { if (u && !cand.includes(u)) cand.push(u); };

    // Si on a un fichier explicite avec extension, essayer direct
    if (/\.(png|webp|jpe?g)$/i.test(baseUS)) {
      mkUrlsForFile(baseUS).forEach(pushUnique);
    } else {
      // Tenter plusieurs extensions et deux variantes de nom
      for (const ext of EXTS) {
        mkUrlsForFile(baseUS + ext).forEach(pushUnique);
        mkUrlsForFile(baseNS + ext).forEach(pushUnique);
      }
    }

    // joli placeholder
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

    return { list: cand, placeholder };
  }

  // petit helper pour itérer les fallbacks depuis l'attribut data
  window.__cycleImg = function(el, placeholder){
    const list = (el.getAttribute("data-srcs") || "").split("|").filter(Boolean);
    let i = parseInt(el.getAttribute("data-i") || "0", 10) + 1;
    if (i < list.length) {
      el.setAttribute("data-i", String(i));
      el.src = list[i];
    } else {
      el.onerror = null;
      el.src = placeholder;
    }
  };

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

    const img = buildImageCandidates(item);

    $("#card").innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Colonne image -->
        <div class="w-full md:w-[260px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[220px] h-[220px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img
              src="${img.list[0]}"
              data-srcs="${img.list.join("|")}"
              data-i="0"
              alt="${escapeHtml(name)}"
              class="w-full h-full object-contain"
              onerror="__cycleImg(this, '${img.placeholder}')">
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

  /* -------------- Fusion Export + LUA (Attacks + MOA/Hound) -------------- */
  function indexByLowerName(list){
    const m = new Map();
    for (const it of list) {
      const n = norm(it.Name || it.name || "");
      if (n) m.set(n.toLowerCase(), it);
    }
    return m;
  }

  function mergeExportWithLua(exportList, luaList){
    const luaByName = indexByLowerName(luaList);

    // 1) Injecter Attacks + Image depuis LUA quand dispo
    const merged = exportList.map(base => {
      const k = (base.Name || "").toLowerCase();
      const lua = luaByName.get(k);
      if (lua) {
        if (!base.Attacks && Array.isArray(lua.Attacks)) base.Attacks = lua.Attacks;
        // si le LUA a une image explicite, on la pose pour aider le builder d’URLs
        const luaImg = coalesce(lua, ["Image","image"], "");
        if (luaImg && !base.Image) base.Image = luaImg;
      }
      return base;
    });

    // 2) Ajouter les MOA + Hounds manquants (du LUA)
    const present = new Set(merged.map(x => (x.Name||"").toLowerCase()));
    const extra = luaList.filter(v => {
      const t = (v.Type || v.type || "").trim();
      const name = (v.Name || v.name || "").trim();
      if (!name) return false;
      if (present.has(name.toLowerCase())) return false;
      return t === "MOA" || t === "Hound";
    }).map(v => ({
      Name: v.Name || v.name || "",
      Type: v.Type || v.type || "Companion",
      Category: v.Category || v.category || "Pets",
      Description: v.Description || v.description || "",
      Armor: v.Armor ?? v.armor ?? "—",
      Health: v.Health ?? v.health ?? "—",
      Shield: v.Shield ?? v.shield ?? "—",
      Energy: v.Energy ?? v.energy ?? "—",
      Attacks: Array.isArray(v.Attacks) ? v.Attacks : null,
      Image: v.Image || v.image || "",
    }));

    const out = merged.concat(extra).sort(byName);
    return out;
  }

  /* -------------- Chargement data -------------- */
  async function loadData(){
    // On charge TOUJOURS le LUA pour fusion (Attacks + MOA/Hound)
    let luaList = [];
    try {
      const rLua = await fetch(FALLBACK_URL, { cache: "no-store" });
      if (rLua.ok) luaList = normalizeFromLua(await rLua.json());
    } catch {}

    // 1) Public Export (priorité)
    try{
      const r = await fetch(EXPORT_URL, { cache: "no-store" });
      if (r.ok) {
        const raw = await r.json();
        const base = normalizeFromExport(raw);
        if (base.length) {
          const merged = mergeExportWithLua(base, luaList);
          return { list: merged, source: "export+lua" };
        }
      }
    }catch{}

    // 2) Fallback pur sur ton JSON LUA si l’export n’est pas dispo
    return { list: luaList, source: "lua-only" };
  }

  /* -------------- Boot -------------- */
  (async function boot(){
    const status = $("#status");
    try{
      status.textContent = "Chargement des companions…";

      const { list, source } = await loadData();
      if (!list.length){
        status.textContent = "Aucun compagnon trouvé.";
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
        return;
      }

      // UI
      renderPicker(list);
      renderCard(list[0]);

      const setStatus = (n) => {
        const tag = source === "export+lua" ? "(Export fusionné LUA)" : "(fallback LUA)";
        status.textContent = `Companions chargés : ${n} ${tag}`;
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
