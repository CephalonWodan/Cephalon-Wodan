// WARFRAME SET BUILDER — Cephalon Codex Assistant
// Tenno Codex HUD: mission-aware build recommendations tied to the active Builder snapshot.
// Keep the client payload compact; the server owns the LLM secret and the recommendation rules.

import { useEffect, useState } from "react";
import { Sparkles, X, Send, Bot, ChevronDown } from "lucide-react";
import { ASSISTANT_BUILD_CONTEXT_EVENT, ASSISTANT_BUILD_CONTEXT_STORAGE_KEY, AssistantBuildContext } from "@/lib/assistant-context";

interface Message {
  role: "assistant" | "user";
  content: string;
}

type MissionType = "auto" | "survival" | "defense" | "interception" | "excavation" | "assassination" | "exterminate" | "spy" | "steel-path" | "fissure";

const MISSION_OPTIONS: Array<{ value: MissionType; label: string; short: string }> = [
  { value: "auto", label: "Déduire de ma question", short: "AUTO" },
  { value: "survival", label: "Survie / Endurance", short: "SURVIE" },
  { value: "defense", label: "Défense / Défense mobile", short: "DÉFENSE" },
  { value: "interception", label: "Interception", short: "INTERCEPTION" },
  { value: "excavation", label: "Excavation", short: "EXCAVATION" },
  { value: "assassination", label: "Assassinat / Boss", short: "ASSASSINAT" },
  { value: "exterminate", label: "Extermination", short: "EXTERMINATION" },
  { value: "spy", label: "Espionnage / Sauvetage", short: "INFILTRATION" },
  { value: "steel-path", label: "Steel Path", short: "STEEL PATH" },
  { value: "fissure", label: "Fissure du Néant", short: "FISSURE" },
];

function readInitialContext(): AssistantBuildContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ASSISTANT_BUILD_CONTEXT_STORAGE_KEY);
    return raw ? JSON.parse(raw) as AssistantBuildContext : null;
  } catch {
    return null;
  }
}

export default function WarframeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [missionType, setMissionType] = useState<MissionType>("auto");
  const [buildContext, setBuildContext] = useState<AssistantBuildContext | null>(readInitialContext);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Salutations, Tenno ! Je suis **Cephalon Codex**. Indique ton type de mission et je te proposerai un build adapté à ta Warframe sélectionnée, à tes armes et à tes objectifs de gameplay."
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

  const selectedMission = MISSION_OPTIONS.find(option => option.value === missionType) || MISSION_OPTIONS[0];
  const activeWarframe = buildContext?.warframe?.name || "NON SÉLECTIONNÉE";

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
        })
      });

      if (!res.ok) {
        const serverError = await res.json().catch(() => null);
        throw new Error(serverError?.error || `Erreur réseau (${res.status})`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Aucune réponse reçue du Cephalon." }]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ Impossible de contacter le Cephalon IA pour le moment. Vérifie que le serveur est actif, puis réessaie." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const askForBuild = () => {
    const frame = buildContext?.warframe?.name;
    setInput(frame
      ? `Propose-moi un build ${selectedMission.value === "auto" ? "adapté à une mission polyvalente" : `pour une mission de type ${selectedMission.label}`} avec ${frame}. Détaille les mods, arcanes, éclats et armes à privilégier.`
      : `Propose-moi un build ${selectedMission.value === "auto" ? "polyvalent" : `pour ${selectedMission.label}`}. Je n'ai pas encore sélectionné de Warframe.`
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={openAssistant}
          className="flex items-center gap-2 rounded-full px-4 py-3 shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "rgba(11, 14, 20, 0.95)", border: "1px solid var(--wf-cyan)", color: "var(--wf-cyan)", boxShadow: "0 0 20px rgba(79, 195, 247, 0.3)" }}
          title="Ouvrir l'assistant IA Cephalon Codex"
        >
          <Sparkles size={18} className="animate-pulse" />
          <span className="text-xs font-bold tracking-wider" style={{ fontFamily: "var(--font-display)" }}>ASSISTANT CEPHALON IA</span>
        </button>
      ) : (
        <div className="flex flex-col rounded-sm shadow-2xl transition-all" style={{ width: "min(400px, calc(100vw - 2rem))", height: "min(620px, calc(100vh - 2rem))", backgroundColor: "rgba(11, 14, 20, 0.98)", border: "1px solid var(--wf-border)", boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(79, 195, 247, 0.2)" }}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <Bot size={16} style={{ color: "var(--wf-cyan)" }} />
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-[0.16em] uppercase" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>CEPHALON CODEX // IA LIVE</div>
                <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-wider" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: "var(--wf-cyan)" }}>FRAME</span> {activeWarframe} <span style={{ color: "var(--wf-border)" }}>//</span> <span style={{ color: "var(--wf-cyan)" }}>MISSION</span> {selectedMission.short}
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded p-1 transition-colors hover:bg-white/10" style={{ color: "var(--wf-text-dim)" }}><X size={14} /></button>
          </div>

          <div className="border-b px-2.5 pt-2.5" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.25)" }}>
            <div className="mb-1.5 flex items-center justify-between text-[8px] uppercase tracking-[0.14em]" style={{ color: "var(--wf-text-dim)", fontFamily: "var(--font-mono)" }}><span>TACTICAL ROUTING // 01</span><span style={{ color: "var(--wf-cyan)" }}>CONTEXT LINKED</span></div>
            <div className="grid grid-cols-1 gap-1.5 pb-2.5 sm:grid-cols-[1fr_auto]">
            <label className="relative flex items-center">
              <select value={missionType} onChange={e => setMissionType(e.target.value as MissionType)} className="w-full appearance-none rounded-sm px-2.5 py-2 pr-7 text-[10px] font-bold outline-none" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: "1px solid rgba(79,195,247,0.45)", color: "var(--wf-cyan)", fontFamily: "var(--font-mono)" }}>
                {MISSION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2" style={{ color: "var(--wf-cyan)" }} />
            </label>
              <button type="button" onClick={askForBuild} className="rounded-sm px-2.5 py-2 text-[9px] font-bold tracking-wider transition-colors hover:bg-white/10" style={{ border: "1px solid var(--wf-cyan)", color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>ANALYSER UN BUILD</button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}`} className={`flex gap-2 text-xs ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm" style={{ backgroundColor: "rgba(79,195,247,0.15)", border: "1px solid rgba(79,195,247,0.4)" }}><Bot size={12} style={{ color: "var(--wf-cyan)" }} /></div>}
                <div className="max-w-[88%] rounded-sm p-2.5 leading-relaxed whitespace-pre-wrap" style={{ backgroundColor: msg.role === "user" ? "rgba(79,195,247,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${msg.role === "user" ? "rgba(79,195,247,0.3)" : "var(--wf-border)"}`, color: "var(--wf-text)", fontSize: "11px" }}>{msg.content}</div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-xs"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm animate-pulse" style={{ backgroundColor: "rgba(79,195,247,0.15)", border: "1px solid rgba(79,195,247,0.4)" }}><Bot size={12} style={{ color: "var(--wf-cyan)" }} /></div><div className="text-[10px] italic" style={{ color: "var(--wf-text-dim)" }}>Le Cephalon compare la mission et l'arsenal...</div></div>}
          </div>

          <div className="flex gap-1 overflow-x-auto border-t px-3 py-1.5" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.2)" }}>
            {["Build mission", "Survie", "Défense", "Steel Path"].map(tag => <button key={tag} onClick={() => setInput(tag === "Build mission" ? "Analyse mon build pour la mission sélectionnée." : `Quel build ${tag.toLowerCase()} recommandes-tu ?`)} className="shrink-0 rounded-sm px-2 py-0.5 text-[9px] transition-colors hover:bg-white/10" style={{ border: "1px solid var(--wf-border)", color: "var(--wf-text-dim)", fontFamily: "var(--font-display)" }}>{tag}</button>)}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-2.5" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.4)" }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Quel build pour cette mission ?" className="flex-1 rounded-sm px-2.5 py-1.5 text-xs outline-none" style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid var(--wf-border)", color: "var(--wf-text)" }} />
            <button type="submit" disabled={loading || !input.trim()} className="rounded-sm p-2 transition-colors disabled:opacity-40" style={{ backgroundColor: "var(--wf-cyan)", color: "#0b0e14" }}><Send size={13} /></button>
          </form>
        </div>
      )}
    </div>
  );
}
