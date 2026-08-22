// WARFRAME SET BUILDER — Assistant context bridge
// Tenno Codex HUD: expose only a compact, readable snapshot of the active build to the IA.
// Keep this payload deterministic and bounded so mission recommendations stay focused.

import type { BuildSet, Mod, SelectedArchonShard } from "./warframe-data";

export const ASSISTANT_BUILD_CONTEXT_EVENT = "warframe-set-builder:assistant-context";
export const ASSISTANT_BUILD_CONTEXT_STORAGE_KEY = "warframe-set-builder:assistant-context:v1";

export interface AssistantBuildContext {
  buildName: string;
  warframe?: {
    name: string;
    role?: string;
    health: number;
    shield: number;
    armor: number;
    energy: number;
    abilities: string[];
  };
  primaryWeapon?: string;
  secondaryWeapon?: string;
  meleeWeapon?: string;
  companion?: string;
  companionWeapon?: string;
  mods: {
    warframe: string[];
    primary: string[];
    secondary: string[];
    melee: string[];
    companion: string[];
    companionWeapon: string[];
  };
  arcanes: string[];
  archonShards: string[];
}

function itemLabel(item: { name?: string; effect?: string } | null | undefined): string | null {
  if (!item?.name) return null;
  return item.effect ? `${item.name} — ${item.effect}` : item.name;
}

function compactMods(mods: (Mod | null)[]): string[] {
  return mods.map(mod => itemLabel(mod)).filter((value): value is string => Boolean(value)).slice(0, 10);
}

function compactShards(shards: (SelectedArchonShard | null)[]): string[] {
  return shards
    .map(selected => selected?.shard?.name ? `${selected.shard.name}${selected.shard.effects?.[selected.effectIndex] ? ` — ${selected.shard.effects[selected.effectIndex]}` : ""}` : null)
    .filter((value): value is string => Boolean(value))
    .slice(0, 5);
}

export function summarizeBuildForAssistant(build: BuildSet, buildName = build.name): AssistantBuildContext {
  return {
    buildName,
    warframe: build.warframe ? {
      name: build.warframe.name,
      role: build.warframe.role,
      health: build.warframe.health,
      shield: build.warframe.shield,
      armor: build.warframe.armor,
      energy: build.warframe.energy,
      abilities: (build.warframe.abilities || []).map(ability => typeof ability === "string" ? ability : ability.name).filter(Boolean).slice(0, 4),
    } : undefined,
    primaryWeapon: build.primaryWeapon?.name,
    secondaryWeapon: build.secondaryWeapon?.name,
    meleeWeapon: build.meleeWeapon?.name,
    companion: build.companion?.name,
    companionWeapon: build.companionWeapon?.name,
    mods: {
      warframe: compactMods(build.warframeMods),
      primary: compactMods(build.primaryMods),
      secondary: compactMods(build.secondaryMods),
      melee: compactMods(build.meleeMods),
      companion: compactMods(build.companionMods),
      companionWeapon: compactMods(build.companionWeaponMods),
    },
    arcanes: [
      ...build.warframeArcanes,
      ...build.primaryArcanes,
      ...build.secondaryArcanes,
      ...build.meleeArcanes,
    ].map(arcane => itemLabel(arcane)).filter((value): value is string => Boolean(value)).slice(0, 6),
    archonShards: compactShards(build.archonShards),
  };
}
