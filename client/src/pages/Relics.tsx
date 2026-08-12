import React, { useState, useMemo } from "react";
import { PRIME_RELICS } from "@/lib/warframe-data";
import { Gem, Search, Filter, ShieldCheck, Sparkles } from "lucide-react";

export default function Relics() {
  const [search, setSearch] = useState("");
  const [eraFilter, setEraFilter] = useState("Toutes");

  const filtered = useMemo(() => {
    return PRIME_RELICS.filter(relic => {
      const matchSearch = relic.name.toLowerCase().includes(search.toLowerCase()) ||
        relic.rewards.some(r => r.itemName.toLowerCase().includes(search.toLowerCase()));
      const matchEra = eraFilter === "Toutes" || relic.era === eraFilter;
      return matchSearch && matchEra;
    });
  }, [search, eraFilter]);

  const rarityColor = (rarity: string) => {
    switch (rarity) {
      case "Rare": return "#ffd700";
      case "Uncommon": return "#c0c0c0";
      default: return "#cd7f32";
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "var(--wf-bg)", color: "var(--wf-text)" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--wf-border)" }}>
          <div>
            <div className="flex items-center gap-2">
              <Gem size={24} style={{ color: "var(--wf-cyan)" }} />
              <h1 className="text-xl md:text-2xl font-bold tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                RELIQUES DU NÉANT // PRIME VAULT
              </h1>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>
              Recherchez des pièces Prime par ère de relique, analysez les taux de drop et optimisez vos ouvertures.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>
            <Sparkles size={14} /> {PRIME_RELICS.length} Reliques indexées
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--wf-text-dim)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une relique (ex: Lith A1) ou une pièce (ex: Saryn Prime)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-sm outline-none transition-all"
              style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {["Toutes", "Lith", "Meso", "Neo", "Axi"].map(era => (
              <button
                key={era}
                onClick={() => setEraFilter(era)}
                className="px-3 py-1.5 text-xs rounded-sm transition-all shrink-0"
                style={{
                  backgroundColor: eraFilter === era ? "var(--wf-cyan)" : "var(--wf-bg-panel)",
                  color: eraFilter === era ? "#000" : "var(--wf-text)",
                  fontFamily: "var(--font-display)",
                  border: "1px solid var(--wf-border)",
                  fontWeight: eraFilter === era ? "bold" : "normal"
                }}
              >
                {era}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filtered.map(relic => (
            <article
              key={relic.id}
              className="relative rounded-sm p-4 hud-frame transition-all duration-200"
              style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}
            >
              <div className="flex items-start justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
                <div>
                  <h3 className="text-sm font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)" }}>
                    {relic.name}
                  </h3>
                  <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
                    ÈRE {relic.era.toUpperCase()} // ÉTAT {relic.state.toUpperCase()}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold" style={{ backgroundColor: "rgba(79,195,247,0.15)", color: "var(--wf-cyan)", border: "1px solid rgba(79,195,247,0.4)" }}>
                  RADIANT
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>
                  Récompenses et probabilités
                </div>
                {relic.rewards.map((reward, idx) => {
                  const color = rarityColor(reward.rarity);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-sm text-xs"
                      style={{ backgroundColor: "rgba(0,0,0,0.35)", borderLeft: `3px solid ${color}` }}
                    >
                      <span className="font-semibold truncate pr-2" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>
                        {reward.itemName}
                      </span>
                      <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                        <span style={{ color }} className="uppercase text-[10px]">{reward.rarity}</span>
                        <span style={{ color: "var(--wf-cyan)" }}>{reward.chance}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
