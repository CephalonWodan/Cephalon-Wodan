// js/app_common.js
// Charge les données, gère la Warframe courante & les onglets (liens vers pages)

const CFG = {
  WF_URL: "https://api.warframestat.us/warframes",
  ABILITIES_VALUES_URL: "data/abilities.json",
  ABILITIES_BY_WF_URL: "data/abilities_by_warframe.json",
  ABILITIES_META_URL: "data/warframe_abilities.json",
  MODS_BY_WF_URL: "data/mods_by_warframe.json",
  ARCANES_BY_WF_URL: "data/arcanes_by_warframe.json",
  SHARDS_BY_WF_URL: "data/archon_shards_by_warframe.json",
  WEAPONS_BY_WF_URL: "data/weapons_by_warframe.json",
};

const txt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (s) => String(s || "").trim();
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
const bySlot = (a, b) => (a.SlotKey ?? 99) - (b.SlotKey ?? 99);

function variantFallbacks(name) {
  if (!name) return [];
  const base = name.replace(/\s+Prime\b/i, "").trim();
  const list = [];
  if (name !== base) list.push(base);
  if (name === "Excalibur Umbra") list.push("Excalibur");
  return list;
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
    fetch(CFG.MODS_BY_WF_URL).then(r=>r.json()).catch(()=> ({})),
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
        mods: (modsRaw || {})[rec.name] || [],
        arcanes: (arcanesRaw || {})[rec.name] || [],
        shards: (shardsRaw || {})[rec.name] || [],
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

  return { list, abilitiesForFrame };
}

function renderVtabs(frameName, activeKey) {
  const host = document.getElementById("vtabs");
  if (!host) return;
  const enc = encodeURIComponent(frameName);
  const tabs = [
    { key:"apt", label:"Aptitudes"   , href:`${pageFor("apt")}?frame=${enc}` },
    { key:"mods", label:"MOD"        , href:`${pageFor("mods")}?frame=${enc}` },
    { key:"arcanes", label:"Arcanes" , href:`${pageFor("arcanes")}?frame=${enc}` },
    { key:"shards", label:"Archon Shards", href:`${pageFor("shards")}?frame=${enc}` },
    { key:"weapons", label:"Weapons" , href:`${pageFor("weapons")}?frame=${enc}` },
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

  // options
  picker.innerHTML = "";
  list.forEach((wf, i) => {
    const opt = document.createElement("option");
    opt.value = wf.name;
    opt.textContent = wf.name;
    picker.appendChild(opt);
  });
  picker.value = currentName;

  // change -> navigue vers même page avec ?frame=
  picker.addEventListener("change", (e) => {
    setQuery(e.target.value);
  });

  // recherche -> filtre la liste + remet le picker
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
    const { list, abilitiesForFrame } = await loadAll();
    const status = document.getElementById("status");
    status.textContent = `Dataset chargé : ${list.length} Warframes`;

    const nameFromURL = getQuery("frame", list[0]?.name || "");
    const current = list.find(x => x.name === nameFromURL) || list[0];

    renderVtabs(current.name, activeKey);
    setupPicker(list, activeKey, current.name);

    // callback page spécifique
    await renderFn({ list, current, abilitiesForFrame });
  }
};
