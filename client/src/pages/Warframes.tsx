// WARFRAME SET BUILDER — Warframes catalogue
// Style reminder: Tenno Codex HUD, dense catalogue with strong cyan hierarchy,
// Prime orange state, canonical repository imagery and explicit sorting controls.
// ============================================================
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Filter, Search, Shield } from "lucide-react";
import Layout from "@/components/Layout";
import AssetImage from "@/components/AssetImage";
import WarframeDetailsModal from "@/components/WarframeDetailsModal";
import { WARFRAMES, Warframe, getRarityColor, getRarityLabel } from "@/lib/warframe-data";
import { useLanguage } from "@/contexts/LanguageContext";

function WarframeCard({ wf, onOpen }: { wf: Warframe; onOpen: (warframe: Warframe) => void }) {
  const rarityColor = getRarityColor(wf.rarity);
  const { t } = useLanguage();
  return (
    <div
      className="rounded-sm overflow-hidden transition-all duration-200 cursor-pointer group"
      style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)", position: "relative" }}
      role="button"
      tabIndex={0}
      aria-label={`Consulter la fiche détaillée de ${wf.name}`}
      onClick={() => onOpen(wf)}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(wf); } }}
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
      </div>
      <div className="p-3 border-t relative" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(7,13,22,0.8)" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${rarityColor}20`, color: rarityColor, border: `1px solid ${rarityColor}50` }}>
            {getRarityLabel(wf.rarity)}
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--wf-text-dim)" }}>
            MR {wf.mastery || 0}
          </span>
        </div>
        <h3 className="text-sm font-bold tracking-wider uppercase truncate" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
          {wf.name}
        </h3>
        <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t text-[11px] font-mono" style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--wf-text-dim)" }}>
          <div>❤️ {wf.health}</div>
          <div>🛡️ {wf.shield}</div>
          <div>🛡️ {wf.armor}</div>
          <div>⚡ {wf.energy}</div>
        </div>
        <div className="mt-2.5 pt-2 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>
            {t("Détails & capacités", "Details & Abilities")}
          </span>
          <span className="text-xs text-cyan-400 group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </div>
  );
}

export default function Warframes() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [versionFilter, setVersionFilter] = useState("Toutes");
  const [sortBy, setSortBy] = useState<"name" | "health" | "shield" | "armor" | "energy">("name");
  const [selectedWarframe, setSelectedWarframe] = useState<Warframe | null>(null);

  const filteredWarframes = useMemo(() => {
    let list = WARFRAMES.filter(wf => {
      const matchSearch = wf.name.toLowerCase().includes(search.toLowerCase());
      if (versionFilter === "Prime") return matchSearch && wf.isPrime;
      if (versionFilter === "Standard") return matchSearch && !wf.isPrime;
      return matchSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "health") return b.health - a.health;
      if (sortBy === "shield") return b.shield - a.shield;
      if (sortBy === "armor") return b.armor - a.armor;
      if (sortBy === "energy") return b.energy - a.energy;
      return 0;
    });
  }, [search, versionFilter, sortBy]);

  const VERSION_FILTERS = [
    { label: t("Toutes", "All"), value: "Toutes" },
    { label: t("Standard", "Standard"), value: "Standard" },
    { label: t("Prime", "Prime"), value: "Prime" },
  ];

  const SORT_OPTIONS = [
    { value: "name", label: t("Nom", "Name") },
    { value: "health", label: t("Vie", "Health") },
    { value: "shield", label: t("Boucliers", "Shields") },
    { value: "armor", label: t("Armure", "Armor") },
    { value: "energy", label: t("Énergie", "Energy") },
  ] as const;

  return (
    <Layout title={t("WARFRAMES // CATALOGUE", "WARFRAMES // CATALOGUE")}>
      <div className="space-y-6">
        {/* FILTERS & SEARCH BAR */}
        <div className="p-4 rounded-sm flex flex-col md:flex-row gap-4 items-center justify-between hud-frame" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("Rechercher une Warframe...", "Search Warframe...")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-sm outline-none"
              style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-body)" }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-sm border" style={{ borderColor: "var(--wf-border)" }}>
              {VERSION_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setVersionFilter(f.value)}
                  className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-all ${versionFilter === f.value ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50" : "text-gray-400 hover:text-white"}`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: "var(--wf-cyan)" }} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-sm outline-none bg-black/40 border cursor-pointer"
                style={{ borderColor: "var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: "#0b121a", color: "#fff" }}>
                    {t("Trier par : ", "Sort by: ")}{opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* STATS COUNT */}
        <div className="flex items-center justify-between text-xs font-mono" style={{ color: "var(--wf-text-dim)" }}>
          <span>{filteredWarframes.length} {t("Warframes répertoriées", "Warframes listed")}</span>
          <span>{t("Sélectionnez une Warframe pour voir les stats et capacités", "Select a Warframe to view stats and abilities")}</span>
        </div>

        {/* GRID */}
        {filteredWarframes.length === 0 ? (
          <div className="p-12 text-center rounded-sm hud-frame" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
            <p className="text-sm font-mono text-gray-400">{t("Aucune Warframe ne correspond à votre recherche.", "No Warframe matches your search.")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredWarframes.map(wf => (
              <WarframeCard key={wf.id} wf={wf} onOpen={setSelectedWarframe} />
            ))}
          </div>
        )}

        {/* DETAILS MODAL */}
        {selectedWarframe && (
          <WarframeDetailsModal warframe={selectedWarframe} onClose={() => setSelectedWarframe(null)} />
        )}
      </div>
    </Layout>
  );
}
