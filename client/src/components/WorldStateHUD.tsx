// WARFRAME SET BUILDER — Live Worldstate HUD
// Style reminder: Tenno Codex HUD — telemetry-first hierarchy, compact cards,
// explicit freshness, cyan/orange faction accents, and one-column readability on mobile.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Flame, Globe, Loader2, Radio, RefreshCw, Swords, Sun, Target } from "lucide-react";
import { WORLD_STATE_MOCK } from "@/lib/warframe-data";
import { fetchWorldState, LiveAlert, LiveInvasion, WORLDSTATE_REFRESH_MS, WorldStateSnapshot } from "@/lib/worldstate-api";

const FALLBACK_STATE: WorldStateSnapshot = {
  timestamp: new Date().toISOString(),
  fissures: WORLD_STATE_MOCK.fissures,
  alerts: WORLD_STATE_MOCK.alerts.map(alert => ({
    id: alert.id,
    missionNode: alert.missionNode,
    missionType: "Alerte",
    faction: alert.faction,
    reward: alert.reward,
    eta: alert.eta,
  } as LiveAlert)),
  invasions: [],
  incursions: null,
  cycles: WORLD_STATE_MOCK.cycles,
};

type LoadState = "loading" | "ready" | "error";

const formatExpiry = (expiry?: string) => {
  if (!expiry) return "ÉCHÉANCE INCONNUE";
  const remaining = new Date(expiry).getTime() - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) return "EXPIRE BIENTÔT";
  const minutes = Math.floor(remaining / 60_000);
  if (minutes < 60) return `${minutes} MIN`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}H${rest.toString().padStart(2, "0")}`;
};

const formatSyncTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const factionColor = (faction: string) => {
  const normalized = faction.toLowerCase();
  if (normalized.includes("grineer")) return "#ff6b35";
  if (normalized.includes("corpus")) return "#4fc3f7";
  if (normalized.includes("infest")) return "#66bb6a";
  if (normalized.includes("narmer")) return "#ffd700";
  return "#ab7cff";
};

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-sm border border-dashed border-white/10 bg-black/20 px-3 py-4 text-center text-[10px] uppercase tracking-wider text-slate-500">{label}</div>;
}

function AlertCard({ alert }: { alert: LiveAlert }) {
  return (
    <div className="rounded-sm border border-violet-400/20 bg-black/30 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-bold text-slate-100">{alert.missionNode}</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-500">{alert.missionType} · {alert.faction}</div>
        </div>
        <span className="shrink-0 rounded-sm bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-mono text-violet-300">{formatExpiry(alert.expiry)}</span>
      </div>
      <div className="mt-2 text-[10px] leading-relaxed text-cyan-300">{alert.reward}</div>
    </div>
  );
}

function InvasionCard({ invasion }: { invasion: LiveInvasion }) {
  const attackerColor = factionColor(invasion.attackerFaction);
  const defenderColor = factionColor(invasion.defenderFaction);
  return (
    <div className="rounded-sm border border-orange-400/20 bg-black/30 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-bold text-slate-100">{invasion.node}</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-500">{invasion.description}</div>
        </div>
        <span className="shrink-0 rounded-sm bg-orange-400/10 px-1.5 py-0.5 text-[9px] font-mono text-orange-300">{formatExpiry(invasion.expiry)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-bold uppercase">
        <span style={{ color: attackerColor }}>{invasion.attackerFaction}</span>
        <Swords size={11} className="text-slate-600" />
        <span style={{ color: defenderColor }}>{invasion.defenderFaction}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-cyan-400 transition-[width] duration-300" style={{ width: `${invasion.completion}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-slate-500">
        <span>{invasion.completion.toFixed(1)} % terminé</span>
        <span className="truncate text-right text-cyan-300">{invasion.attackerReward || invasion.defenderReward}</span>
      </div>
    </div>
  );
}

export default function WorldStateHUD() {
  const [snapshot, setSnapshot] = useState<WorldStateSnapshot>(FALLBACK_STATE);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, setClock] = useState(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true);
    try {
      const next = await fetchWorldState(signal);
      setSnapshot(next);
      setLastFetchedAt(new Date().toISOString());
      setLoadState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadState("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const poll = window.setInterval(() => void refresh(), WORLDSTATE_REFRESH_MS);
    const clock = window.setInterval(() => setClock(value => value + 1), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [refresh]);

  const syncLabel = useMemo(() => lastFetchedAt ? formatSyncTime(lastFetchedAt) : formatSyncTime(snapshot.timestamp), [lastFetchedAt, snapshot.timestamp]);
  const statusColor = loadState === "ready" ? "#66bb6a" : loadState === "error" ? "#ff6b35" : "#ffd700";
  const statusLabel = loadState === "ready" ? "API LIVE" : loadState === "error" ? "REPLI LOCAL" : "SYNC...";

  return (
    <section className="hud-frame rounded-sm p-3 sm:p-4" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }} aria-live="polite">
      <div className="mb-3 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--wf-border)" }}>
        <div className="flex min-w-0 items-center gap-2">
          <Globe size={16} style={{ color: "var(--wf-cyan)" }} />
          <div className="min-w-0">
            <h2 className="truncate text-[11px] font-bold uppercase tracking-wider sm:text-xs" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
              État du système solaire // Worldstate live
            </h2>
            <div className="mt-0.5 text-[9px] font-mono text-slate-500">Dernière synchro : {syncLabel} · actualisation automatique 2 min</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="flex items-center gap-1 rounded-sm px-2 py-0.5 text-[9px] font-mono" style={{ color: statusColor, backgroundColor: `${statusColor}15`, border: `1px solid ${statusColor}55` }}>
            {loadState === "loading" ? <Loader2 size={10} className="animate-spin" /> : <Radio size={10} className={loadState === "ready" ? "animate-pulse" : ""} />}
            {statusLabel}
          </span>
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-black/25 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-wait disabled:opacity-60" aria-label="Rafraîchir le Worldstate">
            <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden xs:inline">Rafraîchir</span>
          </button>
        </div>
      </div>

      {loadState === "error" && <div className="mb-3 flex items-start gap-2 rounded-sm border border-orange-400/25 bg-orange-400/5 p-2 text-[10px] leading-relaxed text-orange-200"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> L’API Worldstate est momentanément indisponible. Les dernières données locales de secours restent visibles.</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300" style={{ fontFamily: "var(--font-display)" }}><Flame size={12} /> Fissures du Néant</div>
          <div className="space-y-1.5">
            {snapshot.fissures.slice(0, 5).map(fissure => <div key={fissure.id} className="flex items-center justify-between gap-2 rounded-sm border border-cyan-400/20 bg-black/30 p-2"><div className="min-w-0"><div className="truncate text-[11px] font-bold text-slate-100">{fissure.node}</div><div className="text-[9px] text-slate-500">{fissure.missionType}{fissure.enemy ? ` · ${fissure.enemy}` : ""}</div></div><span className="shrink-0 rounded-sm bg-orange-400/10 px-1.5 py-0.5 text-[9px] font-bold text-orange-300">{fissure.tier}</span></div>)}
            {snapshot.fissures.length === 0 && <EmptyState label="Aucune fissure active" />}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300" style={{ fontFamily: "var(--font-display)" }}><Sun size={12} /> Cycles planétaires</div>
          <div className="space-y-1.5">
            {snapshot.cycles.slice(0, 5).map(cycle => <div key={cycle.name} className="flex items-center justify-between gap-2 rounded-sm border border-yellow-300/20 bg-black/30 p-2"><div className="truncate text-[11px] font-bold text-slate-100">{cycle.name}<div className="text-[9px] font-normal text-yellow-300">{cycle.state}</div></div><div className="flex shrink-0 items-center gap-1 text-[10px] font-mono text-cyan-300"><Clock size={10} /> {cycle.timeRemaining}</div></div>)}
            {snapshot.cycles.length === 0 && <EmptyState label="Cycles indisponibles" />}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-300" style={{ fontFamily: "var(--font-display)" }}><Radio size={12} /> Alertes actives</div>
          <div className="space-y-1.5">
            {snapshot.alerts.slice(0, 5).map(alert => <AlertCard key={alert.id} alert={alert} />)}
            {snapshot.alerts.length === 0 && <EmptyState label="Aucune alerte active" />}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-300" style={{ fontFamily: "var(--font-display)" }}><Swords size={12} /> Invasions en cours <span className="ml-auto font-mono text-slate-500">{snapshot.invasions.length}</span></div>
          <div className="space-y-1.5">
            {snapshot.invasions.slice(0, 4).map(invasion => <InvasionCard key={invasion.id} invasion={invasion} />)}
            {snapshot.invasions.length === 0 && <EmptyState label="Aucune invasion active" />}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300" style={{ fontFamily: "var(--font-display)" }}><Target size={12} /> Incursions Steel Path</div>
          {snapshot.incursions ? <div className="rounded-sm border border-emerald-400/20 bg-black/30 p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-slate-100">Incursions quotidiennes</span><span className="shrink-0 text-[9px] font-mono text-emerald-300">{formatExpiry(snapshot.incursions.expiry)}</span></div><div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">{snapshot.incursions.missions.length > 0 ? snapshot.incursions.missions.map(mission => <div key={`${mission.node}-${mission.type}`} className="rounded-sm border border-white/10 bg-white/[0.03] p-2"><div className="truncate text-[10px] font-bold text-slate-100">{mission.node}</div><div className="text-[9px] text-slate-500">{mission.type}{mission.faction ? ` · ${mission.faction}` : ""}</div></div>) : <div className="text-[10px] text-slate-500">La liste détaillée des missions n’est pas fournie par l’endpoint actuel.</div>}</div></div> : <EmptyState label="Incursions indisponibles" />}
        </div>
      </div>
    </section>
  );
}
