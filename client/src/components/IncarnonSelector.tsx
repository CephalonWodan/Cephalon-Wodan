// WARFRAME SET BUILDER — Incarnon selector
// Style reminder: Tenno Codex HUD, amber Incarnon signal, compact controls, explicit calculation status.
// ============================================================
import { Sparkles, Target, Zap } from "lucide-react";
import type { Weapon, BuildIncarnonSelection } from "@/lib/warframe-data";
import { createIncarnonSelection, getIncarnonBonus, getIncarnonEvolution, getIncarnonProfile, type IncarnonSlot } from "@/lib/incarnon-data";

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
  const evolution = getIncarnonEvolution(profile, activeSelection?.selectedEvolution || 1);
  const selectedPerkIndex = activeSelection?.selectedPerkByTier?.[String(evolution?.tier || 1)] ?? null;
  const bonus = getIncarnonBonus(profile, activeSelection);

  if (!weapon) {
    return (
      <div className="rounded-sm p-3 opacity-60" style={{ backgroundColor: "rgba(0,0,0,.22)", border: "1px dashed var(--wf-border)" }}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><Sparkles size={12} /> INCARNON // {SLOT_LABELS[slot]}</div>
        <p className="mt-1 text-[10px]" style={{ color: "var(--wf-text-dim)" }}>Sélectionnez d’abord une arme pour rechercher sa Genèse Incarnon.</p>
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

  return (
    <div className="rounded-sm p-3" style={{ backgroundColor: "rgba(245,158,11,.045)", border: `1px solid ${activeSelection?.active ? `${accentColor}80` : `${accentColor}35`}` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: accentColor, fontFamily: "var(--font-display)" }}><Sparkles size={12} /> INCARNON // {SLOT_LABELS[slot]}</div>
        <span className="text-[9px] font-mono" style={{ color: "var(--wf-text-dim)" }}>{profile.family.toUpperCase()}</span>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>Profil détecté</label>
          <div className="rounded-sm px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: "rgba(0,0,0,.28)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>{profile.weapon} · {profile.evolutionsCount} évolutions</div>
        </div>
        <div>
          <label className="mb-1 block text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>État calculé</label>
          <select value={activeSelection?.active ? "active" : "inactive"} onChange={event => updateSelection({ active: event.target.value === "active" })} className="w-full rounded-sm px-2 py-1.5 text-xs outline-none sm:min-w-36" style={{ backgroundColor: "rgba(0,0,0,.4)", border: `1px solid ${accentColor}55`, color: "var(--wf-text)" }}>
            <option value="inactive">DÉSACTIVÉ</option>
            <option value="active">FORME INCARNON ACTIVE</option>
          </select>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>Arbre sélectionné</label>
          <select value={activeSelection?.selectedEvolution || 1} onChange={event => updateSelection({ selectedEvolution: Number(event.target.value) })} className="w-full rounded-sm px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,.4)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>
            {profile.evolutions.map(item => <option key={item.tier} value={item.tier}>ÉVOLUTION {item.tier}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>Perk appliqué</label>
          <select value={selectedPerkIndex ?? "none"} disabled={!evolution?.perks.length} onChange={event => updateSelection({ selectedPerkByTier: { ...(activeSelection?.selectedPerkByTier || {}), [String(evolution?.tier || 1)]: event.target.value === "none" ? null : Number(event.target.value) } })} className="w-full rounded-sm px-2 py-1.5 text-xs outline-none disabled:opacity-60" style={{ backgroundColor: "rgba(0,0,0,.4)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}>
            <option value="none">AUCUN PERK / FORME PAR DÉFAUT</option>
            {evolution?.perks.map((perk, index) => <option key={`${perk.name}-${index}`} value={index}>{perk.name}</option>)}
          </select>
        </div>
      </div>
      {evolution?.activation && <div className="mt-2 flex items-start gap-2 rounded-sm px-2 py-1.5 text-[10px]" style={{ backgroundColor: "rgba(79,195,247,.06)", borderLeft: "2px solid var(--wf-cyan)", color: "var(--wf-text-dim)" }}><Target size={12} className="mt-0.5 shrink-0" style={{ color: "var(--wf-cyan)" }} /><span><strong style={{ color: "var(--wf-text)" }}>Activation :</strong> {evolution.activation}</span></div>}
      {evolution && evolution.unlockChallenges.length > 0 && <div className="mt-2 text-[10px]" style={{ color: "var(--wf-text-dim)" }}><span style={{ color: accentColor }}>Défi :</span> {evolution.unlockChallenges[0]}</div>}
      {activeSelection?.active && <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {[{ label: "Dégâts", value: `+${Math.round(bonus.damagePercent * 100)}%` }, { label: "Critique", value: `+${Math.round(bonus.criticalChanceFlat * 100)}%` }, { label: "Multi crit.", value: `+${bonus.criticalMultiplierFlat.toFixed(2)}x` }, { label: "Statut", value: `+${Math.round(bonus.statusChanceFlat * 100)}%` }].map(metric => <div key={metric.label} className="rounded-sm px-2 py-1" style={{ backgroundColor: "rgba(245,158,11,.08)", border: `1px solid ${accentColor}30` }}><div className="text-[8px] uppercase" style={{ color: "var(--wf-text-dim)" }}>{metric.label}</div><div className="text-[11px] font-bold" style={{ color: accentColor, fontFamily: "var(--font-mono)" }}>{metric.value}</div></div>)}
      </div>}
      {activeSelection?.active && bonus.sources.length === 0 && <div className="mt-2 flex items-start gap-2 rounded-sm px-2 py-1.5 text-[9px]" style={{ backgroundColor: "rgba(148,163,184,.06)", borderLeft: "2px solid #64748b", color: "var(--wf-text-dim)" }}><Zap size={11} className="mt-0.5 shrink-0" /><span>L’Évolution sélectionnée ne fournit pas de bonus chiffré de dégâts dans la source Incarnon importée ; le moteur n’invente aucune valeur et conserve les statistiques de l’arme.</span></div>}
    </div>
  );
}
