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
  <strong>${wf.name}</strong><br>
  <em>${wf.description || "Pas de description disponible."}</em><br><br>
  ${imgURL ? `<img src="${imgURL}" alt="${wf.name}"
      style="width:100px; float:right; margin-left:10px; border-radius:8px;"
      onerror="this.style.display='none'">` : ``}
  <ul style="padding-left:1em; list-style:disc;">
    <li><strong>Armure:</strong> ${wf.armor}</li>
    <li><strong>Énergie:</strong> ${wf.power}</li>
    <li><strong>Vie:</strong> ${wf.health}</li>
    <li><strong>Bouclier:</strong> ${wf.shield}</li>
    <li><strong>Vitesse:</strong> ${wf.sprintSpeed}</li>
  </ul>
  <div class="abilities-box"></div>   <!-- ← ICI -->
`;

    card.appendChild(tooltip);

    card.addEventListener("mouseenter", () => {
  const box = tooltip.querySelector(".abilities-box");
  if (box && !box.dataset.filled) {
    window.ABILITIES?.renderInto(box, wf.name);
    box.dataset.filled = "1";
  }
});

    frag.appendChild(card);
  });

  listEl.appendChild(frag);
}
