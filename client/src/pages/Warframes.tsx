// ============================================================
// WARFRAME SET BUILDER — Warframes catalogue
// Style reminder: Tenno Codex HUD, dense catalogue with strong cyan hierarchy,
// Prime orange state, canonical repository imagery and explicit sorting controls.
// ============================================================
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Filter, Search, Shield } from "lucide-react";
import Layout from "@/components/Layout";
import AssetImage from "@/components/AssetImage";
import { WARFRAMES, Warframe, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

const VERSION_FILTERS = ["Toutes", "Standard", "Prime"];
const SORT_OPTIONS = [
  { value: "name", label: "Nom" },
  { value: "health", label: "Vie" },
  { value: "shield", label: "Boucliers" },
  { value: "armor", label: "Armure" },
  { value: "energy", label: "Énergie" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

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
      <div className="relative h-36 flex items-center justify-center overflow-hidden" style={{ backgroundImage: "url(/manus-storage/warframe-card-bg_e4519a70.jpg)", backgroundSize: "cover" }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${rarityColor}18, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.8))` }} />
        {wf.imageUrls && wf.imageUrls.length > 1 ? (
          <div className="absolute inset-0 z-[1] flex items-center justify-center gap-1 px-3">
            {wf.imageUrls.slice(0, 2).map((source, index) => (
              <div key={source} className="relative h-full min-w-0 flex-1">
                <AssetImage item={wf} type="warframe" preferredSource={source} alt={`${wf.name} — ${index === 0 ? "Sirius" : "Orion"}`} className="h-full w-full object-contain opacity-75 mix-blend-screen" loading="lazy" fallback={<Shield size={32} className="absolute inset-0 m-auto" style={{ color: rarityColor, opacity: 0.8 }} />} />
              </div>
            ))}
          </div>
        ) : (
          <AssetImage item={wf} type="warframe" alt={wf.name} className="absolute inset-0 z-[1] h-full w-full object-contain opacity-75 mix-blend-screen" loading="lazy" fallback={<Shield size={40} className="relative z-10" style={{ color: rarityColor, opacity: 0.8 }} />} />
        )}
        <div className="absolute top-1.5 left-1.5 w-3 h-3" style={{ borderTop: `1.5px solid ${rarityColor}`, borderLeft: `1.5px solid ${rarityColor}`, opacity: 0.8 }} />
        <div className="absolute top-1.5 right-1.5 w-3 h-3" style={{ borderTop: `1.5px solid ${rarityColor}`, borderRight: `1.5px solid ${rarityColor}`, opacity: 0.8 }} />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3" style={{ borderBottom: `1.5px solid ${rarityColor}`, borderLeft: `1.5px solid ${rarityColor}`, opacity: 0.8 }} />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3" style={{ borderBottom: `1.5px solid ${rarityColor}`, borderRight: `1.5px solid ${rarityColor}`, opacity: 0.8 }} />
        {wf.isPrime && <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-sm text-xs font-bold" style={{ backgroundColor: "rgba(255,107,53,0.2)", border: "1px solid #ff6b35", color: "#ff6b35", fontFamily: "var(--font-display)", fontSize: "9px" }}>PRIME</div>}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 z-10" style={{ backgroundColor: rarityColor }} />
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-sm font-bold tracking-wide truncate" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{wf.name}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded-sm ml-1 shrink-0" style={{ backgroundColor: `${rarityColor}20`, color: rarityColor, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>{getRarityLabel(wf.rarity).toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
          <span>{wf.role}</span>
          {wf.abilities.length > 0 && <span style={{ color: "var(--wf-text-dim)" }}>{wf.abilities.length} capacités</span>}
        </div>
        <p className="text-xs mb-3 leading-relaxed line-clamp-2" style={{ color: "var(--wf-text-dim)" }}>{wf.description || "Données de codex disponibles dans le catalogue Cephalon Wodan."}</p>

        <div className="grid grid-cols-4 gap-1 mb-3">
          {[{ label: "VIE", value: wf.health }, { label: "BOU", value: wf.shield }, { label: "ARM", value: wf.armor }, { label: "ENE", value: wf.energy }].map(({ label, value }) => (
            <div key={label} className="text-center p-1 rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
              <div className="text-xs font-bold" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>{value}</div>
              <div className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)", fontSize: "8px", letterSpacing: "0.05em" }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--wf-text-dim)" }}>MR: <span style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>{wf.mastery}</span></span>
          <Link href="/builder" className="text-xs px-2 py-1 rounded-sm transition-all wf-btn-primary" style={{ fontSize: "10px" }}>UTILISER</Link>
        </div>
      </div>
    </div>
  );
}

export default function Warframes() {
  const [search, setSearch] = useState("");
  const [versionFilter, setVersionFilter] = useState("Toutes");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [descending, setDescending] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...WARFRAMES]
      .filter(wf => {
        const searchable = [wf.name, wf.role, wf.description, ...wf.abilities].join(" ").toLowerCase();
        const matchSearch = !query || searchable.includes(query);
        const matchVersion = versionFilter === "Toutes" || wf.role === versionFilter;
        return matchSearch && matchVersion;
      })
      .sort((a, b) => {
        const av = sortBy === "name" ? a.name.toLowerCase() : a[sortBy];
        const bv = sortBy === "name" ? b.name.toLowerCase() : b[sortBy];
        const result = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
        return descending ? -result : result;
      });
  }, [search, versionFilter, sortBy, descending]);

  return (
    <Layout title="WARFRAMES">
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-sm" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
        <div className="relative flex items-center flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: "var(--wf-text-dim)" }} />
          <input type="text" placeholder="Rechercher un Warframe, une capacité..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }} />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: "var(--wf-text-dim)" }} />
          <select value={versionFilter} onChange={e => setVersionFilter(e.target.value)} className="text-xs py-1.5 px-2 rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>
            {VERSION_FILTERS.map(value => <option key={value} value={value}>{value === "Toutes" ? "Toutes les versions" : value}</option>)}
          </select>
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="text-xs py-1.5 px-2 rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>
          {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>Trier : {option.label}</option>)}
        </select>
        <button onClick={() => setDescending(value => !value)} className="px-2.5 py-1.5 text-xs rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{descending ? "DESC" : "ASC"}</button>
        <span className="text-xs ml-auto" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{filtered.length} / {WARFRAMES.length} entrées</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((wf, i) => <div key={wf.id} className="animate-fade-slide-up" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}><WarframeCard wf={wf} /></div>)}
      </div>

      {filtered.length === 0 && <div className="text-center py-16" style={{ color: "var(--wf-text-dim)" }}><Shield size={48} className="mx-auto mb-4 opacity-30" /><p className="text-sm">Aucun Warframe trouvé</p></div>}
    </Layout>
  );
}
