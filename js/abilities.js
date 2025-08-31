console.log("abilities.js chargé");

// === CONFIG
const ABILITIES_URL = "data/warframe_abilities.json";

// === État interne
const ABILITIES = { byFrame: {}, ready: null };

// utils
const norm = s => String(s || "").trim();

// variantes: Prime → base ; Umbra → Excalibur aussi
function variantFallbacks(name){
  if (!name) return [];
  const base = name.replace(/\s+Prime\b/i, "").trim();
  const list = [];
  if (name !== base) list.push(base);
  if (name === "Excalibur Umbra") list.push("Excalibur");
  return list;
}

// chargement + indexation
ABILITIES.ready = (async () => {
  try {
    const res = await fetch(ABILITIES_URL);
    const data = await res.json();
    ABILITIES.byFrame = data.reduce((acc, a) => {
      const key = norm(a.Powersuit || a.Warframe || a.Frame || a.name);
      if (!key) return acc;
      (acc[key] ??= []).push(a);
      return acc;
    }, {});
    // trier par slot si dispo
    for (const k in ABILITIES.byFrame) {
      ABILITIES.byFrame[k].sort((x,y)=> (x.SlotKey ?? 99) - (y.SlotKey ?? 99));
    }
  } catch (e) {
    console.error("Erreur abilities:", e);
    ABILITIES.byFrame = {};
  }
})();

// Umbra: compléter avec base et remplacer Radial Blind -> Radial Howl si besoin
function massageUmbra(list){
  if (!Array.isArray(list)) list = [];
  if (list.length >= 4) return list;
  const base = ABILITIES.byFrame["Excalibur"] || [];
  if (!base.length) return list;
  const merged = base.map(a => ({...a}));
  const umbraList = ABILITIES.byFrame["Excalibur Umbra"] || [];
  const howl = umbraList.find(x=>/Howl/i.test(x.Name || x.name));
  if (howl) {
    const i = merged.findIndex(x=>/Radial\s*Blind/i.test(x.Name || x.name));
    if (i>=0) merged[i] = {...howl, SlotKey: merged[i].SlotKey ?? howl.SlotKey};
  }
  return merged;
}

function getAbilitiesFor(frameName){
  const key = norm(frameName);
  let list = ABILITIES.byFrame[key];
  if (!list || !list.length){
    for (const alt of variantFallbacks(key)){
      if (ABILITIES.byFrame[alt]?.length){ list = ABILITIES.byFrame[alt]; break; }
    }
  }
  if (key === "Excalibur Umbra") list = massageUmbra(list);
  return (list || []).slice();
}

// coûts robustes (essaie plusieurs clés fréquentes)
function fmtCost(a){
  const name = (a.Name || a.name || "").trim();
  const costEnergy = a.Cost ?? a.EnergyCost ?? a.CostEnergy ?? a.energyCost;
  const costShield = a.CostShield ?? a.ShieldCost;
  const costTime   = a.CostTime ?? a.Duration ?? a.duration;

  if (costShield != null) return `${costShield} Bouclier`;
  if (costTime != null)   return `${costTime} Temps`;
  if (costEnergy != null) return `${costEnergy} Énergie`;
  return "—";
}
function cleanDesc(s){
  return (s || "").replace(/\\r?\\n/g,"<br>").replace(/<[^>]+>/g,"").trim();
}

function renderAbilitiesInto(container, frameName){
  const arr = getAbilitiesFor(frameName);
  if (!container) return;
  if (!arr.length){ container.innerHTML = `<p class="muted">Aucun pouvoir trouvé.</p>`; return; }
  container.innerHTML = `
    <h4 class="abilities-title">Pouvoirs</h4>
    <div class="abilities">
      ${arr.map(a => `
        <div class="ability">
          <div class="ability-head">
            <span class="slot">${a.SlotKey ?? ""}</span>
            <span class="name">${a.Name || a.name}</span>
            <span class="cost">${fmtCost(a)}</span>
          </div>
          <p class="desc">${cleanDesc(a.Description || a.description)}</p>
        </div>
      `).join("")}
    </div>`;
}

// expose global
window.ABILITIES = { ready: ABILITIES.ready, get: getAbilitiesFor, renderInto: renderAbilitiesInto };
