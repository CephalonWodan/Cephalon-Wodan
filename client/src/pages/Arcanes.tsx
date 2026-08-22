// WARFRAME SET BUILDER — Arcanes catalogue
// Style reminder: Tenno Codex HUD, compact search-first catalogue with
// rarity accents, target categories and rank metadata visible at a glance.
// ============================================================
import { useMemo, useState } from "react";
import { Filter, Search, Sparkles, X } from "lucide-react";
import Layout from "@/components/Layout";
import AssetImage from "@/components/AssetImage";
import { ARCANES, Arcane, ArcaneType, Rarity, getRarityColor, getRarityLabel } from "@/lib/warframe-data";
import { useLanguage } from "@/contexts/LanguageContext";

function ArcaneCard({ arcane, onPreview }: { arcane: Arcane; onPreview: (arcane: Arcane) => void }) {
  const color = getRarityColor(arcane.rarity);
  const { t } = useLanguage();
  return (
    <article
      onClick={() => onPreview(arcane)}
      className="relative overflow-hidden rounded-sm p-3 transition-all duration-200 hud-frame cursor-pointer"
      style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid ${color}35` }}
      onMouseEnter={event => { event.currentTarget.style.borderColor = color; event.currentTarget.style.boxShadow = `0 0 14px ${color}20`; }}
      onMouseLeave={event => { event.currentTarget.style.borderColor = `${color}35`; event.currentTarget.style.boxShadow = "none"; }}
    >
      <div className="flex items-start gap-3">
        <div className="relative w-12 h-12 shrink-0 rounded-sm flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}22, rgba(0,0,0,.35))`, border: `1px solid ${color}55` }}>
          <AssetImage item={arcane} type="arcane" alt={arcane.name} className="absolute inset-0 h-full w-full object-contain" loading="lazy" fallback={<Sparkles size={20} style={{ color, opacity: 0.75 }} />} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{arcane.name}</h3>
            <span className="shrink-0 rounded-sm px-1.5 py-0.5 text-[9px]" style={{ color, backgroundColor: `${color}18`, fontFamily: "var(--font-display)" }}>{getRarityLabel(arcane.rarity).toUpperCase()}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[9px] uppercase tracking-wider" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>
            <span>{arcane.type}</span>
            <span style={{ color: "var(--wf-text-dim)" }}>{t("RANG MAX", "MAX RANK")} {arcane.maxRank}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-sm px-2 py-1.5 text-xs" style={{ color, backgroundColor: `${color}10`, borderLeft: `2px solid ${color}`, fontFamily: "var(--font-display)" }}>
        {arcane.description || t("Effet d’Arcane", "Arcane Effect")}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wide" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
        <span>{arcane.criteria || t("Condition passive", "Passive condition")}</span>
        <span>{arcane.dissolution ? `${arcane.dissolution} ${t("dissolution", "dissolution")}` : "—"}</span>
      </div>
    </article>
  );
}

export default function Arcanes() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ArcaneType | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "maxRank" | "dissolution">("name");
  const [descending, setDescending] = useState(false);
  const [previewArcane, setPreviewArcane] = useState<Arcane | null>(null);

  const TYPES: Array<{ value: ArcaneType | "all"; label: string }> = [
    { value: "all", label: t("Toutes", "All") },
    { value: "warframe", label: "Warframe" },
    { value: "primary", label: t("Primaire", "Primary") },
    { value: "secondary", label: t("Secondaire", "Secondary") },
    { value: "melee", label: t("Mêlée", "Melee") },
    { value: "operator", label: t("Opérateur", "Operator") },
    { value: "amp", label: "Amp" },
    { value: "kitgun", label: "Kitgun" },
    { value: "zaw", label: "Zaw" },
  ];

  const RARITIES: Array<{ value: Rarity | "all"; label: string }> = [
    { value: "all", label: t("Toutes raretés", "All Rarities") },
    { value: "common", label: t("Commun", "Common") },
    { value: "uncommon", label: t("Peu commun", "Uncommon") },
    { value: "rare", label: "Rare" },
    { value: "legendary", label: t("Légendaire", "Legendary") },
  ];

  const SORT_OPTIONS = [
    { value: "name", label: t("Nom", "Name") },
    { value: "maxRank", label: t("Rang max", "Max Rank") },
    { value: "dissolution", label: t("Dissolution", "Dissolution") },
  ] as const;

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

  return (
    <Layout title={t("ARCANES // CATALOGUE", "ARCANES // CATALOGUE")}>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm p-4" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
        <div className="relative flex min-w-48 flex-1 items-center">
          <Search size={13} className="pointer-events-none absolute left-2.5" style={{ color: "var(--wf-text-dim)" }} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t("Rechercher un Arcane, une condition ou un effet...", "Search an Arcane, condition or effect...")}
            className="w-full rounded-sm py-1.5 pl-8 pr-3 text-xs outline-none"
            style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: "var(--wf-text-dim)" }} />
          <select
            value={typeFilter}
            onChange={event => setTypeFilter(event.target.value as ArcaneType | "all")}
            className="rounded-sm px-2 py-1.5 text-xs outline-none"
            style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          >
            {TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <select
          value={rarityFilter}
          onChange={event => setRarityFilter(event.target.value as Rarity | "all")}
          className="rounded-sm px-2 py-1.5 text-xs outline-none"
          style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
        >
          {RARITIES.map(rarity => <option key={rarity.value} value={rarity.value}>{rarity.label}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={event => setSortBy(event.target.value as any)}
          className="rounded-sm px-2 py-1.5 text-xs outline-none"
          style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
        >
          {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{t("Trier : ", "Sort: ")}{option.label}</option>)}
        </select>
        <button
          onClick={() => setDescending(value => !value)}
          className="rounded-sm px-2.5 py-1.5 text-xs"
          style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}
        >
          {descending ? "DESC" : "ASC"}
        </button>
        <span className="ml-auto text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
          {filtered.length} / {ARCANES.length} {t("arcanes", "arcanes")}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center rounded-sm hud-frame" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
          <Sparkles size={48} className="mx-auto mb-4 opacity-30 text-cyan-400" />
          <p className="text-sm font-mono text-gray-400">{t("Aucun arcane ne correspond à votre recherche.", "No arcane matches your search.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(arcane => <ArcaneCard key={arcane.id} arcane={arcane} onPreview={setPreviewArcane} />)}
        </div>
      )}

      {previewArcane && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setPreviewArcane(null)}>
          <div
            className="w-full max-w-lg rounded-sm p-6 space-y-4 hud-frame relative"
            style={{ backgroundColor: "var(--wf-bg-deep)", border: "1px solid var(--wf-cyan)", boxShadow: "0 0 40px rgba(79,195,247,0.25)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--wf-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-sm flex items-center justify-center overflow-hidden" style={{ background: "rgba(79,195,247,0.1)", border: "1px solid var(--wf-cyan)" }}>
                  <AssetImage item={previewArcane} type="arcane" alt={previewArcane.name} className="h-full w-full object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{previewArcane.name}</h3>
                  <p className="text-xs uppercase tracking-widest font-mono" style={{ color: "var(--wf-cyan)" }}>{previewArcane.type} · {t("RANG MAX", "MAX RANK")} {previewArcane.maxRank}</p>
                </div>
              </div>
              <button onClick={() => setPreviewArcane(null)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs font-mono" style={{ color: "var(--wf-text)" }}>
              <div className="p-3 rounded-sm bg-black/40 border border-white/10">
                <div className="text-[10px] uppercase text-gray-400 mb-1">{t("DESCRIPTION DE L'EFFET", "EFFECT DESCRIPTION")}</div>
                <p className="text-sm font-sans">{previewArcane.description || t("Aucune description disponible.", "No description available.")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-sm bg-black/30 border border-white/10">
                  <div className="text-[10px] uppercase text-gray-400 mb-0.5">{t("CONDITION D'ACTIVATION", "ACTIVATION CONDITION")}</div>
                  <div>{previewArcane.criteria || t("Passive", "Passive")}</div>
                </div>
                <div className="p-2.5 rounded-sm bg-black/30 border border-white/10">
                  <div className="text-[10px] uppercase text-gray-400 mb-0.5">{t("DISSOLUTION", "DISSOLUTION")}</div>
                  <div>{previewArcane.dissolution || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
