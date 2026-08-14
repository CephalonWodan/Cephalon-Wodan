// ============================================================
// WARFRAME SET BUILDER — Mods catalogue
// Style reminder: mod taxonomy follows Cephalon-Wodan compatibility buckets,
// with rarity, rank, augment state and polarity exposed for fast build planning.
// ============================================================
import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import Layout from "@/components/Layout";
import { MODS, Mod, ModType, Rarity, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

const MOD_TYPES: Array<{ value: ModType | "all"; label: string }> = [
  { value: "all", label: "Tous" }, { value: "warframe", label: "Warframe" }, { value: "primary", label: "Primaire" }, { value: "secondary", label: "Secondaire" }, { value: "melee", label: "Mêlée" }, { value: "companion", label: "Compagnon" }, { value: "archwing", label: "Archwing / Plexus" }, { value: "necramech", label: "Necramech" }, { value: "parazon", label: "Parazon" }, { value: "kdrive", label: "K-Drive" }, { value: "universal", label: "Universel" },
];
const RARITIES: Array<{ value: Rarity | "all"; label: string }> = [
  { value: "all", label: "Toutes raretés" }, { value: "common", label: "Commun" }, { value: "uncommon", label: "Peu commun" }, { value: "rare", label: "Rare" }, { value: "legendary", label: "Légendaire" },
];
const POLARITY_SYMBOLS: Record<string, string> = { madurai: "V", vazarin: "D", naramon: "—", zenurik: "=", unairu: "⬡", penjaga: "⬟", umbra: "Ω", any: "—" };
const SORT_OPTIONS = [{ value: "name", label: "Nom" }, { value: "maxRank", label: "Rang max" }, { value: "dropCount", label: "Sources" }] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const typeLabel = (value: string) => MOD_TYPES.find(type => type.value === value)?.label || value;

function ModCard({ mod }: { mod: Mod }) {
  const rarityColor = getRarityColor(mod.rarity);
  const rank = Math.max(0, mod.maxRank || 0);
  return (
    <div className="rounded-sm p-3 transition-all duration-200 cursor-pointer hud-frame" style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid ${rarityColor}30` }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = rarityColor; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${rarityColor}20`; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${rarityColor}30`; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
      {mod.imageUrl && (
        <div className="mb-2 h-20 w-full overflow-hidden rounded-sm bg-black/40 flex items-center justify-center border border-white/10">
          <img src={mod.imageUrl} alt={mod.name} className="h-full w-full object-contain" onError={e => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="flex items-start justify-between mb-2"><div className="flex-1 min-w-0"><h3 className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{mod.name}</h3><div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5"><span className="text-xs" style={{ color: rarityColor, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>{getRarityLabel(mod.rarity).toUpperCase()}</span><span className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)", fontSize: "9px" }}>{typeLabel(mod.type)}</span>{mod.isAugment && <span className="text-[9px] uppercase" style={{ color: "#ff6b35" }}>Augment</span>}</div></div><div className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 ml-2" style={{ backgroundColor: `${rarityColor}20`, border: `1px solid ${rarityColor}50`, color: rarityColor, fontFamily: "var(--font-mono)" }}>{POLARITY_SYMBOLS[mod.polarity] || "—"}</div></div>
      <div className="flex items-center gap-0.5 mb-2">{Array.from({ length: Math.min(rank, 10) }).map((_, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: rarityColor }} />)}<span className="text-xs ml-1" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>{rank > 0 ? `R${rank}` : "R—"}</span></div>
      <div className="px-2 py-1.5 rounded-sm mb-2 text-xs font-semibold line-clamp-2" style={{ backgroundColor: `${rarityColor}10`, borderLeft: `2px solid ${rarityColor}`, color: rarityColor, fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}>{mod.effect}</div>
      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--wf-text-dim)" }}>{mod.description}</p>
      <div className="flex items-center justify-between mt-2 text-[9px] uppercase tracking-wide" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}><span>{mod.compatName || typeLabel(mod.type)}</span><span>{mod.dropCount || 0} source{mod.dropCount === 1 ? "" : "s"}</span></div>
    </div>
  );
}

export default function Mods() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ModType | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [augmentOnly, setAugmentOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [descending, setDescending] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...MODS].filter(mod => {
      const searchable = [mod.name, mod.description, mod.effect, mod.compatName].join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (typeFilter === "all" || mod.type === typeFilter) && (rarityFilter === "all" || mod.rarity === rarityFilter) && (!augmentOnly || mod.isAugment);
    }).sort((a, b) => {
      const av = sortBy === "name" ? a.name.toLowerCase() : (a[sortBy] || 0);
      const bv = sortBy === "name" ? b.name.toLowerCase() : (b[sortBy] || 0);
      const result = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return descending ? -result : result;
    });
  }, [search, typeFilter, rarityFilter, augmentOnly, sortBy, descending]);

  return (
    <Layout title="MODS">
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-sm" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
        <div className="relative flex items-center flex-1 min-w-48"><Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: "var(--wf-text-dim)" }} /><input type="text" placeholder="Rechercher un mod, une compatibilité ou un effet..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }} /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as ModType | "all")} className="text-xs py-1.5 px-2 rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{MOD_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value as Rarity | "all")} className="text-xs py-1.5 px-2 rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{RARITIES.map(rarity => <option key={rarity.value} value={rarity.value}>{rarity.label}</option>)}</select>
        <button onClick={() => setAugmentOnly(value => !value)} className="px-2.5 py-1.5 text-xs rounded-sm" style={{ backgroundColor: augmentOnly ? "rgba(255,107,53,0.15)" : "rgba(0,0,0,0.3)", border: `1px solid ${augmentOnly ? "#ff6b35" : "var(--wf-border)"}`, color: augmentOnly ? "#ff6b35" : "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>AUGMENTS</button>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="text-xs py-1.5 px-2 rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>Trier : {option.label}</option>)}</select>
        <button onClick={() => setDescending(value => !value)} className="px-2.5 py-1.5 text-xs rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{descending ? "DESC" : "ASC"}</button>
        <span className="text-xs ml-auto" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{filtered.length} / {MODS.length} mods</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{filtered.map((mod, i) => <div key={mod.id} className="animate-fade-slide-up" style={{ animationDelay: `${Math.min(i, 12) * 15}ms` }}><ModCard mod={mod} /></div>)}</div>
      {filtered.length === 0 && <div className="text-center py-16" style={{ color: "var(--wf-text-dim)" }}><Star size={48} className="mx-auto mb-4 opacity-30" /><p className="text-sm">Aucun mod trouvé</p></div>}
    </Layout>
  );
}
