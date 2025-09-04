(function () {
  "use strict";

  // Helpers
  function $(s) { return document.querySelector(s); }
  function norm(v) { return (v == null ? "" : String(v)).trim(); }
  function ucFirst(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

  // On teste plusieurs variantes d’URL (selon déploiement côté API)
  var ENDPOINTS = [
    "https://api.warframestat.us/archonshards?language=en",
    "https://api.warframestat.us/archonshards",
    "https://api.warframestat.us/archonshards/"
  ];

  var COLOR_META = {
    Amber:   { dot: "#f3c04a" },
    Azure:   { dot: "#3aa0d8" },
    Emerald: { dot: "#44c08a" },
    Crimson: { dot: "#e25b64" },
    Violet:  { dot: "#9164d6" },
    Topaz:   { dot: "#d1a342" } // au cas où
  };

  // Images locales
  function shardImage(color, tau) {
    var base = color + "ArchonShard.png";
    var tauf = "Tauforged" + color + "ArchonShard.png";
    return "img/shards/" + (tau ? tauf : base);
  }

  // UI
  function dot(hex) { return '<span class="sh-dot" style="background:'+hex+'"></span>'; }
  function badge(label, cls) { return '<span class="sh-badge'+(cls?(" "+cls):"")+'">'+label+'</span>'; }
  function colorBadge(color){
    var meta = COLOR_META[color] || { dot:"#9aa7b5" };
    return '<span class="sh-badge">'+dot(meta.dot)+' '+color+'</span>';
  }
  function makeTitle(color, tau){ return (tau ? "Tauforged " : "") + color + " Archon Shard"; }

  // Lis les effets, quelle que soit la forme
  function effectLines(obj) {
    var up = (obj && (obj.upgradeTypes || obj.effects)) || {};
    var vals = [];
    // up peut être { path: {value:"..."}} ou { path: "..." }
    for (var k in up) {
      if (!Object.prototype.hasOwnProperty.call(up, k)) continue;
      var v = up[k];
      var txt = (v && typeof v === "object" && "value" in v) ? v.value : v;
      if (txt) vals.push(String(txt));
    }
    return vals;
  }

  // Rend une carte
  function card(sh) {
    var color = sh.color || "Amber";
    var tau   = !!sh.tauforged;
    var title = makeTitle(color, tau);
    var img   = shardImage(color, tau);
    var lines = effectLines(sh);

    var chips = [
      tau ? badge("Tauforged","orn") : "",
      colorBadge(color)
    ].filter(Boolean).join(" ");

    return (
      '<div class="sh-card">' +
        '<div class="sh-cover"><img src="'+img+'" alt="'+title.replace(/"/g,"&quot;")+'" loading="lazy" decoding="async"></div>' +
        '<div class="sh-body">' +
          '<div class="sh-head">' +
            '<div class="sh-title" title="'+title.replace(/"/g,"&quot;")+'">'+title+'</div>' +
            '<div class="sh-chips">'+chips+'</div>' +
          '</div>' +
          '<div class="sh-effects">' +
            '<div class="sh-effects-title">Effects</div>' +
            (lines.length
              ? '<ul class="sh-list">'+lines.map(function(x){return "<li>"+x+"</li>";}).join("")+'</ul>'
              : '<div class="muted">No data in API.</div>') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function render(arr) {
    var grid = $("#shards-grid");
    if (!grid) return;
    grid.innerHTML = arr.map(card).join("");
    var st = $("#status");
    if (st) st.textContent = "Shards loaded: " + arr.length + " (EN)";
  }

  // --- Conversion universelle des réponses API vers un tableau exploitable
  function coerceToArray(data) {
    if (!data) return [];
    // 1) Déjà un tableau
    if (Array.isArray(data)) return data.slice();

    // 2) Objet de la forme {ACC_BLUE:{value:"Azure", upgradeTypes:{...}}, TAU_BLUE:{...}}
    if (typeof data === "object") {
      var out = [];
      for (var key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
        var node = data[key] || {};
        var color = norm(node.value || node.name || "");
        // Normalise la couleur (Azure, Amber, Crimson, Emerald, Violet, Topaz)
        color = ucFirst(color.toLowerCase());
        // Tauforged si la clé porte TAU_
        var tau = /TAU/i.test(key) || /tauforged/i.test(node.name || "");
        out.push({
          name: makeTitle(color || "Amber", tau),
          color: color || "Amber",
          tauforged: tau,
          // on conserve la structure pour effectLines
          upgradeTypes: node.upgradeTypes || node.effects || {}
        });
      }
      return out;
    }
    return [];
  }

  // Fetch résilient (essaie plusieurs endpoints jusqu’à avoir des données)
  function fetchShards() {
    var i = 0;
    function tryNext() {
      if (i >= ENDPOINTS.length) return Promise.resolve([]);
      var url = ENDPOINTS[i++];
      return fetch(url, { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
        .then(function (data) {
          var arr = coerceToArray(data);
          if (arr.length) return arr;
          return tryNext();
        })
        .catch(function () { return tryNext(); });
    }
    return tryNext();
  }

  function boot() {
    var st = $("#status");
    if (st) st.textContent = "Loading shards…";

    var grid = $("#shards-grid");
    if (!grid) { console.warn("[shards] #shards-grid introuvable"); return; }

    // Skeleton
    var s = "";
    for (var k=0;k<6;k++){
      s += '<div class="sh-card"><div class="sh-cover skeleton"></div>'+
           '<div class="sh-body"><div class="sh-head">'+
           '<div class="sh-title skeleton-line w-2/3"></div>'+
           '<div class="sh-chips skeleton-pill"></div></div>'+
           '<div class="sh-effects"><div class="skeleton-line w-5/6"></div>'+
           '<div class="skeleton-line w-4/6"></div><div class="skeleton-line w-3/6"></div></div>'+
           '</div></div>';
    }
    grid.innerHTML = s;

    fetchShards().then(function(arr){
      if (!arr.length) {
        // message propre si l’API renvoie vraiment 0
        grid.innerHTML = '<div class="muted">No shards found from API right now.</div>';
        if (st) st.textContent = "Shards loaded: 0 (EN)";
        return;
      }
      render(arr);
    }).catch(function(e){
      console.error(e);
      if (st){
        st.textContent = "Error loading shards.";
        st.className = "mt-2 text-sm px-3 py-2 rounded-lg";
        st.style.background = "rgba(255,0,0,.08)";
        st.style.color = "#ffd1d1";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
