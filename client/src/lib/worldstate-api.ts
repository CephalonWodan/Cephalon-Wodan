// WARFRAME SET BUILDER — Worldstate API adapter
// Style reminder: Tenno Codex HUD — compact live telemetry, explicit freshness,
// high-contrast status accents, and readable fallback states at narrow widths.
// ============================================================

export const WORLDSTATE_ENDPOINT = "https://api.warframestat.us/pc";
export const WORLDSTATE_REFRESH_MS = 120_000;

export interface LiveFissure {
  id: string;
  node: string;
  tier: string;
  missionType: string;
  enemy?: string;
  isStorm?: boolean;
  isHard?: boolean;
  expiry?: string;
}

export interface LiveAlert {
  id: string;
  missionNode: string;
  missionType: string;
  faction: string;
  reward: string;
  expiry?: string;
  activation?: string;
  isExpired?: boolean;
}

export interface LiveInvasion {
  id: string;
  node: string;
  description: string;
  attackerFaction: string;
  defenderFaction: string;
  attackerReward: string;
  defenderReward: string;
  completion: number;
  completed: boolean;
  count: number;
  requiredRuns: number;
  expiry?: string;
}

export interface LiveIncursion {
  id: string;
  activation?: string;
  expiry?: string;
  remaining?: string;
  missions: Array<{ node: string; type: string; faction?: string }>;
}

export interface LiveCycle {
  name: string;
  state: string;
  timeRemaining: string;
}

export interface WorldStateSnapshot {
  timestamp: string;
  fissures: LiveFissure[];
  alerts: LiveAlert[];
  invasions: LiveInvasion[];
  incursions: LiveIncursion | null;
  cycles: LiveCycle[];
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord => (value && typeof value === "object" ? value as UnknownRecord : {});
const asString = (value: unknown, fallback = "—") => typeof value === "string" && value.trim() ? value : fallback;
const asNumber = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

const rewardLabel = (reward: unknown) => {
  const data = asRecord(reward);
  const countedItems = Array.isArray(data.countedItems) ? data.countedItems.map(item => {
    const entry = asRecord(item);
    const count = asNumber(entry.count, 1);
    const type = asString(entry.type, "Récompense");
    return `${count > 1 ? `${count}x ` : ""}${type}`;
  }) : [];
  const items = Array.isArray(data.items) ? data.items.map(item => asString(item, "")).filter(Boolean) : [];
  const credits = asNumber(data.credits, 0);
  return [...countedItems, ...items, credits > 0 ? `${credits.toLocaleString("fr-FR")} crédits` : ""].filter(Boolean).join(" + ") || "Récompense inconnue";
};

const formatCycleState = (value: string) => {
  const labels: Record<string, string> = {
    day: "Jour",
    night: "Nuit",
    warm: "Chaud",
    cold: "Froid",
    fass: "Fass",
    vome: "Vome",
    corpus: "Corpus",
    grineer: "Grineer",
    duviri: "Duviri",
    sorrow: "Sorrow",
    anger: "Anger",
    joy: "Joy",
    fear: "Fear",
    joyless: "Joyless",
  };
  return labels[value.toLowerCase()] || value;
};

const cycle = (name: string, value: unknown): LiveCycle | null => {
  const data = asRecord(value);
  if (!Object.keys(data).length) return null;
  return {
    name,
    state: formatCycleState(asString(data.state)),
    timeRemaining: asString(data.timeLeft, "—"),
  };
};

export const normalizeWorldState = (payload: unknown): WorldStateSnapshot => {
  const data = asRecord(payload);
  const alerts = Array.isArray(data.alerts) ? data.alerts.map((raw, index) => {
    const alert = asRecord(raw);
    const mission = asRecord(alert.mission);
    return {
      id: asString(alert.id, `alert-${index}`),
      missionNode: asString(mission.node, "Nœud inconnu"),
      missionType: asString(mission.type, "Mission"),
      faction: asString(mission.faction, "Faction inconnue"),
      reward: rewardLabel(mission.reward),
      expiry: asString(alert.expiry, ""),
      activation: asString(alert.activation, ""),
      isExpired: Boolean(alert.expired),
    } satisfies LiveAlert;
  }).filter(alert => !alert.isExpired) : [];

  const invasions = Array.isArray(data.invasions) ? data.invasions.map((raw, index) => {
    const invasion = asRecord(raw);
    const attacker = asRecord(invasion.attacker);
    const defender = asRecord(invasion.defender);
    return {
      id: asString(invasion.id, `invasion-${index}`),
      node: asString(invasion.node, "Nœud inconnu"),
      description: asString(invasion.desc, "Invasion"),
      attackerFaction: asString(attacker.faction, "Attaquant"),
      defenderFaction: asString(defender.faction, "Défenseur"),
      attackerReward: rewardLabel(attacker.reward),
      defenderReward: rewardLabel(defender.reward),
      completion: Math.max(0, Math.min(100, asNumber(invasion.completion, 0))),
      completed: Boolean(invasion.completed),
      count: asNumber(invasion.count, 0),
      requiredRuns: asNumber(invasion.requiredRuns, 0),
      expiry: asString(invasion.expiry, ""),
    } satisfies LiveInvasion;
  }).filter(invasion => !invasion.completed) : [];

  const fissures = Array.isArray(data.fissures) ? data.fissures.map((raw, index) => {
    const fissure = asRecord(raw);
    return {
      id: asString(fissure.id, `fissure-${index}`),
      node: asString(fissure.node, "Nœud inconnu"),
      tier: asString(fissure.tier, "—"),
      missionType: asString(fissure.missionType, "Mission"),
      enemy: asString(fissure.enemy, ""),
      isStorm: Boolean(fissure.isStorm),
      isHard: Boolean(fissure.isHard),
      expiry: asString(fissure.expiry, ""),
    } satisfies LiveFissure;
  }).filter(fissure => fissure.node !== "Nœud inconnu") : [];

  const incursionData = asRecord(asRecord(data.steelPath).incursions);
  const incursions = Object.keys(incursionData).length ? {
    id: asString(incursionData.id, "steel-path-incursions"),
    activation: asString(incursionData.activation, ""),
    expiry: asString(incursionData.expiry, ""),
    remaining: asString(asRecord(data.steelPath).remaining, ""),
    missions: Array.isArray(incursionData.missions) ? incursionData.missions.map(mission => {
      const entry = asRecord(mission);
      return { node: asString(entry.node, "Nœud inconnu"), type: asString(entry.type, "Mission"), faction: asString(entry.faction, "") };
    }) : [],
  } satisfies LiveIncursion : null;

  const cycles = [
    cycle("Cetus", data.cetusCycle),
    cycle("Vallée Orbis", data.vallisCycle),
    cycle("Terre", data.earthCycle),
    cycle("Deimos", data.cambionCycle),
    cycle("Zariman", data.zarimanCycle),
    cycle("Duviri", data.duviriCycle),
  ].filter((value): value is LiveCycle => Boolean(value));

  return {
    timestamp: asString(data.timestamp, new Date().toISOString()),
    fissures,
    alerts,
    invasions,
    incursions,
    cycles,
  };
};

export async function fetchWorldState(signal?: AbortSignal): Promise<WorldStateSnapshot> {
  const response = await fetch(WORLDSTATE_ENDPOINT, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Worldstate indisponible (${response.status})`);
  return normalizeWorldState(await response.json());
}
