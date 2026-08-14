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

function CompanionDetailModal({ companion, onClose }: { companion: Companion; onClose: () => void }) {
  const rarityColor = getRarityColor(companion.rarity);
  const isModular = ["moa", "hound"].includes(companion.type.toLowerCase());
  const parts = isModular ? (companion.type.toLowerCase() === "moa" ? MOA_PARTS : HOUND_PARTS) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-sm overflow-y-auto flex flex-col p-5 space-y-4"
        style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid ${rarityColor}`, boxShadow: `0 0 35px ${rarityColor}30` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--wf-border)" }}>
          <div>
            <div className="text-[10px] uppercase font-bold" style={{ color: rarityColor, fontFamily: "var(--font-mono)" }}>
              {typeLabel(companion.type)} // FICHE DÉTAILLÉE
            </div>
            <h2 className="text-lg font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>
              {companion.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-white/10 text-white">
            ✕
          </button>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>
          {companion.description || "Compagnon d'élite de l'arsenal Tenno."}
        </p>

        {/* Base Stats */}
        <div>
          <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>
            Statistiques de base (Rang 30)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Points de Vie", value: companion.health, color: "#ef5350" },
              { label: "Boucliers", value: companion.shield, color: "#42a5f5" },
              { label: "Armure", value: companion.armor, color: "#ffa726" },
              { label: "Maîtrise", value: companion.mastery, color: "#ffca28" },
            ].map(stat => (
              <div key={stat.label} className="rounded-sm p-2 text-center" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: `1px solid ${stat.color}40` }}>
                <div className="text-xs font-bold" style={{ color: stat.color, fontFamily: "var(--font-mono)" }}>{stat.value}</div>
                <div className="text-[9px]" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Modifiers */}
        {companion.modifiers && companion.modifiers.length > 0 && (
          <div>
            <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>
              Modificateurs & Capacités associées
            </div>
            <div className="space-y-1.5">
              {companion.modifiers.map(mod => (
                <div key={mod.name} className="rounded-sm p-2 text-xs" style={{ backgroundColor: "rgba(167,139,250,0.06)", borderLeft: "2px solid #a78bfa" }}>
                  <span className="font-bold text-white mr-2">{mod.name}:</span>
                  <span style={{ color: "var(--wf-text-dim)" }}>{mod.effect}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modular Parts if MOA / Hound */}
        {isModular && parts && (
          <div>
            <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>
              Composants modulaires constructibles
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-sm p-2" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
                <div className="font-bold text-white mb-1">Têtes</div>
                <div className="text-[10px]" style={{ color: "var(--wf-text-dim)" }}>{parts.heads.join(", ")}</div>
              </div>
              <div className="rounded-sm p-2" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
                <div className="font-bold text-white mb-1">Supports</div>
                <div className="text-[10px]" style={{ color: "var(--wf-text-dim)" }}>{parts.brackets.join(", ")}</div>
              </div>
              <div className="rounded-sm p-2" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
                <div className="font-bold text-white mb-1">Cœurs</div>
                <div className="text-[10px]" style={{ color: "var(--wf-text-dim)" }}>{MOA_PARTS.cores.join(", ")}</div>
              </div>
              <div className="rounded-sm p-2" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
                <div className="font-bold text-white mb-1">Gyroscopes</div>
                <div className="text-[10px]" style={{ color: "var(--wf-text-dim)" }}>{MOA_PARTS.gyros.join(", ")}</div>
              </div>
            </div>
          </div>
        )}

        {/* Crafting Recipe */}
        {companion.recipe && (
          <div>
            <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#66bb6a", fontFamily: "var(--font-display)" }}>
              Schéma de fabrication (Fonderie) — {companion.recipe.buildTimeHours}h · {companion.recipe.credits.toLocaleString()} CR
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {companion.recipe.components.map(comp => (
                <div key={comp.name} className="rounded-sm p-2 text-center" style={{ backgroundColor: "rgba(102,187,106,0.06)", border: "1px solid rgba(102,187,106,0.3)" }}>
                  <div className="text-xs font-bold" style={{ color: "#66bb6a", fontFamily: "var(--font-mono)" }}>{comp.count}x</div>
                  <div className="text-[10px] truncate" style={{ color: "var(--wf-text)" }}>{comp.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Link
            href="/builder"
            className="px-4 py-2 text-xs rounded-sm transition-all wf-btn-primary font-bold text-center"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}
          >
            ÉQUIPER DANS LE BUILDER
          </Link>
        </div>
      </div>
    </div>
  );
}

function CompanionCard({ companion, onSelect }: { companion: Companion; onSelect: (c: Companion) => void }) {
  const rarityColor = getRarityColor(companion.rarity);
  const isModular = ["moa", "hound"].includes(companion.type.toLowerCase());
  const parts = isModular ? (companion.type.toLowerCase() === "moa" ? MOA_PARTS : HOUND_PARTS) : null;
  return (
    <div
      onClick={() => onSelect(companion)}
      className="rounded-sm overflow-hidden transition-all duration-200 animate-fade-slide-up flex flex-col justify-between cursor-pointer"
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
        <div
          className="block text-center text-xs px-2 py-1.5 rounded-sm transition-all wf-btn-primary font-bold"
          style={{ fontSize: "10px", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}
        >
          VOIR LES DÉTAILS & SCHÉMA
        </div>
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
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);

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
          <CompanionCard key={companion.id} companion={companion} onSelect={c => setSelectedCompanion(c)} />
        ))}
      </div>

      {selectedCompanion && (
        <CompanionDetailModal companion={selectedCompanion} onClose={() => setSelectedCompanion(null)} />
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ color: "var(--wf-text-dim)" }}>
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Aucun compagnon trouvé pour cet onglet</p>
        </div>
      )}
    </Layout>
  );
}
