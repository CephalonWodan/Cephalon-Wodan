// warframe-api.js
console.log("warframe-api.js chargé (amélioré)");

const API_URL = "https://api.warframestat.us/warframes";
const ABILITIES_URL = "data/abilities_by_warframe.json"; // ← mets ton JSON ici
const EXCLUDED = new Set(["Bonewidow", "Voidrig"]);

const listEl = document.getElementById("warframe-list");
const searchEl = document.getElementById("warframe-search");

// Sécurité : échappe tout texte injecté dans le HTML
const escapeHtml = (s) =>
  s?.replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])) ?? "";

// Normalise un nom pour matcher le JSON (ex: "Excalibur Prime" → "Excalibur")
const normalizeName = (name) => name.replace(/\s+Prime$/i, "").trim();

// Garde uniquement les Warframes standards
const isStandardWarframe = (wf) =>
  wf &&
  typeof wf.type === "string" &&
  wf.type.toLowerCase() === "warframe" &&
  !EXCLUDED.has(wf.name);

(async function init() {
  try {
    const [wfRes, abRes] = await Promise.all([
      fetch(API_URL),
      fetch(ABILITIES_URL).catch(() => null)
    ]);

    const wfData = await wfRes.json();
    const abilitiesMap = abRes && abRes.ok ? await abRes.json() : null;

    let warframes = wfData.filter(isStandardWarframe);

    const getAbilities = (name) => {
      if (!abilitiesMap) return null;
      return abilitiesMap[name] || abilitiesMap[normalizeName(name)] || null;
    };

    render(warframes, getAbilities);

    // Recherche avec debounce
    let t;
    searchEl.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = searchEl.value.trim().toLowerCase();
        const filtered = !q
          ? warframes
          : warframes.filter(wf => wf.name.toLowerCase().includes(q));
        render(filtered, getAbilities);
      }, 150);
    });

  } catch (err) {
    console.error(err);
    listEl.textContent = "Erreur de chargement des Warframes.";
  }
})();

function render(items, getAbilities) {
  listEl.innerHTML = "";
  const frag = document.createDocumentFragment();

  items.forEach((wf) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "mod-item";
    card.setAttribute("aria-label", `Configurer ${wf.name}`);
    card.tabIndex = 0;
    card.textContent = wf.name;

    const tooltip = document.createElement("div");
    tooltip.className = "tooltip-template";

    const imgURL = wf.imageName
      ? `https://cdn.warframestat.us/img/${wf.imageName}`
      : null;

    const abilities = getAbilities?.(wf.name);
    const abilitiesHtml = abilities
      ? `<p style="margin:.5em 0 .25em 0;"><strong>Capacités</strong></p>
         <ol style="padding-left:1.25em;margin:0;">
           ${abilities.map(a => `<li>${escapeHtml(a)}</li>`).join("")}
         </ol>`
      : "";

    tooltip.innerHTML = `
      ${imgURL ? `<img src="${imgURL}" alt="${escapeHtml(wf.name)}"
          style="width:100px; float:right; margin-left:10px; border-radius:8px;"
          onerror="this.style.display='none'">` : ""}

      <strong>${escapeHtml(wf.name)}</strong><br>
      <em>${escapeHtml(wf.description) || "Pas de description disponible."}</em><br><br>

      <ul style="padding-left:1em; list-style:disc; margin:0;">
        <li><strong>Armure:</strong> ${wf.armor ?? "—"}</li>
        <li><strong>Énergie:</strong> ${wf.power ?? wf.energy ?? "—"}</li>
        <li><strong>Vie:</strong> ${wf.health ?? "—"}</li>
        <li><strong>Bouclier:</strong> ${wf.shield ?? "—"}</li>
        <li><strong>Vitesse:</strong> ${wf.sprintSpeed ?? "—"}</li>
      </ul>

      ${abilitiesHtml}
      <div style="clear:both"></div>
    `;

    card.appendChild(tooltip);

    card.addEventListener("click", () => {
      localStorage.setItem("selectedWarframe", JSON.stringify(wf));
      window.location.href = "mods.html";
    });

    frag.appendChild(card);
  });

  listEl.appendChild(frag);
}
