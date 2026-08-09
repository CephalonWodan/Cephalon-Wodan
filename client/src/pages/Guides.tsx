import { toast } from "sonner";
import Layout from "@/components/Layout";
import { BookOpen } from "lucide-react";

const GUIDES = [
  { title: "Guide du Nouveau Joueur", desc: "Tout ce qu'il faut savoir pour commencer Warframe.", tag: "DÉBUTANT", color: "#66bb6a" },
  { title: "Comprendre les Mods", desc: "Apprenez à modder vos Warframes et armes efficacement.", tag: "INTERMÉDIAIRE", color: "#4fc3f7" },
  { title: "Rang de Maîtrise — Guide Complet", desc: "Comment progresser rapidement dans les rangs de maîtrise.", tag: "PROGRESSION", color: "#ffd700" },
  { title: "Builds Meta 2026", desc: "Les meilleurs builds pour chaque type de mission.", tag: "AVANCÉ", color: "#ff6b35" },
  { title: "Farming des Ressources", desc: "Où et comment farmer les ressources rares.", tag: "FARMING", color: "#a78bfa" },
  { title: "Eidolons — Guide de Chasse", desc: "Stratégies pour chasser les Eidolons sur les Plaines.", tag: "BOSS", color: "#ef5350" },
];

export default function Guides() {
  return (
    <Layout title="GUIDES">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GUIDES.map((g, i) => (
          <button key={i} onClick={() => toast.info("Guide bientôt disponible !")}
            className="text-left rounded-sm p-4 transition-all duration-200 animate-fade-slide-up"
            style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)", animationDelay: `${i * 50}ms` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = g.color; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-border)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} style={{ color: g.color }} />
              <span className="text-xs px-2 py-0.5 rounded-sm font-bold"
                style={{ backgroundColor: `${g.color}20`, color: g.color, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>
                {g.tag}
              </span>
            </div>
            <h3 className="text-sm font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{g.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>{g.desc}</p>
          </button>
        ))}
      </div>
    </Layout>
  );
}
