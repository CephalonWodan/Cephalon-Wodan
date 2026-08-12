import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Package } from "lucide-react";

const RESOURCES = [
  { name: "Ferrite", location: "Mercure, Terre, Neptune", rarity: "Commun", color: "#b0bec5" },
  { name: "Alloy Plate", location: "Vénus, Jupiter, Cérès", rarity: "Commun", color: "#b0bec5" },
  { name: "Polymer Bundle", location: "Mercure, Vénus, Uranus", rarity: "Commun", color: "#b0bec5" },
  { name: "Plastids", location: "Saturne, Phobos, Pluton", rarity: "Peu commun", color: "#66bb6a" },
  { name: "Nano Spores", location: "Saturne, Neptune, Eris", rarity: "Peu commun", color: "#66bb6a" },
  { name: "Orokin Cell", location: "Saturne, Cérès (boss)", rarity: "Rare", color: "#42a5f5" },
  { name: "Neural Sensors", location: "Jupiter (boss)", rarity: "Rare", color: "#42a5f5" },
  { name: "Neurodes", location: "Terre, Eris, Lua (boss)", rarity: "Rare", color: "#42a5f5" },
  { name: "Control Module", location: "Neptune, Void", rarity: "Rare", color: "#42a5f5" },
  { name: "Morphics", location: "Mercure, Mars, Phobos", rarity: "Rare", color: "#42a5f5" },
  { name: "Argon Crystal", location: "Void (se dégrade)", rarity: "Légendaire", color: "#ffd700" },
  { name: "Endo", location: "Missions diverses", rarity: "Universel", color: "#a78bfa" },
];

export default function Resources() {
  return (
    <Layout title="RESSOURCES">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {RESOURCES.map((r, i) => (
          <div key={i} className="rounded-sm p-3 animate-fade-slide-up"
            style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid var(--wf-border)`, animationDelay: `${i * 30}ms` }}>
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} style={{ color: r.color }} />
              <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{r.name}</h3>
            </div>
            <div className="text-xs mb-1" style={{ color: r.color, fontFamily: "var(--font-display)", fontSize: "9px", letterSpacing: "0.05em" }}>
              {r.rarity.toUpperCase()}
            </div>
            <p className="text-xs" style={{ color: "var(--wf-text-dim)" }}>{r.location}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
