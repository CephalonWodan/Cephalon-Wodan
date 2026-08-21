import { useState } from "react";
import { Sparkles, X, MessageSquare, Send, Bot, User, HelpCircle } from "lucide-react";
import { WARFRAMES, WEAPONS, MODS, COMPANIONS } from "@/lib/warframe-data";

interface Message {
  role: "assistant" | "user";
  content: string;
}

export default function WarframeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Salutations, Tenno ! Je suis **Cephalon Codex**, ton assistant tactique virtuel. Comment puis-je t'aider dans l'optimisation de ton arsenal, tes builds d'armes Incarnon, tes éclats d'archonte ou tes compagnons ?"
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: Message = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate smart tactical response based on dataset knowledge
    setTimeout(() => {
      let reply = "";
      const lower = query.toLowerCase();

      if (lower.includes("incarnon") || lower.includes("évolution") || lower.includes("evolution")) {
        reply = "Les **adaptations Incarnon** offrent des bonus cumulatifs à chaque palier d'évolution. Assure-toi de choisir le perk le plus adapté à ton arme (comme le Paris Prime ou le Boltor) dans le Builder pour impacter directement tes statistiques de critique, de statut et de dégâts moyens !";
      } else if (lower.includes("compagnon") || lower.includes("hound") || lower.includes("moa") || lower.includes("sentinelle")) {
        reply = `Le catalogue compte ${COMPANIONS.length} compagnons avec gestion complète des 10 emplacements de mods, des postures de bêtes (+7 cap), des armes de sentinelles/MOAs et des griffes moddables. Tu peux configurer chaque pièce dans la section Compagnons !`;
      } else if (lower.includes("mod") || lower.includes("capacité") || lower.includes("polarité") || lower.includes("umbra")) {
        reply = "Le Builder gère la capacité de modding en temps réel avec un système de polarités (incluant les polarités **Umbra** pour Sacrificial Steel et Sacrificial Pressure). Si le coût dépasse la capacité max (60 ou 74 avec réacteur/catalyseur et Aura), l'ajout du mod est automatiquement bloqué.";
      } else if (lower.includes("élément") || lower.includes("feu") || lower.includes("glace") || lower.includes("explosion") || lower.includes("fusion")) {
        reply = "Le moteur de calcul combine automatiquement les éléments primaires (**Feu, Glace, Électricité, Toxine**) par paires selon l'ordre de tes mods (ex: **Feu + Glace = Explosion**). Les conversions globales de dégâts élémentaires prennent le pas sur les fusions normales.";
      } else if (lower.includes("coda")) {
        reply = `Il y a ${WEAPONS.filter(w => w.name.toLowerCase().includes("coda")).length} armes **Coda** disponibles dans le catalogue (5 primaires, 4 secondaires dont la Dual Coda Torxica, et 5 de mêlée). Elles intègrent des statistiques dévastatrices d'Infected/Technocyte !`;
      } else {
        reply = `J'ai analysé ta requête dans la base de données de ${WARFRAMES.length} Warframes et ${WEAPONS.length} armes. Pour optimiser ton set, sélectionne ton équipement dans le **Builder**, équipe tes mods selon tes polarités, ajoute tes arcanes et éclats d'archonte, puis exporte ton build complet en Markdown ou JSON !`;
      }

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full px-4 py-3 shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: "rgba(11, 14, 20, 0.95)",
            border: "1px solid var(--wf-cyan)",
            color: "var(--wf-cyan)",
            boxShadow: "0 0 20px rgba(79, 195, 247, 0.3)"
          }}
          title="Ouvrir l'assistant IA Tenno Codex"
        >
          <Sparkles size={18} className="animate-pulse" />
          <span className="text-xs font-bold tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            ASSISTANT CEPHALON
          </span>
        </button>
      ) : (
        <div
          className="flex flex-col rounded-sm shadow-2xl transition-all"
          style={{
            width: "360px",
            height: "480px",
            backgroundColor: "rgba(11, 14, 20, 0.98)",
            border: "1px solid var(--wf-border)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(79, 195, 247, 0.2)"
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2.5 border-b"
            style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center gap-2">
              <Bot size={16} style={{ color: "var(--wf-cyan)" }} />
              <div>
                <div className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>
                  CEPHALON CODEX // IA
                </div>
                <div className="text-[9px]" style={{ color: "var(--wf-text-dim)" }}>
                  Assistant Tactique Arsenal
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 transition-colors hover:bg-white/10"
              style={{ color: "var(--wf-text-dim)" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 text-xs ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
                    style={{ backgroundColor: "rgba(79, 195, 247, 0.15)", border: "1px solid rgba(79, 195, 247, 0.4)" }}
                  >
                    <Bot size={12} style={{ color: "var(--wf-cyan)" }} />
                  </div>
                )}
                <div
                  className="rounded-sm p-2.5 max-w-[80%] leading-relaxed"
                  style={{
                    backgroundColor: msg.role === "user" ? "rgba(79, 195, 247, 0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${msg.role === "user" ? "rgba(79, 195, 247, 0.3)" : "var(--wf-border)"}`,
                    color: "var(--wf-text)",
                    fontSize: "11px"
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 text-xs items-center">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm animate-pulse"
                  style={{ backgroundColor: "rgba(79, 195, 247, 0.15)", border: "1px solid rgba(79, 195, 247, 0.4)" }}
                >
                  <Bot size={12} style={{ color: "var(--wf-cyan)" }} />
                </div>
                <div className="text-[10px] italic" style={{ color: "var(--wf-text-dim)" }}>
                  Analyse tactique en cours...
                </div>
              </div>
            )}
          </div>

          {/* Quick prompt suggestions */}
          <div className="px-3 py-1.5 flex gap-1 overflow-x-auto border-t" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.2)" }}>
            {["Incarnons", "Compagnons", "Éléments", "Armes Coda"].map(tag => (
              <button
                key={tag}
                onClick={() => setInput(tag)}
                className="shrink-0 rounded-sm px-2 py-0.5 text-[9px] transition-colors hover:bg-white/10"
                style={{ border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Input footer */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 p-2.5 border-t"
            style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pose ta question sur l'arsenal..."
              className="flex-1 rounded-sm px-2.5 py-1.5 text-xs outline-none"
              style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-sm p-2 transition-colors disabled:opacity-40"
              style={{ backgroundColor: "var(--wf-cyan)", color: "#0b0e14" }}
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
