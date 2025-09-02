<script>
const POL_SVG = {
  Madurai:"Madurai_Pol.svg", Vazarin:"Vazarin_Pol.svg", Naramon:"Naramon_Pol.svg",
  Zenurik:"Zenurik_Pol.svg", Unairu:"Unairu_Pol.svg", Umbra:"Umbra_Pol.svg",
  Penjaga:"Penjaga_Pol.svg", Exilus:"Exilus_Pol.svg", Any:"Any_Pol.svg"
};
function polIconSrc(name){ return `img/polarities/${POL_SVG[name]||POL_SVG.Any}`; }

// Variante de makePolarityBadge() qui met une image au lieu d’un caractère
function makePolarityBadge(name, kind=null){
  const el = document.createElement("span");
  el.className = "polarity-badge";
  el.dataset.kind = kind || "";
  el.title = kind ? `${kind}: ${name}` : name;
  const img = document.createElement("img");
  img.alt = name + " polarity";
  img.width = 20; img.height = 20;
  img.src = polIconSrc(name);
  el.appendChild(img);
  return el;
}
</script>
