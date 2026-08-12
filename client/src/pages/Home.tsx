// ============================================================
// WARFRAME SET BUILDER — Home Page
// Tenno Codex dark theme: hero + categories + news
// ============================================================
import { Link } from "wouter";
import { Zap, Shield, Sword, Star, Users, ChevronRight, Clock, BookOpen, Crosshair, Package, Settings, Map, Gem } from "lucide-react";
import Layout from "@/components/Layout";
import { WARFRAMES, WEAPONS, MODS, COMPANIONS, ARCANES, ARCHON_SHARDS, ARCHON_SHARD_EFFECT_TOTAL } from "@/lib/warframe-data";

const CATEGORY_ITEMS = [
  { label: "WARFRAMES", href: "/warframes", Icon: Shield, count: WARFRAMES.length, color: "#4fc3f7" },
  { label: "ARMES", href: "/weapons", Icon: Sword, count: WEAPONS.length, color: "#ff6b35" },
  { label: "MODS", href: "/mods", Icon: Star, count: MODS.length, color: "#ffd700" },
  { label: "COMPAGNONS", href: "/companions", Icon: Users, count: COMPANIONS.length, color: "#66bb6a" },
  { label: "ARCANES", href: "/arcanes", Icon: Star, count: ARCANES.length, color: "#ab7cff" },
  { label: "ÉCLATS", href: "/archon-shards", Icon: Gem, count: ARCHON_SHARDS.length, color: "#ffca28" },
  { label: "CRÉER UN SET", href: "/builder", Icon: Crosshair, count: null, color: "#a78bfa" },
  { label: "GUIDES", href: "/guides", Icon: BookOpen, count: null, color: "#4fc3f7" },
];

const NEWS_ITEMS = [
  { title: "Jade Shadows: Constellations est arrivé !", date: "2026-07-13", tag: "MISE À JOUR", color: "#4fc3f7" },
  { title: "Styanax Prime rejoint le Prime Access", date: "2026-07-01", tag: "PRIME ACCESS", color: "#ff6b35" },
  { title: "TennoCon 2026 — Résumé des annonces", date: "2026-06-15", tag: "ÉVÉNEMENT", color: "#ffd700" },
  { title: "Hotfix 43.0.8 — Corrections de bugs", date: "2026-07-13", tag: "HOTFIX", color: "#66bb6a" },
  { title: "Prime Resurgence : Revenant & Baruuk Prime", date: "2026-07-01", tag: "PRIME RESURGENCE", color: "#a78bfa" },
];

export default function Home() {
  return (
    <Layout>
      {/* HERO SECTION */}
      <div
        className="relative rounded-sm overflow-hidden mb-6"
        style={{ minHeight: 280 }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/manus-storage/warframe-hero-bg_35990cf5.jpg)" }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(10,14,20,0.92) 0%, rgba(10,14,20,0.6) 50%, rgba(10,14,20,0.85) 100%)" }} />
        {/* Top scan line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #4fc3f7, transparent)" }} />
        {/* Left accent */}
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "linear-gradient(180deg, #4fc3f7, transparent)" }} />
        {/* HUD corner decorations */}
        <div className="absolute top-3 left-3 w-5 h-5" style={{ borderTop: "2px solid #4fc3f7", borderLeft: "2px solid #4fc3f7", opacity: 0.8 }} />
        <div className="absolute top-3 right-3 w-5 h-5" style={{ borderTop: "2px solid #4fc3f7", borderRight: "2px solid #4fc3f7", opacity: 0.8 }} />
        <div className="absolute bottom-3 left-3 w-5 h-5" style={{ borderBottom: "2px solid #4fc3f7", borderLeft: "2px solid #4fc3f7", opacity: 0.8 }} />
        <div className="absolute bottom-3 right-3 w-5 h-5" style={{ borderBottom: "2px solid #4fc3f7", borderRight: "2px solid #4fc3f7", opacity: 0.8 }} />
        {/* Bottom scan line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(79,195,247,0.5), transparent)" }} />

        <div className="relative z-10 p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm mb-4 text-xs font-semibold tracking-widest"
              style={{ backgroundColor: "rgba(79,195,247,0.15)", border: "1px solid rgba(79,195,247,0.4)", color: "#4fc3f7", fontFamily: "var(--font-display)" }}>
              <Zap size={10} />
              HOTFIX 43.0.8 — JADE SHADOWS: CONSTELLATIONS
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold mb-3 leading-tight"
              style={{ fontFamily: "var(--font-display)", color: "#e8f4f8", letterSpacing: "0.05em" }}>
              FORGE TON ARSENAL
            </h1>
            <p className="text-sm mb-6 max-w-lg leading-relaxed" style={{ color: "#7fb3c8" }}>
              Construis et optimise tes sets complets de Warframe. Sélectionne ton Warframe, tes armes, ton compagnon et configure tes mods pour créer le build parfait.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/builder"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-sm transition-all duration-150 wf-btn-primary"
              >
                <Zap size={14} />
                <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>CRÉER UN SET</span>
              </Link>
              <Link href="/warframes"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-sm transition-all duration-150"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#e8f4f8", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}
              >
                <Shield size={14} />
                EXPLORER
              </Link>
            </div>
          </div>

          {/* Stats panel */}
          <div className="shrink-0 wf-panel rounded-sm p-4 min-w-44">
            <div className="text-xs font-bold tracking-widest mb-3" style={{ color: "#4fc3f7", fontFamily: "var(--font-display)" }}>
              BASE DE DONNÉES
            </div>
            {[
              { label: "Warframes", value: WARFRAMES.length, icon: Shield },
              { label: "Armes", value: WEAPONS.length, icon: Sword },
              { label: "Mods", value: MODS.length, icon: Star },
              { label: "Compagnons", value: COMPANIONS.length, icon: Users },
              { label: "Arcanes", value: ARCANES.length, icon: Star },
              { label: "Éclats", value: ARCHON_SHARDS.length, icon: Gem },
              { label: "Effets d’éclats", value: ARCHON_SHARD_EFFECT_TOTAL, icon: Gem },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: "var(--wf-border)" }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: "#7fb3c8" }}>
                  <Icon size={11} />
                  {label}
                </div>
                <span className="text-sm font-bold" style={{ color: "#4fc3f7", fontFamily: "var(--font-mono)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CATEGORY GRID */}
      <div className="mb-6">
        <div className="wf-section-label mb-4">CATÉGORIES</div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORY_ITEMS.map((cat, i) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="group flex flex-col items-center justify-center p-4 rounded-sm transition-all duration-200 cursor-pointer animate-fade-slide-up hud-frame"
              style={{
                backgroundColor: "var(--wf-bg-panel)",
                border: "1px solid var(--wf-border)",
                animationDelay: `${i * 50}ms`,
                textDecoration: "none",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = cat.color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${cat.color}30`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--wf-border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <cat.Icon size={24} className="mb-2" style={{ color: cat.color }} />
              <span className="text-xs font-bold tracking-wider text-center" style={{ fontFamily: "var(--font-display)", color: cat.color }}>
                {cat.label}
              </span>
              {cat.count !== null && (
                <span className="text-xs mt-1" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {cat.count} entrées
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* NEWS + TIMERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* NEWS */}
        <div className="lg:col-span-2 wf-panel rounded-sm p-4 hud-frame">
          <div className="wf-section-label mb-4">ACTUALITÉS</div>
          <div className="space-y-2">
            {NEWS_ITEMS.map((news, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-sm cursor-pointer transition-all duration-150 hover:bg-white/5"
                style={{ borderLeft: `2px solid ${news.color}` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded-sm font-semibold"
                      style={{ backgroundColor: `${news.color}20`, color: news.color, fontFamily: "var(--font-display)", fontSize: "10px", letterSpacing: "0.05em" }}
                    >
                      {news.tag}
                    </span>
                    <span className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{news.date}</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--wf-text)" }}>{news.title}</p>
                </div>
                <ChevronRight size={14} style={{ color: "var(--wf-text-dim)", flexShrink: 0, marginTop: 2 }} />
              </div>
            ))}
          </div>
        </div>

        {/* TIMERS + QUICK LINKS */}
        <div className="flex flex-col gap-4">
          {/* Timers */}
          <div className="wf-panel rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} style={{ color: "var(--wf-cyan)" }} />
              <h2 className="text-sm font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)" }}>
                MINUTERIES
              </h2>
            </div>
            {[
              { label: "Reset Quotidien", time: "2h 43m", color: "#4fc3f7" },
              { label: "Reset Hebdo", time: "0j 2h 43m", color: "#66bb6a" },
              { label: "Baro Ki'Teer", time: "11j 15h", color: "#ffd700" },
              { label: "Plains of Eidolon", time: "☀️ JOUR", color: "#ff6b35" },
              { label: "Orb Vallis", time: "❄️ FROID", color: "#42a5f5" },
            ].map(({ label, time, color }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: "var(--wf-border)" }}>
                <span className="text-xs" style={{ color: "var(--wf-text-dim)" }}>{label}</span>
                <span className="text-xs font-bold" style={{ color, fontFamily: "var(--font-mono)" }}>{time}</span>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="wf-panel rounded-sm p-4">
            <div className="flex flex-col gap-2">
              <a href="https://discord.gg/warframe" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center py-2 text-xs font-bold rounded-sm transition-all"
                style={{ backgroundColor: "#5865F2", color: "white", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>
                WIKI DISCORD
              </a>
              <a href="https://www.warframe.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center py-2 text-xs font-bold rounded-sm transition-all wf-btn-primary">
                JOUER GRATUITEMENT
              </a>
              <a href="https://forums.warframe.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center py-2 text-xs font-bold rounded-sm transition-all"
                style={{ backgroundColor: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.4)", color: "#ff6b35", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>
                FORUMS OFFICIELS
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
