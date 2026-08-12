import React from "react";
import { WORLD_STATE_MOCK } from "@/lib/warframe-data";
import { Globe, Flame, Clock, Radio, Sun } from "lucide-react";

export default function WorldStateHUD() {
  return (
    <div className="rounded-sm p-4 hud-frame" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
        <div className="flex items-center gap-2">
          <Globe size={16} style={{ color: "var(--wf-cyan)" }} />
          <h3 className="text-xs font-bold tracking-wider uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
            État du Système Solaire // Fissures & Cycles
          </h3>
        </div>
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm" style={{ backgroundColor: "rgba(76,175,80,0.15)", color: "#66bb6a", border: "1px solid rgba(76,175,80,0.4)", fontFamily: "var(--font-mono)" }}>
          <Radio size={10} className="animate-pulse" /> EN DIRECT
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        {/* Fissures Néant */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>
            <Flame size={12} /> Fissures du Néant Actives
          </div>
          <div className="space-y-1.5">
            {WORLD_STATE_MOCK.fissures.map(f => (
              <div key={f.id} className="p-2 rounded-sm flex items-center justify-between" style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid rgba(79,195,247,0.2)" }}>
                <div>
                  <div className="font-bold text-[11px]" style={{ color: "var(--wf-text)" }}>{f.node}</div>
                  <div className="text-[9px]" style={{ color: "var(--wf-text-dim)" }}>{f.missionType}</div>
                </div>
                <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold" style={{ backgroundColor: "rgba(255,107,53,0.15)", color: "#ff6b35", fontFamily: "var(--font-mono)" }}>
                  {f.tier}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cycles Planétaires */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold" style={{ color: "#ffd700", fontFamily: "var(--font-display)" }}>
            <Sun size={12} /> Cycles Planétaires
          </div>
          <div className="space-y-1.5">
            {WORLD_STATE_MOCK.cycles.map((c, idx) => (
              <div key={idx} className="p-2 rounded-sm flex items-center justify-between" style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,215,0,0.2)" }}>
                <div>
                  <div className="font-bold text-[11px]" style={{ color: "var(--wf-text)" }}>{c.name}</div>
                  <div className="text-[9px]" style={{ color: "#ffd700" }}>{c.state}</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: "var(--wf-cyan)" }}>
                  <Clock size={10} /> {c.timeRemaining}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes & Invasions */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold" style={{ color: "#ab7cff", fontFamily: "var(--font-display)" }}>
            <Radio size={12} /> Alertes & Invasions
          </div>
          <div className="space-y-1.5">
            {WORLD_STATE_MOCK.alerts.map(a => (
              <div key={a.id} className="p-2 rounded-sm space-y-1" style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid rgba(171,124,255,0.2)" }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px]" style={{ color: "var(--wf-text)" }}>{a.missionNode}</span>
                  <span className="text-[9px] font-mono" style={{ color: "#ab7cff" }}>{a.eta}</span>
                </div>
                <div className="text-[10px]" style={{ color: "var(--wf-cyan)" }}>{a.reward}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
