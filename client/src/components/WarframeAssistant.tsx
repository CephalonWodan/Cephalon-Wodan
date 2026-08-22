import { useState } from "react";
import { Sparkles, X, Send, Bot } from "lucide-react";
import { WARFRAMES, WEAPONS, COMPANIONS } from "@/lib/warframe-data";

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
      content: "Salutations, Tenno ! Je suis **Cephalon Codex**, ton assistant tactique virtuel propulsé par l'IA. Pose-moi n'importe quelle question sur les builds, les évolutions Incarnon, les compagnons, les fusions d'éléments ou le modding !"
    }
  ]);
  const [loading, setLoading] = useState(false);

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
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok) {
        throw new Error(`Erreur réseau (${res.status})`);
      }

      const data = await res.json();
      const replyContent = data.reply || "Aucune réponse reçue du Cephalon.";
      setMessages(prev => [...prev, { role: "assistant", content: replyContent }]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Impossible de contacter le serveur IA pour le moment. Vérifie que le serveur backend est bien actif."
        }
      ]);
    } finally {
      setLoading(false);
    }
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
          title="Ouvrir l'assistant IA Cephalon Codex"
        >
          <Sparkles size={18} className="animate-pulse" />
          <span className="text-xs font-bold tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            ASSISTANT CEPHALON IA
          </span>
        </button>
      ) : (
        <div
          className="flex flex-col rounded-sm shadow-2xl transition-all"
          style={{
            width: "380px",
            height: "520px",
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
                  CEPHALON CODEX // IA LIVE
                </div>
                <div className="text-[9px]" style={{ color: "var(--wf-text-dim)" }}>
                  {WARFRAMES.length} Warframes · {WEAPONS.length} Armes
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
                  className="rounded-sm p-2.5 max-w-[85%] leading-relaxed whitespace-pre-wrap"
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
                  Le Cephalon consulte les archives du système...
                </div>
              </div>
            )}
          </div>

          {/* Quick prompt suggestions */}
          <div className="px-3 py-1.5 flex gap-1 overflow-x-auto border-t" style={{ borderColor: "var(--wf-border)", backgroundColor: "rgba(0,0,0,0.2)" }}>
            {["Meilleur build Incarnon ?", "Comment marche la fusion ?", "Polarités Umbra", "Armes Coda"].map(tag => (
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
              placeholder="Pose ta question au Cephalon IA..."
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
