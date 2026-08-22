import type { Request, Response } from "express";

const WISP_DEFENSE_REFERENCE = `Référence de build fournie par l'utilisateur pour Wisp en Défense : Don de Puissance ; Fusion des Réservoirs ; Colère Aveugle ; Influence de l'Augure ; Allonge Archonte ; Haine d'Amar ; Secrets de l'Augure ; Continuité Accrue ; Intensité Archonte ; Courage Passager ; Arcanes Mue Augmentée et Arcane Belliqueux. Ajout demandé : cinq éclats d’Archonte rouges Tauforged, chacun configuré sur +15 % de Puissance des capacités, soit +75 % de Puissance additive au total. La capture indique approximativement Force 323 %, Portée 175 %, Durée 128 %, Efficacité 45 %, Santé 370, Bouclier 370, Armure 210→262 et Énergie 300 ; avec les cinq éclats, la Puissance cible doit être recalculée par le moteur et non copiée mécaniquement. Utilise cette configuration comme inspiration pour Wisp/Wisp Prime en Défense, mais vérifie toujours les noms, rangs, polarités, capacité et valeurs calculées dans le snapshot du Builder. Ne présente pas les valeurs de la capture comme des valeurs officielles si le moteur donne un autre résultat.`;

const MISSION_GUIDANCE: Record<string, string> = {
  auto: "Déduis l'objectif de la demande. Si le type de mission n'est pas identifiable, demande une précision avant de proposer un build spécialisé.",
  survival: "Priorité à la survie longue durée : réduction des dégâts, endurance, contrôle de zone, économie d'énergie et dégâts soutenus.",
  defense: "Priorité à la protection de l'objectif : contrôle, portée, durée, fiabilité du nettoyage et capacité à gérer plusieurs vagues.",
  interception: "Priorité au contrôle de plusieurs points : mobilité, couverture de zone, durée des contrôles et autonomie entre les rotations.",
  excavation: "Priorité à la protection des excavateurs : contrôle, défense de zone, économie d'énergie et capacité à tenir entre les batteries.",
  assassination: "Priorité au combat contre une cible majeure : dégâts concentrés, survie, suppression d'armure/boucliers si pertinente et résistance aux phases du boss.",
  exterminate: "Priorité à la vitesse de parcours : dégâts immédiats, mobilité, portée de nettoyage et faible temps de recharge.",
  spy: "Priorité à l'infiltration et à la fiabilité : mobilité, discrétion, contrôle précis et solutions de secours plutôt que le DPS brut.",
  "steel-path": "Priorité aux ennemis haut niveau : multiplicateurs de dégâts fiables, réduction d'armure/boucliers, survivabilité et choix de faction explicités.",
  fissure: "Priorité à la polyvalence et à la collecte de réactifs : nettoyage efficace, survie, mobilité et adaptation aux bonus de corruption du Néant.",
};

function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function normalizeMessages(value: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is { role: "user" | "assistant"; content: unknown } => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as { role?: unknown; content?: unknown };
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    })
    .map(message => ({ role: message.role, content: typeof message.content === "string" ? message.content.trim().slice(0, 6000) : "" }))
    .filter(message => message.content.length > 0)
    .slice(-20);
}

export async function handleChatRequest(req: Request, res: Response) {
  let body = req.body;
  if (!body && (req as any).rawBody) {
    try {
      body = JSON.parse((req as any).rawBody);
    } catch {
      // ignore malformed raw bodies; validation below returns a clear 400
    }
  }

  let messages = normalizeMessages(body?.messages);
  if (messages.length === 0 && typeof body?.message === "string") {
    const content = body.message.trim().slice(0, 6000);
    if (content.length > 0) messages = [{ role: "user" as const, content }];
  }

  if (messages.length === 0) {
    return sendJson(res, 400, { error: "Invalid messages format. Expected a non-empty array of user/assistant messages." });
  }

  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!apiUrl || !apiKey) {
    return sendJson(res, 200, {
      reply: "⚠️ Le service LLM n'est pas configuré dans cet environnement. Assure-toi que les clés Forge intégrées sont disponibles."
    });
  }

  const missionType = typeof body?.missionType === "string" ? body.missionType : "auto";
  const missionGuidance = MISSION_GUIDANCE[missionType] || MISSION_GUIDANCE.auto;
  const context = body?.context && typeof body.context === "object" ? body.context as Record<string, unknown> : undefined;
  const buildContext = context
    ? JSON.stringify(context).slice(0, 16000)
    : "Aucun snapshot de build actif n'a été transmis.";

  const contextWarframe = context?.warframe && typeof context.warframe === "object"
    ? context.warframe as { name?: unknown }
    : undefined;
  const activeWarframeName = typeof contextWarframe?.name === "string" ? contextWarframe.name : "";
  const referenceGuidance = /wisp/i.test(activeWarframeName) && (missionType === "defense" || /défense|defense/i.test(messages[messages.length - 1]?.content || ""))
    ? `\n\nRéférence utilisateur prioritaire pour ce cas :\n${WISP_DEFENSE_REFERENCE}`
    : "";

  const systemPrompt = `Tu es Cephalon Codex, l'assistant tactique virtuel de l'application WARFRAME Set Builder. Tu réponds en français, avec un ton professionnel et immersif de Cephalon, mais sans sacrifier la précision.

Ta mission est d'aider le joueur à construire un set adapté à une Warframe et à un objectif de mission. Ne donne pas une réponse générique si un contexte de build est disponible. Analyse en priorité la Warframe active, ses capacités, ses armes, ses mods, ses Arcanes, ses éclats d'Archonte et son compagnon. Si aucune Warframe n'est sélectionnée, indique-le clairement et propose soit un archétype conditionnel, soit demande au joueur de la sélectionner.

Type de mission sélectionné : ${missionType}
Consigne tactique pour ce type : ${missionGuidance}

Snapshot JSON du Builder actif :
${buildContext}${referenceGuidance}

Règles de recommandation :
1. Propose une configuration concrète : mods prioritaires par équipement, Aura/Exilus si pertinent, Arcanes, éclats, armes et capacité de compagnon.
2. Explique le rôle de chaque choix et les compromis. Adapte les statistiques à la Warframe réellement sélectionnée ; ne remplace jamais une Warframe par un exemple arbitraire sans le signaler.
3. Respecte les systèmes du jeu : polarités, capacité, fusion élémentaire, Incarnon cumulatif, Helminth et restrictions de buffs. Ne prétends pas avoir appliqué un mod si le snapshot ne le contient pas.
4. Distingue les faits présents dans le snapshot des recommandations. Si archonShardAbilityStrength est renseigné, indique séparément son cumul et ne le compte qu'une seule fois dans la Puissance finale. Cinq éclats rouges Tauforged configurés à +15 % correspondent à +75 % additifs, mais ne prétends pas connaître la valeur finale complète sans les autres contributions calculées.
5. Pour Wisp en Défense, utilise la référence utilisateur des cinq éclats rouges Tauforged comme variante Force/Portée : explique le gain de Puissance, le coût en capacité et les alternatives si le joueur ne dispose pas de cinq éclats Tauforged.
6. Réponds avec des sections courtes : « Diagnostic », « Build conseillé », « Pourquoi cette configuration », puis « Alternatives ou limites » lorsque pertinent.`;

  try {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.55,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LLM Proxy error:", response.status, errText);
      return sendJson(res, 200, {
        reply: `⚠️ Erreur lors de la communication avec le Cephalon IA (Code ${response.status}). Réessaie dans un instant.`
      });
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "Aucune réponse générée par le Cephalon.";
    return sendJson(res, 200, { reply: content });
  } catch (error: any) {
    console.error("Chat API exception:", error);
    return sendJson(res, 200, {
      reply: "⚠️ Erreur interne du serveur de chat : " + (error?.message || "Inconnue")
    });
  }
}
