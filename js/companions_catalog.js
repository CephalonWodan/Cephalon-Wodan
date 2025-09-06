// js/companions_catalog.js
// =====================================================
// Companions depuis data/companions.json (dump wiki)
// - Images: local img/companions/<file> (absolu) → cdn.warframestat.us/img/<file>
// - AUCUN fallback Fandom/Wiki
// - Nettoyage \r\n / \\r\\n / \\n dans les descriptions
// - Attaques affichées avec les stats
// =====================================================

(() => {
  "use strict";

  const DATA_URL = "data/companions.json";

  /* ---------- utils ---------- */
  const $  = (s) => document.querySelector(s);
  const norm = (v) => String(v ?? "").trim();
  const txt  = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byName = (a,b) => (a.Name||"").localeCompare(b.Name||"");

  function renderDesc(s) {
    if (!s) return "";
    let t = String(s);
    // nettoie toutes les variantes d'échappement
    t = t.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");
    t = t.replace(/\n{3,}/g, "\n\n");
    return escapeHtml(t).replace(/\n/g, "<br>");
  }

  /* ---------- Images ---------- */
  const LOCAL_COMP_BASE = new URL("img/companions/", document.baseURI).href;

  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#101a2e"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><rect x="14" y="14" width="612" height="332" rx="22" ry="22" fill="none" stroke="#3d4b63" stroke-width="3"/><text x="50%" y="52%" fill="#6b7b94" font-size="22" font-family="system-ui,Segoe UI,Roboto" text-anchor="middle">No Image</text></svg>');

  function fileCandidates(item) {
    const set = new Set();
    const push = (v) => { v = norm(v); if (v) set.add(v.replace(/^.*[\\/]/, "")); }; // garde seulement le nom de fichier
    push(item.Image);
    push(item.SquadPortrait);
    push(item.Icon);
    const name = norm(item.Name);
    if (name) push(name.replace(/\s+/g, "") + ".png");
    return Array.from(set);
  }

  function expandNameVariants(file) {
    const list = new Set();
    const base = file.replace(/^.*[\\/]/, "");
    const variants = [
      base,
      base.replace(/\s+/g, ""),
      base.toLowerCase(),
      base.replace(/\s+/g, "").toLowerCase()
    ];
    for (const v of variants) {
      list.add(v);
      if (/\.png$/i.test(v)) list.add(v.replace(/\.png$/i, ".webp"));
    }
    return Array.from(list);
  }

  function imageCandidates(item) {
    const files = fileCandidates(item).flatMap(expandNameVariants);
    const out = [];
    for (const f of files) {
      const enc = encodeURIComponent(f);
      out.push(LOCAL_COMP_BASE + enc);                       // chemin ABSOLU local
      out.push(`https://cdn.warframestat.us/img/${enc}`);    // CDN WarframeStat
    }
    // déduplique tout en gardant l'ordre
    return out.filter((v, i, a) => a.indexOf(v) === i);
  }

  function attachImgWithFallbacks(img, item) {
    const list = imageCandidates(item);
    const tryNext = () => {
      if (!list.length) { img.onerror = null; img.src = PLACEHOLDER; return; }
      img.src = list.shift();
    };
    img.onerror = tryNext;
    tryNext();
  }

  /* ---------- Attaques ---------- */
  function pct(x) {
    if (x === undefined || x === null || x === "") return "—";
    const n = Number(x);
    if (Number.isNaN(n)) return "—";
    if (n > 1) return `${Math.round(n)}%`;
    return `${Math.round(n * 100)}%`;
  }
  function damageTotal(a) {
    if (Number.isFinite(a.TotalDamage) && a.TotalDamage > 0) return a.TotalDamage;
    const d = a.Damage || {};
    return Object.values(d).reduce((s, v) => s + (Number(v) || 0), 0);
  }
  function formatAttackLine(a) {
    const name = norm(a.AttackName) || "Attack";
    const dmg = damageTotal(a);
    const cc  = pct(a.CritChance);
    const cm  = (a.CritMultiplier ? `×${a.CritMultiplier}` : "×—");
    const sc  = pct(a.StatusChance);
    return `• ${escapeHtml(name)} — Dégâts ${escapeHtml(txt(dmg))} · Crit ${escapeHtml(cc)} ${escapeHtml(cm)} · Statut ${escapeHtml(sc)}`;
  }

  /* ---------- Rendu ---------- */
  const STATE = { all: [], filtered: [], page: 1, perPage: 12, q: "" };

  function statsPanel(item) {
    const rows = [
      ["Armor",  item.Armor],
      ["Health", item.Health],
      ["Shield", item.Shield],
      ["Energy", item.Energy],
    ];
    const attacks = Array.isArray(item.Attacks) ? item.Attacks : [];
    const attHtml = attacks.length
      ? `<div class="my-2 h-px bg-[rgba(255,255,255,.08)]"></div>
         <div class="text-[10px] uppercase tracking-wide muted mb-1">Attaques</div>
         ${attacks.map(a => `<div class="py-0.5">${formatAttackLine(a)}</div>`).join("")}`
      : "";

    return `
      <div class="bg-[var(--panel-2)] rounded-xl p-3 border border-[rgba(255,255,255,.08)]">
        ${rows.map(([k,v]) => `
          <div class="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,.06)] last:border-0">
            <div class="text-sm">${escapeHtml(k)}</div>
            <div class="font-medium">${escapeHtml(txt(v))}</div>
          </div>`).join("")}
        ${attHtml}
      </div>`;
  }

  function card(item) {
    const cat = norm(item.Category);
    const type = norm(item.Type);
    const desc = renderDesc(item.Description || "");

    const el = document.createElement("div");
    el.className = "card p-4";
    el.innerHTML = `
      <div class="flex gap-4">
        <div class="w-[260px] shrink-0">
          <div class="w-full h-[180px] rounded-2xl overflow-hidden bg-[var(--panel-2)] border orn flex items-center justify-center">
            <img class="w-full h-full object-contain" alt="${escapeHtml(item.Name || "")}">
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold">${escapeHtml(item.Name || "—")}</div>
          <div class="mt-1 text-[var(--muted)]">${escapeHtml(cat)} ${escapeHtml(type)}</div>
          ${desc ? `<p class="mt-3">${desc}</p>` : ""}
          <div class="mt-3">${statsPanel(item)}</div>
        </div>
      </div>`;
    const img = el.querySelector("img");
    attachImgWithFallbacks(img, item);
    return el;
  }

  function render() {
    const per = STATE.perPage;
    const total = STATE.filtered.length;
    const pages = Math.max(1, Math.ceil(total / per));
    const page = Math.min(Math.max(1, STATE.page), pages);
    STATE.page = page;

    const grid = $("#results") || $("#card");
    grid.className = "grid gap-4 grid-cols-1";
    grid.innerHTML = "";
    const start = (page - 1) * per;
    STATE.filtered.slice(start, start + per).forEach(it => grid.appendChild(card(it)));
  }

  function apply() {
    const q = STATE.q = norm($("#q")?.value || $("#search")?.value || "").toLowerCase();
    let arr = STATE.all.slice();
    if (q) {
      arr = arr.filter(it => {
        const hay = [it.Name, it.Description, it.Category, it.Type].map(norm).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    STATE.filtered = arr.sort(byName);
    STATE.page = 1;
    render();
  }

  async function fetchJson(url){
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
    return r.json();
  }

  (async function boot(){
    const status = $("#status");
    try {
      const raw = await fetchJson(DATA_URL);
      const list = (() => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === "object" && raw.Companions) {
          const obj = raw.Companions;
          return Array.isArray(obj) ? obj : Object.values(obj);
        }
        if (raw && typeof raw === "object") return Object.values(raw);
        return [];
      })();
      STATE.all = list.sort(byName);

      $("#q")?.addEventListener("input", ()=>{ STATE.page=1; apply(); });
      $("#search")?.addEventListener("input", ()=>{ STATE.page=1; apply(); });

      if (status) {
        status.textContent = `Chargé : ${STATE.all.length} compagnons`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
        status.style.background = "rgba(0,229,255,.08)";
        status.style.color = "#bfefff";
      }
      apply();
    } catch (e) {
      console.error("[companions] boot error:", e);
      if (status) {
        status.textContent = `Erreur de chargement : ${e.message || e}`;
        status.className = "mb-4 text-sm px-3 py-2 rounded-lg";
        status.style.background = "rgba(255,0,0,.08)";
        status.style.color = "#ffd1d1";
      }
    }
  })();

})();
