// ============================================================
// WARFRAME SET BUILDER — Mods Catalogue Page
// ============================================================
import { useState } from "react";
import { Search, Star } from "lucide-react";
import Layout from "@/components/Layout";
import { MODS, Mod, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

const MOD_TYPES = ["Tous", "warframe", "primary", "secondary", "melee", "companion", "universal"];
const TYPE_LABELS: Record<string, string> = {
  warframe: "Warframe",
  primary: "Primaire",
  secondary: "Secondaire",
  melee: "Mêlée",
  companion: "Compagnon",
  universal: "Universel",
};

const POLARITY_SYMBOLS: Record<string, string> = {
  madurai: "V",
  vazarin: "D",
  naramon: "—",
  zenurik: "=",
  unairu: "⬡",
  penjaga: "⬟",
  umbra: "Ω",
  any: "—",
};

function ModCard({ mod }: { mod: Mod }) {
  const rarityColor = getRarityColor(mod.rarity);
  return (
    <div
      className="rounded-sm p-3 transition-all duration-200 cursor-pointer hud-frame"
      style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid ${rarityColor}30` }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = rarityColor;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${rarityColor}20`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${rarityColor}30`;
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
            {mod.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: rarityColor, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>
              {getRarityLabel(mod.rarity).toUpperCase()}
            </span>
            <span className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)", fontSize: "9px" }}>
              {TYPE_LABELS[mod.type] || mod.type}
            </span>
          </div>
        </div>
        {/* Polarity */}
        <div
          className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 ml-2"
          style={{ backgroundColor: `${rarityColor}20`, border: `1px solid ${rarityColor}50`, color: rarityColor, fontFamily: "var(--font-mono)" }}
        >
          {POLARITY_SYMBOLS[mod.polarity]}
        </div>
      </div>

      {/* Rank dots */}
      <div className="flex items-center gap-0.5 mb-2">
        {Array.from({ length: mod.maxRank }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: i < mod.maxRank ? rarityColor : "rgba(255,255,255,0.1)" }}
          />
        ))}
        <span className="text-xs ml-1" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
          R{mod.maxRank}
        </span>
      </div>

      {/* Effect */}
      <div
        className="px-2 py-1.5 rounded-sm mb-2 text-xs font-semibold"
        style={{ backgroundColor: `${rarityColor}10`, borderLeft: `2px solid ${rarityColor}`, color: rarityColor, fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}
      >
        {mod.effect}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>{mod.description}</p>
    </div>
  );
}

export default function Mods() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");

  const filtered = MODS.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.effect.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "Tous" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <Layout title="MODS">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-sm" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
        <div className="relative flex items-center flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: "var(--wf-text-dim)" }} />
          <input
            type="text"
            placeholder="Rechercher un mod..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-sm outline-none"
            style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {MOD_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-2.5 py-1.5 text-xs rounded-sm transition-all"
              style={{
                backgroundColor: typeFilter === t ? "rgba(79,195,247,0.15)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${typeFilter === t ? "var(--wf-cyan)" : "var(--wf-border)"}`,
                color: typeFilter === t ? "var(--wf-cyan)" : "var(--wf-text-dim)",
                fontFamily: "var(--font-display)",
                fontSize: "11px",
                letterSpacing: "0.05em",
              }}
            >
              {t === "Tous" ? "Tous" : TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>

        <span className="text-xs ml-auto" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
          {filtered.length} mods
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((mod, i) => (
          <div key={mod.id} className="animate-fade-slide-up" style={{ animationDelay: `${i * 20}ms` }}>
            <ModCard mod={mod} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ color: "var(--wf-text-dim)" }}>
          <Star size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Aucun mod trouvé</p>
        </div>
      )}
    </Layout>
  );
}
