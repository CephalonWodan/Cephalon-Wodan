/* js/app.js — build carte + détails des pouvoirs depuis tes 3 JSON */

(() => {
  /* =========================
     CONFIG
  ========================= */
  const URLS = {
    wf:     (typeof WF_URL !== "undefined" && WF_URL) || "https://api.warframestat.us/warframes",
    ab:     (typeof ABILITIES_URL !== "undefined" && ABILITIES_URL) || "data/abilities.json",
    byWf:   "data/abilities_by_warframe.json",
    wfAb:   "data/warframe_abilities.json",
  };

  /* =========================
     Utils
  ========================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const h = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  };

  const norm = (s) => String(s || "").trim();
  const val = (x) => (x === null || x === undefined || x === "" ? "—" : String(x));

  const baseName = (name) => norm(name).replace(/\s+Prime\b/i, "");
  const variantFallbacks = (name) => {
    if (!name) return [];
    const list = [];
    const base = baseName(name);
    if (name !== base) list.push(base);
    if (name === "Excalibur Umbra") list.push("Excalibur");
    return list;
  };

  const byName = (a, b) => (a.name || "").localeCompare(b.name || "");

  const splitByColon = (s) => {
    // "Label: 123 m" -> ["Label", "123 m"]
    const i = s.indexOf(":");
    if (i >= 0) return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
    return [s.trim(), ""];
  };

  const fillPlaceholders = (label, row) => {
    // Remplace |val1| ... |val9| par les valeurs correspondantes dans row
    if (!label) return "";
    return label.replace(/\|val(\d+)\|/g, (_, n) => {
      const k1 = "val" + n;
      const k2 = "v" + n;
      const v = row[k1] ?? row[k2];
      return v == null ? "—" : String(v);
    });
  };

  /* =========================
     Indexation abilities.json
  ========================= */
  function indexAbilities(abilities) {
    // Retourne :
    // {
    //   byFrame: { "Gauss": [ {name, slot, desc, rows:[{left,right}] , affected: {strength,range,duration,efficiency} }, ... ] },
    //   byKey:   { "Gauss::Mach Rush": <same object>, ... }
    // }
    const out = { byFrame: {}, byKey: {} };

    const push = (frame, obj) => {
      if (!out.byFrame[frame]) out.byFrame[frame] = [];
      out.byFrame[frame].push(obj);
      out.byKey[`${frame}::${obj.name}`] = obj;
    };

    for (const a of Array.isArray(abilities) ? abilities : []) {
      const frame =
        norm(a.Powersuit || a.Warframe || a.Frame || a.frame || a.warframe);
      const name = norm(a.Ability || a.Name || a.name);
      if (!frame || !name) continue;

      const slot =
        a.SlotKey ?? a.slot ?? a.Index ?? a.index ?? a.Slot ?? undefined;

      // description si dispo (certains exports l’ont)
      const desc = norm(a.Description || a.description || "");

      // “affected by” : booléens ou liste -> on normalise
      const affList =
        a.AffectedBy ||
        a.affects ||
        a.ScalesWith ||
        a.scales ||
        a.Modifiers ||
        [];
      const aff = Array.isArray(affList)
        ? {
            strength: affList.some((x) => /strength/i.test(x)),
            range: affList.some((x) => /range/i.test(x)),
            duration: affList.some((x) => /duration/i.test(x)),
            efficiency: affList.some((x) => /efficien/i.test(x)),
          }
        : {
            strength: !!(a.aff?.strength || a.strength),
            range: !!(a.aff?.range || a.range),
            duration: !!(a.aff?.duration || a.duration),
            efficiency: !!(a.aff?.efficiency || a.efficiency),
          };

      // lignes de détails : on tente toutes les variantes
      const rawRows =
        a.rows ||
        a.details ||
        a.Details ||
        a.stats ||
        a.Stats ||
        a.lines ||
        [];

      const rows = [];
      for (const r of Array.isArray(rawRows) ? rawRows : []) {
        if (typeof r === "string") {
          const [left, right] = splitByColon(r);
          rows.push({ left, right });
          continue;
        }
        // objet : on choisit la meilleure “étiquette”
        const label =
          r.filledLabel || r.filled || r.final || r.label || r.Label || "";
        const finalLabel = label
          ? label
          : r.label || r.Label
          ? fillPlaceholders(r.label || r.Label, r)
          : "";

        if (finalLabel) {
          const [left, right] = splitByColon(finalLabel);
          rows.push({ left, right });
        } else if (r.name && (r.value != null || r.val != null)) {
          const right = "" + (r.value ?? r.val ?? "");
          rows.push({ left: String(r.name), right });
        }
      }

      const obj = { name, slot, desc, rows, affected: aff };
      push(frame, obj);
    }

    // tri par slot si dispo
    for (const k in out.byFrame) {
      out.byFrame[k].sort((x, y) => (x.slot ?? 99) - (y.slot ?? 99));
    }
    return out;
  }

  /* =========================
     Mapping “abilities_by_warframe”
  ========================= */
  function indexByWarframeMap(raw) {
    // On retourne { "Gauss": ["Mach Rush","Kinetic Plating",...], ... }
    const out = {};
    for (const it of Array.isArray(raw) ? raw : []) {
      const k =
        norm(it.Warframe || it.Powersuit || it.Frame || it.name || it.wf) || "";
      if (!k) continue;
      const list =
        it.Abilities ||
        it.abilities ||
        it.powers ||
        it.list ||
        it.names ||
        [];
      out[k] = list.map((x) => norm(x.Name || x.name || x));
    }
    return out;
  }

  /* =========================
     Fallback “warframe_abilities.json”
     (format souvent {Powersuit, Name, SlotKey, Description})
  ========================= */
  function indexLegacyWFAbilities(raw) {
    // { "Gauss": [ {name, slot, desc} ... ] }
    const map = {};
    for (const a of Array.isArray(raw) ? raw : []) {
      const frame = norm(a.Powersuit || a.Warframe || a.Frame || a.warframe);
      const name = norm(a.Name || a.name);
      if (!frame || !name) continue;
      const slot = a.SlotKey ?? a.slot ?? undefined;
      const desc = norm(a.Description || a.description || "");
      (map[frame] ??= []).push({ name, slot, desc, rows: [], affected: {} });
    }
    for (const k in map) {
      map[k].sort((x, y) => (x.slot ?? 99) - (y.slot ?? 99));
    }
    return map;
  }

  /* =========================
     Fusion abilities (précises) + legacy + mapping
  ========================= */
  function assembleFrameAbilities({
    abilitiesIndexed, // {byFrame, byKey}
    byWfNames,        // {frame: [abilityName, ...]}
    legacy,           // {frame: [{name,slot,desc}]}
  }) {
    // On retourne { "Gauss": [abilityObj enrichi], ... }
    const out = {};

    const frames = new Set([
      ...Object.keys(abilitiesIndexed.byFrame || {}),
      ...Object.keys(byWfNames || {}),
      ...Object.keys(legacy || {}),
    ]);

    for (const frame of frames) {
      const variants = [frame, ...variantFallbacks(frame)];
      let list = [];

      // 1) si on a un ordre officiel (byWfNames), on prend dans cet ordre
      if (byWfNames[frame]) {
        for (const nm of byWfNames[frame]) {
          // on cherche d’abord version détaillée
          let found =
            abilitiesIndexed.byKey[`${frame}::${nm}`] ||
            abilitiesIndexed.byKey[`${variants[1] || ""}::${nm}`] ||
            abilitiesIndexed.byKey[`${variants[2] || ""}::${nm}`];
          // sinon on prend legacy si dispo
          if (!found) {
            const cand =
              (legacy[frame] || []).find((x) => x.name === nm) ||
              (legacy[variants[1]] || []).find((x) => x.name === nm) ||
              (legacy[variants[2]] || []).find((x) => x.name === nm);
            if (cand) found = cand;
          }
          if (found) list.push(found);
        }
      }

      // 2) sinon, on prend ce qu’on a côté “abilities.json”
      if (!list.length) {
        for (const v of variants) {
          if (abilitiesIndexed.byFrame[v]?.length) {
            list = abilitiesIndexed.byFrame[v].slice();
            break;
          }
        }
      }

      // 3) encore rien ? legacy
      if (!list.length) {
        for (const v of variants) {
          if (legacy[v]?.length) {
            list = legacy[v].slice();
            break;
          }
        }
      }

      // Traitement Umbra : remplace Radial Blind par Radial Howl si présent
      if (frame === "Excalibur Umbra" && list.length) {
        const base = abilitiesIndexed.byFrame["Excalibur"] || [];
        const howl =
          abilitiesIndexed.byKey["Excalibur Umbra::Radial Howl"] ||
          base.find((x) => /howl/i.test(x.name));
        if (howl) {
          const i = list.findIndex((x) => /Radial\s*Blind/i.test(x.name));
          if (i >= 0) list[i] = { ...howl, slot: list[i].slot ?? howl.slot };
        }
      }

      if (list.length) out[frame] = list;
    }

    // Tri par slot par sécurité
    for (const k in out) out[k].sort((x, y) => (x.slot ?? 99) - (y.slot ?? 99));
    return out;
  }

  /* =========================
     Rendu UI
  ========================= */
  const statusEl = $("#status");
  const pickerEl = $("#picker");
  const searchEl = $("#search");
  const cardEl = $("#card");

  function setStatus(ok, msg) {
    statusEl.textContent = msg;
    if (ok) {
      statusEl.style.background = "rgba(0,229,255,.08)";
      statusEl.style.color = "#bfefff";
      statusEl.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
    } else {
      statusEl.style.background = "rgba(255,64,64,.1)";
      statusEl.style.color = "#ffd0d0";
      statusEl.className = "mb-4 text-sm px-3 py-2 rounded-lg orn";
    }
  }

  function stat(label, v) {
    return `
      <div class="stat">
        <div class="label">${label}</div>
        <div class="value">${val(v)}</div>
      </div>`;
  }

  function renderDetailsTable(rows) {
    if (!rows || !rows.length) {
      return h("div", { class: "text-[var(--muted)]" }, ["Aucun détail."]);
    }
    const box = h("div", { class: "card p-0 overflow-hidden" });
    const table = h("table", { class: "w-full text-sm" });
    const tb = h("tbody");
    for (const r of rows) {
      const tr = h("tr", { class: "border-b border-[rgba(230,210,142,.18)]" });
      tr.appendChild(
        h("td", { class: "px-4 py-2 text-[var(--muted)]" }, [r.left || ""])
      );
      tr.appendChild(
        h("td", { class: "px-4 py-2 text-right" }, [r.right || ""])
      );
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    box.appendChild(table);
    return box;
  }

  function renderCard(wf, abilitiesByFrame, abilityIndex = 0) {
    cardEl.innerHTML = "";

    const abilities = abilitiesByFrame[wf.name] || [];

    const header = h("div", { class: "flex flex-col md:flex-row gap-6" }, [
      // image
      h("div", { class: "w-full md:w-[260px] shrink-0 flex flex-col items-center gap-2" }, [
        h(
          "div",
          {
            class:
              "w-[220px] h-[220px] rounded-2xl overflow-hidden wf-img flex items-center justify-center",
          },
          [
            wf.image
              ? h("img", {
                  src: wf.image,
                  alt: wf.name,
                  class: "w-full h-full object-contain",
                })
              : h("div", { class: "muted" }, ["Aucune image"]),
          ]
        ),
      ]),
      // texte + stats
      h("div", { class: "flex-1 flex flex-col gap-4" }, [
        h("div", { class: "flex items-start gap-4" }, [
          h("div", { class: "min-w-0 flex-1" }, [
            h("h2", { class: "text-xl font-semibold" }, [wf.name]),
            wf.description
              ? h("p", { class: "muted mt-2" }, [wf.description])
              : null,
          ]),
        ]),
        h("div", { class: "grid grid-cols-5 gap-3" }, [
          h("div", { html: stat("HP", wf.stats.health) }),
          h("div", { html: stat("SHIELD", wf.stats.shield) }),
          h("div", { html: stat("ARMOR", wf.stats.armor) }),
          h("div", { html: stat("ENERGY", wf.stats.energy) }),
          h("div", { html: stat("SPRINT", wf.stats.sprintSpeed) }),
        ]),
      ]),
    ]);

    const tabs =
      abilities.length &&
      h(
        "div",
        { class: "flex flex-wrap gap-2 my-4" },
        abilities.map((ab, i) =>
          h(
            "button",
            {
              type: "button",
              class: "btn-tab " + (i === abilityIndex ? "active" : ""),
              "data-abi": String(i),
            },
            [`${i + 1}. ${ab.name}`]
          )
        )
      );

    const a = abilities[abilityIndex];

    const detailsCard = h("div", { class: "card p-4" }, [
      h("div", { class: "font-semibold" }, [a ? a.name : "—"]),
      a?.desc ? h("p", { class: "muted mt-1" }, [a.desc]) : null,

      // tags “affecté par”
      (() => {
        if (!a || !a.affected) return null;
        const chips = [];
        if (a.affected.strength) chips.push("Force");
        if (a.affected.duration) chips.push("Durée");
        if (a.affected.range) chips.push("Portée");
        if (a.affected.efficiency) chips.push("Efficacité");
        if (!chips.length) return null;
        return h(
          "div",
          { class: "mt-3" },
          [
            h("div", { class: "text-xs mb-1 muted" }, ["Affecté par :"]),
            h(
              "div",
              { class: "flex flex-wrap gap-2" },
              chips.map((c) =>
                h(
                  "span",
                  {
                    class:
                      "px-2 py-[2px] rounded-full text-xs border border-[rgba(230,210,142,.45)]",
                  },
                  [c]
                )
              )
            ),
          ]
        );
      })(),

      // Détails (table)
      h("div", { class: "mt-4" }, [renderDetailsTable(a?.rows || [])]),
    ]);

    const wrap = h("div", { class: "card p-5" }, [header, tabs, detailsCard]);
    cardEl.appendChild(wrap);

    // events tabs
    if (tabs) {
      tabs.querySelectorAll("[data-abi]").forEach((btn) => {
        btn.addEventListener("click", () =>
          renderCard(wf, abilitiesByFrame, parseInt(btn.dataset.abi || "0", 10))
        );
      });
    }
  }

  function renderPicker(list) {
    pickerEl.innerHTML = "";
    list.forEach((wf, i) => {
      const opt = h("option", { value: String(i) }, [wf.name]);
      pickerEl.appendChild(opt);
    });
    pickerEl.value = "0";
  }

  /* =========================
     Normalisation WarframeStat
  ========================= */
  function normalizeWF(rec) {
    const img = rec.imageName
      ? `https://cdn.warframestat.us/img/${rec.imageName}`
      : null;
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
    };
  }

  /* =========================
     Chargement
  ========================= */
  async function fetchJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return await r.json();
  }

  async function loadAll() {
    setStatus(true, "Chargement des Warframes…");

    try {
      const [warframes, abRaw, byWfRaw, wfAbRaw] = await Promise.all([
        fetchJSON(URLS.wf),
        fetchJSON(URLS.ab).catch(() => []),
        fetchJSON(URLS.byWf).catch(() => []),
        fetchJSON(URLS.wfAb).catch(() => []),
      ]);

      // index abilities.json
      const AB = indexAbilities(abRaw);
      // mapping par Warframe (ordre officiel)
      const BYWF = indexByWarframeMap(byWfRaw);
      // fallback legacy
      const LEG = indexLegacyWFAbilities(wfAbRaw);
      // assemble pour chaque frame
      const AB_BY_FRAME = assembleFrameAbilities({
        abilitiesIndexed: AB,
        byWfNames: BYWF,
        legacy: LEG,
      });

      // filtre Warframes valides
      const LIST = warframes
        .filter(
          (wf) =>
            wf.type === "Warframe" && !["Bonewidow", "Voidrig"].includes(wf.name)
        )
        .map(normalizeWF)
        .sort(byName);

      // on garde seulement celles pour lesquelles on a au moins 1 capacité,
      // sinon on garde quand même (description seule) — à ton choix.
      // Ici on garde tout, mais on affichera “Aucun détail” si vide.

      setStatus(true, `Dataset chargé: ${LIST.length} Warframes`);
      renderPicker(LIST);
      if (LIST.length) renderCard(LIST[0], AB_BY_FRAME, 0);

      // événements
      pickerEl.addEventListener("change", (e) => {
        const idx = parseInt(e.target.value, 10);
        const q = norm(searchEl.value).toLowerCase();
        const filtered = !q
          ? LIST
          : LIST.filter((x) => x.name.toLowerCase().includes(q));
        if (filtered[idx]) renderCard(filtered[idx], AB_BY_FRAME, 0);
      });

      searchEl.addEventListener("input", () => {
        const q = norm(searchEl.value).toLowerCase();
        const filtered = !q
          ? LIST
          : LIST.filter((x) => x.name.toLowerCase().includes(q));
        renderPicker(filtered);
        if (filtered.length) renderCard(filtered[0], AB_BY_FRAME, 0);
        setStatus(true, `Affichage: ${filtered.length} résultat(s)`);
      });
    } catch (e) {
      console.error(e);
      setStatus(false, "Erreur de chargement.");
    }
  }

  loadAll();
})();
