// js/app_common.js
// Charge les datasets communs + prépare la Warframe courante + liens d'onglets (pages)

const CFG = {
  WF_URL: "https://api.warframestat.us/warframes?language=fr",
  ABILITIES_VALUES_URL: "data/abilities.json",
  ABILITIES_BY_WF_URL: "data/abilities_by_warframe.json",
  ABILITIES_META_URL: "data/warframe_abilities.json",
  // 🔗 Mods depuis l’API officielle (gros JSON)
  ALL_MODS_URL: "https://api.warframestat.us/mods/?language=en",

  // Ces fichiers restent optionnels pour d’autres pages (shards, weapons…)
  ARCANES_BY_WF_URL: "data/arcanes_by_warframe.json",
  SHARDS_BY_WF_URL: "data/archon_shards_by_warframe.json",
  WEAPONS_BY_WF_URL: "data/weapons_by_warframe.json",
};

const txt  = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (s) => String(s || "").trim();
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
const bySlot = (a, b) => (a.SlotKey ?? 99) - (b.SlotKey ?? 99);

function variantFallbacks(name) {
  if (!name) return [];
  const base = name.replace(/\s+Prime\b/i, "").replace(/\s+Umbra\b/i, "").trim();
  const list = [];
  if (name !== base) list.push(base);
  if (/^Excalibur Umbra$/i.test(name)) list.push("Excalibur");
  return list;
}
function baseFrame(name) {
  return (name || "").replace(/\s+Prime\b/i, "").replace(/\s+Umbra\b/i, "").trim();
}

function getQuery(name, def = "") {
  const u = new URL(location.href);
  return u.searchParams.get(name) || def;
}
function setQuery(nextFrame) {
  const u = new URL(location.href);
  u.searchParams.set("frame", nextFrame);
  location.href = u.toString();
}
function pageFor(key) {
  switch (key) {
    case "apt": return "index.html";
    case "mods": return "mods.html";
    case "arcanes": return "arcanes.html";
    case "shards": return "shards.html";
    case "weapons": return "weapons.html";
    default: return "index.html";
  }
}

// ------- Détection / helpers MODS (depuis l’API)
function isWarframeMod(m) {
  const t = m.type || "";
  const u = m.uniqueName || "";
  return /warframe/i.test(t) || /\/Mods\/Warframe\//i.test(u);
}
function isAura(m) {
  const t = m.type || "";
  const u = m.uniqueName || "";
  return /aura/i.test(t) || /\/Mods\/Auras?\//i.test(u);
}
function isExilus(m) {
  // warframe-items expose souvent isUtility pour Exilus
  if (m.isUtility === true) return true;
  // fallback : certains objets portent un tag/description exilus
  if (Array.isArray(m.tags) && m.tags.some(x => /exilus/i.test(x))) return true;
  if (/exilus/i.test(m.description || "")) return true;
  return false;
}
function isAugmentForFrame(m, frameName) {
  const compat = norm(m.compatName);
  if (compat && baseFrame(compat).toLowerCase() === baseFrame(frameName).toLowerCase()) return true;
  // Quelques anciens enregistrements n’ont pas compatName : heuristique
  if (/augment/i.test(m.description || "")) {
    const b = baseFrame(frameName);
    if (b && new RegExp(`\\b${b}\\b`, "i").test(m.description || "")) return true;
  }
  return false;
}

async function loadAll() {
  const status = document.getElementById("status");
  status.textContent = "Chargement des données…";

  const [
    wfRaw, valsRaw, byWfRaw, metaRaw,
    modsRaw, arcanesRaw, shardsRaw, weaponsRaw
  ] = await Promise.all([
    fetch(CFG.WF_URL).then(r=>r.json()),
    fetch(CFG.ABILITIES_VALUES_URL).then(r=>r.json()),
    fetch(CFG.ABILITIES_BY_WF_URL).then(r=>r.json()).catch(()=> ({})),
    fetch(CFG.ABILITIES_META_URL).then(r=>r.json()),
    // ⚠️ gros payload (plusieurs Mo)
    fetch(CFG.ALL_MODS_URL).then(r=>r.json()).catch(()=> []),
    fetch(CFG.ARCANES_BY_WF_URL).then(r=>r.json()).catch(()=> ({})),
    fetch(CFG.SHARDS_BY_WF_URL).then(r=>r.json()).catch(()=> ({})),
    fetch(CFG.WEAPONS_BY_WF_URL).then(r=>r.json()).catch(()=> ({})),
  ]);

  // --- liste Warframes
  const list = wfRaw
    .filter((wf) => wf.type === "Warframe" && !["Bonewidow","Voidrig"].includes(wf.name))
    .map((rec) => {
      const img = rec.imageName ? `https://cdn.warframestat.us/img/${rec.imageName}` : null;
      const isPrime = /\bPrime\b/i.test(rec.name || "");
      const slots = isPrime ? (rec.prime_polarities ?? rec.polarities ?? []) : (rec.polarities ?? []);
      const aura  = isPrime ? (rec.prime_aura ?? rec.aura ?? null) : (rec.aura ?? null);
      const exilus = rec.exilus ?? null;
      const exilusPolarity = rec.exilusPolarity ?? rec.exilus_polarity ?? null;
      return {
        name: rec.name || "",
        description: rec.description || "",
        image: img,
        stats: {
          health: rec.health ?? "—",
          shield: rec.shield ?? "—",
          armor: rec.armor ?? "—",
          energy: rec.power ?? rec.energy ?? "—",
          sprintSpeed: rec.sprintSpeed ?? "—",
        },
        polarities: { slots, aura, exilus, exilusPolarity },
        // placeholders pour autres pages
        arcanes: (arcanesRaw || {})[rec.name] || [],
        shards:  (shardsRaw  || {})[rec.name] || [],
        weapons: (weaponsRaw || {})[rec.name] || [],
      };
    })
    .sort(byName);

  // --- META pour aptitudes
  const metaByFrame = metaRaw.reduce((acc, m) => {
    const k = norm(m.Powersuit);
    if (!k) return acc;
    (acc[k] ??= []).push(m);
    return acc;
  }, {});
  for (const k in metaByFrame) metaByFrame[k].sort(bySlot);

  // index pour abilities.json
  const vals = valsRaw;
  function findValuesForInternal(internalName) {
    const cands = vals.filter((v) => v.path.startsWith(internalName));
    if (!cands.length) return null;
    cands.sort((a, b) => b.path.length - a.path.length);
    return cands[0];
  }
  function abilitiesForFrame(frameName) {
    let meta = metaByFrame[frameName];
    if (!meta?.length) {
      for (const alt of variantFallbacks(frameName)) {
        if (metaByFrame[alt]?.length) { meta = metaByFrame[alt]; break; }
      }
    }
    if (!meta?.length) {
      const names = (byWfRaw || {})[frameName] || [];
      return names.map((n, i) => ({
        slot: i + 1,
        name: n,
        description: "",
        internal: null,
        summary: { costEnergy: null, strength: null, duration: null, range: null, affectedBy: [] },
        rows: [],
      }));
    }
    return meta.map((m) => {
      const values = findValuesForInternal(m.InternalName) || null;
      const sum = (values && values.summary) || {};
      return {
        slot: m.SlotKey ?? null,
        name: m.Name || m.AbilityKey || "—",
        description: m.Description || "",
        internal: m.InternalName,
        summary: {
          costEnergy: m.Cost ?? sum.costEnergy ?? null,
          strength: sum.strength ?? null,
          duration: sum.duration ?? null,
          range: sum.range ?? null,
          affectedBy: Array.isArray(sum.affectedBy) ? sum.affectedBy : [],
        },
        rows: (values && values.rows) || [],
      };
    }).sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
  }

  // ------- Prépare un index rapide des MODS pour la page mods.html
  const allMods = Array.isArray(modsRaw) ? modsRaw : [];
  function modsForFrame(frameName) {
    const base = baseFrame(frameName);
    const augments = allMods.filter(m => isWarframeMod(m) && isAugmentForFrame(m, base));
    const auras    = allMods.filter(m => isAura(m));
    const exilus   = allMods.filter(m => isWarframeMod(m) && isExilus(m) && !isAugmentForFrame(m, base));
    const generals = allMods.filter(m =>
      isWarframeMod(m) &&
      !isAura(m) &&
      !isExilus(m) &&
      !isAugmentForFrame(m, base)
    );
    return { augments, auras, exilus, generals };
  }

  return { list, abilitiesForFrame, modsForFrame, allMods };
}

function renderVtabs(frameName, activeKey) {
  const host = document.getElementById("vtabs");
  if (!host) return;
  const enc = encodeURIComponent(frameName);
  const tabs = [
    { key:"apt",     label:"Aptitudes"    , href:`${pageFor("apt")}?frame=${enc}` },
    { key:"mods",    label:"MODs"         , href:`${pageFor("mods")}?frame=${enc}` },
    { key:"arcanes", label:"Arcanes"      , href:`${pageFor("arcanes")}?frame=${enc}` },
    { key:"shards",  label:"Archon Shards", href:`${pageFor("shards")}?frame=${enc}` },
    { key:"weapons", label:"Weapons"      , href:`${pageFor("weapons")}?frame=${enc}` },
  ];
  host.innerHTML = `
    <div class="vtab-col">
      ${tabs.map(t =>
        `<a class="btn-tab vtab ${t.key===activeKey?"active":""}" href="${t.href}">
           ${t.label}
         </a>`).join("")}
    </div>`;
}

function setupPicker(list, activeKey, currentName) {
  const picker = document.getElementById("picker");
  const search = document.getElementById("search");
  const status = document.getElementById("status");

  picker.innerHTML = "";
  list.forEach((wf) => {
    const opt = document.createElement("option");
    opt.value = wf.name;
    opt.textContent = wf.name;
    picker.appendChild(opt);
  });
  picker.value = currentName;

  picker.addEventListener("change", (e) => setQuery(e.target.value));

  search.addEventListener("input", () => {
    const q = norm(search.value).toLowerCase();
    const filtered = !q ? list : list.filter((x) => x.name.toLowerCase().includes(q));
    picker.innerHTML = "";
    filtered.forEach((wf) => {
      const opt = document.createElement("option");
      opt.value = wf.name;
      opt.textContent = wf.name;
      picker.appendChild(opt);
    });
    status.textContent = `Affichage : ${filtered.length} résultat(s)`;
  });
}

window.WFApp = {
  txt, norm,
  init: async (activeKey, renderFn) => {
    const { list, abilitiesForFrame, modsForFrame, allMods } = await loadAll();
    const status = document.getElementById("status");
    status.textContent = `Dataset chargé : ${list.length} Warframes`;

    const nameFromURL = getQuery("frame", list[0]?.name || "");
    const current = list.find(x => x.name === nameFromURL) || list[0];

    renderVtabs(current.name, activeKey);
    setupPicker(list, activeKey, current.name);

    await renderFn({ list, current, abilitiesForFrame, modsForFrame, allMods });
  }
};
