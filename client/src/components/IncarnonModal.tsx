import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Flame, Sparkles, Shield, Zap, Target } from "lucide-react";
import AssetImage from "./AssetImage";

interface IncarnonModalProps {
  weapon: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IncarnonModal: React.FC<IncarnonModalProps> = ({ weapon, isOpen, onClose }) => {
  if (!weapon) return null;

  // Données Incarnon simulées/enrichies si l'arme dispose d'une Genèse Incarnon
  const incarnonData = weapon.incarnon || {
    genesis: true,
    challenges: [
      "Tuer 100 ennemis en étant en l'air avec un tir à la tête",
      "Terminer une mission de survie de niveau 50+ sans lâcher le système de survie",
      "Réussir 20 tirs consécutifs sur des points faibles"
    ],
    evolutions: [
      {
        tier: "Évolution I",
        title: "Forme Incarnon",
        description: "Débloque la transformation Incarnon via des tirs à la tête chargés.",
        perks: ["+50 dégâts de base", "Transformation en mode alternatif dévastateur"]
      },
      {
        tier: "Évolution II",
        title: "Avantage du Prédateur",
        description: "Choisissez un bonus passif de statistique.",
        perks: ["+30% de vitesse de rechargement", "ou +40 en dégâts de base"]
      },
      {
        tier: "Évolution III",
        title: "Maîtrise Balistique",
        description: "Optimisation de la maniabilité.",
        perks: ["+50% de vitesse de projectile", "ou +2.0 de pénétration d'obstacles"]
      },
      {
        tier: "Évolution IV",
        title: "Transcendance Finale",
        description: "Puissance critique et de statut ultime.",
        perks: ["+24% de chance critique et +2x multiplicateur critique", "ou +60% de chance de statut"]
      }
    ]
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-950/95 border-amber-500/40 text-slate-100 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/30 overflow-hidden flex items-center justify-center p-1">
              <AssetImage item={weapon} type="weapon" alt={weapon.name} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                  <Sparkles className="w-3 h-3 mr-1" /> Incarnon Genesis
                </Badge>
                {weapon.category && <Badge variant="outline" className="border-slate-700 text-slate-400">{weapon.category}</Badge>}
              </div>
              <DialogTitle className="text-2xl font-bold tracking-wide text-amber-300 mt-1">
                {weapon.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Arme évolutive du système originف - Données d'Arsenal et du Circuit Duviri.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Défis Incarnon */}
          <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" /> Défis de Déblocage (Circuit / Cavalier)
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              {incarnonData.challenges.map((challenge: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span>{challenge}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Évolutions Incarnon */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4" /> Arbre des Évolutions (I à IV)
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {incarnonData.evolutions.map((evo: any, idx: number) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {evo.tier}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{evo.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{evo.description}</p>
                  <div className="space-y-1.5">
                    {evo.perks.map((perk: string, pIdx: number) => (
                      <div key={pIdx} className="text-xs flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded border border-slate-800/80 text-amber-200/90">
                        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
