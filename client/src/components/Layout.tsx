// ============================================================
// WARFRAME SET BUILDER — Layout Component
// Tenno Codex dark theme: sidebar + header + main content
// ============================================================
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield, Sword, Users, BookOpen, Settings, ChevronRight,
  Menu, X, Search, Zap, Star, Package, Home, Sparkles, Gem
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    section: "NAVIGATION",
    items: [
      { label: "Accueil", href: "/", icon: Home },
      { label: "Créer un Set", href: "/builder", icon: Zap },
    ]
  },
  {
    section: "ARSENAL",
    items: [
      { label: "Warframes", href: "/warframes", icon: Shield },
      { label: "Armes", href: "/weapons", icon: Sword },
      { label: "Compagnons", href: "/companions", icon: Users },
      { label: "Mods", href: "/mods", icon: Star },
      { label: "Arcanes", href: "/arcanes", icon: Sparkles },
      { label: "Éclats d’Archonte", href: "/archon-shards", icon: Gem },
    ]
  },
  {
    section: "RESSOURCES",
    items: [
      { label: "Guides", href: "/guides", icon: BookOpen },
      { label: "Ressources", href: "/resources", icon: Package },
      { label: "Paramètres", href: "/settings", icon: Settings },
    ]
  },
];

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--wf-bg-deep)", color: "var(--wf-text)" }}>
      {/* TOP HEADER */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center h-12 px-3 gap-3"
        style={{
          backgroundColor: "#070b10",
          borderBottom: "1px solid var(--wf-border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.5)"
        }}
      >
        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-1.5 rounded transition-colors hover:bg-white/10"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/manus-storage/warframe-logo-icon_cbe14481.png"
            alt="Logo"
            className="w-7 h-7 object-contain"
          />
          <div className="hidden sm:block">
            <div
              className="text-sm font-bold leading-none tracking-widest uppercase"
              style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)" }}
            >
              WARFRAME
            </div>
            <div
              className="text-xs leading-none tracking-widest uppercase"
              style={{ fontFamily: "var(--font-display)", color: "var(--wf-text-dim)" }}
            >
              SET BUILDER
            </div>
          </div>
        </Link>

        {/* Separator */}
        <div className="hidden lg:block w-px h-6 mx-1" style={{ backgroundColor: "var(--wf-border)" }} />

        {/* Top nav links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs">
          {["MAIN PAGE", "WARFRAMES", "ARMES", "MODS", "ARCANES", "BUILDER"].map((item, i) => {
            const hrefs = ["/", "/warframes", "/weapons", "/mods", "/arcanes", "/builder"];
            const isActive = location === hrefs[i];
            return (
              <Link
                key={item}
                href={hrefs[i]}
                className={cn(
                  "px-3 py-1.5 rounded-sm transition-all duration-150 tracking-wider uppercase",
                  isActive
                    ? "text-cyan-300 bg-cyan-500/10 border-b border-cyan-400"
                    : "text-gray-400 hover:text-cyan-300 hover:bg-white/5"
                )}
                style={{ fontFamily: "var(--font-display)", fontSize: "11px" }}
              >
                {item}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-2.5 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 text-xs rounded-sm outline-none w-40 sm:w-52 transition-all focus:w-60"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid var(--wf-border)",
              color: "var(--wf-text)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>

        {/* Actions */}
        <Link
          href="/builder"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm transition-all duration-150 wf-btn-primary"
        >
          <Zap size={12} />
          <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>CRÉER UN SET</span>
        </Link>
      </header>

      {/* BODY */}
      <div className="flex pt-12 min-h-screen">
        {/* SIDEBAR */}
        <aside
          className={cn(
            "fixed lg:sticky top-12 left-0 z-40 w-52 shrink-0 overflow-y-auto transition-transform duration-200",
            "lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{
            backgroundColor: "var(--wf-bg-mid)",
            borderRight: "1px solid var(--wf-border)",
            height: "calc(100vh - 48px)",
          }}
        >
          {/* Sidebar top glow */}
         <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--wf-cyan), transparent)", opacity: 0.4 }} />
         {/* Sidebar scan-line marker */}
         <div className="mx-2 mt-2 mb-1 scan-divider" />

         <nav className="py-3 px-2">
            {NAV_ITEMS.map((group) => (
              <div key={group.section} className="mb-4">
                <div
                  className="px-2 py-1 text-xs font-bold tracking-widest mb-1"
                  style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)", fontSize: "10px" }}
                >
                  {group.section}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs transition-all duration-150 group",
                        isActive
                          ? "text-cyan-300 bg-cyan-500/15"
                          : "text-gray-400 hover:text-cyan-200 hover:bg-white/5"
                      )}
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <Icon size={13} className={isActive ? "text-cyan-400" : "text-gray-500 group-hover:text-cyan-400"} />
                      <span>{item.label}</span>
                      {isActive && <ChevronRight size={10} className="ml-auto text-cyan-400" />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t" style={{ borderColor: "var(--wf-border)" }}>
            <div className="flex flex-col gap-1.5">
              <a
                href="https://www.warframe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-sm transition-all wf-btn-primary"
              >
                JOUER GRATUITEMENT
              </a>
              <a
                href="https://discord.gg/warframe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-1.5 px-3 text-xs rounded-sm transition-all"
                style={{ backgroundColor: "#5865F2", color: "white", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
              >
                DISCORD
              </a>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0">
          {title && (
            <div
              className="px-6 py-4 border-b relative"
              style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.2)" }}
            >
              {/* Scan line below title */}
              <div className="absolute bottom-0 left-0 right-0 scan-divider" />
              <h1
                className="text-2xl font-bold tracking-widest uppercase"
                style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)" }}
              >
                {title}
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--wf-cyan)" }} />
                <span className="text-xs" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                  WARFRAME SET BUILDER // TENNO CODEX
                </span>
              </div>
            </div>
          )}
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
