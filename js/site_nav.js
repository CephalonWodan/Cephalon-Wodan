// js/site_nav.js
// Barre de navigation sticky à inclure sur TOUTES les pages :
// <div id="site-nav"></div> + <script src="js/site_nav.js" defer></script>

(function () {
  const host = document.getElementById("site-nav");
  if (!host) return;

  // Ex: "/Cephalon-Wodan/mods.html" -> "mods.html"
  // Gère aussi "/" ou "/Cephalon-Wodan/" -> "index.html"
  const path = location.pathname.replace(/\/+$/, ""); // trim trailing slash
  let currentFile = path.split("/").pop();
  if (!currentFile || currentFile.toLowerCase() === "") currentFile = "index.html";
  currentFile = currentFile.toLowerCase();

  const links = [
    { href: "index.html",   key: "index.html",   label: "Warframes" },
    { href: "mods.html",    key: "mods.html",    label: "Mods" },
    { href: "arcanes.html", key: "arcanes.html", label: "Arcanes" },
    { href: "shards.html",  key: "shards.html",  label: "Archon Shards" },
    { href: "weapons.html", key: "weapons.html", label: "Weapons" },
    { href: "companions.html", key: "companions.html", label: "Companions" },
    { href: "necramechs_archwings.html", key: "necramechs_archwings.html", label: "Necramechs & Archwings" },
    { href: "hub.html", key: "hub.html", label: "Timer" },
  ];

  // Marque le lien actif
  host.querySelectorAll("[data-key]").forEach(a => {
    const key = (a.getAttribute("data-key") || "").toLowerCase();
    if (key === currentFile || (currentFile === "" && key === "index.html")) {
      a.setAttribute("aria-current", "page");
      a.classList.add("text-[#D4AF37]", "border", "border-[rgba(212,175,55,.5)]");
    }
  });
})();
