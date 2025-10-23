/*
 * Loadout Builder: script déporté.
 *
 * Ce fichier regroupe toute la logique JavaScript pour le builder de loadout Warframe.
 * Les données sont chargées depuis votre API Cephalon‑Wodan (warframes et mods) et
 * depuis les fichiers locaux (arcanes) pour assurer une liste riche et à jour.
 */

/* ==== SOURCES ==== */
const API_WF       = "https://cephalon-wodan-production.up.railway.app/warframes";
const API_MODS     = "https://cephalon-wodan-production.up.railway.app/mods";
const DATA_ARCANES = "data/arcanes_map.json";                 // dataset local (riche)

/* ==== HELPERS ==== */
const $ = (q) => document.querySelector(q);
const esc = (s)=> String(s||"").replace(/[&<>"']/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const fmt = (v)=> v==null?"—":(Number.isFinite(v)?String(v):String(v));

let STATE = {
  showR30: false,
  reactor: false,
  conditionals: false,
  warframes: [],
  mods: [],
  arcanes: [],
  current: null,
  // Niveau de rang (0-30). Détermine la capacité et l'interpolation des stats.
  rank: 30
};

/* ==== RENDER HEADER ==== */
function renderHeader(){
  const wf = STATE.current;
  $("#wfTitle").textContent = wf ? `NEW BUILD: ${wf.name}` : "NEW BUILD";
  $("#wfSubtitle").textContent = wf ? (wf.description || "") : "Sélectionnez une Warframe pour démarrer.";
  $("#wfImg").src = wf ? (`img/warframes/${wf.name.replace(/\s+/g,'')}.png`) : "";
}

/* ==== STATS ==== */
function statRow(k,v){
  return `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${esc(fmt(v))}</div></div>`;
}
function computeBaseStats(wf){
  const s0  = wf.baseStats || {};
  const s30 = wf.baseStatsRank30 || {};
  // Ratio d'interpolation basé sur le rang (0 à 30)
  const r    = STATE.rank || 0;
  const ratio = Math.max(0, Math.min(r, 30)) / 30;
  // helper pour interpoler un champ numérique entre rang 0 et 30
  function lerp(val0, val30){
    const v0 = Number(val0 ?? 0);
    const v30= Number(val30 ?? v0);
    return Math.round(v0 + (v30 - v0) * ratio);
  }
  // Stats de base interpolées
  const hp0   = s0.health ?? 0;
  const hp30  = s30.health ?? hp0;
  const hp    = lerp(hp0, hp30);
  const shield0 = (s0.shields ?? s0.shield ?? 0);
  const shield30= (s30.shields ?? s30.shield ?? shield0);
  const sh    = lerp(shield0, shield30);
  const armor0= s0.armor ?? 0;
  const armor30= s30.armor ?? armor0;
  const armor = lerp(armor0, armor30);
  const energy0= (s0.energy ?? s0.power ?? 0);
  const energy30 = (s30.energy ?? s30.power ?? energy0);
  const energy = lerp(energy0, energy30);
  const sprint0 = s0.sprintSpeed ?? 0;
  const sprint30 = s30.sprintSpeed ?? sprint0;
  const sprint = lerp(sprint0, sprint30);
  // Calcul EHP et DR
  const ehp    = Math.round(hp * (1 + armor/300) + sh);
  const dr     = armor ? Math.round(armor / (armor + 300) * 100) : null;
  // Capacité totale (rang * 1 ou *2 avec Reactor)
  const capTot = r * (STATE.reactor ? 2 : 1);
  return {
    CAPACITY: capTot || "—",
    ENERGY: energy || "—",
    HEALTH: hp || "—",
    SHIELD: sh || "—",
    "SPRINT SPEED": sprint || "—",
    DURATION: "100%",
    EFFICIENCY: "100%",
    RANGE: "100%",
    STRENGTH: "100%",
    ARMOR: armor || "—",
    "DAMAGE REDUCTION": dr != null ? dr + "%" : "—",
    "EFFECTIVE HIT POINTS": isFinite(ehp)? ehp : "—"
  };
}
function renderStats(){
  const box = $("#statsList");
  box.innerHTML = "";
  if(!STATE.current){ box.innerHTML = `<div class="muted">Aucune Warframe sélectionnée.</div>`; return; }
  const stats = computeBaseStats(STATE.current);
  Object.entries(stats).forEach(([k,v]) => box.insertAdjacentHTML("beforeend", statRow(k,v)));
  renderPolarities();
}
function polarityBadge(p){
  const nice = p.charAt(0).toUpperCase()+p.slice(1);
  return `<span class="chip ${p==='umbra'?'gold':''}">${esc(nice)}</span>`;
}
function renderPolarities(){
  const pols = [];
  const wf = STATE.current; if(!wf){ $("#polList").innerHTML=""; return; }
  if (wf.aura) pols.push("aura");
  if (wf.exilus) pols.push("exilus");
  (wf.polarities||[]).forEach(p=>pols.push(String(p).toLowerCase()));
  $("#polList").innerHTML = pols.length ? pols.map(polarityBadge).join(" ") : `<span class="muted small">—</span>`;
}

/* ==== CATALOG (mods + arcanes) ==== */
function renderCatalog(){
  const host = $("#modList");
  const q = $("#globalSearch").value.trim().toLowerCase();
  const pol = $("#fltPol").value;
  const typ = $("#fltType").value;
  const rar = $("#fltRarity").value;
  const sort = $("#fltSort").value;

  let list = STATE.mods.concat(STATE.arcanes.map(a => ({
    isArcane: true,
    name: a.Name,
    type: a.Type || "ARCANE",
    rarity: a.Rarity || "",
    cost: a.Cost || 0,
    art: a.ImageName ? `img/arcanes/${a.ImageName}` : "",
    text: a.Description || "",
    polarity: ""
  })));

  list = list.filter(x=>{
    if (q && !(x.name||"").toLowerCase().includes(q) && !(x.text||"").toLowerCase().includes(q)) return false;
    if (pol && String(x.polarity||"").toLowerCase() !== pol) return false;
    if (typ && String(x.type||"").toUpperCase() !== typ) return false;
    if (rar && String(x.rarity||"").toUpperCase() !== rar) return false;
    return true;
  });
  list.sort((a,b)=>{
    if (sort==="cost") return (a.cost||0)-(b.cost||0);
    if (sort==="rarity") return String(a.rarity||"").localeCompare(String(b.rarity||""));
    return String(a.name||"").localeCompare(String(b.name||""));
  });

  host.innerHTML = list.map(x=>`
    <div class="mod-card">
      <div class="mod-art">${x.art?`<img src="${esc(x.art)}" alt="">`:""}</div>
      <div class="mod-meta">
        <div class="mod-name">${esc(x.name||"—")}</div>
        <div class="small muted">${esc(x.isArcane ? "ARCANE" : (x.type||"MOD"))} • ${esc((x.rarity||"").toString())}${x.cost?` • Drain ${x.cost}`:""}</div>
        <div class="small">${esc((x.text||"").replace(/\s+/g," ").trim()).slice(0,160)}</div>
        <div class="inline small">
          ${x.polarity? `<span class="chip">${esc(x.polarity)}</span>` : ""}
          ${x.isArcane? `<span class="chip gold">Arcane</span>`: ""}
        </div>
      </div>
    </div>
  `).join("");
}

/* ==== DATA LOADING ==== */
async function loadAll(){
  // charge Warframes et Arcanes
  const [wfRes, arcRes] = await Promise.all([
    fetch(API_WF).then(r=>r.json()),
    fetch(DATA_ARCANES).then(r=>r.json())
  ]);
  STATE.warframes = (wfRes.entities || wfRes || []).filter(x=>String(x.type||"").toLowerCase()==="warframe");
  STATE.arcanes   = Array.isArray(arcRes)? arcRes : [];

  // charge mods depuis l’API Cephalon‑Wodan (plus complet que le JSON local)
  try{
    const modsRes = await fetch(API_MODS);
    if (modsRes.ok){
      const modsJson = await modsRes.json();
      STATE.mods = (modsJson || []).filter(m => m.type && /warframe/i.test(m.type)).map(m=>({
        name: m.name,
        type: m.type,
        rarity: m.rarity,
        cost: m.baseDrain,
        polarity: m.polarity ? m.polarity.toLowerCase() : "",
        text: (Array.isArray(m.levelStats) && m.levelStats.length)
          ? m.levelStats[m.levelStats.length - 1].stats.join(", ")
          : ""
      }));
    }
  }catch(e){
    console.error("Erreur de chargement des mods", e);
  }

  // initialise le picker
  const picker = $("#wfPicker");
  picker.innerHTML = STATE.warframes.map((w,i)=> `<option value="${i}">${esc(w.name)}</option>`).join("");
  if (STATE.warframes.length){
    STATE.current = STATE.warframes[0];
    renderHeader(); renderStats();
  }
  // synchroniser slider, label et toggle avec le rang initial
  const sld = document.getElementById("rankSlider");
  const vlab= document.getElementById("rankVal");
  const tog = document.getElementById("rankToggle");
  if(sld){ sld.value = String(STATE.rank); }
  if(vlab){ vlab.textContent = String(STATE.rank); }
  if(tog){ tog.checked = (STATE.rank >= 30); }
  renderCatalog();
}

/* ==== EVENTS ==== */
$("#wfPicker").addEventListener("change", e=>{
  const idx = parseInt(e.target.value,10);
  STATE.current = STATE.warframes[idx];
  renderHeader(); renderStats();
});
$("#rankToggle").addEventListener("change", e=>{
  STATE.showR30 = !!e.target.checked;
  // Si on bascule le toggle, ajuster également le slider de rang
  STATE.rank = STATE.showR30 ? 30 : 0;
  const slider = document.getElementById("rankSlider");
  const valLab = document.getElementById("rankVal");
  if(slider){ slider.value = STATE.rank; }
  if(valLab){ valLab.textContent = String(STATE.rank); }
  renderStats();
});
$("#reactor").addEventListener("change", e=>{ STATE.reactor = !!e.target.checked; /* hook coût/polarités plus tard */ });
$("#conditionals").addEventListener("change", e=>{ STATE.conditionals = !!e.target.checked; /* hook preview conditionnels plus tard */ });

["globalSearch","fltPol","fltType","fltRarity","fltGame","fltSort"].forEach(id=>{
  document.getElementById(id).addEventListener("input", renderCatalog);
  document.getElementById(id).addEventListener("change", renderCatalog);
});
$("#resetBuild").addEventListener("click", ()=>{
  document.querySelectorAll(".slot").forEach(el=> el.textContent = el.getAttribute("data-slot").toUpperCase());
  $("#globalSearch").value = "";
  renderCatalog();
});

// Slider de rang
const rankSlider = document.getElementById("rankSlider");
if(rankSlider){
  rankSlider.addEventListener("input", (e) => {
    const v = parseInt(e.target.value, 10);
    STATE.rank = isNaN(v) ? 0 : v;
    // Met à jour le label et le toggle si nécessaire
    const valLab = document.getElementById("rankVal");
    if(valLab){ valLab.textContent = String(STATE.rank); }
    // Synchronise le toggle si on atteint extrêmes
    const tog = document.getElementById("rankToggle");
    if(tog){ tog.checked = (STATE.rank >= 30); }
    renderStats();
  });
}

/* ==== BOOT ==== */
loadAll().catch(err=>{
  console.error(err);
  alert("Erreur de chargement des données.");
});
