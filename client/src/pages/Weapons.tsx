// ============================================================
// WARFRAME SET BUILDER — Weapons catalogue
// Style reminder: Tenno Codex HUD, category tabs mirror Cephalon-Wodan
// (Primary / Secondary / Melee), while sorting exposes combat stats first.
// ============================================================
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Filter, Search, Sword } from "lucide-react";
import Layout from "@/components/Layout";
import { WEAPONS, Weapon, WeaponType, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

const WEAPON_TYPES: { label: string; value: WeaponType | "all" }[] = [
  { label: "Toutes", value: "all" },
  { label: "Primaires", value: "primary" },
  { label: "Secondaires", value: "secondary" },
  { label: "Mêlée", value: "melee" },
];
const SORT_OPTIONS = [
  { value: "name", label: "Nom" },
  { value: "damage", label: "Dégâts" },
  { value: "critChance", label: "Critique" },
  { value: "statusChance", label: "Statut" },
  { value: "mastery", label: "MR" },
  { value: "fireRate", label: "Cadence" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function WeaponCard({ weapon }: { weapon: Weapon }) {
  const rarityColor = getRarityColor(weapon.rarity);
  const typeLabels: Record<WeaponType, string> = { primary: "PRIMAIRE", secondary: "SECONDAIRE", melee: "MÊLÉE", archgun: "ARCHGUN", archmelee: "ARCHMÊLÉE" };
  return (
    <div className="rounded-sm overflow-hidden transition-all duration-200 cursor-pointer" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = rarityColor; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${rarityColor}20`; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
      <div className="relative h-28 flex items-center justify-center overflow-hidden" style={{ backgroundImage: "url(/manus-storage/warframe-card-bg_e4519a70.jpg)", backgroundSize: "cover" }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${rarityColor}12, transparent 60%, rgba(0,0,0,0.75))` }} />
        {weapon.imageUrl && <img src={weapon.imageUrl} alt="" className="absolute inset-0 z-[1] h-full w-full object-contain opacity-75 mix-blend-screen" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} />}
        {!weapon.imageUrl && <Sword size={36} className="relative z-10" style={{ color: rarityColor, opacity: 0.8 }} />}
        <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-sm text-xs" style={{ backgroundColor: "rgba(0,0,0,0.5)", border: `1px solid ${rarityColor}50`, color: rarityColor, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>{typeLabels[weapon.type]}</div>
        {weapon.isPrime && <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-sm text-xs" style={{ backgroundColor: "rgba(255,107,53,0.2)", border: "1px solid #ff6b35", color: "#ff6b35", fontFamily: "var(--font-display)", fontSize: "9px" }}>PRIME</div>}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 z-10" style={{ backgroundColor: rarityColor }} />
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between mb-1 gap-2"><h3 className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{weapon.name}</h3><span className="text-xs px-1.5 py-0.5 rounded-sm shrink-0" style={{ backgroundColor: `${rarityColor}20`, color: rarityColor, fontFamily: "var(--font-display)", fontSize: "9px" }}>{getRarityLabel(weapon.rarity).toUpperCase()}</span></div>
        <div className="flex gap-2 mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><span>{weapon.weaponClass || "Arme"}</span>{weapon.trigger && <span>· {weapon.trigger}</span>}</div>
        <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>{weapon.description || "Données balistiques issues du catalogue Cephalon Wodan."}</p>

        <div className="grid grid-cols-2 gap-1 mb-3">{[
          { label: "DÉGÂTS", value: Math.round(weapon.damage) },
          { label: "CRIT%", value: `${(weapon.critChance * 100).toFixed(1)}%` },
          { label: "MULTI", value: `${weapon.critMultiplier}x` },
          { label: "STATUT%", value: `${(weapon.statusChance * 100).toFixed(1)}%` },
        ].map(({ label, value }) => <div key={label} className="flex items-center justify-between px-2 py-1 rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}><span className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)", fontSize: "9px" }}>{label}</span><span className="text-xs font-bold" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>{value}</span></div>)}
        </div>

        <div className="flex items-center justify-between"><span className="text-xs" style={{ color: "var(--wf-text-dim)" }}>MR: <span style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>{weapon.mastery}</span></span><Link href="/builder" className="text-xs px-2 py-1 rounded-sm transition-all wf-btn-primary" style={{ fontSize: "10px" }}>ÉQUIPER</Link></div>
      </div>
    </div>
  );
}

export default function Weapons() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<WeaponType | "all">("all");
  const [primeOnly, setPrimeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [descending, setDescending] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...WEAPONS].filter(weapon => {
      const searchable = [weapon.name, weapon.description, weapon.weaponClass, weapon.trigger, ...Object.keys(weapon.damageTypes || {})].join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (typeFilter === "all" || weapon.type === typeFilter) && (!primeOnly || weapon.isPrime);
    }).sort((a, b) => {
      const av = sortBy === "name" ? a.name.toLowerCase() : a[sortBy];
      const bv = sortBy === "name" ? b.name.toLowerCase() : b[sortBy];
      const result = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return descending ? -result : result;
    });
  }, [search, typeFilter, primeOnly, sortBy, descending]);

  return (
    <Layout title="ARMES">
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-sm" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
        <div className="relative flex items-center flex-1 min-w-48"><Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: "var(--wf-text-dim)" }} /><input type="text" placeholder="Rechercher une arme, un type ou un élément..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }} /></div>
        <div className="flex items-center gap-1"><Filter size={12} style={{ color: "var(--wf-text-dim)" }} />{WEAPON_TYPES.map(t => <button key={t.value} onClick={() => setTypeFilter(t.value)} className="px-2.5 py-1.5 text-xs rounded-sm transition-all" style={{ backgroundColor: typeFilter === t.value ? "rgba(79,195,247,0.15)" : "rgba(0,0,0,0.3)", border: `1px solid ${typeFilter === t.value ? "var(--wf-cyan)" : "var(--wf-border)"}`, color: typeFilter === t.value ? "var(--wf-cyan)" : "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{t.label}</button>)}</div>
        <button onClick={() => setPrimeOnly(value => !value)} className="px-3 py-1.5 text-xs rounded-sm transition-all" style={{ backgroundColor: primeOnly ? "rgba(255,107,53,0.15)" : "rgba(0,0,0,0.3)", border: `1px solid ${primeOnly ? "#ff6b35" : "var(--wf-border)"}`, color: primeOnly ? "#ff6b35" : "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>PRIME</button>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="text-xs py-1.5 px-2 rounded-sm outline-none" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>Trier : {option.label}</option>)}</select>
        <button onClick={() => setDescending(value => !value)} className="px-2.5 py-1.5 text-xs rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{descending ? "DESC" : "ASC"}</button>
        <span className="text-xs ml-auto" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{filtered.length} / {WEAPONS.length} armes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">{filtered.map((weapon, i) => <div key={weapon.id} className="animate-fade-slide-up" style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}><WeaponCard weapon={weapon} /></div>)}</div>
      {filtered.length === 0 && <div className="text-center py-16" style={{ color: "var(--wf-text-dim)" }}><Sword size={48} className="mx-auto mb-4 opacity-30" /><p className="text-sm">Aucune arme trouvée</p></div>}
    </Layout>
  );
}
