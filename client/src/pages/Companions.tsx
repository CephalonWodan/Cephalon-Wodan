// ============================================================
// WARFRAME SET BUILDER — Companions Page (placeholder)
// ============================================================
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { COMPANIONS, getRarityColor, getRarityLabel } from "@/lib/warframe-data";

export default function Companions() {
  const [search, setSearch] = useState("");
  const filtered = COMPANIONS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout title="COMPAGNONS">
      <div className="flex items-center gap-3 mb-6 p-4 rounded-sm" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
        <div className="relative flex items-center flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: "var(--wf-text-dim)" }} />
          <input type="text" placeholder="Rechercher un compagnon..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-sm outline-none"
            style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }} />
        </div>
        <span className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{filtered.length} compagnons</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((c, i) => {
          const rc = getRarityColor(c.rarity);
          return (
            <div key={c.id} className="rounded-sm overflow-hidden transition-all duration-200 animate-fade-slide-up"
              style={{ backgroundColor: "var(--wf-bg-panel)", border: `1px solid var(--wf-border)`, animationDelay: `${i * 30}ms` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = rc; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-border)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              <div className="h-28 flex items-center justify-center" style={{ backgroundColor: `${rc}10` }}>
                <Users size={36} style={{ color: rc, opacity: 0.8 }} />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{c.name}</h3>
                  <span className="text-xs px-1.5 py-0.5 rounded-sm ml-1" style={{ backgroundColor: `${rc}20`, color: rc, fontFamily: "var(--font-display)", fontSize: "9px" }}>
                    {getRarityLabel(c.rarity).toUpperCase()}
                  </span>
                </div>
                <div className="text-xs mb-2 capitalize" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)", fontSize: "10px" }}>{c.type}</div>
                <p className="text-xs mb-3 line-clamp-2" style={{ color: "var(--wf-text-dim)" }}>{c.description}</p>
                <div className="grid grid-cols-3 gap-1 mb-3">
                  {[{ l: "VIE", v: c.health }, { l: "BOU", v: c.shield }, { l: "ARM", v: c.armor }].map(({ l, v }) => (
                    <div key={l} className="text-center p-1 rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
                      <div className="text-xs font-bold" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>{v}</div>
                      <div className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)", fontSize: "8px" }}>{l}</div>
                    </div>
                  ))}
                </div>
                <Link href="/builder" className="block text-center text-xs px-2 py-1 rounded-sm transition-all wf-btn-primary" style={{ fontSize: "10px" }}>
                  ÉQUIPER
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
