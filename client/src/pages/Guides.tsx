// Tenno Codex Guides — source-first community library.
// Style reminder: asymmetric research console, cyan hierarchy, amber creator markers, compact evidence cards.
// Every entry is a sourced summary; exact stats remain controlled by the local Warframe catalog.

import { useMemo, useState } from "react";
import { ExternalLink, Filter, PlayCircle, Search, ShieldCheck, Swords } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { COMMUNITY_GUIDES, type CommunityGuide, type GuideCategory, type GuideCreator } from "@/lib/community-guides";

const CREATOR_OPTIONS: Array<GuideCreator | "ALL"> = ["ALL", "PANDAAHH", "Vũ Thắng", "MHBlacky", "TheKengineer"];
const CATEGORY_OPTIONS: Array<GuideCategory | "ALL"> = ["ALL", "Warframe", "Arme", "Mécanique", "Progression", "Compagnon"];

function creatorColor(creator: GuideCreator) {
  if (creator === "PANDAAHH") return "#ff6b35";
  if (creator === "Vũ Thắng") return "#a78bfa";
  if (creator === "MHBlacky") return "#4fc3f7";
  return "#ffd166";
}

function creatorLabel(creator: GuideCreator, language: "fr" | "en") {
  if (creator === "PANDAAHH") return "PANDAAHH";
  if (creator === "Vũ Thắng") return "Vũ Thắng";
  if (creator === "MHBlacky") return "MHBlacky";
  return language === "fr" ? "TheKengineer" : "TheKengineer";
}

function GuideCard({ guide, language }: { guide: CommunityGuide; language: "fr" | "en" }) {
  const color = creatorColor(guide.creator);
  const text = guide.title[language];
  const summary = guide.summary[language];

  return (
    <article className="group flex min-h-[260px] flex-col rounded-sm p-4 transition-all duration-200" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }} onMouseEnter={event => { event.currentTarget.style.borderColor = color; event.currentTarget.style.transform = "translateY(-2px)"; event.currentTarget.style.boxShadow = `0 8px 24px ${color}18`; }} onMouseLeave={event => { event.currentTarget.style.borderColor = "var(--wf-border)"; event.currentTarget.style.transform = "translateY(0)"; event.currentTarget.style.boxShadow = "none"; }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlayCircle size={16} style={{ color }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color, fontFamily: "var(--font-display)" }}>{creatorLabel(guide.creator, language)}</span>
        </div>
        <span className="rounded-sm px-2 py-1 text-[9px] uppercase" style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}45`, fontFamily: "var(--font-mono)" }}>{guide.category}</span>
      </div>

      <h2 className="mb-2 text-base font-bold leading-tight" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{text}</h2>
      {guide.targetItemName && <div className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}><Swords size={12} /> {guide.targetItemName}</div>}
      <p className="mb-4 flex-1 text-xs leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>{summary}</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {guide.tags.map(tag => <span key={tag} className="rounded-sm px-1.5 py-0.5 text-[9px]" style={{ color: "var(--wf-text-dim)", backgroundColor: "rgba(0,0,0,.24)", border: "1px solid var(--wf-border)", fontFamily: "var(--font-mono)" }}>#{tag}</span>)}
      </div>

      <div className="mb-4 flex items-center gap-2 border-t pt-3 text-[10px]" style={{ borderColor: "var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}><ShieldCheck size={12} style={{ color: "var(--wf-cyan)" }} /> {guide.mission[language]}</div>
      <div className="flex flex-wrap gap-2">
        <a href={guide.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors" style={{ color, border: `1px solid ${color}70`, backgroundColor: `${color}10`, fontFamily: "var(--font-display)" }}><ExternalLink size={12} /> {guide.sourceLabel[language]}</a>
        {guide.targetItemName && <Link href="/builder" className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider wf-btn-primary" style={{ fontFamily: "var(--font-display)" }}>{language === "fr" ? "Ouvrir le Builder" : "Open Builder"}</Link>}
      </div>
    </article>
  );
}

export default function Guides() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [creator, setCreator] = useState<GuideCreator | "ALL">("ALL");
  const [category, setCategory] = useState<GuideCategory | "ALL">("ALL");
  const lang = language === "en" ? "en" : "fr";

  const filteredGuides = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return COMMUNITY_GUIDES.filter(guide => {
      const searchable = [guide.creator, guide.category, guide.targetItemName || "", guide.title.fr, guide.title.en, guide.summary.fr, guide.summary.en, ...guide.tags].join(" ").toLowerCase();
      return (!normalized || searchable.includes(normalized)) && (creator === "ALL" || guide.creator === creator) && (category === "ALL" || guide.category === category);
    });
  }, [category, creator, query]);

  return (
    <Layout title={lang === "fr" ? "GUIDES" : "GUIDES"}>
      <section className="mb-6 rounded-sm p-5" style={{ backgroundColor: "rgba(7,13,22,.78)", border: "1px solid var(--wf-border)" }}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>COMMUNITY ARCHIVE // SOURCES VÉRIFIÉES</div>
            <h1 className="text-xl font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{lang === "fr" ? "Apprendre par les builds publiés" : "Learn from published builds"}</h1>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>{lang === "fr" ? "Une bibliothèque de guides et d’analyses reliés à leurs sources originales. Les fiches résument le sujet, le rôle et les compromis présentés dans chaque publication." : "A library of guides and analyses linked to their original sources. Cards summarize the topic, role, and trade-offs presented in each publication."}</p>
          </div>
          <div className="text-right text-[10px] uppercase" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>{filteredGuides.length} / {COMMUNITY_GUIDES.length} {lang === "fr" ? "fiches" : "entries"}</div>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_auto_auto]">
          <label className="relative block"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--wf-text-dim)" }} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={lang === "fr" ? "Rechercher une Warframe, une arme, un créateur…" : "Search a Warframe, weapon, creator…"} className="w-full rounded-sm py-2 pl-9 pr-3 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }} /></label>
          <select value={creator} onChange={event => setCreator(event.target.value as GuideCreator | "ALL")} className="rounded-sm px-3 py-2 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}><option value="ALL">{lang === "fr" ? "Tous les créateurs" : "All creators"}</option>{CREATOR_OPTIONS.filter(value => value !== "ALL").map(value => <option key={value} value={value}>{value}</option>)}</select>
          <select value={category} onChange={event => setCategory(event.target.value as GuideCategory | "ALL")} className="rounded-sm px-3 py-2 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,.3)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}><option value="ALL">{lang === "fr" ? "Toutes les catégories" : "All categories"}</option>{CATEGORY_OPTIONS.filter(value => value !== "ALL").map(value => <option key={value} value={value}>{value}</option>)}</select>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}><Filter size={12} style={{ color: "var(--wf-cyan)" }} /> {lang === "fr" ? "Les sources restent la référence de la configuration exacte." : "The original sources remain the reference for exact configurations."}</div>
      </section>

      {filteredGuides.length > 0 ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredGuides.map((guide, index) => <div key={guide.id} className="animate-fade-slide-up" style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}><GuideCard guide={guide} language={lang} /></div>)}</div> : <div className="rounded-sm p-8 text-center" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)" }}>{lang === "fr" ? "Aucune fiche ne correspond à ces filtres." : "No guide matches these filters."}</div>}
    </Layout>
  );
}
