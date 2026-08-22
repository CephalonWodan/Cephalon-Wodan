import type { Request, Response } from "express";

const WISP_DEFENSE_REFERENCE = `Référence de build fournie par l'utilisateur pour Wisp en Défense : Don de Puissance ; Fusion des Réservoirs ; Colère Aveugle ; Influence de l'Augure ; Allonge Archonte ; Haine d'Amar ; Secrets de l'Augure ; Continuité Accrue ; Intensité Archonte ; Courage Passager ; Arcanes Mue Augmentée et Arcane Belliqueux. Ajout demandé : cinq éclats d’Archonte rouges Tauforged, chacun configuré sur +15 % de Puissance des capacités, soit +75 % de Puissance additive au total. La capture indique approximativement Force 323 %, Portée 175 %, Durée 128 %, Efficacité 45 %, Santé 370, Bouclier 370, Armure 210→262 et Énergie 300 ; avec les cinq éclats, la Puissance cible doit être recalculée par le moteur et non copiée mécaniquement. Utilise cette configuration comme inspiration pour Wisp/Wisp Prime en Défense, mais vérifie toujours les noms, rangs, polarités, capacité et valeurs calculées dans le snapshot du Builder. Ne présente pas les valeurs de la capture comme des valeurs officielles si le moteur donne un autre résultat.`;

const COMMUNITY_CREATORS_CONTEXT = `Références communautaires secondaires (créateurs YouTube reconnus : MHBlacky, PANDAAHH, TheKengineer, Unified Codex, Endryx_ow, Lau 5040, vu.thang205) : utilise leurs approches méthodologiques et synergies populaires (comme l'analyse statistique rigoureuse de TheKengineer, les guides pratiques de MHBlacky, ou les builds francophones approfondis de PANDAAHH et autres créateurs) pour enrichir tes explications tactiques, tout en t'appuyant en priorité sur les règles officielles du Wiki et le snapshot du Builder.`;

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

const FACTION_GUIDANCE: Record<string, string> = {
  auto: "Déduis la faction à partir de la mission ou demande une précision ; ne suppose pas une vulnérabilité sans l'indiquer.",
  grineer: "Vérifie l'armure et propose une réponse cohérente (par exemple Corrosif/Chaleur ou Viral/Tranchant selon l'arme et les effets réellement disponibles).",
  corpus: "Vérifie les boucliers et la chair ; compare Toxine, Magnétique ou une autre réponse selon la cible et ne promet pas un contournement universel.",
  infested: "Prends en compte les unités blindées et les essaims ; privilégie un élément et un contrôle adaptés au profil de la mission plutôt qu'une recette fixe.",
  orokin: "Prends en compte les unités Orokin et leurs défenses ; justifie les éléments et le contrôle choisis avec les stats de l'arme.",
  narmer: "Évalue les défenses Narmer et les unités mélangées ; recommande une solution polyvalente et explicite les limites des vulnérabilités.",
  sentient: "Prends en compte l'adaptation des Conscients ; privilégie la polyvalence, les changements d'élément et les effets qui restent fiables.",
};

const LEVEL_GUIDANCE: Record<string, string> = {
  auto: "Demande le niveau ou distingue clairement une recommandation standard d'une recommandation d'endurance.",
  "100-200": "Cherche un build Steel Path solide sans sacrifier inutilement la qualité de vie et l'économie d'énergie.",
  "200-400": "Priorise la mise à l'échelle, la survivabilité active, les multiplicateurs fiables et la gestion des résistances.",
  "400-800": "Analyse le cycle de survie, le contrôle, le scaling des dégâts et les conditions de déclenchement ; refuse les promesses de DPS non calculées.",
  "800+": "Traite la demande comme de l'endurance : explique les limites du scaling, les boucles de survie, l'usage des buffs et les compromis d'exécution.",
};

const FOCUS_GUIDANCE: Record<string, string> = {
  balanced: "Optimise un compromis jouable entre dégâts, survie, énergie, portée et confort.",
  damage: "Maximise le nettoyage et le scaling des dégâts, sans supprimer les mécanismes indispensables de survie.",
  survival: "Maximise l'eHP, le shield gating ou les autres mécanismes de survie réellement disponibles pour la Warframe.",
  support: "Maximise le contrôle, les buffs utiles à l'équipe et la protection de l'objectif, en conservant une capacité minimale de nettoyage.",
  endurance: "Optimise la stabilité sur une longue session : énergie, munitions, contrôles, survivabilité et dégâts qui continuent à monter.",
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

  const rawApiUrl = process.env.BUILT_IN_FORGE_API_URL?.trim() || "";
  const apiUrl = rawApiUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY?.trim() || "";

  if (!apiUrl || !apiKey) {
    return sendJson(res, 200, {
      reply: "⚠️ Le service LLM n'est pas configuré dans cet environnement. Assure-toi que les clés Forge intégrées sont disponibles."
    });
  }

  const missionType = typeof body?.missionType === "string" ? body.missionType : "auto";
  const missionGuidance = MISSION_GUIDANCE[missionType] || MISSION_GUIDANCE.auto;
  const rawAdvancedOptions = body?.advancedOptions && typeof body.advancedOptions === "object"
    ? body.advancedOptions as Record<string, unknown>
    : {};
  const faction = typeof rawAdvancedOptions.faction === "string" ? rawAdvancedOptions.faction : "auto";
  const enemyLevelBand = typeof rawAdvancedOptions.enemyLevelBand === "string" ? rawAdvancedOptions.enemyLevelBand : "auto";
  const squadMode = rawAdvancedOptions.squadMode === "solo" ? "solo" : "squad";
  const optimizationFocus = typeof rawAdvancedOptions.optimizationFocus === "string" ? rawAdvancedOptions.optimizationFocus : "balanced";
  const advancedGuidance = `Faction : ${faction}. ${FACTION_GUIDANCE[faction] || FACTION_GUIDANCE.auto}\nNiveau ennemi : ${enemyLevelBand}. ${LEVEL_GUIDANCE[enemyLevelBand] || LEVEL_GUIDANCE.auto}\nMode : ${squadMode === "solo" ? "solo" : "escouade"}. ${squadMode === "solo" ? "Ne compte pas sur un buff, un contrôle ou une source d'énergie fournie par un allié." : "Distingue ce que la Warframe apporte seule de ce qui dépend d'un allié."}\nPriorité : ${optimizationFocus}. ${FOCUS_GUIDANCE[optimizationFocus] || FOCUS_GUIDANCE.balanced}`;
  const context = body?.context && typeof body.context === "object" ? body.context as Record<string, unknown> : undefined;
  const buildContext = context
    ? JSON.stringify(context).slice(0, 16000)
    : "Aucun snapshot de build actif n'a été transmis.";

  const rawWarframe = context?.warframe;
  const contextWarframe = rawWarframe && typeof rawWarframe === "object"
    ? rawWarframe as { name?: unknown }
    : undefined;
  const activeWarframeName = typeof rawWarframe === "string"
    ? rawWarframe.trim()
    : typeof contextWarframe?.name === "string"
      ? contextWarframe.name.trim()
      : "";
  const referenceGuidance = /wisp/i.test(activeWarframeName) && (missionType === "defense" || /défense|defense/i.test(messages[messages.length - 1]?.content || ""))
    ? `\n\nRéférence utilisateur prioritaire pour ce cas :\n${WISP_DEFENSE_REFERENCE}`
    : "";

  const systemPrompt = `Tu es Cephalon Codex, l'assistant tactique virtuel de l'application WARFRAME Set Builder. Tu réponds en français, avec un ton professionnel et immersif de Cephalon, mais sans sacrifier la précision.

Ta mission est d'aider le joueur à construire un set adapté à une Warframe et à un objectif de mission. Ne donne pas une réponse générique si un contexte de build est disponible. Analyse en priorité la Warframe active, ses capacités, ses armes, ses mods, ses Arcanes, ses éclats d'Archonte et son compagnon. Le champ 'warframe.name' du snapshot est la source de vérité : lorsqu'il est présent, reconnais cette Warframe immédiatement, ne dis jamais que son modèle est inconnu et ne demande pas au joueur de répéter son nom. Tu peux distinguer une variante Prime ou une autre variante uniquement si elle est explicitement indiquée dans le nom. Si aucune Warframe n'est sélectionnée, indique-le clairement et propose soit un archétype conditionnel, soit demande au joueur de la sélectionner.

Type de mission sélectionné : ${missionType}
Consigne tactique pour ce type : ${missionGuidance}

Paramètres d'optimisation haut niveau :
${advancedGuidance}

Snapshot JSON du Builder actif :
${buildContext}${referenceGuidance}

${COMMUNITY_CREATORS_CONTEXT}

Règles de recommandation :
1. Propose une configuration concrète : mods prioritaires par équipement, Aura/Exilus si pertinent, Arcanes, éclats, armes et capacité de compagnon.
2. Explique le rôle de chaque choix et les compromis. Adapte les statistiques à la Warframe réellement sélectionnée ; ne remplace jamais une Warframe par un exemple arbitraire sans le signaler.
3. Respecte les systèmes du jeu : polarités, capacité, fusion élémentaire, Incarnon cumulatif, Helminth et restrictions de buffs. Ne prétends pas avoir appliqué un mod si le snapshot ne le contient pas.
4. Distingue les faits présents dans le snapshot des recommandations. Si archonShardAbilityStrength est renseigné, indique séparément son cumul et ne le compte qu'une seule fois dans la Puissance finale. Cinq éclats rouges Tauforged configurés à +15 % correspondent à +75 % additifs, mais ne prétends pas connaître la valeur finale complète sans les autres contributions calculées.
5. Pour Wisp en Défense, utilise la référence utilisateur des cinq éclats rouges Tauforged comme variante Force/Portée : explique le gain de Puissance, le coût en capacité et les alternatives si le joueur ne dispose pas de cinq éclats Tauforged.
6. Compare mentalement au moins deux archétypes (par exemple équilibre, dégâts, survie ou endurance) et retiens celui qui respecte le mieux les paramètres demandés ; signale ce que tu sacrifies.
7. Ne transforme jamais une recommandation communautaire en vérité universelle : indique lorsqu'un choix est dépendant d'une faction, d'un niveau, d'une équipe ou d'une exécution précise.
8. À la toute fin de ta réponse, inclus impérativement un bloc JSON normalisé entre balises \`\`\`json:recommendation et \`\`\` listant exactement les éléments suggérés (par exemple : {"mods":["Don de Puissance",...],"arcanes":["Mue Augmentée"],"aura":"Courage Passager","exilus":"Influence de l'Augure"}) pour permettre leur application en un clic dans le Builder.
9. Réponds avec des sections courtes : « Diagnostic », « Build conseillé », « Pourquoi cette configuration », puis « Alternatives ou limites » lorsque pertinent.`;

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
