// js/companions_catalog.js
// =====================================================
// Companions (Kavats, Kubrows, Sentinels, MOA, Predasite, Vulpaphyla, Hounds)
// Source: data/companions.json (dump wiki officiel -> JSON)
// - Image priority: Wiki /images/...  -> WarframeStat CDN -> assets locaux
// - Nettoyage \r\n -> <br>
// - Intègre "Attacks" dans le panneau (si présent)
// - IDs utilisés: #status, #search, #picker, #card
// =====================================================

(function(){
  "use strict";

  /* ---------------- utils DOM & texte ---------------- */
  const $  = (s) => document.querySelector(s);
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
  const norm = (s) => String(s || "").trim();
  const byName = (a,b) => (a.name||"").localeCompare(b.name||"");

  function cleanDesc(s){
    if (!s) return "";
    return escapeHtml(String(s).replace(/\r\n?/g, "\n")).replace(/\n{3,}/g, "\n\n").replace(/\n/g, "<br>");
  }

  function fmtPercent(v){
    if (v == null || v === "") return "—";
    // si déjà en %, laisse tel quel
    if (typeof v === "string" && /%$/.test(v.trim())) return v.trim();
    const n = Number(v);
    if (!Number.isFinite(n)) return escapeHtml(String(v));
    const p = (n <= 1 && n >= 0) ? n * 100 : n; // 0.3 -> 30, sinon suppose déjà en %
    return `${Number(p.toFixed(p % 1 === 0 ? 0 : (p < 1 ? 2 : 1)))}%`;
  }

  function fmtDamageMap(obj){
    if (!obj || typeof obj !== "object") return "—";
    const parts = [];
    for (const [k,v] of Object.entries(obj)){
      if (v == null) continue;
      parts.push(`${escapeHtml(k)} ${Number(v)}`);
    }
    return parts.length ? parts.join(" · ") : "—";
  }

  /* ---------------- images: priorité & fallback ---------------- */
  // Priorité 1 : wiki officiel /images/<File>
  const wikiImg = (file) => file ? `https://wiki.warframe.com/images/${encodeURIComponent(file)}` : "";
  // Priorité 2 : CDN warframestat (si disponible pour ce fichier)
  const wfStat = (file) => file ? `https://cdn.warframestat.us/img/${encodeURIComponent(file)}` : "";
  // Priorité 3 : assets locaux (ton repo)
  const localImg = (file) => file ? `img/companions/${encodeURIComponent(file)}` : "";

  function buildImageCandidates(cmp){
    const files = [cmp.Image, cmp.SquadPortrait, cmp.Icon].filter(Boolean);
    const urls = [];
    for (const f of files){ urls.push(wikiImg(f)); }
    for (const f of files){ urls.push(wfStat(f)); }
    for (const f of files){ urls.push(localImg(f)); }

    // fallback final: placeholder SVG (inline)
    const ph = placeholder(`${cmp.Name || cmp.name || "Companion"}`);
    urls.push(ph);
    // filtre doublons / vides
    return Array.from(new Set(urls.filter(Boolean)));
  }

  function placeholder(name){
    const initials = (name||"C").split(/\s+/).map(s=>s[0]).slice(0,2).join("").toUpperCase();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/>
          </linearGradient>
        </defs>
        <rect width="240" height="160" rx="16" fill="url(#g)"/>
        <text x="50%" y="55%" fill="#7aa2d6" font-family="Inter,system-ui,Segoe UI,Roboto" font-size="56" text-anchor="middle">${escapeHtml(initials)}</text>
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // onerror fallback chain
  window._nextImg = function(img){
    try{
      const arr = JSON.parse(img.dataset.srcs || "[]");
      let idx = Number(img.dataset.idx || 0);
      idx++;
      if (idx < arr.length){
        img.dataset.idx = String(idx);
        img.src = arr[idx];
      }
    }catch(e){ /* noop */ }
  };

  /* ---------------- chargement des données ---------------- */
  async function loadLocalCompanions(){
    // Le JSON converti depuis le LUA doit être au format:
    // { "Companions": { "Name": { ... }, "Other": { ... } } }
    const r = await fetch("data/companions.json", { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status} @ data/companions.json`);
    const data = await r.json();
    const dict = data && (data.Companions || data.companions || data);
    if (!dict || typeof dict !== "object") return [];
    const list = [];
    for (const [k, raw] of Object.entries(dict)){
      // normalise structure
      const rec = Object.assign({}, raw);
      rec.Name = rec.Name || rec.name || k;
      rec.Type = rec.Type || rec.type || "";
      rec.Category = rec.Category || rec.category || "";
      rec.Description = rec.Description || rec.description || "";
      rec.Image = rec.Image || rec.image || "";
      rec.Icon = rec.Icon || rec.icon || "";
      rec.SquadPortrait = rec.SquadPortrait || rec.squadPortrait || "";
      rec.Health = rec.Health ?? rec.health ?? null;
      rec.Shield = rec.Shield ?? rec.shield ?? null;
      rec.Armor = rec.Armor ?? rec.armor ?? null;
      rec.Energy = rec.Energy ?? rec.energy ?? null;
      rec.Stamina = rec.Stamina ?? rec.stamina ?? null;
      rec.Polarities = rec.Polarities || rec.polarities || [];
      rec.Attacks = Array.isArray(rec.Attacks) ? rec.Attacks : (Array.isArray(rec.attacks) ? rec.attacks : []);
      list.push(rec);
    }
    return list.sort(byName);
  }

  /* ---------------- UI helpers ---------------- */
  const txt = (v) => (v == null || v === "" ? "—" : String(v));
  function badge(label, cls=""){ return `<span class="badge ${cls}">${escapeHtml(label)}</span>`; }

  function statBox(label, value){
    return `
      <div class="stat">
        <div class="text-[10px] uppercase tracking-wide text-slate-300">${escapeHtml(label)}</div>
        <div class="text-lg font-semibold">${escapeHtml(txt(value))}</div>
      </div>`;
  }

  function attackCard(a){
    const name = a.AttackName || a.name || "Attack";
    const total = (a.TotalDamage != null) ? Number(a.TotalDamage) : null;
    const dmgMap = fmtDamageMap(a.Damage || a.damage);
    const cc  = (a.CritChance != null) ? fmtPercent(a.CritChance) : "—";
    const cd  = (a.CritMultiplier != null) ? `${Number(a.CritMultiplier)}x` : "—";
    const sc  = (a.StatusChance != null) ? fmtPercent(a.StatusChance) : "—";
    const fr  = (a.FireRate != null) ? `${a.FireRate}/s` : null;

    return `
      <div class="rounded-xl border border-[rgba(255,255,255,.10)] p-3 bg-[rgba(255,255,255,.02)]">
        <div class="font-semibold mb-2">${escapeHtml(name)}</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <div><span class="text-[var(--muted)]">Total:</span> <b>${escapeHtml(total==null?"—":String(total))}</b></div>
          <div><span class="text-[var(--muted)]">Crit:</span> <b>${cc} / ${cd}</b></div>
          <div><span class="text-[var(--muted)]">Status:</span> <b>${sc}</b></div>
          ${fr ? `<div><span class="text-[var(--muted)]">Cadence:</span> <b>${escapeHtml(fr)}</b></div>` : ""}
          <div class="col-span-2 sm:col-span-3"><span class="text-[var(--muted)]">Dégâts:</span> <b>${escapeHtml(dmgMap)}</b></div>
        </div>
      </div>`;
  }

  function polaritiesRow(arr){
    if (!Array.isArray(arr) || !arr.length) return "";
    return `<div class="flex flex-wrap gap-2">${arr.map(p=>badge(p)).join("")}</div>`;
  }

  /* ---------------- rendu carte ---------------- */
  function renderCard(c){
    const card = $("#card");
    if (!card) return;
    const name = c.Name || c.name || "—";
    const desc = cleanDesc(c.Description || c.description || "");
    const cats = [c.Category, c.Type].filter(Boolean).map(s=>badge(s)).join(" ");

    const imgCandidates = buildImageCandidates(c);
    const firstSrc = imgCandidates[0];
    const rest = imgCandidates.slice(1);

    const attacks = Array.isArray(c.Attacks) ? c.Attacks : [];
    const attacksHtml = attacks.length
      ? `<div class="mt-5">
           <div class="text-sm text-[var(--muted)] mb-2">Attaques</div>
           <div class="grid gap-3">
             ${attacks.map(attackCard).join("")}
           </div>
         </div>`
      : "";

    card.innerHTML = `
      <div class="flex flex-col md:flex-row gap-6">
        <div class="w-full md:w-[280px] shrink-0 flex flex-col items-center gap-3">
          <div class="w-[240px] h-[160px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img src="${escapeHtml(firstSrc)}"
                 data-srcs='${escapeHtml(JSON.stringify(imgCandidates))}'
                 data-idx="0"
                 alt="${escapeHtml(name)}"
                 class="w-full h-full object-contain"
                 loading="lazy" decoding="async"
                 onerror="_nextImg(this)">
          </div>

          <div class="w-full">
            <div class="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">Polarities</div>
            ${polaritiesRow(c.Polarities)}
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <h2 class="text-xl font-semibold">${escapeHtml(name)}</h2>
              ${cats ? `<div class="mt-1 flex flex-wrap gap-2">${cats}</div>` : ""}
              ${desc ? `<p class="mt-3 text-[var(--muted)]">${desc}</p>` : ""}
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
            ${statBox("HP", c.Health)}
            ${statBox("SHIELD", c.Shield)}
            ${statBox("ARMOR", c.Armor)}
            ${statBox("ENERGY", c.Energy)}
            ${statBox("STAMINA", c.Stamina)}
          </div>

          ${attacksHtml}
        </div>
      </div>
    `;
  }

  /* ---------------- picker + search ---------------- */
  function renderPicker(arr){
    const picker = $("#picker");
    if (!picker) return;
    picker.innerHTML = "";
    arr.forEach((c, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = c.Name || c.name || "—";
      picker.appendChild(opt);
    });
    picker.value = "0";
  }

  /* ---------------- boot ---------------- */
  (async function boot(){
    const status = $("#status");
    try{
      if (status){
        status.textContent = "Chargement des companions…";
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      }

      const all = await loadLocalCompanions();
      if (!all.length){
        if (status){
          status.textContent = "Aucun compagnon trouvé dans data/companions.json.";
          status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
          status.style.background = "rgba(255,0,0,.08)";
          status.style.color = "#ffd1d1";
        }
        return;
      }

      // search + picker
      const search = $("#search");
      let filtered = all.slice();
      renderPicker(filtered);
      renderCard(filtered[0]);

      const update = ()=>{
        const q = norm(search ? search.value : "").toLowerCase();
        filtered = !q ? all.slice() : all.filter(c => (c.Name||"").toLowerCase().includes(q));
        renderPicker(filtered);
        if (filtered.length) renderCard(filtered[0]);
        if (status) status.textContent = `Affichage : ${filtered.length} résultat(s)`;
      };

      if (search) search.addEventListener("input", update);
      const picker = $("#picker");
      if (picker) picker.addEventListener("change", (e)=>{
        const idx = parseInt(e.target.value, 10);
        if (!filtered.length) return;
        renderCard(filtered[Math.min(Math.max(0, idx), filtered.length - 1)]);
      });

      if (status) status.textContent = `Companions chargés : ${all.length}`;
    }catch(e){
      console.error("[companions] ERREUR :", e);
      if (status){
        status.textContent = `Erreur de chargement : ${e.message || e}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    }
  })();

})();
