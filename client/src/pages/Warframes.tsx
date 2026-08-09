// ============================================================
// WARFRAME SET BUILDER — Warframes Catalogue Page
// ============================================================
import { useState } from "react";
import { Link } from "wouter";
import { Search, Filter, Shield, Zap } from "lucide-react";
import Layout from "@/components/Layout";
import { WARFRAMES, Warframe, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

const ROLES = ["Tous", "Attaque", "Contrôle", "Tank", "Support", "Furtivité", "Vitesse", "Défense", "Nuisance", "Tireur d'élite", "Pyromane", "Assassin"];

function WarframeCard({ wf }: { wf: Warframe }) {
  const rarityColor = getRarityColor(wf.rarity);
  return (
    <div
      className="rounded-sm overflow-hidden transition-all duration-200 cursor-pointer group"
      style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)", position: "relative" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = rarityColor;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${rarityColor}25`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Card image area */}
      <div
        className="relative h-36 flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: "url(/manus-storage/warframe-card-bg_e4519a70.jpg)", backgroundSize: "cover" }}
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${rarityColor}15, transparent 60%, rgba(0,0,0,0.5))` }} />
        {/* HUD corner decorations */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3" style={{ borderTop: `1.5px solid ${rarityColor}`, borderLeft: `1.5px solid ${rarityColor}`, opacity: 0.8 }} />
        <div className="absolute top-1.5 right-1.5 w-3 h-3" style={{ borderTop: `1.5px solid ${rarityColor}`, borderRight: `1.5px solid ${rarityColor}`, opacity: 0.8 }} />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3" style={{ borderBottom: `1.5px solid ${rarityColor}`, borderLeft: `1.5px solid ${rarityColor}`, opacity: 0.8 }} />
        {/* Warframe silhouette placeholder */}
        <div className="relative z-10 flex flex-col items-center">
          <Shield size={40} style={{ color: rarityColor, opacity: 0.8 }} />
        </div>
        {/* Prime badge */}
        {wf.isPrime && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-sm text-xs font-bold"
            style={{ backgroundColor: "rgba(255,107,53,0.2)", border: "1px solid #ff6b35", color: "#ff6b35", fontFamily: "var(--font-display)", fontSize: "9px" }}>
            PRIME
          </div>
        )}
        {/* Rarity indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: rarityColor }} />
      </div>

      {/* Card info */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-sm font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
            {wf.name}
          </h3>
          <span className="text-xs px-1.5 py-0.5 rounded-sm ml-1 shrink-0"
            style={{ backgroundColor: `${rarityColor}20`, color: rarityColor, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>
            {getRarityLabel(wf.rarity).toUpperCase()}
          </span>
        </div>
        <div className="text-xs mb-2" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
          {wf.role}
        </div>
        <p className="text-xs mb-3 leading-relaxed line-clamp-2" style={{ color: "var(--wf-text-dim)" }}>
          {wf.description}
        </p>

        {/* Stats mini */}
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[
            { label: "VIE", value: wf.health },
            { label: "BOU", value: wf.shield },
            { label: "ARM", value: wf.armor },
            { label: "ENE", value: wf.energy },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-1 rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
              <div className="text-xs font-bold" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>{value}</div>
              <div className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)", fontSize: "8px", letterSpacing: "0.05em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* MR */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--wf-text-dim)" }}>
            Rang de Maîtrise: <span style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>{wf.mastery}</span>
          </span>
          <Link href="/builder"
            className="text-xs px-2 py-1 rounded-sm transition-all wf-btn-primary"
            style={{ fontSize: "10px" }}
          >
            UTILISER
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Warframes() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tous");
  const [primeOnly, setPrimeOnly] = useState(false);

  const filtered = WARFRAMES.filter(wf => {
    const matchSearch = wf.name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "Tous" || wf.role === roleFilter;
    const matchPrime = !primeOnly || wf.isPrime;
    return matchSearch && matchRole && matchPrime;
  });

  return (
    <Layout title="WARFRAMES">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-sm" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
        {/* Search */}
        <div className="relative flex items-center flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: "var(--wf-text-dim)" }} />
          <input
            type="text"
            placeholder="Rechercher un Warframe..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-sm outline-none"
            style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          />
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: "var(--wf-text-dim)" }} />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-sm outline-none"
            style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Prime toggle */}
        <button
          onClick={() => setPrimeOnly(!primeOnly)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-all"
          style={{
            backgroundColor: primeOnly ? "rgba(255,107,53,0.15)" : "rgba(0,0,0,0.3)",
            border: `1px solid ${primeOnly ? "#ff6b35" : "var(--wf-border)"}`,
            color: primeOnly ? "#ff6b35" : "var(--wf-text-dim)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.05em",
          }}
        >
          ⭐ PRIME UNIQUEMENT
        </button>

        <span className="text-xs ml-auto" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
          {filtered.length} résultats
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((wf, i) => (
          <div key={wf.id} className="animate-fade-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
            <WarframeCard wf={wf} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ color: "var(--wf-text-dim)" }}>
          <Shield size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Aucun Warframe trouvé</p>
        </div>
      )}
    </Layout>
  );
}
