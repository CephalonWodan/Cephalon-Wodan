// Tenno Codex HUD: mission-aware build recommendations tied to the active Builder snapshot.
// Keep the client payload compact; the server owns the LLM secret and the recommendation rules.

import { useEffect, useState } from "react";
import { Sparkles, X, Send, Bot, ChevronDown } from "lucide-react";
import { ASSISTANT_BUILD_CONTEXT_EVENT, ASSISTANT_BUILD_CONTEXT_STORAGE_KEY, AssistantBuildContext } from "@/lib/assistant-context";
import { MODS, Mod } from "@/lib/warframe-data";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Message {
  role: "assistant" | "user";
  content: string;
}

type RecommendationItem = string | { name?: string; rank?: number; effectIndex?: number; effect?: string };
type RecommendationPayload = {
  mods?: RecommendationItem[];
  aura?: RecommendationItem | null;
  exilus?: RecommendationItem | null;
  arcanes?: RecommendationItem[];
  archon_shards?: RecommendationItem[];
  shards?: RecommendationItem[];
  companion_mods?: RecommendationItem[];
  primary_mods?: RecommendationItem[];
  secondary_mods?: RecommendationItem[];
  melee_mods?: RecommendationItem[];
  companion_weapon_mods?: RecommendationItem[];
  weapons?: RecommendationItem[];
  companion?: RecommendationItem | null;
  [key: string]: unknown;
};

function recommendationItemName(item: RecommendationItem | null | undefined): string {
  if (typeof item === "string") return item.trim();
  return typeof item?.name === "string" ? item.name.trim() : "";
}

function extractRecommendationPayload(content: string): RecommendationPayload | null {
  const candidates = [
    /```json:recommendation\s*([\s\S]*?)\s*```/i,
    /```json\s*([\s\S]*?)\s*```/i,
    /```\s*([\s\S]*?)\s*```/i,
  ];
  for (const pattern of candidates) {
    const match = content.match(pattern);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as RecommendationPayload;
    } catch {
      // Continue with the next tolerant extraction strategy.
    }
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as RecommendationPayload;
    } catch {
      // The response can be ordinary prose containing braces; leave it untouched.
    }
  }
  return null;
}

function stripRecommendationBlock(content: string): string {
  return content
    .replace(/```json:recommendation\s*[\s\S]*?\s*```/gi, "")
    .replace(/```json\s*[\s\S]*?\s*```/gi, "")
    .replace(/```\s*[\s\S]*?\s*```/gi, "")
    .trim();
}

function readableRecommendationText(content: string): string {
  const narrative = stripRecommendationBlock(content);
  if (narrative && !/^\s*[\[{]/.test(narrative)) return narrative;
  const payload = extractRecommendationPayload(content);
  if (!payload) return content;
  const sections: string[] = [];
  const add = (label: string, values: RecommendationItem[] | undefined) => {
    const names = (values || []).map(recommendationItemName).filter(Boolean);
    if (names.length) sections.push(`${label} : ${names.join(", ")}`);
  };
  add("Mods", payload.mods);
  if (recommendationItemName(payload.aura)) sections.push(`Aura : ${recommendationItemName(payload.aura)}`);
  if (recommendationItemName(payload.exilus)) sections.push(`Exilus : ${recommendationItemName(payload.exilus)}`);
  add("Arcanes", payload.arcanes);
  add("Éclats d’Archonte", payload.archon_shards || payload.shards);
  add("Mods compagnon", payload.companion_mods);
  add("Armes", payload.weapons);
  if (recommendationItemName(payload.companion)) sections.push(`Compagnon : ${recommendationItemName(payload.companion)}`);
  return sections.length ? `Configuration structurée extraite du conseil :\\n${sections.join("\\n")}` : "Le Cephalon a fourni une recommandation structurée, mais aucun élément exploitable n’a été reconnu.";
}

type MissionType = "auto" | "survival" | "defense" | "interception" | "excavation" | "assassination" | "exterminate" | "spy" | "steel-path" | "fissure";
type Faction = "auto" | "grineer" | "corpus" | "infested" | "orokin" | "narmer" | "sentient";
type SquadMode = "solo" | "squad";
type OptimizationFocus = "balanced" | "damage" | "survival" | "support" | "endurance";
type EnemyLevelBand = "auto" | "100-200" | "200-400" | "400-800" | "800+";

function readInitialContext(): AssistantBuildContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ASSISTANT_BUILD_CONTEXT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function WarframeAssistant() {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [missionType, setMissionType] = useState<MissionType>("auto");
  const [faction, setFaction] = useState<Faction>("auto");
  const [enemyLevelBand, setEnemyLevelBand] = useState<EnemyLevelBand>("auto");
  const [squadMode, setSquadMode] = useState<SquadMode>("squad");
  const [optimizationFocus, setOptimizationFocus] = useState<OptimizationFocus>("balanced");
  const [buildContext, setBuildContext] = useState<AssistantBuildContext | null>(readInitialContext);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: language === "en"
        ? "Greetings, Tenno! I am **Cephalon Codex**. Specify your mission type and I will suggest an optimal build tailored to your selected Warframe, weapons, and gameplay objectives."
        : "Salutations, Tenno ! Je suis **Cephalon Codex**. Indique ton type de mission et je te proposerai un build adapté à ta Warframe sélectionnée, à tes armes et à tes objectifs de gameplay."
    }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleContextUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AssistantBuildContext>).detail;
      if (detail) setBuildContext(detail);
    };
    window.addEventListener(ASSISTANT_BUILD_CONTEXT_EVENT, handleContextUpdate);
    return () => window.removeEventListener(ASSISTANT_BUILD_CONTEXT_EVENT, handleContextUpdate);
  }, []);

  const MISSION_OPTIONS: Array<{ value: MissionType; label: string }> = [
    { value: "auto", label: t("Déduire de ma question", "Infer from my question") },
    { value: "survival", label: t("Survie / Endurance", "Survival / Endurance") },
    { value: "defense", label: t("Défense / Défense mobile", "Defense / Mobile Defense") },
    { value: "interception", label: "Interception" },
    { value: "excavation", label: "Excavation" },
    { value: "assassination", label: t("Assassinat / Boss", "Assassination / Boss") },
    { value: "exterminate", label: t("Extermination", "Extermination") },
    { value: "spy", label: t("Espionnage / Sauvetage", "Spy / Rescue") },
    { value: "steel-path", label: "Steel Path" },
    { value: "fissure", label: t("Fissure du Néant", "Void Fissure") },
  ];

  const FACTION_OPTIONS: Array<{ value: Faction; label: string }> = [
    { value: "auto", label: t("Faction à déduire", "Infer faction") },
    { value: "grineer", label: "Grineer" },
    { value: "corpus", label: "Corpus" },
    { value: "infested", label: t("Infestés", "Infested") },
    { value: "orokin", label: "Orokin" },
    { value: "narmer", label: "Narmer" },
    { value: "sentient", label: t("Conscients", "Sentient") },
  ];

  const LEVEL_OPTIONS: Array<{ value: EnemyLevelBand; label: string }> = [
    { value: "auto", label: t("Niveau à déduire", "Infer level") },
    { value: "100-200", label: t("Niveau 100–200", "Level 100–200") },
    { value: "200-400", label: t("Niveau 200–400", "Level 200–400") },
    { value: "400-800", label: t("Niveau 400–800", "Level 400–800") },
    { value: "800+", label: t("Niveau 800+ / Endurance", "Level 800+ / Endurance") },
  ];

  const OPTIMIZATION_OPTIONS: Array<{ value: OptimizationFocus; label: string }> = [
    { value: "balanced", label: t("Équilibre général", "General balance") },
    { value: "damage", label: t("Dégâts / Nettoyage", "Damage / Clearing") },
    { value: "survival", label: t("Survie / EHP", "Survival / EHP") },
    { value: "support", label: t("Soutien / Objectif", "Support / Objective") },
    { value: "endurance", label: t("Endurance longue", "Long endurance") },
  ];

  const openAssistant = () => {
    const latestContext = readInitialContext();
    if (latestContext) setBuildContext(latestContext);
    setIsOpen(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: Message = { role: "user", content: query };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          missionType,
          context: buildContext,
          advancedOptions: { faction, enemyLevelBand, squadMode, optimizationFocus, language },
        })
      });

      if (!res.ok) {
        const serverError = await res.json().catch(() => null);
        throw new Error(serverError?.error || (language === "en" ? `Network error (${res.status})` : `Erreur réseau (${res.status})`));
      }

      const data = await res.json();
      const replyText = data.reply || (language === "en" ? "No response received from Cephalon." : "Aucune réponse reçue du Cephalon.");
      setMessages(prev => [...prev, { role: "assistant", content: replyText }]);
      try {
        localStorage.setItem("warframe-assistant:last-transcript", replyText);
      } catch {}
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: language === "en"
            ? "⚠️ Unable to contact the AI Cephalon at the moment. Please verify the server is running and try again."
            : "⚠️ Impossible de contacter le Cephalon IA pour le moment. Vérifie que le serveur est actif, puis réessaie."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestedBuild = (content: string) => {
    try {
      const payload = extractRecommendationPayload(content);
      const appliedMods: Array<{ name: string; rank: number }> = [];
      const modItems = payload?.mods || [];
      modItems.forEach(item => {
        const name = recommendationItemName(item);
        if (!name) return;
        const found = MODS.find(mod => mod.name.toLowerCase() === name.toLowerCase());
        if (found && !appliedMods.some(mod => mod.name.toLowerCase() === found.name.toLowerCase())) {
          const rank = typeof item === "object" && Number.isFinite(item.rank) ? Number(item.rank) : 5;
          appliedMods.push({ name: found.name, rank: Math.max(0, Math.min(rank, found.maxRank)) });
        }
      });
      if (appliedMods.length === 0 && !payload) {
        content.split("\n").forEach(line => {
          const match = line.match(/(?:[-*•]|\d+\.)\s+\*\*([^*]+)\*\*/);
          if (!match?.[1]) return;
          const found = MODS.find(mod => mod.name.toLowerCase() === match[1].trim().toLowerCase());
          if (found && !appliedMods.some(mod => mod.name.toLowerCase() === found.name.toLowerCase())) appliedMods.push({ name: found.name, rank: found.maxRank });
        });
      }

      const recommendationHasActions = Boolean(payload && (appliedMods.length || payload.aura || payload.exilus || payload.arcanes?.length || payload.archon_shards?.length || payload.shards?.length || payload.companion_mods?.length || payload.primary_mods?.length || payload.secondary_mods?.length || payload.melee_mods?.length || payload?.companion_weapon_mods?.length || payload?.weapons?.length || payload?.companion));
      if (appliedMods.length === 0 && !recommendationHasActions) {
        toast.error(language === "en" ? "No precise mod configuration detected in Cephalon response." : "Aucune configuration de mod précise n'a été détectée dans la réponse du Cephalon.");
        return;
      }

      if (payload) window.dispatchEvent(new CustomEvent("apply-ai-recommendation", { detail: payload }));
      if (appliedMods.length) window.dispatchEvent(new CustomEvent("apply-ai-mods", { detail: appliedMods }));
      const appliedCount = appliedMods.length + (payload?.arcanes?.length || 0) + (payload?.archon_shards?.length || payload?.shards?.length || 0);
      toast.success(language === "en" ? `Recommendation ready: ${appliedCount || 1} item(s) detected.` : `Recommandation prête : ${appliedCount || 1} élément(s) détecté(s).`);
    } catch (err) {
      console.error("Failed to apply AI mods:", err);
      toast.error(language === "en" ? "Error applying mods." : "Erreur lors de l'application des mods.");
    }
  };

  return (
    <>
      {/* Floating HUD Button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={openAssistant}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm shadow-2xl transition-all duration-200 hud-frame group"
            style={{
              backgroundColor: "rgba(7, 13, 22, 0.92)",
              border: "1px solid var(--wf-cyan)",
              color: "var(--wf-cyan)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.1em"
            }}
          >
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-xs font-bold uppercase">{t("ASSISTANT CEPHALON IA", "CEPHALON AI ASSISTANT")}</span>
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-4 right-4 z-50 w-[92vw] sm:w-[440px] max-h-[85vh] rounded-sm flex flex-col shadow-2xl hud-frame overflow-hidden"
          style={{
            backgroundColor: "var(--wf-bg-deep)",
            border: "1px solid var(--wf-cyan)",
            boxShadow: "0 10px 35px rgba(0, 195, 255, 0.2)"
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2.5 border-b"
            style={{ backgroundColor: "rgba(7, 13, 22, 0.98)", borderColor: "var(--wf-border)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ backgroundColor: "rgba(79, 195, 247, 0.15)", border: "1px solid rgba(79, 195, 247, 0.4)" }}>
                <Bot size={16} style={{ color: "var(--wf-cyan)" }} />
              </div>
              <div>
                <div className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "var(--wf-cyan)" }}>
                  CEPHALON CODEX // AI
                </div>
                <div className="text-[10px] font-mono text-gray-400">
                  {buildContext?.warframe ? `${t("Actif", "Active")}: ${buildContext.warframe.name}` : t("Aucun set actif", "No active set")}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mission & Advanced Parameters Toolbar */}
          <div className="p-2.5 border-b grid grid-cols-2 gap-2 text-xs" style={{ backgroundColor: "rgba(0, 0, 0, 0.35)", borderColor: "var(--wf-border)" }}>
            <div>
              <label className="block text-[9px] font-mono text-gray-400 uppercase">{t("Mission", "Mission")}</label>
              <select
                value={missionType}
                onChange={e => setMissionType(e.target.value as MissionType)}
                className="w-full mt-0.5 px-2 py-1 rounded-sm text-[11px] outline-none bg-black/60 border border-white/10 text-cyan-300 font-mono"
              >
                {MISSION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: "#070b10", color: "#fff" }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-mono text-gray-400 uppercase">{t("Faction", "Faction")}</label>
              <select
                value={faction}
                onChange={e => setFaction(e.target.value as Faction)}
                className="w-full mt-0.5 px-2 py-1 rounded-sm text-[11px] outline-none bg-black/60 border border-white/10 text-cyan-300 font-mono"
              >
                {FACTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: "#070b10", color: "#fff" }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 max-h-[360px] text-xs font-mono" style={{ backgroundColor: "rgba(5, 9, 15, 0.85)" }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-sm ${msg.role === "user" ? "ml-6 bg-cyan-500/10 border border-cyan-500/30 text-cyan-200" : "mr-6 bg-black/50 border border-white/10 text-gray-200"}`}
              >
                <div className="text-[10px] font-bold mb-1 opacity-70 uppercase tracking-widest" style={{ color: msg.role === "user" ? "var(--wf-cyan)" : "#a0aec0" }}>
                  {msg.role === "user" ? t("Vous", "You") : "Cephalon Codex"}
                </div>
                <div className="leading-relaxed whitespace-pre-wrap text-[11px] font-sans">
                  {msg.role === "assistant" ? readableRecommendationText(msg.content) : msg.content}
                </div>
                {msg.role === "assistant" && (extractRecommendationPayload(msg.content) !== null || msg.content.includes("**")) && (
                  <button
                    onClick={() => applySuggestedBuild(msg.content)}
                    className="mt-2 w-full py-1.5 px-3 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all wf-btn-primary flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={12} />
                    {t("Appliquer les mods suggérés", "Apply suggested mods")}
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div className="p-2.5 rounded-sm mr-6 bg-black/50 border border-white/10 text-cyan-400 animate-pulse text-[11px] font-mono">
                {t("Calculs tactiques en cours...", "Running tactical calculations...")}
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-2.5 border-t flex gap-2" style={{ backgroundColor: "rgba(7, 13, 22, 0.98)", borderColor: "var(--wf-border)" }}>
            <input
              type="text"
              placeholder={t("Pose ta question au Cephalon Codex...", "Ask Cephalon Codex a question...")}
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-sm outline-none bg-black/50 border border-white/15 text-white font-sans focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-1.5 rounded-sm text-xs font-bold transition-all wf-btn-primary disabled:opacity-50 flex items-center justify-center"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
