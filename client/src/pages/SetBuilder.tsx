// ============================================================
// WARFRAME SET BUILDER — Set Builder Page (Core Feature)
// Tenno Codex dark theme — Build your complete loadout
// ============================================================
import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Sword, Users, Star, Sparkles, Gem, ChevronDown, X, Plus, Save, Trash2, Copy, Check, Download, Upload, FileText } from "lucide-react";
import Layout from "@/components/Layout";
import {
  WARFRAMES, WEAPONS, COMPANIONS, MODS, ARCANES, ARCHON_SHARDS, ARCHON_SHARD_EFFECT_TOTAL,
  MOA_PARTS, HOUND_PARTS,
  Warframe, Weapon, Companion, Mod, Arcane, ArchonShard, SelectedArchonShard, BuildSet, Polarity,
  getRarityColor, getRarityLabel, createEmptyBuild
} from "@/lib/warframe-data";
import { toast } from "sonner";

// ---- Slot Selector Modal ----
type SlotType = "warframe" | "primary" | "secondary" | "melee" | "companion" | "arcane-warframe" | "arcane-primary" | "arcane-secondary" | "arcane-melee" | "archon-shard" | "mod-warframe" | "mod-primary" | "mod-secondary" | "mod-melee" | "mod-companion";

const BUILD_STORAGE_KEY = "warframe-set-builder:builds:v2";

type BuildItem = { id?: string; name?: string };

function itemIdentity(item: BuildItem | null | undefined): string {
  if (!item) return "";
  return String(item.id || item.name || "").trim().toLowerCase();
}

function normalizeUniqueArray<T extends BuildItem>(value: unknown, length: number): (T | null)[] {
  const seen = new Set<string>();
  return Array.from({ length }, (_, index) => {
    const item = Array.isArray(value) ? (value[index] as T | null | undefined) : null;
    const identity = itemIdentity(item);
    if (!item || !identity || seen.has(identity)) return null;
    seen.add(identity);
    return item;
  });
}

function normalizeModArray(value: unknown, length: number): (Mod | null)[] {
  return normalizeUniqueArray<Mod>(value, length).map(mod => {
    if (!mod) return null;
    const maxRank = Math.max(0, Number(mod.maxRank) || 0);
    const parsedRank = Number(mod.selectedRank);
    const selectedRank = Number.isFinite(parsedRank) ? Math.max(0, Math.min(Math.round(parsedRank), maxRank)) : maxRank;
    return { ...mod, selectedRank };
  });
}

function selectModAtMaxRank(item: Mod): Mod {
  return { ...item, selectedRank: Math.max(0, Number(item.maxRank) || 0) };
}

function getSlotItems(build: BuildSet, type: SlotType): (BuildItem | null)[] {
  switch (type) {
    case "mod-warframe": return build.warframeMods;
    case "mod-primary": return build.primaryMods;
    case "mod-secondary": return build.secondaryMods;
    case "mod-melee": return build.meleeMods;
    case "mod-companion": return build.companionMods;
    case "arcane-warframe": return build.warframeArcanes;
    case "arcane-primary": return build.primaryArcanes;
    case "arcane-secondary": return build.secondaryArcanes;
    case "arcane-melee": return build.meleeArcanes;
    default: return [];
  }
}

function getUnavailableIds(build: BuildSet, type: SlotType, currentIndex?: number): string[] {
  return getSlotItems(build, type)
    .filter((item, index) => index !== currentIndex && item)
    .map(item => itemIdentity(item))
    .filter(Boolean);
}

const POLARITY_GLYPHS: Record<string, string> = {
  madurai: "V",
  vazarin: "D",
  naramon: "—",
  zenurik: "∩",
  unairu: "W",
  penjaga: "◇",
  umbra: "U",
  any: "✦",
};

function modBaseCost(mod: Mod, rank = mod.selectedRank ?? mod.maxRank): number {
  return Math.max(2, 2 + Math.min(10, Math.max(0, Number(rank) || 0)));
}

function modCost(mod: Mod, slotPolarity?: Polarity): number {
  const base = modBaseCost(mod);
  return slotPolarity && slotPolarity !== "any" && mod.polarity === slotPolarity ? Math.ceil(base / 2) : base;
}

function capacityKeyForModType(type: ModGridProps["modType"]): keyof BuildSet["capacityBoosts"] {
  if (type === "mod-warframe") return "warframe";
  if (type === "mod-primary") return "primary";
  if (type === "mod-secondary") return "secondary";
  if (type === "mod-melee") return "melee";
  return "companion";
}

function isCompanionModCompatible(mod: Mod, companion?: Companion): boolean {
  if (mod.type === "universal") return true;
  if (mod.type !== "companion" || !companion) return mod.type === "companion";
  const compat = (mod.compatName || "").trim().toLowerCase();
  const name = companion.name.trim().toLowerCase();
  const family = companion.type.trim().toLowerCase();
  if (!compat || compat === "companion") return true;
  if (compat === name || name.includes(compat) || compat.includes(name)) return true;
  if (compat === family || family.includes(compat)) return true;
  const aliases: Record<string, string[]> = {
    beast: ["beast", "kubrow", "kavat", "vulpaphyla", "predasite", "claws"],
    sentinel: ["sentinel", "robotic"],
    moa: ["moa", "robotic"],
    hound: ["hound", "robotic"],
    predasite: ["predasite", "beast", "claws"],
    vulpaphyla: ["vulpaphyla", "beast", "claws"],
  };
  return (aliases[family] || []).some(alias => compat === alias || compat.includes(alias));
}

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
    capacityBoosts: {
      ...fallback.capacityBoosts,
      ...(candidate.capacityBoosts && typeof candidate.capacityBoosts === "object" ? candidate.capacityBoosts : {}),
    },
    warframeMods: normalizeModArray(candidate.warframeMods, 8),
    primaryMods: normalizeModArray(candidate.primaryMods, 8),
    secondaryMods: normalizeModArray(candidate.secondaryMods, 8),
    meleeMods: normalizeModArray(candidate.meleeMods, 8),
    companionMods: normalizeModArray(candidate.companionMods, 8),
    warframeArcanes: normalizeUniqueArray(candidate.warframeArcanes, 2),
    primaryArcanes: normalizeUniqueArray(candidate.primaryArcanes, 1),
    secondaryArcanes: normalizeUniqueArray(candidate.secondaryArcanes, 1),
    meleeArcanes: normalizeUniqueArray(candidate.meleeArcanes, 1),
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
  unavailableIds?: string[];
  companion?: Companion;
  onSelect: (item: Warframe | Weapon | Companion | Mod | Arcane | ArchonShard) => void;
  onClose: () => void;
}

function SelectorModal({ type, modSlotIndex, unavailableIds = [], companion, onSelect, onClose }: SelectorModalProps) {
  const [search, setSearch] = useState("");

  const [preceptFilter, setPreceptFilter] = useState<string>("all");

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
      case "mod-companion": {
        let list = MODS.filter(mod => isCompanionModCompatible(mod, companion));
        if (preceptFilter === "precept") list = list.filter(m => (m.effect || "").toLowerCase().includes("précepte") || (m.name || "").toLowerCase().includes("precept") || m.type === "companion");
        if (preceptFilter === "universal") list = list.filter(m => m.type === "universal" || (m.compatName || "").toLowerCase().includes("universal"));
        if (preceptFilter === "moa") list = list.filter(m => (m.compatName || "").toLowerCase().includes("moa") || (m.name || "").toLowerCase().includes("moa"));
        if (preceptFilter === "hound") list = list.filter(m => (m.compatName || "").toLowerCase().includes("hound") || (m.name || "").toLowerCase().includes("hound"));
        return list;
      }
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
      "mod-companion": "SÉLECTIONNER UN MOD COMPAGNON",
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

        {/* Search & filters */}
        <div className="px-4 py-2 border-b space-y-2" style={{ borderColor: "var(--wf-border)" }}>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full px-3 py-1.5 text-xs rounded-sm outline-none"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
          />
          {type === "mod-companion" && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {[
                { id: "all", label: "TOUS" },
                { id: "precept", label: "PRÉCEPTES & APTITUDES" },
                { id: "universal", label: "UNIVERSELS" },
                { id: "moa", label: "MOA" },
                { id: "hound", label: "HOUND" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPreceptFilter(f.id)}
                  className="px-2.5 py-1 text-[9px] rounded-sm whitespace-nowrap transition-all"
                  style={{
                    backgroundColor: preceptFilter === f.id ? "rgba(167,139,250,0.2)" : "rgba(0,0,0,0.3)",
                    border: `1px solid ${preceptFilter === f.id ? "#a78bfa" : "var(--wf-border)"}`,
                    color: preceptFilter === f.id ? "#a78bfa" : "var(--wf-text-dim)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="overflow-y-auto flex-1 p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {items.map(item => {
              const rarityColor = getRarityColor((item as any).rarity || "common");
              const isPrime = (item as any).isPrime;
              const isArcane = type.startsWith("arcane-");
              const arcane = isArcane ? item as Arcane : null;
              const isUnavailable = unavailableIds.includes(itemIdentity(item));
              return (
                <button
                  key={item.id}
                  disabled={isUnavailable}
                  onClick={() => { if (!isUnavailable) { onSelect(item); onClose(); } }}
                  className={`flex items-start gap-3 p-2.5 rounded-sm text-left transition-all duration-150 ${isUnavailable ? "cursor-not-allowed opacity-40" : "hover:bg-white/5"}`}
                  style={{ border: `1px solid ${isUnavailable ? "rgba(148,163,184,.18)" : "var(--wf-border)"}` }}
                  onMouseEnter={e => { if (!isUnavailable) e.currentTarget.style.borderColor = rarityColor; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isUnavailable ? "rgba(148,163,184,.18)" : "var(--wf-border)"; }}
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
                      {type === "archon-shard" && <span className="shrink-0 text-[8px]" style={{ color: "#ffca28", fontFamily: "var(--font-mono)" }}>{(item as any).sourceKey}</span>}
                      {isPrime && <span className="text-xs shrink-0" style={{ color: "#ff6b35", fontSize: "9px" }}>PRIME</span>}
                      {isUnavailable && <span className="ml-auto shrink-0 text-[8px] uppercase" style={{ color: "#94a3b8", fontFamily: "var(--font-mono)" }}>DÉJÀ UTILISÉ</span>}
                    </div>
                    <div className="text-xs" style={{ color: rarityColor, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>
                      {getRarityLabel((item as any).rarity || "common").toUpperCase()}
                      {(item as any).effect && ` — ${(item as any).effect}`}
                      {(item as any).criteria && ` — ${(item as any).criteria}`}
                      {(item as any).effects?.[0] && ` — ${(item as any).effects[0]}`}
                      {type === "archon-shard" && ` · ${(item as any).effectCount ?? (item as any).effects?.length ?? 0} effets`}
                    </div>
                    {arcane && (
                      <div className="mt-2 rounded-sm px-2 py-1.5" style={{ backgroundColor: `${rarityColor}0d`, borderLeft: `2px solid ${rarityColor}80` }}>
                        <div className="flex items-center justify-between gap-2 text-[8px] uppercase" style={{ color: rarityColor, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>
                          <span>APERÇU DE L’EFFET</span>
                          <span>RANG MAX {arcane.maxRank}</span>
                        </div>
                        <div className="mt-1 line-clamp-3 text-[10px] leading-relaxed" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>
                          {arcane.description || "Effet détaillé indisponible dans le catalogue."}
                        </div>
                      </div>
                    )}
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
      className="wf-hud-panel hud-frame rounded-sm overflow-hidden transition-all duration-200"
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
          <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)", fontSize: "10px" }}>
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
          <div className="wf-empty-slot relative flex items-center gap-2 py-3 px-1" style={{ color: "var(--wf-text-dim)" }}>
            <div className="wf-slot-trace" />
            <Plus size={14} style={{ color: "var(--wf-cyan-dim)" }} />
            <span className="text-xs" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>
              INITIALISER {label.toLowerCase()}
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
  slotPolarity?: Polarity;
  cost?: number;
  onSelect: (index: number) => void;
  onClear: (index: number) => void;
  onRankChange?: (index: number, rank: number) => void;
}

function ModSlot({ mod, index, slotPolarity, cost, onSelect, onClear, onRankChange }: ModSlotProps) {
  const rarityColor = mod ? getRarityColor(mod.rarity) : "#1e3a4a";
  return (
    <div
      className={`relative rounded-sm overflow-hidden transition-all duration-150 cursor-pointer group ${mod ? "" : "wf-empty-slot"}`}
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
          <div className="mt-1 flex items-center gap-1.5 text-[8px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
            <span style={{ color: slotPolarity && mod.polarity === slotPolarity ? "#66bb6a" : rarityColor }}>COÛT {cost ?? modBaseCost(mod)}</span>
            {slotPolarity && <span style={{ color: "#a78bfa" }}>SLOT {POLARITY_GLYPHS[slotPolarity] || slotPolarity}</span>}
          </div>
          <select
            value={mod.selectedRank ?? mod.maxRank}
            onClick={event => event.stopPropagation()}
            onChange={event => { event.stopPropagation(); onRankChange?.(index, Number(event.target.value)); }}
            className="mt-1 w-full rounded-sm px-1 py-0.5 text-[9px] outline-none"
            style={{ backgroundColor: "rgba(0,0,0,.35)", border: `1px solid ${rarityColor}50`, color: "var(--wf-text)", fontFamily: "var(--font-mono)" }}
            aria-label={`Rang de ${mod.name}`}
          >
            {Array.from({ length: mod.maxRank + 1 }, (_, rank) => <option key={rank} value={rank}>RANG {rank}/{mod.maxRank} — COÛT {modCost({ ...mod, selectedRank: rank }, slotPolarity)}</option>)}
          </select>
          {/* Rank dots */}
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: Math.min(mod.selectedRank ?? mod.maxRank, 6) }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rarityColor }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center h-full min-h-16 p-3">
          <div className="wf-slot-trace" />
          <Plus size={16} style={{ color: "var(--wf-cyan-dim)" }} />
        </div>
      )}
    </div>
  );
}

// ---- Mod Grid Component ----
interface ModGridProps {
  label: string;
  mods: (Mod | null)[];
  modType: "mod-warframe" | "mod-primary" | "mod-secondary" | "mod-melee" | "mod-companion";
  equipment?: Warframe | Weapon | Companion;
  capacityBoosted: boolean;
  onToggleCapacity: () => void;
  onSelectMod: (index: number, type: SlotType) => void;
  onClearMod: (index: number, type: SlotType) => void;
  onRankChange: (index: number, rank: number, type: SlotType) => void;
  accentColor?: string;
}

function ModGrid({ label, mods, modType, equipment, capacityBoosted, onToggleCapacity, onSelectMod, onClearMod, onRankChange, accentColor = "#4fc3f7" }: ModGridProps) {
  const slotPolarities = equipment?.polarities || [];
  const capacityMax = capacityBoosted ? 60 : 30;
  const usedCapacity = mods.reduce((total, mod, index) => total + (mod ? modCost(mod, slotPolarities[index]) : 0), 0);
  const isOverCapacity = usedCapacity > capacityMax;
  return (
    <div className="wf-hud-panel hud-frame rounded-sm overflow-hidden" style={{ border: `1px solid ${isOverCapacity ? "#ef5350" : "var(--wf-border)"}` }}>
      <div className="px-3 py-2 border-b flex flex-wrap items-center gap-2" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.2)" }}>
        <Star size={12} style={{ color: accentColor }} />
        <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)", fontSize: "10px" }}>
          MODS — {label}
        </span>
        <span className="ml-auto text-xs" style={{ color: isOverCapacity ? "#ef5350" : "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
          {usedCapacity}/{capacityMax}
        </span>
        <button disabled={!equipment} onClick={onToggleCapacity} className="rounded-sm px-1.5 py-0.5 text-[8px] uppercase transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40" style={{ color: capacityBoosted ? "#66bb6a" : "var(--wf-text-dim)", border: `1px solid ${capacityBoosted ? "#66bb6a80" : "var(--wf-border)"}`, fontFamily: "var(--font-mono)" }} title="Ajouter ou retirer un Réacteur/Catalyseur">
          {capacityBoosted ? "CAP +30" : "AJOUTER +30"}
        </button>
      </div>
      <div className="px-3 py-1 text-[8px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
        {equipment ? `POLARITÉS : ${(equipment.polarities || []).map(polarity => POLARITY_GLYPHS[polarity] || polarity).join(" ") || "AUCUNE"} · COÛTS SELON LE RANG` : "SÉLECTIONNEZ L’ÉQUIPEMENT POUR VOIR SES POLARITÉS"}
        {isOverCapacity && <span className="ml-2" style={{ color: "#ef5350" }}>CAPACITÉ DÉPASSÉE</span>}
      </div>
      <div className="p-2 grid grid-cols-4 gap-1.5" style={{ backgroundColor: "var(--wf-bg-panel)" }}>
        {mods.map((mod, i) => (
          <ModSlot
            key={i}
            mod={mod}
            index={i}
            slotPolarity={slotPolarities[i]}
            cost={mod ? modCost(mod, slotPolarities[i]) : undefined}
            onSelect={(idx) => onSelectMod(idx, modType)}
            onClear={(idx) => onClearMod(idx, modType)}
            onRankChange={(idx, rank) => onRankChange(idx, rank, modType)}
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
  return <div className="wf-hud-panel hud-frame rounded-sm overflow-hidden" style={{ border: "1px solid var(--wf-border)" }}><div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.2)" }}><Sparkles size={12} style={{ color: accentColor }} /><span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)", fontSize: "10px" }}>ARCANES — {label}</span><span className="ml-auto text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>{arcanes.filter(Boolean).length}/{arcanes.length}</span></div><div className="p-2 grid grid-cols-1 gap-1.5" style={{ backgroundColor: "var(--wf-bg-panel)" }}>{arcanes.map((arcane, index) => { const color = arcane ? getRarityColor(arcane.rarity) : "#1e3a4a"; return <div key={index} onClick={() => onSelect(index, arcaneType)} className="relative min-h-14 cursor-pointer rounded-sm p-2 transition-all duration-150" style={{ backgroundColor: arcane ? `${color}10` : "rgba(0,0,0,.2)", border: `1px solid ${arcane ? color : "var(--wf-border)"}` }} onMouseEnter={event => { if (!arcane) event.currentTarget.style.borderColor = "var(--wf-cyan)"; }} onMouseLeave={event => { if (!arcane) event.currentTarget.style.borderColor = "var(--wf-border)"; }}>{arcane ? <><div className="flex items-start justify-between gap-2"><span className="truncate text-[10px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{arcane.name}</span><button onClick={event => { event.stopPropagation(); onClear(index, arcaneType); }} className="shrink-0"><X size={10} style={{ color: "var(--wf-text-dim)" }} /></button></div><div className="mt-1 line-clamp-1 text-[9px]" style={{ color, fontFamily: "var(--font-display)" }}>{arcane.description}</div></> : <div className="wf-empty-slot relative flex items-center gap-2 py-2 text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><Plus size={13} /> Ajouter un Arcane</div>}</div>; })}</div></div>;
}

function ArchonShardGrid({ shards, onSelect, onClear, onEffectChange }: { shards: (SelectedArchonShard | null)[]; onSelect: (index: number, type: SlotType) => void; onClear: (index: number, type: SlotType) => void; onEffectChange: (index: number, effectIndex: number) => void }) {
  return <div className="wf-hud-panel hud-frame rounded-sm overflow-hidden" style={{ border: "1px solid rgba(255,202,40,.4)" }}><div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,202,40,.25)", backgroundColor: "rgba(255,202,40,.05)" }}><Gem size={12} style={{ color: "#ffca28" }} /><span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "#ffca28", fontSize: "10px" }}>ÉCLATS D’ARCHONTE</span><span className="ml-auto text-right text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>{shards.filter(Boolean).length}/{shards.length} · {ARCHON_SHARD_EFFECT_TOTAL} effets</span></div><div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5" style={{ backgroundColor: "var(--wf-bg-panel)" }}>{shards.map((shard, index) => { const color = shard?.shard.variant === "tauforged" ? "#ff6b35" : "#ffca28"; return <div key={index} onClick={() => onSelect(index, "archon-shard")} className="relative min-h-14 cursor-pointer rounded-sm p-2 transition-all duration-150" style={{ backgroundColor: shard ? `${color}10` : "rgba(0,0,0,.2)", border: `1px solid ${shard ? color : "var(--wf-border)"}` }} onMouseEnter={event => { if (!shard) event.currentTarget.style.borderColor = "#ffca28"; }} onMouseLeave={event => { if (!shard) event.currentTarget.style.borderColor = "var(--wf-border)"; }}>{shard ? <><div className="flex items-start justify-between gap-2"><span className="truncate text-[10px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{shard.shard.name}</span><button onClick={event => { event.stopPropagation(); onClear(index, "archon-shard"); }} className="shrink-0"><X size={10} style={{ color: "var(--wf-text-dim)" }} /></button></div><div className="mt-1 line-clamp-1 text-[9px]" style={{ color, fontFamily: "var(--font-display)" }}>{shard.shard.effects[shard.effectIndex]}</div><select value={shard.effectIndex} onClick={event => event.stopPropagation()} onChange={event => { event.stopPropagation(); onEffectChange(index, Number(event.target.value)); }} className="mt-1 w-full rounded-sm px-1.5 py-1 text-[9px] outline-none" style={{ backgroundColor: "rgba(0,0,0,.35)", border: `1px solid ${color}50`, color: "var(--wf-text)" }}>{shard.shard.effects.map((effect, effectIndex) => <option key={effectIndex} value={effectIndex}>Effet {effectIndex + 1} — {effect}</option>)}</select></> : <div className="wf-empty-slot relative flex items-center gap-2 py-2 text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}><Plus size={13} /> Ajouter un Éclat</div>}</div>; })}</div></div>;
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

interface WeaponDamageBreakdown {
  baseDamage: number;
  totalDamage: number;
  elements: Array<{ name: string; damage: number; color: string }>;
}

interface WarframeStatSummary {
  health: number;
  baseHealth: number;
  healthModPct: number;
  shield: number;
  baseShield: number;
  shieldModPct: number;
  armor: number;
  baseArmor: number;
  armorModPct: number;
  energy: number;
  baseEnergy: number;
  energyModPct: number;
  strengthPct: number;
  durationPct: number;
  rangePct: number;
  efficiencyPct: number;
  sprintSpeed: number;
  ehp: number;
  activeMods: Array<{ name: string; effect: string; cost: number }>;
}

function calculateWeaponDamage(weapon?: Weapon | null, mods: (Mod | null)[] = []): WeaponDamageBreakdown {
  if (!weapon) return { baseDamage: 0, totalDamage: 0, elements: [] };
  let baseDamage = weapon.damage || 100;
  let damageMultiplier = 1;
  let elementalBonuses: Array<{ name: string; pct: number; color: string }> = [];

  mods.forEach(mod => {
    if (!mod) return;
    const effect = (mod.effect || mod.description || "").toLowerCase();
    const rank = mod.selectedRank ?? mod.maxRank;
    const rankRatio = mod.maxRank > 0 ? rank / mod.maxRank : 1;

    // Corrupted & standard damage mods
    if (effect.includes("damage") && !effect.includes("status") && !effect.includes("critical")) {
      const match = effect.match(/\+(\d+(?:\.\d+)?)%/);
      if (match) damageMultiplier += (Number(match[1]) * rankRatio) / 100;
    }
    // Corrupted mods like Transient Fortitude / Blind Rage / Overextended / Narrow Minded
    if (effect.includes("strength") && effect.includes("duration")) {
      // e.g. Transient Fortitude
      damageMultiplier += 0.25 * rankRatio;
    }
    // Elemental mods
    if (effect.includes("heat") || effect.includes("feu")) elementalBonuses.push({ name: "Feu", pct: 15 * (rank + 1), color: "#ff6b35" });
    if (effect.includes("cold") || effect.includes("glace")) elementalBonuses.push({ name: "Glace", pct: 15 * (rank + 1), color: "#42a5f5" });
    if (effect.includes("electric") || effect.includes("électricité")) elementalBonuses.push({ name: "Électricité", pct: 15 * (rank + 1), color: "#ab47bc" });
    if (effect.includes("toxin") || effect.includes("poison")) elementalBonuses.push({ name: "Toxine", pct: 15 * (rank + 1), color: "#66bb6a" });
    if (effect.includes("corrosive")) elementalBonuses.push({ name: "Corrosif", pct: 30 * (rank + 1), color: "#ffa726" });
    if (effect.includes("viral")) elementalBonuses.push({ name: "Viral", pct: 30 * (rank + 1), color: "#26c6da" });
    if (effect.includes("radiation")) elementalBonuses.push({ name: "Radiation", pct: 30 * (rank + 1), color: "#ffd700" });
    // Augment mods bonus handling
    if (effect.includes("augment") || mod.name.toLowerCase().includes("augment")) {
      damageMultiplier += 0.20;
    }
  });

  const totalPhysical = Math.round(baseDamage * damageMultiplier);
  const elements = elementalBonuses.map(el => ({
    name: el.name,
    damage: Math.round(baseDamage * (el.pct / 100)),
    color: el.color,
  }));
  const totalElemental = elements.reduce((acc, el) => acc + el.damage, 0);

  return {
    baseDamage,
    totalDamage: totalPhysical + totalElemental,
    elements,
  };
}

function calculateWarframeStats(build: BuildSet): WarframeStatSummary {
  const wf = build.warframe;
  const baseHealth = wf?.health || 300;
  const baseShield = wf?.shield || 300;
  const baseArmor = wf?.armor || 150;
  const baseEnergy = wf?.energy || 150;
  const baseSprint = 1.15;

  let healthModPct = 0;
  let shieldModPct = 0;
  let armorModPct = 0;
  let energyModPct = 0;
  
  let flatHealth = 0;
  let flatShield = 0;
  let flatArmor = 0;
  let flatEnergy = 0;

  let strengthBonus = 0;
  let durationBonus = 0;
  let rangeBonus = 0;
  let efficiencyBonus = 0;

  const activeMods: Array<{ name: string; effect: string; cost: number }> = [];

  // Parse Arcanes & Shards
  const enhancements = calculateEnhancementBonuses(build);
  flatHealth += enhancements.flatHealth;
  flatShield += enhancements.flatShield;
  flatArmor += enhancements.flatArmor;
  flatEnergy += enhancements.flatEnergy;
  strengthBonus += enhancements.abilityStrengthPct;
  durationBonus += enhancements.abilityDurationPct;

  build.warframeMods.forEach((mod, index) => {
    if (!mod) return;
    const rank = mod.selectedRank ?? mod.maxRank;
    const rankRatio = mod.maxRank > 0 ? rank / mod.maxRank : 1;
    const effect = (mod.effect || mod.description || "").toLowerCase();
    const slotPolarity = wf?.polarities?.[index];
    const cost = modCost(mod, slotPolarity);

    activeMods.push({ name: mod.name, effect: mod.effect || mod.description || "", cost });

    // Precise matching for specific Warframe mods and Archon mods
    const modNameLower = mod.name.toLowerCase();
    
    if (modNameLower.includes("archon vitality") || modNameLower.includes("vitalité archonte")) {
      healthModPct += 1.0; // +100%
    } else if (modNameLower.includes("archon intensify") || modNameLower.includes("intensité archonte")) {
      strengthBonus += 30; // +30%
    } else if (modNameLower.includes("archon redirection") || modNameLower.includes("redirection archonte")) {
      shieldModPct += 4.4; // +440%
    } else if (modNameLower.includes("archon stretch") || modNameLower.includes("allonge archonte")) {
      rangeBonus += 45; // +45%
    } else if (modNameLower.includes("archon continuity") || modNameLower.includes("continuité archonte")) {
      durationBonus += 30; // +30%
    } else if (modNameLower.includes("archon flow") || modNameLower.includes("flux archonte")) {
      energyModPct += 1.5; // +150%
    } else if (mod.id === "vitality" || modNameLower.endsWith(" vitality") || modNameLower === "vitality" || modNameLower === "vitalité") {
      const baseBonus = mod.maxRank >= 10 ? 4.4 : (mod.maxRank >= 5 ? 1.0 : 0.4);
      healthModPct += baseBonus * rankRatio;
    } else if (mod.id === "redirection" || modNameLower.endsWith(" redirection") || modNameLower === "redirection") {
      const baseBonus = mod.maxRank >= 10 ? 4.4 : 1.0;
      shieldModPct += baseBonus * rankRatio;
    } else if (mod.id === "steel-fiber" || modNameLower.includes("steel fiber") || modNameLower.includes("fibre d'acier")) {
      const baseBonus = mod.maxRank >= 10 ? 1.1 : 0.5;
      armorModPct += baseBonus * rankRatio;
    } else if (mod.id === "flow" || modNameLower.endsWith(" flow") || modNameLower === "flow" || modNameLower === "flux") {
      const baseBonus = mod.maxRank >= 5 ? 1.5 : 1.0;
      energyModPct += baseBonus * rankRatio;
    } else if (modNameLower.includes("umbra vitality")) {
      healthModPct += (55 * (rank + 1)) / 100;
    } else if (modNameLower.includes("umbra fiber")) {
      armorModPct += (33 * (rank + 1)) / 100;
    } else if (effect.includes("strength") || effect.includes("puissance") || mod.id === "blind-rage" || mod.id === "intensify" || modNameLower.includes("intensify")) {
      const val = mod.id === "blind-rage" ? 99 * (rank + 1) / 10 : (mod.id === "intensify" ? 30 * (rank + 1) / 5 : 15 * (rank + 1) / 5);
      strengthBonus += val;
    } else if (effect.includes("duration") || effect.includes("durée") || mod.id === "continuity" || mod.id === "narrow-minded") {
      const val = mod.id === "narrow-minded" ? 99 * (rank + 1) / 10 : 30 * (rank + 1) / 5;
      durationBonus += val;
    } else if (effect.includes("range") || effect.includes("portée") || mod.id === "stretch" || mod.id === "overextended") {
      const val = mod.id === "overextended" ? 90 : 45 * (rank + 1) / 5;
      rangeBonus += val;
    } else if (effect.includes("efficiency") || effect.includes("efficacité") || mod.id === "streamline" || mod.id === "fleeting-expertise") {
      const val = mod.id === "fleeting-expertise" ? 60 : 30 * (rank + 1) / 5;
      efficiencyBonus += val;
    }
  });

  const health = Math.round((baseHealth * (1 + healthModPct)) + flatHealth);
  const shield = Math.round((baseShield * (1 + shieldModPct)) + flatShield);
  const armor = Math.round((baseArmor * (1 + armorModPct)) + flatArmor);
  const energy = Math.round((baseEnergy * (1 + energyModPct)) + flatEnergy);
  const ehp = Math.round(health * (1 + armor / 300));

  return {
    health,
    baseHealth,
    healthModPct: Math.round(healthModPct * 100),
    shield,
    baseShield,
    shieldModPct: Math.round(shieldModPct * 100),
    armor,
    baseArmor,
    armorModPct: Math.round(armorModPct * 100),
    energy,
    baseEnergy,
    energyModPct: Math.round(energyModPct * 100),
    strengthPct: Math.max(10, 100 + strengthBonus),
    durationPct: Math.max(10, 100 + durationBonus),
    rangePct: Math.max(10, 100 + rangeBonus),
    efficiencyPct: Math.min(175, Math.max(34, 100 + efficiencyBonus)),
    sprintSpeed: baseSprint,
    ehp,
    activeMods,
  };
}

function calculateEnhancementBonuses(build: BuildSet): EnhancementBonusSummary {
  const summary: EnhancementBonusSummary = { flatHealth: 0, flatShield: 0, flatArmor: 0, flatEnergy: 0, abilityStrengthPct: 0, abilityDurationPct: 0, castingSpeedPct: 0, parkourVelocityPct: 0, primaryStatusPct: 0, secondaryCritPct: 0, meleeCritDamagePct: 0, activeEffects: [] };
  const effects: Array<{ source: string; effect: string; isTauforged: boolean }> = [];
  
  [...build.warframeArcanes, ...build.primaryArcanes, ...build.secondaryArcanes, ...build.meleeArcanes].forEach(arcane => { 
    if (arcane) effects.push({ source: `Arcane · ${arcane.name}`, effect: arcane.description, isTauforged: false }); 
  });
  
  build.archonShards.forEach(selected => { 
    if (selected) {
      const isTauforged = selected.shard.variant === "tauforged";
      const effectText = selected.shard.effects[selected.effectIndex] || selected.shard.effects[0] || selected.shard.description;
      effects.push({ source: `Éclat ${isTauforged ? "Tauforgé" : "Standard"} · ${selected.shard.name}`, effect: effectText, isTauforged }); 
    }
  });

  effects.forEach(({ source, effect, isTauforged }) => {
    let recognized = false;
    const multiplier = isTauforged ? 1.5 : 1.0;
    
    const add = (pattern: RegExp, key: keyof EnhancementBonusSummary) => {
      const match = effect.match(pattern);
      if (!match) return;
      const val = Number(match[1]) * multiplier;
      (summary[key] as number) += val;
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
    
    summary.activeEffects.push({ source, effect: isTauforged ? `${effect} (Tauforgé x1.5)` : effect, recognized });
  });
  return summary;
}

interface CompanionStatSummary {
  health: number;
  shield: number;
  armor: number;
  damagePct: number;
  criticalChancePct: number;
  statusChancePct: number;
  statusDamagePct: number;
  healthRegen: number;
  activeEffects: Array<{ name: string; effect: string; recognized: boolean }>;
}

function calculateCompanionStats(build: BuildSet): CompanionStatSummary | null {
  const companion = build.companion;
  if (!companion) return null;
  const warframeHealth = build.warframe?.health || 0;
  const warframeShield = build.warframe?.shield || 0;
  const warframeArmor = build.warframe?.armor || 0;
  const summary: CompanionStatSummary = {
    health: companion.health,
    shield: companion.shield,
    armor: companion.armor,
    damagePct: 0,
    criticalChancePct: 0,
    statusChancePct: 0,
    statusDamagePct: 0,
    healthRegen: 0,
    activeEffects: [],
  };
  build.companionMods.filter(Boolean).forEach(mod => {
    if (!mod) return;
    const effect = mod.effect || mod.description || "";
    let recognized = false;
    const linkHealth = effect.match(/\+(\d+(?:\.\d+)?)%\s+of\s+Warframe(?:'s|’s)\s+Max\s+Health/i);
    const linkShield = effect.match(/\+(\d+(?:\.\d+)?)%\s+of\s+Warframe(?:'s|’s)\s+Max\s+Shield/i);
    const linkArmor = effect.match(/\+(\d+(?:\.\d+)?)%\s+of\s+Warframe(?:'s|’s)\s+Armor/i);
    const flatHealth = effect.match(/\+(\d+(?:\.\d+)?)\s+(?:Companion\s+)?Health\b(?!\s+Regen)/i);
    const flatShield = effect.match(/\+(\d+(?:\.\d+)?)\s+(?:Companion\s+)?Shield\b/i);
    const flatArmor = effect.match(/\+(\d+(?:\.\d+)?)\s+(?:Companion\s+)?Armor\b/i);
    const damage = effect.match(/\+(\d+(?:\.\d+)?)%\s+(?:Melee\s+)?Damage\b/i);
    const critical = effect.match(/\+(\d+(?:\.\d+)?)%\s+(?:Primary\s+Weapon\s+)?Critical\s+Chance/i);
    const statusChance = effect.match(/\+(\d+(?:\.\d+)?)%\s+(?:Primary\s+Weapon\s+)?Status\s+Chance/i);
    const statusDamage = effect.match(/\+(\d+(?:\.\d+)?)%\s+Status\s+Damage/i);
    const regen = effect.match(/\+(\d+(?:\.\d+)?)\s+Companion\s+Health\s+Regen\/s/i);
    if (linkHealth) { summary.health += warframeHealth * Number(linkHealth[1]) / 100; recognized = true; }
    if (linkShield) { summary.shield += warframeShield * Number(linkShield[1]) / 100; recognized = true; }
    if (linkArmor) { summary.armor += warframeArmor * Number(linkArmor[1]) / 100; recognized = true; }
    if (flatHealth) { summary.health += Number(flatHealth[1]); recognized = true; }
    if (flatShield) { summary.shield += Number(flatShield[1]); recognized = true; }
    if (flatArmor) { summary.armor += Number(flatArmor[1]); recognized = true; }
    if (damage) { summary.damagePct += Number(damage[1]); recognized = true; }
    if (critical) { summary.criticalChancePct += Number(critical[1]); recognized = true; }
    if (statusChance) { summary.statusChancePct += Number(statusChance[1]); recognized = true; }
    if (statusDamage) { summary.statusDamagePct += Number(statusDamage[1]); recognized = true; }
    if (regen) { summary.healthRegen += Number(regen[1]); recognized = true; }
    summary.activeEffects.push({ name: mod.name, effect, recognized });
  });
  summary.health = Math.round(summary.health);
  summary.shield = Math.round(summary.shield);
  summary.armor = Math.round(summary.armor);
  return summary;
}

function buildSummaryMarkdown(build: BuildSet): string {
  const capacityLine = (label: string, mods: (Mod | null)[], equipment: Warframe | Weapon | Companion | undefined, boosted: boolean) => {
    const polarities = equipment?.polarities || [];
    const used = mods.reduce((total, mod, index) => total + (mod ? modCost(mod, polarities[index]) : 0), 0);
    const max = boosted ? 60 : 30;
    const entries = mods.map((mod, index) => mod ? `- Slot ${index + 1}: ${mod.name} — rang ${mod.selectedRank ?? mod.maxRank}/${mod.maxRank} — coût ${modCost(mod, polarities[index])}${polarities[index] ? ` — polarité ${POLARITY_GLYPHS[polarities[index]] || polarities[index]}` : ""}` : null).filter(Boolean).join("\n");
    return `### ${label} — capacité ${used}/${max}${used > max ? " (DÉPASSÉE)" : ""}\n${entries || "- Aucun mod équipé"}`;
  };
  const arcanes = [...build.warframeArcanes, ...build.primaryArcanes, ...build.secondaryArcanes, ...build.meleeArcanes].filter(Boolean).map(arcane => `- ${arcane?.name}: ${arcane?.description}`).join("\n") || "- Aucun Arcane équipé";
  const shards = build.archonShards.filter(Boolean).map(selected => `- ${selected?.shard.name}: ${selected?.shard.effects[selected.effectIndex] || selected?.shard.description}`).join("\n") || "- Aucun éclat équipé";
  const enhancements = calculateEnhancementBonuses(build);
  const companionStats = calculateCompanionStats(build);
  const parts = build.companionParts;
  const partsSummary = parts && build.companion && ["moa", "hound"].includes(build.companion.type.toLowerCase()) ? `\n- Configuration modulaire : Tête [${parts.head || "—"}], Support [${parts.bracket || "—"}], Cœur [${parts.core || "—"}], Gyroscope [${parts.gyro || "—"}]` : "";
  const companionBlock = companionStats ? `\n### Statistiques compagnon\n- ${build.companion?.name} (${build.companion?.type?.toUpperCase()})${partsSummary}\n- PV : ${companionStats.health} · Boucliers : ${companionStats.shield} · Armure : ${companionStats.armor}\n- Bonus : Dégâts +${companionStats.damagePct}% · Critique +${companionStats.criticalChancePct}% · Statut +${companionStats.statusChancePct}% · Dégâts de statut +${companionStats.statusDamagePct}% · Régénération +${companionStats.healthRegen}/s` : "\n### Statistiques compagnon\n- Aucun compagnon sélectionné";
  return [
    `# ${build.name}`,
    "",
    build.description ? `> ${build.description}` : "> Résumé de build WARFRAME Set Builder",
    "",
    "## Équipement",
    `- Warframe : ${build.warframe?.name || "—"}`,
    `- Arme primaire : ${build.primaryWeapon?.name || "—"}`,
    `- Arme secondaire : ${build.secondaryWeapon?.name || "—"}`,
    `- Arme de mêlée : ${build.meleeWeapon?.name || "—"}`,
    `- Compagnon : ${build.companion?.name || "—"}`,
    "",
    "## Mods",
    capacityLine("Warframe", build.warframeMods, build.warframe, build.capacityBoosts.warframe),
    "",
    capacityLine("Arme primaire", build.primaryMods, build.primaryWeapon, build.capacityBoosts.primary),
    "",
    capacityLine("Arme secondaire", build.secondaryMods, build.secondaryWeapon, build.capacityBoosts.secondary),
    "",
    capacityLine("Arme de mêlée", build.meleeMods, build.meleeWeapon, build.capacityBoosts.melee),
    "",
    capacityLine("Compagnon", build.companionMods, build.companion, build.capacityBoosts.companion),
    "",
    "## Arcanes",
    arcanes,
    "",
    "## Éclats d’Archonte",
    shards,
    companionBlock,
    "",
    "## Bonus reconnus",
    `- PV : +${enhancements.flatHealth} · Boucliers : +${enhancements.flatShield} · Armure : +${enhancements.flatArmor} · Énergie : +${enhancements.flatEnergy}`,
    `- Force : +${enhancements.abilityStrengthPct}% · Durée : +${enhancements.abilityDurationPct}% · Parkour : +${enhancements.parkourVelocityPct}%`,
  ].join("\n");
}

// ---- Stats Panel ----
function StatsPanel({ build }: { build: BuildSet }) {
  const wf = build.warframe;
  const stats = calculateWarframeStats(build);
  const enhancements = calculateEnhancementBonuses(build);
  const companionStats = calculateCompanionStats(build);
  const primaryDmg = build.primaryWeapon ? build.primaryWeapon.damage * (1 + (build.primaryMods.filter(m => m?.id === "serration").length ? 1.65 : 0)) : 0;

  return (
    <div className="wf-panel wf-hud-panel rounded-sm p-4 hud-frame">
      <div className="wf-section-label mb-4 flex items-center justify-between">
        <span>STATISTIQUES DU SET</span>
        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: "rgba(79,195,247,0.15)", color: "var(--wf-cyan)" }}>
          EN DIRECT
        </span>
      </div>

      {wf ? (
        <div className="space-y-3">
          {/* Warframe Header */}
          <div className="text-xs font-bold px-2.5 py-1.5 rounded-sm flex items-center justify-between" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.08em", backgroundColor: "rgba(79,195,247,0.08)", borderLeft: "2px solid var(--wf-cyan)" }}>
            <span>{wf.name.toUpperCase()}</span>
            <span className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "#66bb6a" }}>RANG 30</span>
          </div>

          {/* Survivability & Energy (Warframe In-Game HUD Style) */}
          <div className="space-y-2 rounded-sm p-2.5" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
            <div className="text-[10px] uppercase font-bold tracking-wider mb-2" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>
              SURVIE & ÉNERGIE
            </div>
            {[
              { label: "Health", base: stats.baseHealth, val: stats.health, modPct: stats.healthModPct, color: "#ef5350", max: 1500 },
              { label: "Shield", base: stats.baseShield, val: stats.shield, modPct: stats.shieldModPct, color: "#42a5f5", max: 1500 },
              { label: "Armor", base: stats.baseArmor, val: stats.armor, modPct: stats.armorModPct, color: "#ffa726", max: 1000 },
              { label: "Energy", base: stats.baseEnergy, val: stats.energy, modPct: stats.energyModPct, color: "#ab47bc", max: 500 },
            ].map(({ label, base, val, modPct, color, max }) => (
              <div key={label} className="text-xs">
                <div className="flex justify-between items-center mb-0.5">
                  <span style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{label}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    {modPct !== 0 && (
                      <span className="text-[10px]" style={{ color: modPct > 0 ? "#66bb6a" : "#ef5350" }}>
                        {modPct > 0 ? `+${modPct}%` : `${modPct}%`}
                      </span>
                    )}
                    <span className="font-bold text-white">{base}</span>
                    <span style={{ color: "var(--wf-text-dim)" }}>→</span>
                    <span className="font-bold" style={{ color }}>{val}</span>
                  </div>
                </div>
                <div className="stat-bar-track">
                  <div className="stat-bar-fill" style={{ width: `${Math.min(100, (val / max) * 100)}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1 text-xs border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>Sprint Speed</span>
              <span className="font-mono font-bold" style={{ color: "#26c6da" }}>{stats.sprintSpeed}</span>
            </div>
          </div>

          {/* Ability Stats (Warframe In-Game HUD Style) */}
          <div className="space-y-1.5 rounded-sm p-2.5" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
            <div className="text-[10px] uppercase font-bold tracking-wider mb-1.5" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>
              STATISTIQUES DE POUVOIR
            </div>
            {[
              { label: "Duration", val: stats.durationPct, color: "#4fc3f7" },
              { label: "Efficiency", val: stats.efficiencyPct, color: "#66bb6a" },
              { label: "Range", val: stats.rangePct, color: "#ffd700" },
              { label: "Strength", val: stats.strengthPct, color: "#ff6b35" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex justify-between items-center text-xs py-0.5">
                <span style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{label}</span>
                <span className="font-mono font-bold" style={{ color }}>{val}%</span>
              </div>
            ))}
          </div>

          {build.primaryWeapon && (() => {
            const primaryDmgData = calculateWeaponDamage(build.primaryWeapon, build.primaryMods);
            return (
              <div className="space-y-2 rounded-sm p-2.5" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "#ff6b35", fontFamily: "var(--font-display)" }}>
                    ARME PRIMAIRE : {build.primaryWeapon.name.toUpperCase()}
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: "#ff6b35" }}>
                    {primaryDmgData.totalDamage} DÉGÂTS TOTAUX
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between py-0.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--wf-text-dim)" }}>Critique</span>
                    <span className="font-mono font-bold text-yellow-400">{(build.primaryWeapon.critChance * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--wf-text-dim)" }}>Statut</span>
                    <span className="font-mono font-bold text-green-400">{(build.primaryWeapon.statusChance * 100 + enhancements.primaryStatusPct).toFixed(0)}%</span>
                  </div>
                </div>
                {primaryDmgData.elements.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <div className="text-[9px] uppercase font-bold tracking-wider" style={{ color: "var(--wf-text-dim)" }}>DÉGÂTS ÉLÉMENTAIRES</div>
                    <div className="grid grid-cols-2 gap-1">
                      {primaryDmgData.elements.map(el => (
                        <div key={el.name} className="flex justify-between rounded-sm px-2 py-1 text-[10px]" style={{ backgroundColor: `${el.color}15`, border: `1px solid ${el.color}40` }}>
                          <span style={{ color: el.color, fontWeight: "bold" }}>{el.name}</span>
                          <span className="font-mono" style={{ color: "var(--wf-text)" }}>{el.damage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {build.secondaryWeapon && (() => {
            const secondaryDmgData = calculateWeaponDamage(build.secondaryWeapon, build.secondaryMods);
            return (
              <div className="space-y-2 rounded-sm p-2.5" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "#42a5f5", fontFamily: "var(--font-display)" }}>
                    ARME SECONDAIRE : {build.secondaryWeapon.name.toUpperCase()}
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: "#42a5f5" }}>
                    {secondaryDmgData.totalDamage} DÉGÂTS TOTAUX
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between py-0.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--wf-text-dim)" }}>Critique</span>
                    <span className="font-mono font-bold text-yellow-400">{(build.secondaryWeapon.critChance * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--wf-text-dim)" }}>Statut</span>
                    <span className="font-mono font-bold text-green-400">{(build.secondaryWeapon.statusChance * 100).toFixed(0)}%</span>
                  </div>
                </div>
                {secondaryDmgData.elements.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <div className="text-[9px] uppercase font-bold tracking-wider" style={{ color: "var(--wf-text-dim)" }}>DÉGÂTS ÉLÉMENTAIRES</div>
                    <div className="grid grid-cols-2 gap-1">
                      {secondaryDmgData.elements.map(el => (
                        <div key={el.name} className="flex justify-between rounded-sm px-2 py-1 text-[10px]" style={{ backgroundColor: `${el.color}15`, border: `1px solid ${el.color}40` }}>
                          <span style={{ color: el.color, fontWeight: "bold" }}>{el.name}</span>
                          <span className="font-mono" style={{ color: "var(--wf-text)" }}>{el.damage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {companionStats && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--wf-border)" }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold" style={{ color: "#a78bfa", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>{build.companion?.name.toUpperCase()}</div>
                <span className="text-[9px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>STATS COMPAGNON</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[{ label: "PV", value: companionStats.health, color: "#ef5350" }, { label: "Bouclier", value: companionStats.shield, color: "#42a5f5" }, { label: "Armure", value: companionStats.armor, color: "#ffa726" }].map(metric => <div key={metric.label} className="rounded-sm px-2 py-1.5" style={{ backgroundColor: `${metric.color}10`, border: `1px solid ${metric.color}35` }}><div className="text-[8px] uppercase" style={{ color: "var(--wf-text-dim)" }}>{metric.label}</div><div className="text-sm font-bold" style={{ color: metric.color, fontFamily: "var(--font-mono)" }}>{metric.value}</div></div>)}
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {[{ label: "Dégâts", value: companionStats.damagePct, suffix: "%" }, { label: "Critique", value: companionStats.criticalChancePct, suffix: "%" }, { label: "Statut", value: companionStats.statusChancePct, suffix: "%" }, { label: "Dégâts statut", value: companionStats.statusDamagePct, suffix: "%" }, { label: "Régénération", value: companionStats.healthRegen, suffix: "/s" }].filter(metric => metric.value !== 0).map(metric => <div key={metric.label} className="flex justify-between rounded-sm px-2 py-1 text-[10px]" style={{ backgroundColor: "rgba(167,139,250,.08)", color: "var(--wf-text-dim)" }}><span>{metric.label}</span><span style={{ color: "#a78bfa", fontFamily: "var(--font-mono)" }}>+{metric.value}{metric.suffix}</span></div>)}
              </div>
              <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto">{companionStats.activeEffects.map(entry => <div key={entry.name} className="rounded-sm px-2 py-1" style={{ borderLeft: `2px solid ${entry.recognized ? "#66bb6a" : "#6b7280"}`, backgroundColor: "rgba(0,0,0,.18)" }}><div className="text-[9px] font-bold" style={{ color: entry.recognized ? "#66bb6a" : "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{entry.name} · {entry.recognized ? "CALCULÉ" : "DÉTAIL"}</div><div className="text-[9px]" style={{ color: "var(--wf-text)" }}>{entry.effect}</div></div>)}</div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: "var(--wf-border)" }}>
            <div className="rounded-sm p-2" style={{ backgroundColor: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.25)" }}><div className="text-[9px] uppercase" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>Arcanes</div><div className="text-sm font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-mono)" }}>{[...build.warframeArcanes, ...build.primaryArcanes, ...build.secondaryArcanes, ...build.meleeArcanes].filter(Boolean).length}</div></div>
            <div className="rounded-sm p-2" style={{ backgroundColor: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.25)" }}><div className="text-[9px] uppercase" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>Mods comp.</div><div className="text-sm font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-mono)" }}>{build.companionMods.filter(Boolean).length}/{build.companionMods.length}</div></div>
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
          <div className="relative mx-auto mb-3 flex h-16 w-24 items-center justify-center wf-empty-slot">
            <Shield size={32} className="opacity-50" style={{ color: "var(--wf-cyan)" }} />
            <div className="wf-slot-trace" />
          </div>
          <p className="text-xs" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}>INITIALISER UN WARFRAME POUR DÉPLOYER LES STATISTIQUES</p>
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
    const identity = itemIdentity(item);
    if ((type.startsWith("mod-") || type.startsWith("arcane-")) && identity && getUnavailableIds(activeBuild, type, modIndex).includes(identity)) {
      toast.error("Cet élément est déjà utilisé dans cette catégorie.");
      return;
    }

    updateBuild(b => {
      const nb = { ...b };
      if (type === "warframe") nb.warframe = item as Warframe;
      else if (type === "primary") nb.primaryWeapon = item as Weapon;
      else if (type === "secondary") nb.secondaryWeapon = item as Weapon;
      else if (type === "melee") nb.meleeWeapon = item as Weapon;
      else if (type === "companion") {
        const nextCompanion = item as Companion;
        nb.companion = nextCompanion;
        nb.companionMods = b.companionMods.map(mod => mod && isCompanionModCompatible(mod, nextCompanion) ? mod : null);
      }
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
        nb.warframeMods[modIndex] = selectModAtMaxRank(item as Mod);
      } else if (type === "mod-primary" && modIndex !== undefined) {
        nb.primaryMods = [...b.primaryMods];
        nb.primaryMods[modIndex] = selectModAtMaxRank(item as Mod);
      } else if (type === "mod-secondary" && modIndex !== undefined) {
        nb.secondaryMods = [...b.secondaryMods];
        nb.secondaryMods[modIndex] = selectModAtMaxRank(item as Mod);
      } else if (type === "mod-melee" && modIndex !== undefined) {
        nb.meleeMods = [...b.meleeMods];
        nb.meleeMods[modIndex] = selectModAtMaxRank(item as Mod);
      } else if (type === "mod-companion" && modIndex !== undefined) {
        nb.companionMods = [...b.companionMods];
        nb.companionMods[modIndex] = selectModAtMaxRank(item as Mod);
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
      else if (type === "companion") {
        nb.companion = undefined;
        nb.companionMods = Array(8).fill(null);
      }
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
      else if (type === "mod-companion") { nb.companionMods = [...b.companionMods]; nb.companionMods[index] = null; }
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

  const toggleCapacity = (key: keyof BuildSet["capacityBoosts"]) => {
    updateBuild(build => ({
      ...build,
      capacityBoosts: { ...build.capacityBoosts, [key]: !build.capacityBoosts[key] },
    }));
  };

  const setModRank = (index: number, rank: number, type: SlotType) => {
    updateBuild(build => {
      const slots = getSlotItems(build, type);
      const current = slots[index] as Mod | null | undefined;
      if (!current) return build;
      const maxRank = Math.max(0, Number(current.maxRank) || 0);
      const selectedRank = Math.max(0, Math.min(Math.round(rank), maxRank));
      const nextSlots = [...slots] as (Mod | null)[];
      nextSlots[index] = { ...current, selectedRank };
      if (type === "mod-warframe") return { ...build, warframeMods: nextSlots };
      if (type === "mod-primary") return { ...build, primaryMods: nextSlots };
      if (type === "mod-secondary") return { ...build, secondaryMods: nextSlots };
      if (type === "mod-melee") return { ...build, meleeMods: nextSlots };
      if (type === "mod-companion") return { ...build, companionMods: nextSlots };
      return build;
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

  const exportBuildSummary = () => {
    const blobUrl = URL.createObjectURL(new Blob([buildSummaryMarkdown({ ...activeBuild, name: buildName })], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `${buildName.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "warframe-build"}-resume.md`;
    anchor.click();
    URL.revokeObjectURL(blobUrl);
    toast.success("Résumé du build exporté !");
  };

  const duplicateBuild = (source: BuildSet = activeBuild) => {
    const duplicated = normalizeBuild(JSON.parse(JSON.stringify(source)));
    if (!duplicated) return;
    duplicated.id = Date.now().toString();
    duplicated.name = `${source.name} — COPIE`;
    duplicated.createdAt = new Date().toISOString();
    setBuilds(prev => [...prev, duplicated]);
    setActiveBuildIndex(builds.length);
    setBuildName(duplicated.name);
    toast.success(`Set "${duplicated.name}" dupliqué !`);
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
          <div className="wf-panel wf-hud-panel hud-frame flex flex-wrap items-center gap-3 p-3 rounded-sm" style={{ border: "1px solid var(--wf-border)" }}>
            <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text-dim)", fontSize: "10px", whiteSpace: "nowrap" }}>
              LOADOUT // NOM TACTIQUE
            </span>
            <input
              type="text"
              value={buildName}
              onChange={e => {
                setBuildName(e.target.value);
                updateBuild(b => ({ ...b, name: e.target.value }));
              }}
              className="min-w-[180px] flex-1 px-3 py-1.5 text-sm rounded-sm outline-none"
              style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
              placeholder="Ex. Steel Path // Survie"
            />
            <button
              onClick={saveBuild}
              className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm transition-all wf-btn-primary shrink-0"
            >
              <Save size={12} />
              <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>SAUVEGARDER</span>
            </button>
            <button onClick={() => duplicateBuild()} className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm transition-all" style={{ border: "1px solid rgba(79,195,247,.65)", color: "var(--wf-cyan)", backgroundColor: "rgba(79,195,247,.08)" }}>
              <Copy size={12} />
              <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>DUPLIQUER</span>
            </button>
            <button onClick={exportBuild} className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm transition-all" style={{ border: "1px solid rgba(167,139,250,.65)", color: "#c4b5fd", backgroundColor: "rgba(167,139,250,.08)" }}>
              <Download size={12} />
              <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>EXPORTER JSON</span>
            </button>
            <button onClick={exportBuildSummary} className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm transition-all" style={{ border: "1px solid rgba(102,187,106,.65)", color: "#66bb6a", backgroundColor: "rgba(102,187,106,.08)" }}>
              <FileText size={12} />
              <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>RÉSUMÉ</span>
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

          {/* Modular parts configuration for MOA and Hound companions */}
          {activeBuild.companion && ["moa", "hound"].includes(activeBuild.companion.type.toLowerCase()) && (
            <div className="wf-hud-panel hud-frame rounded-sm p-4 space-y-3" style={{ border: "1px solid rgba(167,139,250,0.4)", backgroundColor: "rgba(167,139,250,0.03)" }}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a78bfa", fontFamily: "var(--font-display)" }}>
                  CONFIGURATION MODULAIRE // {activeBuild.companion.type.toUpperCase()} ({activeBuild.companion.name})
                </div>
                <span className="text-[9px]" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>TÊTE • SUPPORT • CŒUR • GYROSCOPE</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { key: "head" as const, label: "TÊTE", options: activeBuild.companion.type.toLowerCase() === "moa" ? MOA_PARTS.heads : HOUND_PARTS.heads },
                  { key: "bracket" as const, label: "SUPPORT", options: activeBuild.companion.type.toLowerCase() === "moa" ? MOA_PARTS.brackets : HOUND_PARTS.brackets },
                  { key: "core" as const, label: "CŒUR", options: activeBuild.companion.type.toLowerCase() === "moa" ? MOA_PARTS.cores : HOUND_PARTS.cores },
                  { key: "gyro" as const, label: "GYROSCOPE", options: activeBuild.companion.type.toLowerCase() === "moa" ? MOA_PARTS.gyros : HOUND_PARTS.gyros },
                ].map(part => (
                  <div key={part.key} className="space-y-1">
                    <label className="text-[9px] uppercase font-bold" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{part.label}</label>
                    <select
                      value={activeBuild.companionParts?.[part.key] || part.options[0]}
                      onChange={e => {
                        const val = e.target.value;
                        updateBuild(b => ({
                          ...b,
                          companionParts: { ...(b.companionParts || {}), [part.key]: val }
                        }));
                      }}
                      className="w-full rounded-sm px-2 py-1.5 text-xs outline-none"
                      style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
                    >
                      {part.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              equipment={activeBuild.warframe}
              capacityBoosted={activeBuild.capacityBoosts.warframe}
              onToggleCapacity={() => toggleCapacity("warframe")}
              onSelectMod={(idx, type) => setSelectorOpen({ type, modIndex: idx })}
              onClearMod={clearMod}
              onRankChange={setModRank}
              accentColor="#4fc3f7"
            />
            <ModGrid
              label="PRIMAIRE"
              mods={activeBuild.primaryMods}
              modType="mod-primary"
              equipment={activeBuild.primaryWeapon}
              capacityBoosted={activeBuild.capacityBoosts.primary}
              onToggleCapacity={() => toggleCapacity("primary")}
              onSelectMod={(idx, type) => setSelectorOpen({ type, modIndex: idx })}
              onClearMod={clearMod}
              onRankChange={setModRank}
              accentColor="#ff6b35"
            />
            <ModGrid
              label="SECONDAIRE"
              mods={activeBuild.secondaryMods}
              modType="mod-secondary"
              equipment={activeBuild.secondaryWeapon}
              capacityBoosted={activeBuild.capacityBoosts.secondary}
              onToggleCapacity={() => toggleCapacity("secondary")}
              onSelectMod={(idx, type) => setSelectorOpen({ type, modIndex: idx })}
              onClearMod={clearMod}
              onRankChange={setModRank}
              accentColor="#ffd700"
            />
            <ModGrid
              label="MÊLÉE"
              mods={activeBuild.meleeMods}
              modType="mod-melee"
              equipment={activeBuild.meleeWeapon}
              capacityBoosted={activeBuild.capacityBoosts.melee}
              onToggleCapacity={() => toggleCapacity("melee")}
              onSelectMod={(idx, type) => setSelectorOpen({ type, modIndex: idx })}
              onClearMod={clearMod}
              onRankChange={setModRank}
              accentColor="#66bb6a"
            />
            <ModGrid
              label={activeBuild.companion ? `COMPAGNON — ${activeBuild.companion.name}` : "COMPAGNON"}
              mods={activeBuild.companionMods}
              modType="mod-companion"
              equipment={activeBuild.companion}
              capacityBoosted={activeBuild.capacityBoosts.companion}
              onToggleCapacity={() => toggleCapacity("companion")}
              onSelectMod={(idx, type) => {
                if (!activeBuild.companion) {
                  toast.error("Sélectionnez d’abord un compagnon.");
                  return;
                }
                setSelectorOpen({ type, modIndex: idx });
              }}
              onClearMod={clearMod}
              onRankChange={setModRank}
              accentColor="#a78bfa"
            />
          </div>
        </div>

        {/* Right: Stats + Saved builds */}
        <div className="xl:col-span-1 space-y-4">
          <StatsPanel build={activeBuild} />

          {/* Saved builds */}
          {savedBuilds.length > 0 && (
            <div className="wf-panel wf-hud-panel hud-frame rounded-sm p-4">
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => duplicateBuild(sb)}
                          className="p-1.5 rounded-sm transition-colors hover:bg-white/10"
                          style={{ color: "var(--wf-cyan)", border: "1px solid var(--wf-border)" }}
                          title="Dupliquer ce set"
                        >
                          <Copy size={11} />
                        </button>
                        <button
                          onClick={() => {
                            const loaded = normalizeBuild(sb);
                            if (!loaded) return;
                            setBuilds(prev => [...prev, { ...loaded, id: Date.now().toString() }]);
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="wf-panel wf-hud-panel hud-frame rounded-sm p-3" style={{ backgroundColor: "rgba(79,195,247,0.05)", border: "1px solid rgba(79,195,247,0.2)" }}>
            <div className="text-xs font-bold mb-2" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
              CONSEILS DE L’ARSENAL
            </div>
            <ul className="space-y-1">
              {[
                "Clique sur un slot pour sélectionner l'équipement",
                "Les mods améliorent les statistiques en temps réel",
                "Chaque mod et Arcane ne peut être utilisé qu’une fois par catégorie",
                "Les mods compagnon se débloquent après la sélection d’un compagnon",
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
          unavailableIds={getUnavailableIds(activeBuild, selectorOpen.type, selectorOpen.modIndex)}
          companion={activeBuild.companion}
          onSelect={handleSelect}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </Layout>
  );
}
