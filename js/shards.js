(function () {
  "use strict";

  function $(s) { return document.querySelector(s); }
  function norm(v) { return (v == null ? "" : String(v)).trim(); }
  function ucFirst(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

  var ENDPOINTS = [
    "https://api.warframestat.us/archonshards?language=en",
    "https://api.warframestat.us/archonshards",
    "https://api.warframestat.us/archonshards/"
  ];

  // Couleurs supportées
  var COLORS = ["Amber","Azure","Emerald","Crimson","Violet","Topaz"];

  // Map fichiers EXACTS de ton repo (pas d'espace, bonne casse)
  var FILE_MAP = {};
  COLORS.forEach(function(c){
    FILE_MAP[c] = {
      base:      c + "ArchonShard.png",
      tauforged: "Tauforged" + c + "ArchonShard.png"
    };
  });

  // UI helpers
  function dot(hex){ return '<span class="sh-dot" style="background:'+hex+'"></span>'; }
  function badge(label, cls){ return '<span class="sh-badge'+(cls?(" "+cls):"")+'">'+label+'</span>'; }
  function colorDot(color){
    var hex = {Amber:"#f3c04a",Azure:"#3aa0d8",Emerald:"#44c08a",Crimson:"#e25b64",Violet:"#9164d6",Topaz:"#d1a342"}[color] || "#9aa7b5";
    return '<span class="sh-badge">'+dot(hex)+' '+color+'</span>';
  }
  function titleOf(color, tau){ return (tau ? "Tauforged " : "") + color + " Archon Shard"; }

  function shardImage(color, tau){
    // sécurise la couleur et la casse
    var c = ucFirst(norm(color).toLowerCase());
    if (!FILE_MAP[c]) c = "Amber";
    var f = tau ? FILE_MAP[c].tauforged : FILE_MAP[c].base;
    return "img/shards/" + f; // -> ex: img/shards/TauforgedCrimsonArchonShard.png
  }

  // Effets depuis l’API (objet {path:{value:"..."}} ou {path:"..."})
  function effectLines(obj){
    var up = (obj && (obj.upgradeTypes || obj.effects)) || {};
    var vals = [];
    for (var k in up){
      if (!Object.prototype.hasOwnProperty.call(up,k)) continue;
      var v = up[k];
      var txt = (v && typeof v==="object" && "value" in v) ? v.value : v;
      if (txt) vals.push(String(txt));
    }
    return vals;
  }

  function card(sh){
    var color = sh.color || "Amber";
    var tau   = !!sh.tauforged;
    var img   = shardImage(color, tau);
    var title = titleOf(color, tau);
    var lines = effectLines(sh);
    var chips = [ tau ? badge("Tauforged","orn") : "", colorDot(color) ].filter(Boolean).join(" ");

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
            (lines.length ? '<ul class="sh-list">'+lines.map(function(x){return "<li>"+x+"</li>";}).join("")+'</ul>'
                          : '<div class="muted">No data in API.</div>') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function render(arr){
    var grid = $("#shards-grid"); if (!grid) return;
    grid.innerHTML = arr.map(card).join("");
    var st = $("#status"); if (st) st.textContent = "Shards loaded: " + arr.length + " (EN)";
  }

  // Convertit la réponse API (array OU objet de clés) en tableau homogène
  function coerceToArray(data){
    if (!data) return [];
    if (Array.isArray(data)) return data.slice();

    if (typeof data === "object"){
      var out = [];
      for (var key in data){
        if (!Object.prototype.hasOwnProperty.call(data,key)) continue;
        var node = data[key] || {};
        var rawColor = norm(node.value || node.name || "");
        var color = ucFirst(rawColor.toLowerCase());
        if (COLORS.indexOf(color) === -1){
          // fallback: essaie via la clé (ACC_BLUE / TAU_BLUE / etc.)
          var m = String(key).match(/(AMBER|AZURE|EMERALD|CRIMSON|VIOLET|TOPAZ)/i);
          color = m ? ucFirst(m[1].toLowerCase()) : "Amber";
        }
        var tau  = /TAU/i.test(key) || /tauforged/i.test(String(node.name||""));
        out.push({
          name: titleOf(color, tau),
          color: color,
          tauforged: tau,
          upgradeTypes: node.upgradeTypes || node.effects || {}
        });
      }
      return out;
    }
    return [];
  }

  // fetch résilient (essaie plusieurs endpoints)
  function fetchShards(){
    var i=0;
    function next(){
      if (i>=ENDPOINTS.length) return Promise.resolve([]);
      var url = ENDPOINTS[i++];
      return fetch(url,{cache:"no-store"})
        .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
        .then(function(json){ var arr = coerceToArray(json); return arr.length ? arr : next(); })
        .catch(function(){ return next(); });
    }
    return next();
  }

  function boot(){
    var st=$("#status"); if(st) st.textContent="Loading shards…";
    var grid=$("#shards-grid"); if(!grid){ console.warn("[shards] #shards-grid introuvable"); return; }

    // skeleton
    var s=""; for(var k=0;k<6;k++){ s+=
      '<div class="sh-card"><div class="sh-cover skeleton"></div>'+
      '<div class="sh-body"><div class="sh-head">'+
      '<div class="sh-title skeleton-line w-2/3"></div>'+
      '<div class="sh-chips skeleton-pill"></div></div>'+
      '<div class="sh-effects"><div class="skeleton-line w-5/6"></div>'+
      '<div class="skeleton-line w-4/6"></div><div class="skeleton-line w-3/6"></div></div>'+
      '</div></div>'; }
    grid.innerHTML = s;

    fetchShards().then(function(arr){
      if (!arr.length){
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

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  } else {
    boot();
  }
})();
