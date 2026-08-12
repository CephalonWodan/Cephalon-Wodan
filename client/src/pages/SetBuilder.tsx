// ============================================================
// WARFRAME SET BUILDER — Set Builder Page (Core Feature)
// Tenno Codex dark theme — Build your complete loadout
// ============================================================
import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Sword, Users, Star, Sparkles, Gem, ChevronDown, X, Plus, Save, Trash2, Copy, Check, Download, Upload } from "lucide-react";
import Layout from "@/components/Layout";
import {
  WARFRAMES, WEAPONS, COMPANIONS, MODS, ARCANES, ARCHON_SHARDS,
  Warframe, Weapon, Companion, Mod, Arcane, ArchonShard, SelectedArchonShard, BuildSet,
  getRarityColor, getRarityLabel, createEmptyBuild
} from "@/lib/warframe-data";
import { toast } from "sonner";

// ---- Slot Selector Modal ----
type SlotType = "warframe" | "primary" | "secondary" | "melee" | "companion" | "arcane-warframe" | "arcane-primary" | "arcane-secondary" | "arcane-melee" | "archon-shard" | "mod-warframe" | "mod-primary" | "mod-secondary" | "mod-melee";

const BUILD_STORAGE_KEY = "warframe-set-builder:builds:v2";

function normalizeBuild(raw: unknown): BuildSet | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<BuildSet> & Record<string, any>;
  const fallback = createEmptyBuild(typeof candidate.name === "string" && candidate.name.trim() ? candidate.name : "Set importé");
  const normalizeArray = <T,>(value: unknown, length: number, fallbackValue: T | null = null): (T | null)[] => Array.from({ length }, (_, index) => Array.isArray(value) ? (value[index] ?? fallbackValue) : fallbackValue);
  const normalizeShards = (value: unknown): (SelectedArchonShard | null)[] => Array.from({ length: 5 }, (_, index) => {
    const entry = Array.isArray(value) ? value[index] : null;
    if (!entry || typeof entry !== "object") return null;
    if ("shard" in entry && entry.shard && typeof entry.shard === "object") {
      return { shard: entry.shard as ArchonShard, effectIndex: Math.max(0, Math.min(Number((entry as any).effectIndex) || 0, ((entry.shard as ArchonShard).effects?.length || 1) - 1)) };
    }
    if ("effects" in entry && Array.isArray((entry as any).effects)) return { shard: entry as ArchonShard, effectIndex: 0 };
    return null;
  });
  return {
    ...fallback,
    ...candidate,
    id: typeof candidate.id === "string" ? candidate.id : fallback.id,
    name: typeof candidate.name === "string" ? candidate.name : fallback.name,
    description: typeof candidate.description === "string" ? candidate.description : "",
    warframeMods: normalizeArray(candidate.warframeMods, 8),
    primaryMods: normalizeArray(candidate.primaryMods, 8),
    secondaryMods: normalizeArray(candidate.secondaryMods, 8),
    meleeMods: normalizeArray(candidate.meleeMods, 8),
    warframeArcanes: normalizeArray(candidate.warframeArcanes, 2),
    primaryArcanes: normalizeArray(candidate.primaryArcanes, 1),
    secondaryArcanes: normalizeArray(candidate.secondaryArcanes, 1),
    meleeArcanes: normalizeArray(candidate.meleeArcanes, 1),
    archonShards: normalizeShards(candidate.archonShards),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : fallback.createdAt,
  };
}

function loadPersistedBuildState(): { builds: BuildSet[]; savedBuilds: BuildSet[] } {
  if (typeof window === "undefined") return { builds: [createEmptyBuild("Mon Premier Set")], savedBuilds: [] };
  try {
    const raw = JSON.parse(window.localStorage.getItem(BUILD_STORAGE_KEY) || "null");
    const builds = Array.isArray(raw?.builds) ? raw.builds.map(normalizeBuild).filter(Boolean) as BuildSet[] : [];
    const savedBuilds = Array.isArray(raw?.savedBuilds) ? raw.savedBuilds.map(normalizeBuild).filter(Boolean) as BuildSet[] : [];
    return { builds: builds.length ? builds : [createEmptyBuild("Mon Premier Set")], savedBuilds };
  } catch {
    return { builds: [createEmptyBuild("Mon Premier Set")], savedBuilds: [] };
  }
}

interface SelectorModalProps {
  type: SlotType;
  modSlotIndex?: number;
  onSelect: (item: Warframe | Weapon | Companion | Mod | Arcane | ArchonShard) => void;
  onClose: () => void;
}

function SelectorModal({ type, modSlotIndex, onSelect, onClose }: SelectorModalProps) {
  const [search, setSearch] = useState("");

  const getItems = () => {
    switch (type) {
      case "warframe": return WARFRAMES;
      case "primary": return WEAPONS.filter(w => w.type === "primary");
      case "secondary": return WEAPONS.filter(w => w.type === "secondary");
      case "melee": return WEAPONS.filter(w => w.type === "melee");
      case "companion": return COMPANIONS;
      case "arcane-warframe": return ARCANES.filter(arcane => arcane.type === "warframe");
      case "arcane-primary": return ARCANES.filter(arcane => ["primary", "kitgun", "bow", "shotgun"].includes(arcane.type));
      case "arcane-secondary": return ARCANES.filter(arcane => ["secondary", "kitgun"].includes(arcane.type));
      case "arcane-melee": return ARCANES.filter(arcane => ["melee", "zaw"].includes(arcane.type));
      case "archon-shard": return ARCHON_SHARDS;
      case "mod-warframe": return MODS.filter(m => m.type === "warframe" || m.type === "universal");
      case "mod-primary": return MODS.filter(m => m.type === "primary" || m.type === "universal");
      case "mod-secondary": return MODS.filter(m => m.type === "secondary" || m.type === "universal");
      case "mod-melee": return MODS.filter(m => m.type === "melee" || m.type === "universal");
      default: return [];
    }
  };

  const items = getItems().filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const getTitle = () => {
    const titles: Record<SlotType, string> = {
      warframe: "SÉLECTIONNER UN WARFRAME",
      primary: "SÉLECTIONNER UNE ARME PRIMAIRE",
      secondary: "SÉLECTIONNER UNE ARME SECONDAIRE",
      melee: "SÉLECTIONNER UNE ARME DE MÊLÉE",
      companion: "SÉLECTIONNER UN COMPAGNON",
      "arcane-warframe": "SÉLECTIONNER UN ARCANE WARFRAME",
      "arcane-primary": "SÉLECTIONNER UN ARCANE PRIMAIRE",
      "arcane-secondary": "SÉLECTIONNER UN ARCANE SECONDAIRE",
      "arcane-melee": "SÉLECTIONNER UN ARCANE MÊLÉE",
      "archon-shard": "SÉLECTIONNER UN ÉCLAT D’ARCHONTE",
      "mod-warframe": "SÉLECTIONNER UN MOD WARFRAME",
      "mod-primary": "SÉLECTIONNER UN MOD PRIMAIRE",
      "mod-secondary": "SÉLECTIONNER UN MOD SECONDAIRE",
      "mod-melee": "SÉLECTIONNER UN MOD MÊLÉE",
    };
    return titles[type];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-sm overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-cyan)", boxShadow: "0 0 30px rgba(79,195,247,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--wf-border)" }}>
          <h3 className="text-sm font-bold tracking-widest" style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)" }}>
            {getTitle()}
          </h3>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-white/10 transition-colors">
            <X size={16} style={{ color: "var(--wf-text-dim)" }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full px-3 py-1.5 text-xs rounded-sm outline-none"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          />
        </div>

        {/* Items list */}
        <div className="overflow-y-auto flex-1 p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {items.map(item => {
              const rarityColor = getRarityColor((item as any).rarity || "common");
              const isPrime = (item as any).isPrime;
              return (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item); onClose(); }}
                  className="flex items-center gap-3 p-2.5 rounded-sm text-left transition-all duration-150 hover:bg-white/5"
                  style={{ border: "1px solid var(--wf-border)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = rarityColor)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--wf-border)")}
                >
                  <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${rarityColor}20`, border: `1px solid ${rarityColor}40` }}>
                    {type === "warframe" ? <Shield size={15} style={{ color: rarityColor }} /> : type.includes("mod") ? <Star size={15} style={{ color: rarityColor }} /> : type.includes("arcane") ? <Sparkles size={15} style={{ color: rarityColor }} /> : type === "archon-shard" ? <Gem size={15} style={{ color: rarityColor }} /> : type === "companion" ? <Users size={15} style={{ color: rarityColor }} /> : <Sword size={15} style={{ color: rarityColor }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
                        {item.name}
                      </span>
                      {isPrime && <span className="text-xs shrink-0" style={{ color: "#ff6b35", fontSize: "9px" }}>PRIME</span>}
                    </div>
                    <div className="text-xs" style={{ color: rarityColor, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>
                      {getRarityLabel((item as any).rarity || "common").toUpperCase()}
                      {(item as any).effect && ` — ${(item as any).effect}`}
                      {(item as any).criteria && ` — ${(item as any).criteria}`}
                      {(item as any).effects?.[0] && ` — ${(item as any).effects[0]}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {items.length === 0 && (
            <div className="text-center py-8 text-xs" style={{ color: "var(--wf-text-dim)" }}>Aucun résultat</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Equipment Slot Component ----
interface EquipSlotProps {
  label: string;
  icon: React.ReactNode;
  item?: Warframe | Weapon | Companion;
  onSelect: () => void;
  onClear: () => void;
  accentColor?: string;
}

function EquipSlot({ label, icon, item, onSelect, onClear, accentColor = "#4fc3f7" }: EquipSlotProps) {
  const rarityColor = item ? getRarityColor((item as any).rarity || "common") : accentColor;
  return (
    <div
      className="rounded-sm overflow-hidden transition-all duration-200"
      style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid ${item ? rarityColor : "var(--wf-border)"}`, position: "relative" }}
    >
      {/* HUD corner decoration */}
      {item && (
        <>
          <div className="absolute top-0 left-0 w-2.5 h-2.5 pointer-events-none" style={{ borderTop: `1.5px solid ${rarityColor}`, borderLeft: `1.5px solid ${rarityColor}`, opacity: 0.6 }} />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 pointer-events-none" style={{ borderBottom: `1.5px solid ${rarityColor}`, borderRight: `1.5px solid ${rarityColor}`, opacity: 0.6 }} />
        </>
      )}
      {/* Slot header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: accentColor }}>{icon}</span>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text-dim)", fontSize: "10px" }}>
            {label}
          </span>
        </div>
        {item && (
          <button onClick={onClear} className="p-0.5 rounded-sm hover:bg-white/10 transition-colors">
            <X size={12} style={{ color: "var(--wf-text-dim)" }} />
          </button>
        )}
      </div>

      {/* Slot content */}
      <button
        onClick={onSelect}
        className="w-full p-3 text-left transition-all duration-150 hover:bg-white/5"
      >
        {item ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${rarityColor}15`, border: `1px solid ${rarityColor}40` }}>
              <span className="text-lg">{label === "WARFRAME" ? "⚡" : label.includes("COMPAGNON") ? "🐾" : "⚔️"}</span>
            </div>
            <div>
              <div className="text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
                {item.name}
              </div>
              <div className="text-xs" style={{ color: rarityColor, fontFamily: "var(--font-display)", fontSize: "10px" }}>
                {getRarityLabel((item as any).rarity || "common").toUpperCase()}
                {(item as any).isPrime && " — PRIME"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1" style={{ color: "var(--wf-text-dim)" }}>
            <Plus size={14} />
            <span className="text-xs" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
              Sélectionner {label.toLowerCase()}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

// ---- Mod Slot Component ----
interface ModSlotProps {
  mod: Mod | null;
  index: number;
  onSelect: (index: number) => void;
  onClear: (index: number) => void;
}

function ModSlot({ mod, index, onSelect, onClear }: ModSlotProps) {
  const rarityColor = mod ? getRarityColor(mod.rarity) : "#1e3a4a";
  return (
    <div
      className="relative rounded-sm overflow-hidden transition-all duration-150 cursor-pointer group"
      style={{
        backgroundColor: mod ? `${rarityColor}10` : "rgba(0,0,0,0.2)",
        border: `1px solid ${mod ? rarityColor : "var(--wf-border)"}`,
        minHeight: 64,
      }}
      onClick={() => onSelect(index)}
      onMouseEnter={e => { if (!mod) (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-cyan)"; }}
      onMouseLeave={e => { if (!mod) (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-border)"; }}
    >
      {mod ? (
        <div className="p-2">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)", fontSize: "10px" }}>
              {mod.name}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onClear(index); }}
              className="p-0.5 rounded-sm hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
            >
              <X size={10} style={{ color: "var(--wf-text-dim)" }} />
            </button>
          </div>
          <div className="text-xs mt-0.5" style={{ color: rarityColor, fontSize: "9px", fontFamily: "var(--font-display)" }}>
            {mod.effect}
          </div>
          {/* Rank dots */}
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: Math.min(mod.maxRank, 6) }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rarityColor }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full p-3">
          <Plus size={16} style={{ color: "var(--wf-border)" }} />
        </div>
      )}
    </div>
  );
}

// ---- Mod Grid Component ----
interface ModGridProps {
  label: string;
  mods: (Mod | null)[];
  modType: "mod-warframe" | "mod-primary" | "mod-secondary" | "mod-melee";
  onSelectMod: (index: number, type: SlotType) => void;
  onClearMod: (index: number, type: SlotType) => void;
  accentColor?: string;
}

function ModGrid({ label, mods, modType, onSelectMod, onClearMod, accentColor = "#4fc3f7" }: ModGridProps) {
  return (
    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid var(--wf-border)" }}>
      <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.2)" }}>
        <Star size={12} style={{ color: accentColor }} />
        <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: accentColor, fontSize: "10px" }}>
          MODS — {label}
        </span>
        <span className="ml-auto text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
          {mods.filter(Boolean).length}/{mods.length}
        </span>
      </div>
      <div className="p-2 grid grid-cols-4 gap-1.5" style={{ backgroundColor: "var(--wf-bg-panel)" }}>
        {mods.map((mod, i) => (
          <ModSlot
            key={i}
            mod={mod}
            index={i}
            onSelect={(idx) => onSelectMod(idx, modType)}
            onClear={(idx) => onClearMod(idx, modType)}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Arcane and Archon Shard Grids ----
interface ArcaneGridProps {
  label: string;
  arcanes: (Arcane | null)[];
  arcaneType: SlotType;
  onSelect: (index: number, type: SlotType) => void;
  onClear: (index: number, type: SlotType) => void;
  accentColor: string;
}

function ArcaneGrid({ label, arcanes, arcaneType, onSelect, onClear, accentColor }: ArcaneGridProps) {
  return <div className="rounded-sm overflow-hidden" style={{ border: "1px solid var(--wf-border)" }}><div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.2)" }}><Sparkles size={12} style={{ color: accentColor }} /><span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: accentColor, fontSize: "10px" }}>ARCANES — {label}</span><span className="ml-auto text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>{arcanes.filter(Boolean).length}/{arcanes.length}</span></div><div className="p-2 grid grid-cols-1 gap-1.5" style={{ backgroundColor: "var(--wf-bg-panel)" }}>{arcanes.map((arcane, index) => { const color = arcane ? getRarityColor(arcane.rarity) : "#1e3a4a"; return <div key={index} onClick={() => onSelect(index, arcaneType)} className="relative min-h-14 cursor-pointer rounded-sm p-2 transition-all duration-150" style={{ backgroundColor: arcane ? `${color}10` : "rgba(0,0,0,.2)", border: `1px solid ${arcane ? color : "var(--wf-border)"}` }} onMouseEnter={event => { if (!arcane) event.currentTarget.style.borderColor = "var(--wf-cyan)"; }} onMouseLeave={event => { if (!arcane) event.currentTarget.style.borderColor = "var(--wf-border)"; }}>{arcane ? <><div className="flex items-start justify-between gap-2"><span className="truncate text-[10px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{arcane.name}</span><button onClick={event => { event.stopPropagation(); onClear(index, arcaneType); }} className="shrink-0"><X size={10} style={{ color: "var(--wf-text-dim)" }} /></button></div><div className="mt-1 line-clamp-1 text-[9px]" style={{ color, fontFamily: "var(--font-display)" }}>{arcane.description}</div></> : <div className="flex items-center gap-2 py-1 text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><Plus size={13} /> Ajouter un Arcane</div>}</div>; })}</div></div>;
}

function ArchonShardGrid({ shards, onSelect, onClear, onEffectChange }: { shards: (SelectedArchonShard | null)[]; onSelect: (index: number, type: SlotType) => void; onClear: (index: number, type: SlotType) => void; onEffectChange: (index: number, effectIndex: number) => void }) {
  return <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(255,202,40,.4)" }}><div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,202,40,.25)", backgroundColor: "rgba(255,202,40,.05)" }}><Gem size={12} style={{ color: "#ffca28" }} /><span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "#ffca28", fontSize: "10px" }}>ÉCLATS D’ARCHONTE</span><span className="ml-auto text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>{shards.filter(Boolean).length}/{shards.length}</span></div><div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5" style={{ backgroundColor: "var(--wf-bg-panel)" }}>{shards.map((shard, index) => { const color = shard?.shard.variant === "tauforged" ? "#ff6b35" : "#ffca28"; return <div key={index} onClick={() => onSelect(index, "archon-shard")} className="relative min-h-14 cursor-pointer rounded-sm p-2 transition-all duration-150" style={{ backgroundColor: shard ? `${color}10` : "rgba(0,0,0,.2)", border: `1px solid ${shard ? color : "var(--wf-border)"}` }} onMouseEnter={event => { if (!shard) event.currentTarget.style.borderColor = "#ffca28"; }} onMouseLeave={event => { if (!shard) event.currentTarget.style.borderColor = "var(--wf-border)"; }}>{shard ? <><div className="flex items-start justify-between gap-2"><span className="truncate text-[10px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{shard.shard.name}</span><button onClick={event => { event.stopPropagation(); onClear(index, "archon-shard"); }} className="shrink-0"><X size={10} style={{ color: "var(--wf-text-dim)" }} /></button></div><div className="mt-1 line-clamp-1 text-[9px]" style={{ color, fontFamily: "var(--font-display)" }}>{shard.shard.effects[shard.effectIndex]}</div><select value={shard.effectIndex} onClick={event => event.stopPropagation()} onChange={event => { event.stopPropagation(); onEffectChange(index, Number(event.target.value)); }} className="mt-1 w-full rounded-sm px-1.5 py-1 text-[9px] outline-none" style={{ backgroundColor: "rgba(0,0,0,.35)", border: `1px solid ${color}50`, color: "var(--wf-text)" }}>{shard.shard.effects.map((effect, effectIndex) => <option key={effectIndex} value={effectIndex}>Effet {effectIndex + 1} — {effect}</option>)}</select></> : <div className="flex items-center gap-2 py-1 text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><Plus size={13} /> Ajouter un Éclat</div>}</div>; })}</div></div>;
}

interface EnhancementBonusSummary {
  flatHealth: number;
  flatShield: number;
  flatArmor: number;
  flatEnergy: number;
  abilityStrengthPct: number;
  abilityDurationPct: number;
  castingSpeedPct: number;
  parkourVelocityPct: number;
  primaryStatusPct: number;
  secondaryCritPct: number;
  meleeCritDamagePct: number;
  activeEffects: Array<{ source: string; effect: string; recognized: boolean }>;
}

function calculateEnhancementBonuses(build: BuildSet): EnhancementBonusSummary {
  const summary: EnhancementBonusSummary = { flatHealth: 0, flatShield: 0, flatArmor: 0, flatEnergy: 0, abilityStrengthPct: 0, abilityDurationPct: 0, castingSpeedPct: 0, parkourVelocityPct: 0, primaryStatusPct: 0, secondaryCritPct: 0, meleeCritDamagePct: 0, activeEffects: [] };
  const effects: Array<{ source: string; effect: string }> = [];
  [...build.warframeArcanes, ...build.primaryArcanes, ...build.secondaryArcanes, ...build.meleeArcanes].forEach(arcane => { if (arcane) effects.push({ source: `Arcane · ${arcane.name}`, effect: arcane.description }); });
  build.archonShards.forEach(selected => { if (selected) effects.push({ source: `Éclat · ${selected.shard.name}`, effect: selected.shard.effects[selected.effectIndex] || selected.shard.effects[0] || selected.shard.description }); });

  effects.forEach(({ source, effect }) => {
    let recognized = false;
    const add = (pattern: RegExp, key: keyof EnhancementBonusSummary) => {
      const match = effect.match(pattern);
      if (!match) return;
      (summary[key] as number) += Number(match[1]);
      recognized = true;
    };
    add(/\+(\d+(?:\.\d+)?)\s+(?:Maximum\s+)?Health\b(?!\s*\/s|\s*Orbs)/i, "flatHealth");
    add(/\+(\d+(?:\.\d+)?)\s+Shield(?:\s+Capacity)?\b(?!\s*Recharge)/i, "flatShield");
    add(/\+(\d+(?:\.\d+)?)\s+Armor\b/i, "flatArmor");
    add(/\+(\d+(?:\.\d+)?)\s+Energy\s+Max\b/i, "flatEnergy");
    add(/\+?(\d+(?:\.\d+)?)%\s+Ability\s+Strength\b/i, "abilityStrengthPct");
    add(/\+?(\d+(?:\.\d+)?)%\s+Ability\s+Duration\b/i, "abilityDurationPct");
    add(/\+?(\d+(?:\.\d+)?)%\s+Casting\s+Speed\b/i, "castingSpeedPct");
    add(/\+?(\d+(?:\.\d+)?)%\s+Parkour\s+Velocity\b/i, "parkourVelocityPct");
    add(/\+?(\d+(?:\.\d+)?)%\s+Primary\s+Status\s+Chance\b/i, "primaryStatusPct");
    add(/\+?(\d+(?:\.\d+)?)%\s+Secondary\s+Critical\s+Chance\b/i, "secondaryCritPct");
    add(/\+?(\d+(?:\.\d+)?)%\s+Melee\s+Critical\s+Damage\b/i, "meleeCritDamagePct");
    summary.activeEffects.push({ source, effect, recognized });
  });
  return summary;
}

// ---- Stats Panel ----
function StatsPanel({ build }: { build: BuildSet }) {
  const wf = build.warframe;
  const vitality = build.warframeMods.find(m => m?.id === "vitality");
  const redirection = build.warframeMods.find(m => m?.id === "redirection");
  const steelFiber = build.warframeMods.find(m => m?.id === "steel-fiber");
  const enhancements = calculateEnhancementBonuses(build);

  const health = wf ? Math.round((wf.health + enhancements.flatHealth) * (1 + (vitality ? 4.4 : 0))) : 0;
  const shield = wf ? Math.round((wf.shield + enhancements.flatShield) * (1 + (redirection ? 4.4 : 0))) : 0;
  const armor = wf ? Math.round((wf.armor + enhancements.flatArmor) * (1 + (steelFiber ? 1.1 : 0))) : 0;
  const energy = wf ? wf.energy + enhancements.flatEnergy : 0;
  const ehp = wf ? Math.round(health * (1 + armor / 300)) : 0;

  const primaryDmg = build.primaryWeapon ? build.primaryWeapon.damage * (1 + (build.primaryMods.filter(m => m?.id === "serration").length ? 1.65 : 0)) : 0;

  return (
    <div className="wf-panel rounded-sm p-4 hud-frame">
      <div className="wf-section-label mb-4">STATISTIQUES DU SET</div>

      {wf ? (
        <div className="space-y-2">
          {/* Warframe stats */}
          <div className="text-xs font-bold mb-3 px-2 py-1 rounded-sm" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.08em", backgroundColor: "rgba(79,195,247,0.08)", borderLeft: "2px solid var(--wf-cyan)" }}>
            {wf.name.toUpperCase()}
          </div>
          {[
            { label: "Points de Vie", value: health, max: 1500, color: "#ef5350" },
            { label: "Boucliers", value: shield, max: 1500, color: "#42a5f5" },
            { label: "Armure", value: armor, max: 1000, color: "#ffa726" },
            { label: "Énergie", value: energy, max: 400, color: "#ab47bc" },
            { label: "PV Effectifs", value: ehp, max: 5000, color: "#26c6da" },
          ].map(({ label, value, max, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span style={{ color: "var(--wf-text-dim)" }}>{label}</span>
                <span className="font-bold" style={{ color, fontFamily: "var(--font-mono)" }}>{value}</span>
              </div>
              <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
              </div>
            </div>
          ))}

          {build.primaryWeapon && (
            <>
              <div className="h-px my-3" style={{ backgroundColor: "var(--wf-border)" }} />
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
                {build.primaryWeapon.name.toUpperCase()}
              </div>
              {[
                { label: "Dégâts", value: Math.round(primaryDmg), color: "#ff6b35" },
                { label: "Critique", value: `${(build.primaryWeapon.critChance * 100).toFixed(0)}%`, color: "#ffd700" },
                { label: "Statut", value: `${(build.primaryWeapon.statusChance * 100 + enhancements.primaryStatusPct).toFixed(0)}%`, color: "#66bb6a" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-xs py-1 border-b last:border-0" style={{ borderColor: "var(--wf-border)" }}>
                  <span style={{ color: "var(--wf-text-dim)" }}>{label}</span>
                  <span style={{ color, fontFamily: "var(--font-mono)" }}>{value}</span>
                </div>
              ))}
            </>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3" style={{ borderColor: "var(--wf-border)" }}>
            <div className="rounded-sm p-2" style={{ backgroundColor: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.25)" }}><div className="text-[9px] uppercase" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>Arcanes</div><div className="text-sm font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-mono)" }}>{[...build.warframeArcanes, ...build.primaryArcanes, ...build.secondaryArcanes, ...build.meleeArcanes].filter(Boolean).length}</div></div>
            <div className="rounded-sm p-2" style={{ backgroundColor: "rgba(255,202,40,.08)", border: "1px solid rgba(255,202,40,.25)" }}><div className="text-[9px] uppercase" style={{ color: "#ffca28", fontFamily: "var(--font-display)" }}>Éclats</div><div className="text-sm font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-mono)" }}>{build.archonShards.filter(Boolean).length}/5</div></div>
          </div>

          {enhancements.activeEffects.length > 0 && <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--wf-border)" }}>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ffca28", fontFamily: "var(--font-display)" }}>BONUS ACTIFS</div>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {[{ label: "PV", value: enhancements.flatHealth, color: "#ef5350" }, { label: "Boucliers", value: enhancements.flatShield, color: "#42a5f5" }, { label: "Armure", value: enhancements.flatArmor, color: "#ffa726" }, { label: "Énergie", value: enhancements.flatEnergy, color: "#ab47bc" }, { label: "Force", value: enhancements.abilityStrengthPct, color: "#66bb6a", suffix: "%" }, { label: "Durée", value: enhancements.abilityDurationPct, color: "#4fc3f7", suffix: "%" }, { label: "Parkour", value: enhancements.parkourVelocityPct, color: "#ffd700", suffix: "%" }, { label: "Crit. mêlée", value: enhancements.meleeCritDamagePct, color: "#ff6b35", suffix: "%" }].filter(metric => metric.value !== 0).map(metric => <div key={metric.label} className="flex justify-between rounded-sm px-2 py-1 text-[10px]" style={{ backgroundColor: `${metric.color}10`, color: "var(--wf-text-dim)" }}><span>{metric.label}</span><span style={{ color: metric.color, fontFamily: "var(--font-mono)" }}>+{metric.value}{metric.suffix || ""}</span></div>)}
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto">{enhancements.activeEffects.map((entry, index) => <div key={`${entry.source}-${index}`} className="rounded-sm px-2 py-1.5" style={{ backgroundColor: "rgba(0,0,0,.2)", borderLeft: `2px solid ${entry.recognized ? "#66bb6a" : "#6b7280"}` }}><div className="flex items-center justify-between gap-2 text-[9px] uppercase" style={{ color: entry.recognized ? "#66bb6a" : "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><span className="truncate">{entry.source}</span><span>{entry.recognized ? "CALCULÉ" : "DÉTAIL"}</span></div><div className="mt-0.5 text-[10px]" style={{ color: "var(--wf-text)" }}>{entry.effect}</div></div>)}</div>
          </div>}
        </div>
      ) : (
        <div className="text-center py-6" style={{ color: "var(--wf-text-dim)" }}>
          <Shield size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs">Sélectionne un Warframe pour voir les statistiques</p>
        </div>
      )}
    </div>
  );
}

// ---- MAIN SetBuilder Page ----
export default function SetBuilder() {
  const [initialState] = useState(loadPersistedBuildState);
  const [builds, setBuilds] = useState<BuildSet[]>(initialState.builds);
  const [activeBuildIndex, setActiveBuildIndex] = useState(0);
  const [selectorOpen, setSelectorOpen] = useState<{ type: SlotType; modIndex?: number } | null>(null);
  const [savedBuilds, setSavedBuilds] = useState<BuildSet[]>(initialState.savedBuilds);
  const [buildName, setBuildName] = useState(initialState.builds[0]?.name || "Mon Premier Set");
  const [activeTab, setActiveTab] = useState<"equipment" | "mods">("equipment");
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BUILD_STORAGE_KEY, JSON.stringify({ version: 2, builds, savedBuilds }));
    }
  }, [builds, savedBuilds]);

  const activeBuild = builds[activeBuildIndex];

  const updateBuild = useCallback((updater: (b: BuildSet) => BuildSet) => {
    setBuilds(prev => prev.map((b, i) => i === activeBuildIndex ? updater(b) : b));
  }, [activeBuildIndex]);

  const handleSelect = (item: Warframe | Weapon | Companion | Mod | Arcane | ArchonShard) => {
    if (!selectorOpen) return;
    const { type, modIndex } = selectorOpen;

    updateBuild(b => {
      const nb = { ...b };
      if (type === "warframe") nb.warframe = item as Warframe;
      else if (type === "primary") nb.primaryWeapon = item as Weapon;
      else if (type === "secondary") nb.secondaryWeapon = item as Weapon;
      else if (type === "melee") nb.meleeWeapon = item as Weapon;
      else if (type === "companion") nb.companion = item as Companion;
      else if (type === "arcane-warframe" && modIndex !== undefined) {
        nb.warframeArcanes = [...b.warframeArcanes];
        nb.warframeArcanes[modIndex] = item as Arcane;
      } else if (type === "arcane-primary" && modIndex !== undefined) {
        nb.primaryArcanes = [...b.primaryArcanes];
        nb.primaryArcanes[modIndex] = item as Arcane;
      } else if (type === "arcane-secondary" && modIndex !== undefined) {
        nb.secondaryArcanes = [...b.secondaryArcanes];
        nb.secondaryArcanes[modIndex] = item as Arcane;
      } else if (type === "arcane-melee" && modIndex !== undefined) {
        nb.meleeArcanes = [...b.meleeArcanes];
        nb.meleeArcanes[modIndex] = item as Arcane;
      } else if (type === "archon-shard" && modIndex !== undefined) {
        nb.archonShards = [...b.archonShards];
        nb.archonShards[modIndex] = { shard: item as ArchonShard, effectIndex: 0 };
      } else if (type === "mod-warframe" && modIndex !== undefined) {
        nb.warframeMods = [...b.warframeMods];
        nb.warframeMods[modIndex] = item as Mod;
      } else if (type === "mod-primary" && modIndex !== undefined) {
        nb.primaryMods = [...b.primaryMods];
        nb.primaryMods[modIndex] = item as Mod;
      } else if (type === "mod-secondary" && modIndex !== undefined) {
        nb.secondaryMods = [...b.secondaryMods];
        nb.secondaryMods[modIndex] = item as Mod;
      } else if (type === "mod-melee" && modIndex !== undefined) {
        nb.meleeMods = [...b.meleeMods];
        nb.meleeMods[modIndex] = item as Mod;
      }
      return nb;
    });
  };

  const clearSlot = (type: "warframe" | "primary" | "secondary" | "melee" | "companion") => {
    updateBuild(b => {
      const nb = { ...b };
      if (type === "warframe") nb.warframe = undefined;
      else if (type === "primary") nb.primaryWeapon = undefined;
      else if (type === "secondary") nb.secondaryWeapon = undefined;
      else if (type === "melee") nb.meleeWeapon = undefined;
      else if (type === "companion") nb.companion = undefined;
      return nb;
    });
  };

  const clearMod = (index: number, type: SlotType) => {
    updateBuild(b => {
      const nb = { ...b };
      if (type === "arcane-warframe") { nb.warframeArcanes = [...b.warframeArcanes]; nb.warframeArcanes[index] = null; }
      else if (type === "arcane-primary") { nb.primaryArcanes = [...b.primaryArcanes]; nb.primaryArcanes[index] = null; }
      else if (type === "arcane-secondary") { nb.secondaryArcanes = [...b.secondaryArcanes]; nb.secondaryArcanes[index] = null; }
      else if (type === "arcane-melee") { nb.meleeArcanes = [...b.meleeArcanes]; nb.meleeArcanes[index] = null; }
      else if (type === "archon-shard") { nb.archonShards = [...b.archonShards]; nb.archonShards[index] = null; }
      else
      if (type === "mod-warframe") { nb.warframeMods = [...b.warframeMods]; nb.warframeMods[index] = null; }
      else if (type === "mod-primary") { nb.primaryMods = [...b.primaryMods]; nb.primaryMods[index] = null; }
      else if (type === "mod-secondary") { nb.secondaryMods = [...b.secondaryMods]; nb.secondaryMods[index] = null; }
      else if (type === "mod-melee") { nb.meleeMods = [...b.meleeMods]; nb.meleeMods[index] = null; }
      return nb;
    });
  };

  const setShardEffect = (index: number, effectIndex: number) => {
    updateBuild(build => {
      const next = { ...build, archonShards: [...build.archonShards] };
      const selected = next.archonShards[index];
      if (selected) next.archonShards[index] = { ...selected, effectIndex: Math.max(0, Math.min(effectIndex, selected.shard.effects.length - 1)) };
      return next;
    });
  };

  const saveBuild = () => {
    const buildToSave = { ...activeBuild, name: buildName, id: Date.now().toString() };
    setSavedBuilds(prev => [...prev, buildToSave]);
    toast.success(`Set "${buildName}" sauvegardé !`, {
      style: { backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-cyan)", color: "var(--wf-text)" }
    });
  };

  const exportBuild = () => {
    const payload = { format: "warframe-set-builder", version: 2, exportedAt: new Date().toISOString(), build: { ...activeBuild, name: buildName } };
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `${buildName.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "warframe-build"}.json`;
    anchor.click();
    URL.revokeObjectURL(blobUrl);
    toast.success("Set exporté en JSON !");
  };

  const importBuildFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const source = raw?.build ?? (Array.isArray(raw?.builds) ? raw.builds[0] : raw);
      const imported = normalizeBuild(source);
      if (!imported) throw new Error("Format invalide");
      const nextBuild = { ...imported, id: Date.now().toString() };
      setBuilds(prev => [...prev, nextBuild]);
      setActiveBuildIndex(builds.length);
      setBuildName(nextBuild.name);
      toast.success(`Set "${nextBuild.name}" importé !`);
    } catch {
      toast.error("Impossible d’importer ce fichier JSON.");
    } finally {
      event.target.value = "";
    }
  };

  const addNewBuild = () => {
    const newBuild = createEmptyBuild(`Set ${builds.length + 1}`);
    setBuilds(prev => [...prev, newBuild]);
    setActiveBuildIndex(builds.length);
    setBuildName(`Set ${builds.length + 1}`);
  };

  const deleteBuild = (index: number) => {
    if (builds.length === 1) {
      toast.error("Impossible de supprimer le dernier set");
      return;
    }
    setBuilds(prev => prev.filter((_, i) => i !== index));
    setActiveBuildIndex(Math.max(0, activeBuildIndex - 1));
  };

  return (
    <Layout title="CRÉER UN SET">
      {/* Build tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {builds.map((b, i) => (
          <div key={b.id} className="flex items-center">
            <button
              onClick={() => { setActiveBuildIndex(i); setBuildName(b.name); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-all"
              style={{
                backgroundColor: i === activeBuildIndex ? "rgba(79,195,247,0.15)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${i === activeBuildIndex ? "var(--wf-cyan)" : "var(--wf-border)"}`,
                color: i === activeBuildIndex ? "var(--wf-cyan)" : "var(--wf-text-dim)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.05em",
              }}
            >
              {b.name}
            </button>
            {builds.length > 1 && (
              <button onClick={() => deleteBuild(i)} className="ml-0.5 p-1 rounded-sm hover:bg-white/10 transition-colors">
                <X size={10} style={{ color: "var(--wf-text-dim)" }} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addNewBuild}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-sm transition-all"
          style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px dashed var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}
        >
          <Plus size={11} />
          NOUVEAU
        </button>
      </div>

      {/* Main builder layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Tab switcher for mobile */}
        <div className="xl:hidden col-span-full flex items-center gap-1 mb-2">
          {[{ id: "equipment" as const, label: "ÉQUIPEMENT" }, { id: "mods" as const, label: "MODS" }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 text-xs font-bold rounded-sm transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? "rgba(79,195,247,0.15)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${activeTab === tab.id ? "var(--wf-cyan)" : "var(--wf-border)"}`,
                color: activeTab === tab.id ? "var(--wf-cyan)" : "var(--wf-text-dim)",
                fontFamily: "var(--font-display)", letterSpacing: "0.08em",
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        {/* Left: Equipment + Mods */}
        <div className="xl:col-span-3 space-y-4">
          {/* Build name input */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 p-3 rounded-sm" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
            <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text-dim)", fontSize: "10px", whiteSpace: "nowrap" }}>
              NOM DU SET
            </span>
            <input
              type="text"
              value={buildName}
              onChange={e => {
                setBuildName(e.target.value);
                updateBuild(b => ({ ...b, name: e.target.value }));
              }}
              className="min-w-0 w-full px-3 py-1.5 text-sm rounded-sm outline-none"
              style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
              placeholder="Nom de votre set..."
            />
            <button
              onClick={saveBuild}
              className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm transition-all wf-btn-primary shrink-0"
            >
              <Save size={12} />
              <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>SAUVEGARDER</span>
            </button>
            <button onClick={exportBuild} className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm transition-all" style={{ border: "1px solid rgba(167,139,250,.65)", color: "#c4b5fd", backgroundColor: "rgba(167,139,250,.08)" }}>
              <Download size={12} />
              <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>EXPORTER</span>
            </button>
            <button onClick={() => importInputRef.current?.click()} className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm transition-all" style={{ border: "1px solid rgba(255,202,40,.65)", color: "#ffca28", backgroundColor: "rgba(255,202,40,.08)" }}>
              <Upload size={12} />
              <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>IMPORTER</span>
            </button>
            <input ref={importInputRef} type="file" accept="application/json,.json" onChange={importBuildFile} className="hidden" />
          </div>

          {/* Equipment slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <EquipSlot
              label="WARFRAME"
              icon={<Shield size={13} />}
              item={activeBuild.warframe}
              onSelect={() => setSelectorOpen({ type: "warframe" })}
              onClear={() => clearSlot("warframe")}
              accentColor="#4fc3f7"
            />
            <EquipSlot
              label="ARME PRIMAIRE"
              icon={<Sword size={13} />}
              item={activeBuild.primaryWeapon}
              onSelect={() => setSelectorOpen({ type: "primary" })}
              onClear={() => clearSlot("primary")}
              accentColor="#ff6b35"
            />
            <EquipSlot
              label="ARME SECONDAIRE"
              icon={<Sword size={13} />}
              item={activeBuild.secondaryWeapon}
              onSelect={() => setSelectorOpen({ type: "secondary" })}
              onClear={() => clearSlot("secondary")}
              accentColor="#ffd700"
            />
            <EquipSlot
              label="ARME DE MÊLÉE"
              icon={<Sword size={13} />}
              item={activeBuild.meleeWeapon}
              onSelect={() => setSelectorOpen({ type: "melee" })}
              onClear={() => clearSlot("melee")}
              accentColor="#66bb6a"
            />
            <EquipSlot
              label="COMPAGNON"
              icon={<Users size={13} />}
              item={activeBuild.companion}
              onSelect={() => setSelectorOpen({ type: "companion" })}
              onClear={() => clearSlot("companion")}
              accentColor="#a78bfa"
            />
          </div>

          {/* Arcanes and Archon Shards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ArcaneGrid label="WARFRAME" arcanes={activeBuild.warframeArcanes} arcaneType="arcane-warframe" onSelect={(idx, type) => setSelectorOpen({ type, modIndex: idx })} onClear={clearMod} accentColor="#a78bfa" />
            <ArchonShardGrid shards={activeBuild.archonShards} onSelect={(idx, type) => setSelectorOpen({ type, modIndex: idx })} onClear={clearMod} onEffectChange={setShardEffect} />
            <ArcaneGrid label="PRIMAIRE" arcanes={activeBuild.primaryArcanes} arcaneType="arcane-primary" onSelect={(idx, type) => setSelectorOpen({ type, modIndex: idx })} onClear={clearMod} accentColor="#ff6b35" />
            <ArcaneGrid label="SECONDAIRE" arcanes={activeBuild.secondaryArcanes} arcaneType="arcane-secondary" onSelect={(idx, type) => setSelectorOpen({ type, modIndex: idx })} onClear={clearMod} accentColor="#ffd700" />
            <ArcaneGrid label="MÊLÉE" arcanes={activeBuild.meleeArcanes} arcaneType="arcane-melee" onSelect={(idx, type) => setSelectorOpen({ type, modIndex: idx })} onClear={clearMod} accentColor="#66bb6a" />
          </div>

          {/* Mod grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModGrid
              label="WARFRAME"
              mods={activeBuild.warframeMods}
              modType="mod-warframe"
              onSelectMod={(idx, type) => setSelectorOpen({ type, modIndex: idx })}
              onClearMod={clearMod}
              accentColor="#4fc3f7"
            />
            <ModGrid
              label="PRIMAIRE"
              mods={activeBuild.primaryMods}
              modType="mod-primary"
              onSelectMod={(idx, type) => setSelectorOpen({ type, modIndex: idx })}
              onClearMod={clearMod}
              accentColor="#ff6b35"
            />
            <ModGrid
              label="SECONDAIRE"
              mods={activeBuild.secondaryMods}
              modType="mod-secondary"
              onSelectMod={(idx, type) => setSelectorOpen({ type, modIndex: idx })}
              onClearMod={clearMod}
              accentColor="#ffd700"
            />
            <ModGrid
              label="MÊLÉE"
              mods={activeBuild.meleeMods}
              modType="mod-melee"
              onSelectMod={(idx, type) => setSelectorOpen({ type, modIndex: idx })}
              onClearMod={clearMod}
              accentColor="#66bb6a"
            />
          </div>
        </div>

        {/* Right: Stats + Saved builds */}
        <div className="xl:col-span-1 space-y-4">
          <StatsPanel build={activeBuild} />

          {/* Saved builds */}
          {savedBuilds.length > 0 && (
            <div className="wf-panel rounded-sm p-4">
              <div className="text-xs font-bold tracking-widest mb-3" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>
                SETS SAUVEGARDÉS ({savedBuilds.length})
              </div>
              <div className="space-y-1.5">
                {savedBuilds.map(sb => (
                  <div
                    key={sb.id}
                    className="flex items-center justify-between p-2 rounded-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}
                  >
                    <div>
                      <div className="text-xs font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{sb.name}</div>
                      <div className="text-xs" style={{ color: "var(--wf-text-dim)", fontSize: "10px" }}>
                        {sb.warframe?.name || "—"} / {sb.primaryWeapon?.name || "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setBuilds(prev => [...prev, { ...sb, id: Date.now().toString() }]);
                        setActiveBuildIndex(builds.length);
                        setBuildName(sb.name);
                        toast.success("Set chargé !");
                      }}
                      className="text-xs px-2 py-1 rounded-sm wf-btn-primary"
                      style={{ fontSize: "10px" }}
                    >
                      CHARGER
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="rounded-sm p-3" style={{ backgroundColor: "rgba(79,195,247,0.05)", border: "1px solid rgba(79,195,247,0.2)" }}>
            <div className="text-xs font-bold mb-2" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
              💡 CONSEILS
            </div>
            <ul className="space-y-1">
              {[
                "Clique sur un slot pour sélectionner l'équipement",
                "Les mods améliorent les statistiques en temps réel",
                "Sauvegarde plusieurs sets pour différentes missions",
                "Les sets Prime offrent de meilleures statistiques",
              ].map((tip, i) => (
                <li key={i} className="text-xs leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>
                  • {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Selector Modal */}
      {selectorOpen && (
        <SelectorModal
          type={selectorOpen.type}
          modSlotIndex={selectorOpen.modIndex}
          onSelect={handleSelect}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </Layout>
  );
}
