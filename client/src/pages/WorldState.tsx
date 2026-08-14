// WARFRAME SET BUILDER — Worldstate page
// Style reminder: Tenno Codex HUD — operational console layout, concise telemetry,
// clear live/offline states, and generous touch targets on mobile.
// ============================================================
import { Clock, Info, Radio } from "lucide-react";
import Layout from "@/components/Layout";
import WorldStateHUD from "@/components/WorldStateHUD";

export default function WorldState() {
  return (
    <Layout title="WORLDSTATE">
      <div className="space-y-4 sm:space-y-6">
        <div className="hud-frame rounded-sm border border-cyan-400/25 bg-cyan-400/[0.04] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-sm border border-cyan-400/30 bg-cyan-400/10 p-2 text-cyan-300"><Radio size={16} /></div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300" style={{ fontFamily: "var(--font-display)" }}>Console de surveillance</div>
              <h2 className="mt-1 text-lg font-bold uppercase tracking-wider text-slate-100 sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>Alertes, invasions et incursions en temps réel</h2>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400 sm:text-sm">Les données sont synchronisées automatiquement depuis le Worldstate public. Les cartes affichent les échéances, les récompenses et la progression des invasions dès que l’API est disponible.</p>
            </div>
          </div>
        </div>
        <WorldStateHUD />
        <div className="grid grid-cols-1 gap-3 text-xs text-slate-400 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-sm border border-white/10 bg-black/20 p-3"><Clock size={14} className="mt-0.5 shrink-0 text-cyan-300" /><span>Le rafraîchissement automatique suit la cadence de cache publique de l’API, soit environ deux minutes.</span></div>
          <div className="flex items-start gap-2 rounded-sm border border-white/10 bg-black/20 p-3"><Info size={14} className="mt-0.5 shrink-0 text-violet-300" /><span>En cas d’indisponibilité temporaire, le dernier état lisible reste affiché avec un indicateur de repli local.</span></div>
        </div>
      </div>
    </Layout>
  );
}
