// ============================================================
// WARFRAME SET BUILDER — Arcanes catalogue
// Style reminder: Tenno Codex HUD, compact search-first catalogue with
// rarity accents, target categories and rank metadata visible at a glance.
// ============================================================
import { useMemo, useState } from "react";
import { Filter, Search, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import { ARCANES, Arcane, ArcaneType, Rarity, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

const TYPES: Array<{ value: ArcaneType | "all"; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "warframe", label: "Warframe" },
  { value: "primary", label: "Primaire" },
  { value: "secondary", label: "Secondaire" },
  { value: "melee", label: "Mêlée" },
  { value: "operator", label: "Opérateur" },
  { value: "amp", label: "Amp" },
  { value: "kitgun", label: "Kitgun" },
  { value: "zaw", label: "Zaw" },
];
const RARITIES: Array<{ value: Rarity | "all"; label: string }> = [
  { value: "all", label: "Toutes raretés" },
  { value: "common", label: "Commun" },
  { value: "uncommon", label: "Peu commun" },
  { value: "rare", label: "Rare" },
  { value: "legendary", label: "Légendaire" },
];
const SORT_OPTIONS = [
  { value: "name", label: "Nom" },
  { value: "maxRank", label: "Rang max" },
  { value: "dissolution", label: "Dissolution" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const typeLabel = (value: string) => TYPES.find(type => type.value === value)?.label || value;

function ArcaneCard({ arcane }: { arcane: Arcane }) {
  const color = getRarityColor(arcane.rarity);
  return (
    <article className="relative overflow-hidden rounded-sm p-3 transition-all duration-200 hud-frame" style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid ${color}35` }} onMouseEnter={event => { event.currentTarget.style.borderColor = color; event.currentTarget.style.boxShadow = `0 0 14px ${color}20`; }} onMouseLeave={event => { event.currentTarget.style.borderColor = `${color}35`; event.currentTarget.style.boxShadow = "none"; }}>
      <div className="flex items-start gap-3">
        <div className="relative w-12 h-12 shrink-0 rounded-sm flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}22, rgba(0,0,0,.35))`, border: `1px solid ${color}55` }}>
          {arcane.imageUrl && <img src={arcane.imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} />}
          <Sparkles size={20} style={{ color, opacity: 0.75 }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><h3 className="truncate text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{arcane.name}</h3><span className="shrink-0 rounded-sm px-1.5 py-0.5 text-[9px]" style={{ color, backgroundColor: `${color}18`, fontFamily: "var(--font-display)" }}>{getRarityLabel(arcane.rarity).toUpperCase()}</span></div>
          <div className="mt-0.5 flex items-center gap-2 text-[9px] uppercase tracking-wider" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}><span>{typeLabel(arcane.type)}</span><span style={{ color: "var(--wf-text-dim)" }}>RANG MAX {arcane.maxRank}</span></div>
        </div>
      </div>
      <div className="mt-3 rounded-sm px-2 py-1.5 text-xs" style={{ color, backgroundColor: `${color}10`, borderLeft: `2px solid ${color}`, fontFamily: "var(--font-display)" }}>{arcane.description || "Effet d’Arcane"}</div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wide" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}><span>{arcane.criteria || "Condition passive"}</span><span>{arcane.dissolution ? `${arcane.dissolution} dissolution` : "—"}</span></div>
    </article>
  );
}

export default function Arcanes() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ArcaneType | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [descending, setDescending] = useState(false);
  const filtered = useMemo(() => [...ARCANES].filter(arcane => {
    const query = search.trim().toLowerCase();
    const haystack = [arcane.name, arcane.type, arcane.criteria, arcane.description].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (typeFilter === "all" || arcane.type === typeFilter) && (rarityFilter === "all" || arcane.rarity === rarityFilter);
  }).sort((a, b) => {
    const av = sortBy === "name" ? a.name.toLowerCase() : a[sortBy];
    const bv = sortBy === "name" ? b.name.toLowerCase() : b[sortBy];
    const result = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
    return descending ? -result : result;
  }), [search, typeFilter, rarityFilter, sortBy, descending]);

  return <Layout title="ARCANES"><div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm p-4" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}><div className="relative flex min-w-48 flex-1 items-center"><Search size={13} className="pointer-events-none absolute left-2.5" style={{ color: "var(--wf-text-dim)" }} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un Arcane, une condition ou un effet..." className="w-full rounded-sm py-1.5 pl-8 pr-3 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }} /></div><div className="flex items-center gap-1.5"><Filter size={12} style={{ color: "var(--wf-text-dim)" }} /><select value={typeFilter} onChange={event => setTypeFilter(event.target.value as ArcaneType | "all")} className="rounded-sm px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div><select value={rarityFilter} onChange={event => setRarityFilter(event.target.value as Rarity | "all")} className="rounded-sm px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{RARITIES.map(rarity => <option key={rarity.value} value={rarity.value}>{rarity.label}</option>)}</select><select value={sortBy} onChange={event => setSortBy(event.target.value as SortKey)} className="rounded-sm px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>Trier : {option.label}</option>)}</select><button onClick={() => setDescending(value => !value)} className="rounded-sm px-2.5 py-1.5 text-xs" style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{descending ? "DESC" : "ASC"}</button><span className="ml-auto text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{filtered.length} / {ARCANES.length} arcanes</span></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map(arcane => <ArcaneCard key={arcane.id} arcane={arcane} />)}</div>{filtered.length === 0 && <div className="py-16 text-center" style={{ color: "var(--wf-text-dim)" }}><Sparkles size={48} className="mx-auto mb-4 opacity-30" /><p className="text-sm">Aucun arcane trouvé</p></div>}</Layout>;
}
