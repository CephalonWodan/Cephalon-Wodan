// ============================================================
// WARFRAME SET BUILDER — Companions catalogue with MOA & Hound tabs
// ============================================================
import { useMemo, useState } from "react";
import { Search, Users, Shield, Cpu, Dog } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { COMPANIONS, MOA_PARTS, HOUND_PARTS, COMPANION_PRECEPTS, Companion, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

const TABS = [
  { id: "all", label: "Tous", icon: Users },
  { id: "sentinel", label: "Sentinelles", icon: Shield },
  { id: "beast", label: "Bêtes", icon: Dog },
  { id: "moa", label: "MOA", icon: Cpu },
  { id: "hound", label: "Hound", icon: Cpu },
  { id: "predasite", label: "Predasites", icon: Users },
  { id: "vulpaphyla", label: "Vulpaphylas", icon: Users },
] as const;

const SORT_OPTIONS = [
  { value: "name", label: "Nom" },
  { value: "health", label: "Vie" },
  { value: "shield", label: "Boucliers" },
  { value: "armor", label: "Armure" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const typeLabel = (type: string) =>
  ({
    sentinel: "Sentinelle",
    beast: "Bête",
    moa: "MOA",
    hound: "Hound",
    predasite: "Predasite",
    vulpaphyla: "Vulpaphyla",
  } as Record<string, string>)[type] || type;

function CompanionCard({ companion }: { companion: Companion }) {
  const rarityColor = getRarityColor(companion.rarity);
  const isModular = ["moa", "hound"].includes(companion.type.toLowerCase());
  const parts = isModular ? (companion.type.toLowerCase() === "moa" ? MOA_PARTS : HOUND_PARTS) : null;
  return (
    <div
      className="rounded-sm overflow-hidden transition-all duration-200 animate-fade-slide-up flex flex-col justify-between"
      style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid var(--wf-border)` }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = rarityColor;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-border)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div>
        <div
          className="relative h-28 flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${rarityColor}12, rgba(0,0,0,0.6))` }}
        >
          {companion.imageUrl && (
            <img
              src={companion.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-contain opacity-75 mix-blend-screen"
              loading="lazy"
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          {!companion.imageUrl && <Users size={36} style={{ color: rarityColor, opacity: 0.8 }} />}
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded-sm text-[9px] uppercase font-bold"
            style={{
              backgroundColor: "rgba(0,0,0,0.45)",
              border: `1px solid ${rarityColor}50`,
              color: rarityColor,
              fontFamily: "var(--font-display)",
            }}
          >
            {typeLabel(companion.type)}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: rarityColor }} />
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between mb-1 gap-2">
            <h3 className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
              {companion.name}
            </h3>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-sm shrink-0"
              style={{ backgroundColor: `${rarityColor}20`, color: rarityColor, fontFamily: "var(--font-display)" }}
            >
              {getRarityLabel(companion.rarity).toUpperCase()}
            </span>
          </div>
          <p className="text-xs mb-3 line-clamp-2" style={{ color: "var(--wf-text-dim)" }}>
            {companion.description || "Données de compagnon issues du catalogue Cephalon Wodan."}
          </p>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {[
              { l: "VIE", v: companion.health },
              { l: "BOU", v: companion.shield },
              { l: "ARM", v: companion.armor },
            ].map(({ l, v }) => (
              <div key={l} className="text-center p-1 rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
                <div className="text-xs font-bold" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                  {v}
                </div>
                <div className="text-[8px]" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>
                  {l}
                </div>
              </div>
            ))}
          </div>

          {isModular && parts && (
            <div className="mb-3 rounded-sm p-2 text-[9px] space-y-1" style={{ backgroundColor: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.25)" }}>
              <div className="font-bold uppercase tracking-wider" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>
                PIÈCES MODULAIRES DISPONIBLES
              </div>
              <div style={{ color: "var(--wf-text-dim)" }}>
                <div>Têtes : {parts.heads.join(", ")}</div>
                <div>Supports : {parts.brackets.join(", ")}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="p-3 pt-0">
        <Link
          href="/builder"
          className="block text-center text-xs px-2 py-1.5 rounded-sm transition-all wf-btn-primary font-bold"
          style={{ fontSize: "10px", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}
        >
          ÉQUIPER
        </Link>
      </div>
    </div>
  );
}

export default function Companions() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [preceptFilter, setPreceptFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [descending, setDescending] = useState(false);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: COMPANIONS.length };
    TABS.forEach(t => {
      if (t.id !== "all") {
        map[t.id] = COMPANIONS.filter(c => c.type === t.id).length;
      }
    });
    return map;
  }, []);

  const filtered = useMemo(() => {
    return [...COMPANIONS]
      .filter(companion => {
        const query = search.trim().toLowerCase();
        const matchesQuery = !query || [companion.name, companion.type, companion.description].join(" ").toLowerCase().includes(query);
        const matchesTab = activeTab === "all" || companion.type === activeTab;
        const matchesPrecept = preceptFilter === "all" || (preceptFilter === "modular" && ["moa", "hound"].includes(companion.type.toLowerCase())) || (preceptFilter === "organic" && ["beast", "predasite", "vulpaphyla"].includes(companion.type.toLowerCase())) || (preceptFilter === "sentinel" && companion.type.toLowerCase() === "sentinel");
        return matchesQuery && matchesTab && matchesPrecept;
      })
      .sort((a, b) => {
        const av = sortBy === "name" ? a.name.toLowerCase() : (a[sortBy] ?? 0);
        const bv = sortBy === "name" ? b.name.toLowerCase() : (b[sortBy] ?? 0);
        const result = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
        return descending ? -result : result;
      });
  }, [search, activeTab, preceptFilter, sortBy, descending]);

  return (
    <Layout title="COMPAGNONS">
      {/* TABS HEADER */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 p-1 rounded-sm border" style={{ backgroundColor: "var(--wf-bg-panel)", borderColor: "var(--wf-border)" }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-sm transition-all duration-150"
              style={{
                backgroundColor: isActive ? "var(--wf-cyan-dim, rgba(0,229,255,0.15))" : "transparent",
                color: isActive ? "var(--wf-cyan)" : "var(--wf-text-dim)",
                border: isActive ? "1px solid var(--wf-cyan)" : "1px solid transparent",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.05em",
              }}
            >
              <Icon size={14} />
              <span>{tab.label.toUpperCase()}</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px]"
                style={{
                  backgroundColor: isActive ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.06)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTROLS BAR */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-sm border" style={{ backgroundColor: "var(--wf-bg-panel)", borderColor: "var(--wf-border)" }}>
        <div className="relative flex items-center flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: "var(--wf-text-dim)" }} />
          <input
            type="text"
            placeholder="Rechercher un compagnon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-sm outline-none"
            style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          />
        </div>
        <select
          value={preceptFilter}
          onChange={e => setPreceptFilter(e.target.value)}
          className="text-xs py-1.5 px-2 rounded-sm outline-none"
          style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
        >
          <option value="all">Filtre : Tous les types</option>
          <option value="modular">Modulaires (MOA / Hound)</option>
          <option value="organic">Organiques & Bêtes</option>
          <option value="sentinel">Sentinelles</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="text-xs py-1.5 px-2 rounded-sm outline-none"
          style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              Trier : {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setDescending(value => !value)}
          className="px-2.5 py-1.5 text-xs rounded-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}
        >
          {descending ? "DESC" : "ASC"}
        </button>
        <span className="text-xs ml-auto" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
          {filtered.length} affichés / {COMPANIONS.length} total
        </span>
      </div>

      {/* PRECEPTS CATALOG SECTION */}
      <div className="mb-6 rounded-sm p-4 border" style={{ backgroundColor: "var(--wf-bg-panel)", borderColor: "var(--wf-border)" }}>
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>
          PRÉCEPTES ET APTITUDES UNIQUES DE COMPAGNONS
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {COMPANION_PRECEPTS.slice(0, 4).map(precept => (
            <div key={precept.id} className="rounded-sm p-2 text-[10px]" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
              <div className="font-bold mb-0.5" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>{precept.name}</div>
              <div style={{ color: "var(--wf-text-dim)" }} className="line-clamp-2">{precept.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(companion => (
          <CompanionCard key={companion.id} companion={companion} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ color: "var(--wf-text-dim)" }}>
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Aucun compagnon trouvé pour cet onglet</p>
        </div>
      )}
    </Layout>
  );
}
