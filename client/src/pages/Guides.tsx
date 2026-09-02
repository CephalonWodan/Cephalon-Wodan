// ============================================================
// GUIDES PAGE — Community Creator Reference Builds & Modding Guides
// ============================================================

import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { COMMUNITY_GUIDES } from "@/lib/community-guides";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function Guides() {
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredGuides = selectedCategory === "all"
    ? COMMUNITY_GUIDES
    : COMMUNITY_GUIDES.filter(g => g.category === selectedCategory);

  return (
    <Layout title={language === "fr" ? "GUIDES & BUILDS COMMUNAUTAIRES" : "COMMUNITY GUIDES & BUILDS"}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {t(
              "Builds authentiques rigoureusement repris des créateurs de référence (TheKengineer, MHBlacky, PANDAAHH).",
              "Authentic builds strictly adapted from recognized creators (TheKengineer, MHBlacky, PANDAAHH)."
            )}
          </p>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {["all", "warframe", "weapon", "melee"].map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize text-xs h-7 px-3"
              >
                {cat === "all" ? t("Tous", "All") : cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid of Guides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGuides.map((guide) => (
            <Card key={guide.id} className="bg-card/60 backdrop-blur-md border-border/60 hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <User className="w-3 h-3 mr-1 inline" /> {guide.creator}
                  </Badge>
                  <Badge variant="outline" className="capitalize text-muted-foreground text-xs">
                    {guide.category}
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold mt-2 text-foreground font-display">
                  {guide.title[language]}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {guide.description[language]}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="bg-muted/30 rounded-md p-3 border border-border/40 text-xs space-y-1">
                  {guide.loadoutSummary.frame && (
                    <div><span className="text-muted-foreground">Warframe:</span> <strong className="text-foreground">{guide.loadoutSummary.frame}</strong></div>
                  )}
                  {guide.loadoutSummary.weapon && (
                    <div><span className="text-muted-foreground">{t("Arme", "Weapon")}:</span> <strong className="text-foreground">{guide.loadoutSummary.weapon}</strong></div>
                  )}
                  <div>
                    <span className="text-muted-foreground">{t("Mods clés", "Key Mods")}:</span>{" "}
                    <span className="text-foreground">{guide.loadoutSummary.keyMods.join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Arcanes:</span>{" "}
                    <span className="text-foreground">{guide.loadoutSummary.arcanes.join(", ")}</span>
                  </div>
                  {guide.loadoutSummary.shards && (
                    <div><span className="text-muted-foreground">{t("Éclats", "Shards")}:</span> <span className="text-foreground">{guide.loadoutSummary.shards}</span></div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground/90 italic">
                  "{guide.details[language]}"
                </p>

                <div className="pt-1 flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => setLocation("/builder")}
                    className="gap-2 bg-primary/25 hover:bg-primary/35 text-primary border border-primary/30 text-xs h-8"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {t("Ouvrir dans le Builder", "Open in Builder")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
