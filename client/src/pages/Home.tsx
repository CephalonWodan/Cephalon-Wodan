import React from "react";
// ============================================================
// WARFRAME SET BUILDER — HOME PAGE // TENNO CODEX HUD
// ============================================================
import { Link } from "wouter";
import { Zap, Shield, Sword, Star, Users, ChevronRight, Clock, BookOpen, Crosshair, Package, Settings, Map, Gem } from "lucide-react";
import Layout from "@/components/Layout";
import { WARFRAMES, WEAPONS, MODS, COMPANIONS, ARCANES, ARCHON_SHARDS, ARCHON_SHARD_EFFECT_TOTAL, PRIME_RELICS } from "@/lib/warframe-data";
import WorldStateHUD from "@/components/WorldStateHUD";

const CATEGORY_ITEMS = [
  { label: "WARFRAMES", href: "/warframes", Icon: Shield, count: WARFRAMES.length, color: "#4fc3f7" },
  { label: "ARMES", href: "/weapons", Icon: Sword, count: WEAPONS.length, color: "#69d4ff" },
  { label: "MODS", href: "/mods", Icon: Star, count: MODS.length, color: "#ffd166" },
  { label: "COMPAGNONS", href: "/companions", Icon: Users, count: COMPANIONS.length, color: "#73d4f6" },
  { label: "ARCANES", href: "/arcanes", Icon: Star, count: ARCANES.length, color: "#8bdcff" },
  { label: "ÉCLATS", href: "/archon-shards", Icon: Gem, count: ARCHON_SHARDS.length, color: "#ffd166" },
  { label: "RELIQUES", href: "/relics", Icon: Package, count: PRIME_RELICS.length, color: "#69d4ff" },
  { label: "CRÉER UN SET", href: "/builder", Icon: Crosshair, count: null, color: "#4fc3f7" },
  { label: "GUIDES", href: "/guides", Icon: BookOpen, count: null, color: "#8bdcff" },
];

const WISP_HERO_IMAGE = "https://wiki.warframe.com/images/Wisp.png?e6cde";

const NEWS_ITEMS = [
  { tag: "MISE À JOUR", date: "2026-07-13", title: "Jade Shadows: Constellations est arrivé !", desc: "Découvrez Sirius & Orion, le duo de Warframes constellation, et les nouvelles récompenses Railjack.", color: "#4fc3f7" },
  { tag: "PRIME ACCESS", date: "2026-07-01", title: "Styvax Prime rejoint le Prime Access", desc: "Ajout des armements et accessoires Prime exclusifs dans le catalogue.", color: "#ff6b35" },
  { tag: "ÉVÉNEMENT", date: "2026-06-15", title: "TennoCon 2026 — Résumé des annonces", desc: "Toutes les nouveautés de l'année 2026 et les aperçus des prochaines quêtes intégrés.", color: "#ffd700" }
];

export default function Home() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* HERO BANNER */}
        <div className="relative rounded-sm p-4 sm:p-6 md:p-8 overflow-hidden hud-frame wf-command-console" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url(/manus-storage/warframe-card-bg_e4519a70.jpg)", backgroundSize: "cover" }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] overflow-hidden md:block">
            <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(90deg, var(--wf-bg-panel) 0%, rgba(17,29,43,0.65) 34%, rgba(17,29,43,0.06) 100%)" }} />
            <div className="absolute inset-y-0 right-4 w-[78%] opacity-80" style={{ background: "linear-gradient(180deg, transparent, rgba(79,195,247,0.12) 50%, transparent)", mixBlendMode: "screen" }} />
            <img src={WISP_HERO_IMAGE} alt="Wisp — aperçu Warframe" className="absolute right-0 top-1/2 h-[132%] max-w-none -translate-y-1/2 object-contain opacity-70 mix-blend-screen" />
            <div className="absolute bottom-5 right-8 z-20 border px-2 py-1 text-[9px] uppercase tracking-[0.18em]" style={{ color: "var(--wf-cyan)", borderColor: "rgba(79,195,247,0.5)", background: "rgba(7,13,22,0.68)", fontFamily: "var(--font-mono)" }}>FRAME SCHEMATIC // WISP</div>
          </div>
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}><Crosshair size={12} /> ARSENAL FORGE // COMMAND CONSOLE</div>
            <div className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: "rgba(79,195,247,0.15)", color: "var(--wf-cyan)", border: "1px solid rgba(79,195,247,0.4)", fontFamily: "var(--font-mono)" }}>
              HOTFIX 43.0.8 — JADE SHADOWS: CONSTELLATIONS
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
              FORGE TON ARSENAL
            </h1>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>
              Construis et optimise tes sets complets de Warframe. Sélectionne ton Warframe, tes armes, ton compagnon et configure tes mods pour créer un loadout prêt pour chaque mission.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/builder" className="w-full sm:w-auto px-5 py-2.5 rounded-sm text-xs font-bold tracking-wider transition-all wf-btn-primary flex items-center justify-center gap-2">
                <Crosshair size={14} /> CRÉER UN SET
              </Link>
              <Link href="/warframes" className="w-full sm:w-auto px-5 py-2.5 rounded-sm text-xs font-bold tracking-wider transition-all text-center" style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>
                EXPLORER
              </Link>
            </div>
          </div>
        </div>

        {/* WORLD STATE HUD WIDGET */}
        <WorldStateHUD />

        {/* CATEGORIES GRID */}
        <div>
          <div className="wf-section-label mb-3">CATÉGORIES</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {CATEGORY_ITEMS.map((cat, i) => {
              const IconComponent = cat.Icon;
              return (
                <Link
                  key={i}
                  href={cat.href}
                  className="p-3 rounded-sm flex flex-col items-center text-center transition-all duration-200 hud-frame group"
                  style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}
                >
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-2 transition-all group-hover:scale-105" style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}40` }}>
                    <IconComponent size={20} style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-bold tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
                    {cat.label}
                  </span>
                  {cat.count !== null && (
                    <span className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--wf-text-dim)" }}>
                      {cat.count} entrées
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* NEWS + STATS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 wf-panel rounded-sm p-4 hud-frame">
            <div className="wf-section-label mb-3">ACTUALITÉS</div>
            <div className="space-y-2">
              {NEWS_ITEMS.map((news, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-sm transition-all duration-150 hover:bg-white/5"
                  style={{ borderLeft: `2px solid ${news.color}`, backgroundColor: "rgba(0,0,0,0.25)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase" style={{ backgroundColor: `${news.color}20`, color: news.color, fontFamily: "var(--font-display)" }}>
                        {news.tag}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: "var(--wf-text-dim)" }}>{news.date}</span>
                    </div>
                    <h3 className="text-xs md:text-sm font-bold truncate mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>{news.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>{news.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="wf-panel rounded-sm p-4 hud-frame space-y-4">
            <div className="wf-section-label">BASE DE DONNÉES</div>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: "Warframes", value: WARFRAMES.length, icon: Shield },
                { label: "Armes", value: WEAPONS.length, icon: Sword },
                { label: "Mods", value: MODS.length, icon: Star },
                { label: "Compagnons", value: COMPANIONS.length, icon: Users },
                { label: "Arcanes", value: ARCANES.length, icon: Star },
                { label: "Éclats d'Archonte", value: ARCHON_SHARDS.length, icon: Gem },
                { label: "Effets d'éclats", value: ARCHON_SHARD_EFFECT_TOTAL, icon: Zap },
                { label: "Reliques Prime", value: PRIME_RELICS.length, icon: Package },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid var(--wf-border)" }}>
                  <span className="flex items-center gap-2 text-[11px]" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>
                    <Icon size={14} style={{ color: "var(--wf-cyan)" }} /> {label}
                  </span>
                  <span className="font-bold" style={{ color: "var(--wf-cyan)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
