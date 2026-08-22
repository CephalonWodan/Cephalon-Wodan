// Style reminder: Tenno Codex HUD, amber Incarnon signal, compact controls, explicit calculation status.
// ============================================================
import { Sparkles, Target, Zap, Check } from "lucide-react";
import type { Weapon, BuildIncarnonSelection } from "@/lib/warframe-data";
import { createIncarnonSelection, getIncarnonBonus, getIncarnonProfile, type IncarnonSlot } from "@/lib/incarnon-data";

interface IncarnonSelectorProps {
  weapon?: Weapon;
  slot: IncarnonSlot;
  selection: BuildIncarnonSelection | null;
  onChange: (selection: BuildIncarnonSelection | null) => void;
  accentColor?: string;
}

const SLOT_LABELS: Record<IncarnonSlot, string> = {
  primary: "PRIMAIRE",
  secondary: "SECONDAIRE",
  melee: "MÊLÉE",
};

export default function IncarnonSelector({ weapon, slot, selection, onChange, accentColor = "#f59e0b" }: IncarnonSelectorProps) {
  const profile = getIncarnonProfile(weapon);
  const activeSelection = profile && selection?.profileWeapon === profile.weapon ? selection : profile ? createIncarnonSelection(profile) : null;
  const bonus = getIncarnonBonus(profile, activeSelection);

  if (!weapon) {
    return (
      <div className="rounded-sm p-3 opacity-60" style={{ backgroundColor: "rgba(0,0,0,.22)", border: "1px dashed var(--wf-border)" }}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><Sparkles size={12} /> INCARNON // {SLOT_LABELS[slot]}</div>
        <p className="mt-1 text-[10px]" style={{ color: "var(--wf-text-dim)" }}>Sélectionnez d’abord une arme pour configurer sa Genèse Incarnon.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-sm p-3" style={{ backgroundColor: "rgba(0,0,0,.22)", border: "1px solid var(--wf-border)" }}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><Sparkles size={12} /> INCARNON // {SLOT_LABELS[slot]}</div>
        <p className="mt-1 text-[10px]" style={{ color: "var(--wf-text-dim)" }}>{weapon.name} ne possède pas de profil Incarnon chargé dans le dataset.</p>
      </div>
    );
  }

  const updateSelection = (patch: Partial<BuildIncarnonSelection>) => {
    onChange({ ...(activeSelection || createIncarnonSelection(profile)), ...patch, profileWeapon: profile.weapon });
  };

  const handlePerkSelect = (tier: number, perkIndex: number | null) => {
    const currentPerks = { ...(activeSelection?.selectedPerkByTier || {}) };
    currentPerks[String(tier)] = perkIndex;
    updateSelection({ selectedPerkByTier: currentPerks });
  };

  return (
    <div className="rounded-sm p-3 space-y-3" style={{ backgroundColor: "rgba(245,158,11,.045)", border: `1px solid ${activeSelection?.active ? `${accentColor}80` : `${accentColor}35`}` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: accentColor, fontFamily: "var(--font-display)" }}><Sparkles size={12} /> INCARNON // {SLOT_LABELS[slot]}</div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: accentColor }}>{profile.family.toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>Profil Genèse Détecté</label>
          <div className="rounded-sm px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: "rgba(0,0,0,.28)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{profile.weapon} · {profile.evolutionsCount} évolutions cumulatives</div>
        </div>
        <div>
          <label className="mb-1 block text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>État de la Forme</label>
          <select value={activeSelection?.active ? "active" : "inactive"} onChange={event => updateSelection({ active: event.target.value === "active" })} className="w-full rounded-sm px-2 py-1.5 text-xs outline-none sm:min-w-36 font-bold" style={{ backgroundColor: "rgba(0,0,0,.4)", border: `1px solid ${accentColor}55`, color: accentColor }}>
            <option value="inactive">INCARNON DÉSACTIVÉ</option>
            <option value="active">FORME INCARNON ACTIVE</option>
          </select>
        </div>
      </div>

      {/* Liste de toutes les évolutions cumulables */}
      <div className="space-y-2 mt-2">
        <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
          Arbre des Évolutions (Sélectionnez un perk par palier — Effets cumulés)
        </div>
        {profile.evolutions.map(evo => {
          const currentPerk = activeSelection?.selectedPerkByTier?.[String(evo.tier)] ?? 0;
          return (
            <div key={evo.tier} className="rounded-sm p-2" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase" style={{ color: accentColor, fontFamily: "var(--font-display)" }}>
                  ÉVOLUTION {evo.tier}
                </span>
                {evo.activation && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: "rgba(79,195,247,0.1)", color: "var(--wf-cyan)" }}>
                    {evo.activation}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {evo.perks.map((perk, pIdx) => {
                  const isSelected = currentPerk === pIdx;
                  return (
                    <button
                      key={`${perk.name}-${pIdx}`}
                      type="button"
                      onClick={() => handlePerkSelect(evo.tier, pIdx)}
                      className="text-left p-2 rounded-sm transition-all flex flex-col justify-between"
                      style={{
                        backgroundColor: isSelected ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.2)",
                        border: `1px solid ${isSelected ? accentColor : "var(--wf-border)"}`,
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold" style={{ color: isSelected ? accentColor : "var(--wf-text)" }}>
                            {perk.name}
                          </span>
                          {isSelected && <Check size={12} style={{ color: accentColor }} className="shrink-0" />}
                        </div>
                        <p className="text-[9px] mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>
                          {perk.text}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {activeSelection?.active && (
        <div className="mt-3 pt-2 border-t" style={{ borderColor: `${accentColor}30` }}>
          <div className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: accentColor, fontFamily: "var(--font-mono)" }}>
            Bonus Cumulés Actifs dans le Set
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {[
              { label: "Dégâts", value: `+${Math.round(bonus.damagePercent * 100)}%` },
              { label: "Critique", value: `+${Math.round(bonus.criticalChanceFlat * 100)}%` },
              { label: "Multi crit.", value: `+${bonus.criticalMultiplierFlat.toFixed(2)}x` },
              { label: "Statut", value: `+${Math.round(bonus.statusChanceFlat * 100)}%` }
            ].map(metric => (
              <div key={metric.label} className="rounded-sm px-2 py-1" style={{ backgroundColor: "rgba(245,158,11,.08)", border: `1px solid ${accentColor}30` }}>
                <div className="text-[8px] uppercase" style={{ color: "var(--wf-text-dim)" }}>{metric.label}</div>
                <div className="text-[11px] font-bold" style={{ color: accentColor, fontFamily: "var(--font-mono)" }}>{metric.value}</div>
              </div>
            ))}
          </div>
          {bonus.sources.length > 0 && (
            <div className="mt-2 text-[9px] space-y-0.5" style={{ color: "var(--wf-text-dim)" }}>
              {bonus.sources.map((src, i) => <div key={i}>• {src}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
