// ============================================================
// WARFRAME SET BUILDER — Companions catalogue
// Style reminder: companion classes and repository imagery remain visible,
// with the same compact stat-first treatment as the Warframe catalogue.
// ============================================================
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { COMPANIONS, Companion, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

const TYPES = ["Tous", "sentinel", "beast", "moa", "hound", "predasite", "vulpaphyla"];
const SORT_OPTIONS = [{ value: "name", label: "Nom" }, { value: "health", label: "Vie" }, { value: "shield", label: "Boucliers" }, { value: "armor", label: "Armure" }] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];
const typeLabel = (type: string) => ({ sentinel: "Sentinelle", beast: "Bête", moa: "Moa", hound: "Hound", predasite: "Predasite", vulpaphyla: "Vulpaphyla" } as Record<string, string>)[type] || type;

function CompanionCard({ companion }: { companion: Companion }) {
  const rarityColor = getRarityColor(companion.rarity);
  return <div className="rounded-sm overflow-hidden transition-all duration-200 animate-fade-slide-up" style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid var(--wf-border)` }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = rarityColor; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-border)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
    <div className="relative h-28 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${rarityColor}12, rgba(0,0,0,0.6))` }}>
      {companion.imageUrl && <img src={companion.imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain opacity-75 mix-blend-screen" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} />}
      {!companion.imageUrl && <Users size={36} style={{ color: rarityColor, opacity: 0.8 }} />}
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-sm text-[9px] uppercase" style={{ backgroundColor: "rgba(0,0,0,0.45)", border: `1px solid ${rarityColor}50`, color: rarityColor, fontFamily: "var(--font-display)" }}>{typeLabel(companion.type)}</div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: rarityColor }} />
    </div>
    <div className="p-3"><div className="flex items-start justify-between mb-1 gap-2"><h3 className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{companion.name}</h3><span className="text-[9px] px-1.5 py-0.5 rounded-sm shrink-0" style={{ backgroundColor: `${rarityColor}20`, color: rarityColor, fontFamily: "var(--font-display)" }}>{getRarityLabel(companion.rarity).toUpperCase()}</span></div><p className="text-xs mb-3 line-clamp-2" style={{ color: "var(--wf-text-dim)" }}>{companion.description || "Données de compagnon issues du catalogue Cephalon Wodan."}</p><div className="grid grid-cols-3 gap-1 mb-3">{[{ l: "VIE", v: companion.health }, { l: "BOU", v: companion.shield }, { l: "ARM", v: companion.armor }].map(({ l, v }) => <div key={l} className="text-center p-1 rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}><div className="text-xs font-bold" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>{v}</div><div className="text-[8px]" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{l}</div></div>)}</div><Link href="/builder" className="block text-center text-xs px-2 py-1 rounded-sm transition-all wf-btn-primary" style={{ fontSize: "10px" }}>ÉQUIPER</Link></div>
  </div>;
}

export default function Companions() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [descending, setDescending] = useState(false);
  const filtered = useMemo(() => [...COMPANIONS].filter(companion => { const query = search.trim().toLowerCase(); return (!query || [companion.name, companion.type, companion.description].join(" ").toLowerCase().includes(query)) && (typeFilter === "Tous" || companion.type === typeFilter); }).sort((a, b) => { const av = sortBy === "name" ? a.name.toLowerCase() : a[sortBy]; const bv = sortBy === "name" ? b.name.toLowerCase() : b[sortBy]; const result = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv); return descending ? -result : result; }), [search, typeFilter, sortBy, descending]);
  return <Layout title="COMPAGNONS"><div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-sm" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}><div className="relative flex items-center flex-1 min-w-48"><Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: "var(--wf-text-dim)" }} /><input type="text" placeholder="Rechercher un compagnon..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }} /></div><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-xs py-1.5 px-2 rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{TYPES.map(type => <option key={type} value={type}>{type === "Tous" ? "Tous les types" : typeLabel(type)}</option>)}</select><select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="text-xs py-1.5 px-2 rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>Trier : {option.label}</option>)}</select><button onClick={() => setDescending(value => !value)} className="px-2.5 py-1.5 text-xs rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{descending ? "DESC" : "ASC"}</button><span className="text-xs ml-auto" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{filtered.length} / {COMPANIONS.length} compagnons</span></div><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{filtered.map(companion => <CompanionCard key={companion.id} companion={companion} />)}</div>{filtered.length === 0 && <div className="text-center py-16" style={{ color: "var(--wf-text-dim)" }}><Users size={48} className="mx-auto mb-4 opacity-30" /><p className="text-sm">Aucun compagnon trouvé</p></div>}</Layout>;
}
