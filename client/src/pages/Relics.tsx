import React, { useMemo, useState } from "react";
import { Calculator, Gem, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PRIME_RELICS, PrimeRelic } from "@/lib/warframe-data";

// ============================================================
// RELICS // TENNO CODEX
// Recherche de composants Prime + probabilités Radshare x4.
// ============================================================

type Refinement = "Intact" | "Exceptional" | "Flawless" | "Radiant";

const REFINEMENT_LABELS: Record<Refinement, string> = {
  Intact: "Intacte",
  Exceptional: "Exceptionnelle",
  Flawless: "Sans défaut",
  Radiant: "Radieuse",
};

const REFINEMENT_PROBABILITIES: Record<Refinement, Record<string, number>> = {
  Intact: { Common: 25.33, Uncommon: 11, Rare: 2 },
  Exceptional: { Common: 23.33, Uncommon: 13, Rare: 4 },
  Flawless: { Common: 20, Uncommon: 17, Rare: 6 },
  Radiant: { Common: 16.67, Uncommon: 20, Rare: 10 },
};

const ERA_FILTERS = ["Toutes", "Lith", "Meso", "Neo", "Axi", "Requiem"];
const REFINEMENTS: Refinement[] = ["Intact", "Exceptional", "Flawless", "Radiant"];

function rarityColor(rarity: string) {
  if (rarity === "Rare") return "#ffd700";
  if (rarity === "Uncommon") return "#c0c0c0";
  return "#cd7f32";
}

function chanceForReward(relic: PrimeRelic | undefined, target: string, refinement: Refinement) {
  const reward = relic?.rewards.find(item => item.itemName === target);
  return reward ? REFINEMENT_PROBABILITIES[refinement][reward.rarity] ?? 0 : 0;
}

export default function Relics() {
  const [search, setSearch] = useState("");
  const [eraFilter, setEraFilter] = useState("Toutes");
  const [targetItem, setTargetItem] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [playerRelics, setPlayerRelics] = useState<string[]>(Array(4).fill(PRIME_RELICS[0]?.id ?? ""));
  const [playerRefinements, setPlayerRefinements] = useState<Refinement[]>(Array(4).fill("Radiant"));

  const allPrimeParts = useMemo(() => Array.from(new Set(
    PRIME_RELICS.flatMap(relic => relic.rewards.map(reward => reward.itemName))
  )).sort((a, b) => a.localeCompare(b)), []);

  const targetSuggestions = useMemo(() => {
    const query = targetQuery.trim().toLowerCase();
    const matches = query
      ? allPrimeParts.filter(item => item.toLowerCase().includes(query))
      : allPrimeParts;
    return matches.slice(0, 8);
  }, [allPrimeParts, targetQuery]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return PRIME_RELICS.filter(relic => {
      const matchesEra = eraFilter === "Toutes" || relic.era === eraFilter;
      const matchesSearch = !query || relic.name.toLowerCase().includes(query) || relic.rewards.some(reward => reward.itemName.toLowerCase().includes(query));
      return matchesEra && matchesSearch;
    });
  }, [search, eraFilter]);

  const selectedTarget = targetItem;
  const radshareProbability = useMemo(() => {
    const failureProbability = playerRelics.reduce((failure, relicId, index) => {
      const relic = PRIME_RELICS.find(item => item.id === relicId);
      const chance = chanceForReward(relic, selectedTarget, playerRefinements[index]);
      return failure * (1 - chance / 100);
    }, 1);
    return (1 - failureProbability) * 100;
  }, [playerRelics, playerRefinements, selectedTarget]);

  const updatePlayer = (index: number, relicId: string) => {
    setPlayerRelics(current => current.map((value, itemIndex) => itemIndex === index ? relicId : value));
  };

  const updateRefinement = (index: number, refinement: Refinement) => {
    setPlayerRefinements(current => current.map((value, itemIndex) => itemIndex === index ? refinement : value));
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "var(--wf-bg)", color: "var(--wf-text)" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--wf-border)" }}>
          <div>
            <div className="flex items-center gap-2">
              <Gem size={24} style={{ color: "var(--wf-cyan)" }} />
              <h1 className="text-xl md:text-2xl font-bold tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                RELIQUES DU NÉANT // PRIME VAULT
              </h1>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>
              Recherchez une pièce Prime, trouvez ses reliques et estimez vos chances en Radshare x4.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>
            <Sparkles size={14} /> {PRIME_RELICS.length} Reliques indexées
          </div>
        </div>

        <section className="hud-frame rounded-sm p-4" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
            <Search size={16} style={{ color: "var(--wf-cyan)" }} />
            <h2 className="text-xs font-bold tracking-wider uppercase" style={{ fontFamily: "var(--font-display)" }}>Recherche de composant Prime</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--wf-text-dim)" }} />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Ex : Saryn Prime, Braton Prime ou Lith A1..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-sm outline-none"
                style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {ERA_FILTERS.map(era => (
                <button
                  key={era}
                  onClick={() => setEraFilter(era)}
                  className="px-3 py-1.5 text-xs rounded-sm shrink-0 transition-all"
                  style={{ backgroundColor: eraFilter === era ? "var(--wf-cyan)" : "rgba(0,0,0,0.35)", color: eraFilter === era ? "#000" : "var(--wf-text)", border: "1px solid var(--wf-border)", fontFamily: "var(--font-display)", fontWeight: eraFilter === era ? "bold" : "normal" }}
                >
                  {era}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
            {filtered.length} relique(s) correspondent à votre recherche
          </div>
        </section>

        <section className="hud-frame rounded-sm p-4" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid rgba(171,124,255,0.45)" }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b" style={{ borderColor: "var(--wf-border)" }}>
            <div className="flex items-center gap-2">
              <Calculator size={18} style={{ color: "#ab7cff" }} />
              <div>
                <h2 className="text-sm font-bold tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>SIMULATEUR RADSHARE // 4 JOUEURS</h2>
                <p className="text-[10px]" style={{ color: "var(--wf-text-dim)" }}>Probabilité théorique d’obtenir au moins une fois le composant ciblé.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-right">
              <Users size={14} style={{ color: "#ab7cff" }} />
              <div className="text-lg font-bold font-mono" style={{ color: "#ab7cff" }}>{radshareProbability.toFixed(2)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            <div className="space-y-3">
              <label className="block text-[10px] uppercase tracking-wider" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>
                Composant ciblé
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--wf-text-dim)" }} />
                  <input
                    type="search"
                    value={targetQuery || targetItem}
                    onChange={event => {
                      const value = event.target.value;
                      setTargetQuery(value);
                      const exactMatch = allPrimeParts.find(item => item.toLowerCase() === value.trim().toLowerCase());
                      setTargetItem(exactMatch ?? "");
                    }}
                    placeholder="Rechercher une pièce Prime..."
                    aria-label="Rechercher un composant Prime"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-sm outline-none"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
                  />
                  {targetQuery.trim() && targetSuggestions.length > 0 && !targetItem && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 p-1 rounded-sm shadow-xl" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid rgba(171,124,255,0.45)" }}>
                      {targetSuggestions.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => { setTargetItem(item); setTargetQuery(item); }}
                          className="block w-full text-left px-2 py-1.5 text-[11px] rounded-sm hover:bg-white/10 transition-colors"
                          style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="block mt-1 text-[9px] normal-case" style={{ color: targetItem ? "#66bb6a" : "var(--wf-text-dim)" }}>
                  {targetItem ? `Cible sélectionnée : ${targetItem}` : targetQuery ? "Sélectionnez une suggestion pour calculer les chances." : "Saisissez un composant Prime pour commencer."}
                </span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {playerRelics.map((relicId, index) => (
                  <div key={index} className="p-2 rounded-sm space-y-2" style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid var(--wf-border)" }}>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>
                      <span>Joueur {index + 1}</span>
                      <span>{chanceForReward(PRIME_RELICS.find(item => item.id === relicId), selectedTarget, playerRefinements[index]).toFixed(2)}%</span>
                    </div>
                    <select value={relicId} onChange={event => updatePlayer(index, event.target.value)} className="w-full px-2 py-1.5 text-xs rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>
                      {PRIME_RELICS.map(relic => <option key={relic.id} value={relic.id}>{relic.name}</option>)}
                    </select>
                    <select value={playerRefinements[index]} onChange={event => updateRefinement(index, event.target.value as Refinement)} className="w-full px-2 py-1.5 text-xs rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid var(--wf-border)", color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>
                      {REFINEMENTS.map(refinement => <option key={refinement} value={refinement}>{REFINEMENT_LABELS[refinement]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-64 p-3 rounded-sm" style={{ backgroundColor: "rgba(171,124,255,0.08)", border: "1px solid rgba(171,124,255,0.3)" }}>
              <div className="flex items-center gap-2 text-xs font-bold mb-2" style={{ color: "#ab7cff", fontFamily: "var(--font-display)" }}><ShieldCheck size={14} /> RÉSULTAT DU CALCUL</div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>
                {selectedTarget ? <>Avec <strong style={{ color: "var(--wf-text)" }}>{selectedTarget}</strong>, la probabilité d’obtenir au moins une récompense après les quatre ouvertures est de <strong style={{ color: "#ab7cff" }}>{radshareProbability.toFixed(2)}%</strong>.</> : <>Saisissez puis sélectionnez un composant Prime pour calculer la probabilité d’obtenir cette récompense après quatre ouvertures.</>}
              </p>
              <p className="mt-3 text-[10px] leading-relaxed" style={{ color: "var(--wf-text-dim)" }}>
                Calcul : 1 − produit des probabilités d’échec de chaque joueur. Les récompenses rares utilisent les taux de raffinage standards du Néant.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(relic => (
            <article key={relic.id} className="relative rounded-sm p-4 hud-frame transition-all duration-200" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
              <div className="flex items-start justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
                <div>
                  <h3 className="text-sm font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)" }}>{relic.name}</h3>
                  <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>ÈRE {relic.era.toUpperCase()} // ÉTAT {relic.state.toUpperCase()}</div>
                </div>
                <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold" style={{ backgroundColor: "rgba(79,195,247,0.15)", color: "var(--wf-cyan)", border: "1px solid rgba(79,195,247,0.4)" }}>{REFinementLabel(relic.state)}</span>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>Récompenses et probabilités</div>
                {relic.rewards.map((reward, index) => {
                  const color = rarityColor(reward.rarity);
                  return <div key={`${relic.id}-${index}`} className="flex items-center justify-between p-2 rounded-sm text-xs" style={{ backgroundColor: "rgba(0,0,0,0.35)", borderLeft: `3px solid ${color}` }}>
                    <span className="font-semibold truncate pr-2" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{reward.itemName}</span>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]"><span style={{ color }} className="uppercase text-[10px]">{reward.rarity}</span><span style={{ color: "var(--wf-cyan)" }}>{REWARD_CHANCES.Radiant[reward.rarity]}%</span></div>
                  </div>;
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

const REWARD_CHANCES = { Radiant: REFINEMENT_PROBABILITIES.Radiant };
function REFinementLabel(refinement: string) {
  return REFINEMENT_LABELS[refinement as Refinement] ?? refinement;
}
