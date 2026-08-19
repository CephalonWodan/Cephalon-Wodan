// WARFRAME SET BUILDER — Warframe details modal
// Style reminder: Tenno Codex HUD, readable data panels, cyan hierarchy, Prime orange accents.
// ============================================================
import { Activity, Brain, Gauge, Heart, Shield, Sparkles, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import AssetImage from "@/components/AssetImage";
import type { Warframe, WarframeAbility, WarframeAbilityEntry } from "@/lib/warframe-data";
import { getRarityColor, getRarityLabel } from "@/lib/warframe-data";

interface WarframeDetailsModalProps {
  warframe: Warframe | null;
  onClose: () => void;
}

function normalizeAbility(entry: WarframeAbilityEntry, index: number): WarframeAbility {
  if (typeof entry === "string") return { name: `Capacité ${index + 1}`, description: entry };
  return entry;
}

function normalizePassive(passive: Warframe["passive"]): string | null {
  if (!passive) return null;
  return typeof passive === "string" ? passive : passive.description;
}

const statConfig = [
  { key: "health", label: "VIE", color: "#ef5350", icon: Heart },
  { key: "shield", label: "BOUCLIERS", color: "#42a5f5", icon: Shield },
  { key: "armor", label: "ARMURE", color: "#ffa726", icon: Activity },
  { key: "energy", label: "ÉNERGIE", color: "#ab47bc", icon: Zap },
] as const;

export default function WarframeDetailsModal({ warframe, onClose }: WarframeDetailsModalProps) {
  if (!warframe) return null;
  const rarityColor = getRarityColor(warframe.rarity);
  const abilities = warframe.abilities.map(normalizeAbility);
  const passive = normalizePassive(warframe.passive);

  return (
    <Dialog open={Boolean(warframe)} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] w-[min(960px,calc(100vw-1rem))] overflow-y-auto rounded-sm border p-0 text-left shadow-2xl" style={{ backgroundColor: "var(--wf-bg-deep)", borderColor: `${rarityColor}80`, color: "var(--wf-text)" }}>
        <div className="relative overflow-hidden border-b p-4 sm:p-5" style={{ borderColor: "var(--wf-border)", background: `linear-gradient(120deg, ${rarityColor}18, rgba(0,0,0,.18) 48%, rgba(79,195,247,.06))` }}>
          <div className="absolute right-4 top-4 h-8 w-8" style={{ borderRight: `1px solid ${rarityColor}`, borderTop: `1px solid ${rarityColor}` }} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-sm" style={{ backgroundColor: "rgba(0,0,0,.3)", border: `1px solid ${rarityColor}90` }}>
              <AssetImage item={warframe} type="warframe" alt={warframe.name} className="h-full w-full object-contain" fallback={<Shield size={42} className="absolute inset-0 m-auto" style={{ color: rarityColor }} />} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.18em]" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}><Sparkles size={12} /> FICHE CODEX // WARFRAME</div>
              <DialogTitle className="mt-1 text-2xl font-bold uppercase tracking-wider" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{warframe.name}</DialogTitle>
              <DialogDescription className="mt-1 text-xs uppercase tracking-wider" style={{ color: rarityColor, fontFamily: "var(--font-display)" }}>{warframe.role} · {getRarityLabel(warframe.rarity)}{warframe.isPrime ? " · PRIME" : ""} · MR {warframe.mastery}</DialogDescription>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>{warframe.description || "Aucune description de codex n’est disponible pour cette entrée."}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <section>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}><Gauge size={13} /> STATISTIQUES DE BASE</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {statConfig.map(stat => {
                const Icon = stat.icon;
                return <div key={stat.key} className="rounded-sm p-3" style={{ backgroundColor: `${stat.color}0d`, border: `1px solid ${stat.color}45` }}><div className="flex items-center justify-between"><span className="text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{stat.label}</span><Icon size={13} style={{ color: stat.color }} /></div><div className="mt-1 text-xl font-bold" style={{ color: stat.color, fontFamily: "var(--font-mono)" }}>{Number(warframe[stat.key] ?? 0).toLocaleString("fr-FR")}</div><div className="mt-1 text-[9px] uppercase" style={{ color: "var(--wf-text-dim)" }}>rang 30 · valeur de base</div></div>;
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
            <section className="rounded-sm p-3" style={{ backgroundColor: "rgba(0,0,0,.2)", border: "1px solid var(--wf-border)" }}>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}><Brain size={13} /> PASSIF & CONFIGURATION</div>
              {passive ? <div className="rounded-sm p-2.5 text-xs leading-relaxed" style={{ backgroundColor: "rgba(167,139,250,.08)", borderLeft: "2px solid #a78bfa", color: "var(--wf-text)" }}>{passive}</div> : <div className="rounded-sm p-2.5 text-xs" style={{ backgroundColor: "rgba(148,163,184,.06)", color: "var(--wf-text-dim)" }}>Aucun passif détaillé n’est fourni pour cette entrée.</div>}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div><div className="text-[9px] uppercase" style={{ color: "var(--wf-text-dim)" }}>AURA</div><div className="mt-1 text-xs font-bold uppercase" style={{ color: "#ffd700", fontFamily: "var(--font-mono)" }}>{warframe.aura || "—"}</div></div>
                <div><div className="text-[9px] uppercase" style={{ color: "var(--wf-text-dim)" }}>POLARITÉS</div><div className="mt-1 flex flex-wrap gap-1">{warframe.polarities?.length ? warframe.polarities.map((polarity, index) => <span key={`${polarity}-${index}`} className="rounded-sm px-1.5 py-0.5 text-[9px] uppercase" style={{ backgroundColor: "rgba(79,195,247,.1)", border: "1px solid rgba(79,195,247,.35)", color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>{polarity}</span>) : <span className="text-xs" style={{ color: "var(--wf-text-dim)" }}>—</span>}</div></div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#ff6b35", fontFamily: "var(--font-display)" }}><Zap size={13} /> CAPACITÉS ({abilities.length})</div><span className="text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>DONNÉES CODEX</span></div>
              {abilities.length ? <div className="space-y-2">{abilities.map((ability, index) => <article key={`${ability.name}-${index}`} className="rounded-sm p-3" style={{ backgroundColor: "rgba(0,0,0,.2)", border: "1px solid var(--wf-border)", borderLeft: "2px solid #ff6b35" }}><div className="flex items-start gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold" style={{ backgroundColor: "rgba(255,107,53,.15)", color: "#ff6b35", fontFamily: "var(--font-mono)" }}>{index + 1}</span><div className="min-w-0 flex-1"><h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{ability.name}</h3><p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>{ability.description}</p>{(ability.strength || ability.duration || ability.range || ability.efficiency || ability.misc) && <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">{[{ label: "Force", value: ability.strength }, { label: "Durée", value: ability.duration }, { label: "Portée", value: ability.range }, { label: "Efficacité", value: ability.efficiency }, { label: "Détails", value: ability.misc }].filter(item => item.value && item.value !== "N/A").map(item => <div key={item.label} className="rounded-sm px-2 py-1.5" style={{ backgroundColor: "rgba(255,255,255,.03)" }}><div className="text-[8px] uppercase" style={{ color: "#ff6b35", fontFamily: "var(--font-mono)" }}>{item.label}</div><div className="mt-0.5 text-[10px] leading-relaxed" style={{ color: "var(--wf-text)" }}>{item.value}</div></div>)}</div>}</div></div></article>)}</div> : <div className="rounded-sm p-4 text-xs" style={{ backgroundColor: "rgba(0,0,0,.2)", border: "1px dashed var(--wf-border)", color: "var(--wf-text-dim)" }}>Les capacités détaillées ne sont pas encore renseignées pour cette Warframe.</div>}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
