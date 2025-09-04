(function () {
  "use strict";

  // Helpers
  function $(s) { return document.querySelector(s); }
  function norm(v) { return (v == null ? "" : String(v)).trim(); }

  var API = "https://api.warframestat.us/archonshards?language=en";

  // Couleurs (badge)
  var COLOR_META = {
    Amber:   { dot: "#f3c04a" },
    Azure:   { dot: "#3aa0d8" },
    Emerald: { dot: "#44c08a" },
    Crimson: { dot: "#e25b64" },
    Violet:  { dot: "#9164d6" }
  };

  // Images locales de ton repo
  function shardImage(color, tau) {
    var base = color + "ArchonShard.png";
    var tauf = "Tauforged" + color + "ArchonShard.png";
    return "img/shards/" + (tau ? tauf : base);
  }

  // UI bits
  function dot(hex) {
    return '<span class="sh-dot" style="background:' + hex + '"></span>';
  }
  function badge(label, cls) {
    return '<span class="sh-badge' + (cls ? " " + cls : "") + '">' + label + "</span>";
  }
  function colorBadge(color) {
    var meta = COLOR_META[color] || { dot: "#9aa7b5" };
    return '<span class="sh-badge">' + dot(meta.dot) + " " + color + "</span>";
  }
  function makeTitle(color, tau) {
    return (tau ? "Tauforged " : "") + color + " Archon Shard";
  }

  // Effets depuis l’API (les champs peuvent varier)
  function effectLines(obj) {
    var up = (obj && (obj.upgradeTypes || obj.effects)) || {};
    var vals = [];
    for (var k in up) {
      if (!Object.prototype.hasOwnProperty.call(up, k)) continue;
      var v = up[k];
      var txt = (v && typeof v === "object" && "value" in v) ? v.value : v;
      if (txt) vals.push(String(txt));
    }
    return vals;
  }

  function card(sh) {
    var name = norm(sh.name);
    var colorMatch = name.match(/(Amber|Azure|Emerald|Crimson|Violet)/i);
    var color = sh.color || (colorMatch ? (colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1).toLowerCase()) : "Amber");
    var tau = !!(sh.tauforged || /tauforged/i.test(name));

    var title = makeTitle(color, tau);
    var img   = shardImage(color, tau);
    var lines = effectLines(sh);

    var chips = [
      tau ? badge("Tauforged", "orn") : "",
      colorBadge(color)
    ].filter(Boolean).join(" ");

    return (
      '<div class="sh-card">' +
        '<div class="sh-cover">' +
          '<img src="' + img + '" alt="' + title.replace(/"/g, "&quot;") + '" loading="lazy" decoding="async">' +
        '</div>' +
        '<div class="sh-body">' +
          '<div class="sh-head">' +
            '<div class="sh-title" title="' + title.replace(/"/g, "&quot;") + '">' + title + '</div>' +
            '<div class="sh-chips">' + chips + '</div>' +
          '</div>' +
          '<div class="sh-effects">' +
            '<div class="sh-effects-title">Effects</div>' +
            (lines.length
              ? '<ul class="sh-list">' + lines.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul>'
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

    var status = $("#status");
    if (status) status.textContent = "Shards loaded: " + arr.length + " (EN)";
  }

  function normalizeShards(data) {
    var out = [];
    for (var i = 0; i < data.length; i++) {
      var x = data[i] || {};
      var name = norm(x.name);
      var tau  = /tauforged/i.test(name) || !!x.tauforged;
      var colorMatch = name.match(/(Amber|Azure|Emerald|Crimson|Violet)/i);
      var color = x.color || (colorMatch ? (colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1).toLowerCase()) : "");
      out.push(Object.assign({}, x, { color: color, tauforged: tau }));
    }
    return out;
  }

  function boot() {
    var status = $("#status");
    if (status) status.textContent = "Loading shards…";

    var grid = $("#shards-grid");
    if (!grid) { console.warn("[shards] #shards-grid introuvable"); return; }

    // Skeleton
    var s = '';
    for (var i = 0; i < 6; i++) {
      s += '' +
      '<div class="sh-card">' +
        '<div class="sh-cover skeleton"></div>' +
        '<div class="sh-body">' +
          '<div class="sh-head">' +
            '<div class="sh-title skeleton-line w-2/3"></div>' +
            '<div class="sh-chips skeleton-pill"></div>' +
          '</div>' +
          '<div class="sh-effects">' +
            '<div class="skeleton-line w-5/6"></div>' +
            '<div class="skeleton-line w-4/6"></div>' +
            '<div class="skeleton-line w-3/6"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
    grid.innerHTML = s;

    fetch(API, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var arr = Array.isArray(data) ? normalizeShards(data) : [];
        render(arr);
      })
      .catch(function (e) {
        console.error(e);
        var st = $("#status");
        if (st) {
          st.textContent = "Error loading shards.";
          st.className = "mt-2 text-sm px-3 py-2 rounded-lg";
          st.style.background = "rgba(255,0,0,.08)";
          st.style.color = "#ffd1d1";
        }
      });
  }

  // Lancer après que le DOM soit prêt (script chargé en defer)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
