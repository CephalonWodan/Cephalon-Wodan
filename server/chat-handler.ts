import type { Request, Response } from "express";

export async function handleChatRequest(req: Request, res: Response) {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.json({
      reply: "⚠️ Le service LLM n'est pas configuré dans cet environnement. Assure-toi que le projet dispose des clés d'API Forge intégrées."
    });
  }

  try {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "Tu es Cephalon Codex, l'assistant tactique virtuel de l'application Warframe Set Builder. Tu aides les joueurs (Tenno) à optimiser leurs builds, comprendre les statistiques, les règles de fusion élémentaire, les evolutions Incarnon, les compagnons (Sentinelles, MOAs, Hounds, bêtes) et les arcanes/éclats d'archonte. Sois concis, précis, et réponds en français dans un ton immersif et professionnel (style Tenno Codex)."
          },
          ...messages
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LLM Proxy error:", response.status, errText);
      return res.json({
        reply: "⚠️ Erreur lors de la communication avec le Cephalon IA (Code " + response.status + "). Réessaie dans un instant."
      });
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "Aucune réponse générée par le Cephalon.";
    return res.json({ reply: content });
  } catch (error: any) {
    console.error("Chat API exception:", error);
    return res.json({
      reply: "⚠️ Erreur interne du serveur de chat : " + (error?.message || "Inconnue")
    });
  }
}
