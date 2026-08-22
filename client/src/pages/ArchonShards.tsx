// WARFRAME SET BUILDER — Archon Shards catalogue
// Style reminder: use crystal color coding, Tauforged orange state and
// effect chips to make five-slot planning fast inside the Tenno Codex HUD.
// ============================================================
import { useMemo, useState } from "react";
import { Filter, Gem, Search } from "lucide-react";
import Layout from "@/components/Layout";
import { ARCHON_SHARDS, ArchonShard } from "@/lib/warframe-data";
import { useLanguage } from "@/contexts/LanguageContext";

const COLORS = ["Tous", "azure", "crimson", "amber", "topaz", "violet", "emerald"] as const;
const VARIANTS = ["Toutes", "standard", "tauforged"] as const;

function ShardCard({ shard }: { shard: ArchonShard }) {
  const { t } = useLanguage();
  const COLOR_META: Record<string, { label: string; color: string }> = {
    azure: { label: t("Azur", "Azure"), color: "#42a5f5" },
    crimson: { label: t("Cramoisi", "Crimson"), color: "#ef5350" },
    amber: { label: t("Ambre", "Amber"), color: "#ffca28" },
    topaz: { label: t("Topaze", "Topaz"), color: "#ff8a3d" },
    violet: { label: t("Violet", "Violet"), color: "#ab7cff" },
    emerald: { label: t("Émeraude", "Emerald"), color: "#66bb6a" },
  };

  const meta = COLOR_META[shard.color] || { label: shard.color, color: "#4fc3f7" };
  const isTauforged = shard.variant === "tauforged";

  return (
    <article
      className="relative overflow-hidden rounded-sm p-3 transition-all duration-200 hud-frame"
      style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid ${isTauforged ? "#ff6b35" : meta.color}45` }}
      onMouseEnter={event => { event.currentTarget.style.borderColor = isTauforged ? "#ff6b35" : meta.color; event.currentTarget.style.boxShadow = `0 0 14px ${(isTauforged ? "#ff6b35" : meta.color)}25`; }}
      onMouseLeave={event => { event.currentTarget.style.borderColor = `${isTauforged ? "#ff6b35" : meta.color}45`; event.currentTarget.style.boxShadow = "none"; }}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-sm" style={{ background: `linear-gradient(135deg, ${meta.color}30, rgba(0,0,0,.35))`, border: `1px solid ${isTauforged ? "#ff6b35" : meta.color}70` }}>
          {shard.imageUrl && <img src={shard.imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} />}
          <Gem size={24} style={{ color: isTauforged ? "#ff6b35" : meta.color, opacity: 0.85 }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{shard.name}</h3>
            {isTauforged && <span className="shrink-0 rounded-sm px-1.5 py-0.5 text-[9px]" style={{ color: "#ff6b35", backgroundColor: "rgba(255,107,53,.14)", fontFamily: "var(--font-display)" }}>{t("TAUFORGÉ", "TAUFORGED")}</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[9px] uppercase tracking-wider" style={{ color: meta.color, fontFamily: "var(--font-display)" }}>
            <span>{meta.label}</span>
            <span style={{ color: "var(--wf-text-dim)" }}>{shard.effectCount ?? shard.effects.length} {t("choix", "choices")}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--wf-text-dim)" }}>{shard.description}</p>
      <div className="mt-3 space-y-1.5">
        {shard.effects.map((effect, index) => (
          <div key={index} className="rounded-sm px-2 py-1.5 text-xs" style={{ backgroundColor: `${meta.color}0d`, borderLeft: `2px solid ${isTauforged ? "#ff6b35" : meta.color}`, color: "var(--wf-text)" }}>
            {effect}
          </div>
        ))}
      </div>
    </article>
  );
}

export default function ArchonShards() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("Tous");
  const [variantFilter, setVariantFilter] = useState("Toutes");

  const COLOR_META: Record<string, { label: string; color: string }> = {
    azure: { label: t("Azur", "Azure"), color: "#42a5f5" },
    crimson: { label: t("Cramoisi", "Crimson"), color: "#ef5350" },
    amber: { label: t("Ambre", "Amber"), color: "#ffca28" },
    topaz: { label: t("Topaze", "Topaz"), color: "#ff8a3d" },
    violet: { label: t("Violet", "Violet"), color: "#ab7cff" },
    emerald: { label: t("Émeraude", "Emerald"), color: "#66bb6a" },
  };

  const TOTAL_EFFECTS = ARCHON_SHARDS.reduce((total, shard) => total + (shard.effectCount ?? shard.effects.length), 0);

  const filtered = useMemo(() => ARCHON_SHARDS.filter(shard => {
    const query = search.trim().toLowerCase();
    const haystack = [shard.name, shard.color, shard.variant, ...shard.effects].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (colorFilter === "Tous" || shard.color === colorFilter) && (variantFilter === "Toutes" || shard.variant === variantFilter);
  }), [search, colorFilter, variantFilter]);

  return (
    <Layout title={t("ÉCLATS D’ARCHONTE // CATALOGUE", "ARCHON SHARDS // CATALOGUE")}>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm p-4" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
        <div className="relative flex min-w-48 flex-1 items-center">
          <Search size={13} className="pointer-events-none absolute left-2.5" style={{ color: "var(--wf-text-dim)" }} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t("Rechercher une couleur ou un effet...", "Search by color or effect...")}
            className="w-full rounded-sm py-1.5 pl-8 pr-3 text-xs outline-none"
            style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: "var(--wf-text-dim)" }} />
          <select
            value={colorFilter}
            onChange={event => setColorFilter(event.target.value)}
            className="rounded-sm px-2 py-1.5 text-xs outline-none"
            style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          >
            {COLORS.map(color => (
              <option key={color} value={color}>
                {color === "Tous" ? t("Toutes les couleurs", "All Colors") : COLOR_META[color]?.label || color}
              </option>
            ))}
          </select>
        </div>
        <select
          value={variantFilter}
          onChange={event => setVariantFilter(event.target.value)}
          className="rounded-sm px-2 py-1.5 text-xs outline-none"
          style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
        >
          {VARIANTS.map(variant => (
            <option key={variant} value={variant}>
              {variant === "Toutes" ? t("Toutes les variantes", "All Variants") : variant === "tauforged" ? t("Tauforgées", "Tauforged") : t("Standards", "Standard")}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-right" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
          {filtered.length} / {ARCHON_SHARDS.length} {t("éclats", "shards")} · {TOTAL_EFFECTS} {t("effets", "effects")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(shard => <ShardCard key={shard.id} shard={shard} />)}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center" style={{ color: "var(--wf-text-dim)" }}>
          <Gem size={48} className="mx-auto mb-4 opacity-30 text-cyan-400" />
          <p className="text-sm">{t("Aucun éclat trouvé", "No shards found")}</p>
        </div>
      )}
    </Layout>
  );
}
