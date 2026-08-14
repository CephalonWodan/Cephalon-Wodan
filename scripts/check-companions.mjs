import catalog from '../client/src/lib/warframe-data-full.json' with { type: 'json' };

const comps = catalog.companions ?? [];
const types = {};
comps.forEach(c => {
  types[c.type] = (types[c.type] || 0) + 1;
});

console.log(JSON.stringify({
  total: comps.length,
  types,
  moas: comps.filter(c => c.type === 'moa').map(c => c.name),
  hounds: comps.filter(c => c.type === 'hound').map(c => c.name),
}, null, 2));
