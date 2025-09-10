(function () {
  function host() {
    return document.getElementById('site-nav') || document.querySelector('header') || document.body;
  }

  function mount(html) {
    const h = host();
    const wrap = document.createElement('nav');
    wrap.className = 'navbar';
    wrap.innerHTML = html;
    h.replaceChildren(wrap);
  }

  // 1) cas idéal : ton site_nav.js expose une fonction globale
  if (window.renderSiteNav)  { window.renderSiteNav(host()); return; }
  if (window.buildSiteNav)   { window.buildSiteNav(host());  return; }
  if (window.initSiteNav)    { window.initSiteNav(host());    return; }

  // 2) fallback simple (adapte les liens à ton arbo si besoin)
  mount(`
    <a href="./index.html">Accueil</a>
    <a href="./hub.html">Hub</a>
    <a href="./warframes.html">Warframes</a>
    <a href="./weapons.html">Armes</a>
    <a href="./mods.html">Mods</a>
  `);
})();
