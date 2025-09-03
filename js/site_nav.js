// js/site_nav.js
// Injecte une barre de navigation sticky en haut de page.
// A mettre sur TOUTES les pages : <div id="site-nav"></div> + <script src="js/site_nav.js" defer></script>

(function () {
  const host = document.getElementById("site-nav");
  if (!host) return;

  const currentFile = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const links = [
    { href: "index.html",   key: "index.html",   label: "Warframes" },
    { href: "mods.html",    key: "mods.html",    label: "Mods" },
    { href: "arcanes.html", key: "arcanes.html", label: "Arcanes" },
    { href: "shards.html",  key: "shards.html",  label: "Archon Shards" },
    { href: "weapons.html", key: "weapons.html", label: "Weapons" },
  ];

  host.innerHTML = `
    <header class="sticky top-0 z-40 border-b border-[rgba(255,255,255,.08)]
                    bg-[rgba(8,8,10,.65)] backdrop-blur">
      <div class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <a href="index.html" class="flex items-center gap-2 text-lg font-semibold">
          <span class="inline-flex w-6 h-6 rounded-full border border-[rgba(255,255,255,.18)]
                         items-center justify-center text-[10px]">CW</span>
          <span>Cephalon Wodan</span>
        </a>
        <nav class="flex items-center gap-1" aria-label="Navigation principale">
          ${links.map(l => `
            <a href="${l.href}" data-key="${l.key}"
               class="px-3 py-1.5 rounded-lg border border-transparent
                      hover:border-[rgba(255,255,255,.12)]
                      hover:bg-[rgba(255,255,255,.06)]
                      transition-colors">
              ${l.label}
            </a>
          `).join("")}
          <a href="https://github.com/CephalonWodan/Cephalon-Wodan" target="_blank" rel="noopener"
             class="ml-2 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,.12)]
                    hover:bg-[rgba(255,255,255,.06)]">GitHub</a>
        </nav>
      </div>
    </header>
  `;

  // Marque le lien actif (page en cours)
  host.querySelectorAll("[data-key]").forEach(a => {
    const key = (a.getAttribute("data-key") || "").toLowerCase();
    if (key === currentFile) {
      a.setAttribute("aria-current", "page");
      a.classList.add("text-[#D4AF37]", "border", "border-[rgba(212,175,55,.5)]");
    }
  });
})();
