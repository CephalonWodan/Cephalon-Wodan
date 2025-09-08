// js/warframe_stat_labels.override.js
(() => {
  // ➜ change ici les libellés comme tu veux
  const MAP = {
    "Force": "Strength",
    "Durée": "Duration",          // ex: "Temps"
    "Portée": "Range",        // ex: "Zone"
    "Efficacité": "Efficiency" // ex: "Efficacité"
  };

  // Sélecteurs possibles pour ces pastilles (élargis si besoin)
  const SELS = [
    ".badge", ".chip", ".stat-chip", ".wf-chip", ".ability-chip"
  ];

  function renameChips(root=document){
    const nodes = root.querySelectorAll(SELS.join(","));
    nodes.forEach(el => {
      const t = (el.textContent || "").trim();
      if (t in MAP) el.textContent = MAP[t];
    });
  }

  // 1) renomme au chargement
  document.addEventListener("DOMContentLoaded", () => renameChips());

  // 2) renomme si la page réinjecte du contenu plus tard (MutationObserver)
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType===1) renameChips(n);
      }
    }
  });
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();
