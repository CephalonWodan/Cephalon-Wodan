// Build the compact, deterministic RAG index from the normalized Warframe dataset.
// No model call is required: indexing stays reproducible and runs in GitHub Actions.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const sourcePath = path.join(root, "client/src/lib/warframe-data-full.json");
const outputPath = path.join(root, "data/rag-index.json");
const outputTsPath = path.join(root, "server/rag-index.generated.ts");
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const enrichmentPath = path.join(root, "data/wiki-enrichment.json");
const enrichment = fs.existsSync(enrichmentPath) ? JSON.parse(fs.readFileSync(enrichmentPath, "utf8")) : [];
const youtubePath = path.join(root, "data/youtube-transcripts.json");
const youtube = fs.existsSync(youtubePath) ? JSON.parse(fs.readFileSync(youtubePath, "utf8")) : { videos: [] };
const googleGuidePath = path.join(root, "data/google-doc-defense-guide.txt");
const googleGuideUrl = "https://docs.google.com/document/d/1rslhIJVmW5YO0TJm1MTtrryDgoeeU2L-CE3MomM6Rwk/edit?tab=t.0";
const googleGuideText = fs.existsSync(googleGuidePath) ? fs.readFileSync(googleGuidePath, "utf8") : "";
const communityPresetsPath = path.join(root, "client/src/lib/community-presets.ts");
const communityPresetsSource = fs.existsSync(communityPresetsPath) ? fs.readFileSync(communityPresetsPath, "utf8") : "";
const enrichmentByName = new Map((Array.isArray(enrichment) ? enrichment : []).map(item => [normalize(item.name), item]));
const stopWords = new Set("a au aux avec dans de des du en et la le les pour sur un une the and for from of on to with build set faire quel quelle quels quelles".split(" "));

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9+#.%'-]+/g, " ").trim();
}
function tokens(value) {
  return Array.from(new Set(normalize(value).split(/\s+/).filter(token => token.length > 1 && !stopWords.has(token))));
}
function compact(value, depth = 0) {
  if (value === null || value === undefined || depth > 2) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  if (Array.isArray(value)) return value.slice(0, 12).map(item => compact(item, depth + 1)).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value).slice(0, 18).map(([key, item]) => `${key}: ${compact(item, depth + 1)}`).filter(line => !line.endsWith(": ")).join(" | ");
  return "";
}
function text(kind, item) {
  return [
    `Type: ${kind}`, `Nom: ${item.name || ""}`, item.type && `Catégorie: ${item.type}`,
    item.description && `Description: ${item.description}`, item.wikiDescription && `Description Wiki: ${item.wikiDescription}`, item.effect && `Effet: ${item.effect}`,
    item.role && `Rôle: ${item.role}`, item.creator && `Créateur: ${item.creator}`, item.publishedAt && `Publié le: ${item.publishedAt}`, item.transcriptStatus && `Statut transcription: ${item.transcriptStatus}`, item.weaponClass && `Classe: ${item.weaponClass}`,
    item.damage && `Dégâts totaux: ${item.damage}`, item.critChance && `Chance critique: ${item.critChance}`,
    item.critMultiplier && `Multiplicateur critique: ${item.critMultiplier}`, item.statusChance && `Chance de statut: ${item.statusChance}`,
    item.fireRate && `Cadence: ${item.fireRate}`, item.health && `Santé: ${item.health}`,
    item.shield && `Bouclier: ${item.shield}`, item.armor && `Armure: ${item.armor}`,
    item.energy && `Énergie: ${item.energy}`, item.polarity && `Polarité: ${item.polarity}`,
    item.maxRank !== undefined && `Rang maximum: ${item.maxRank}`, item.compatName && `Compatibilité: ${item.compatName}`,
    item.abilities && `Capacités: ${compact(item.abilities)}`, item.officialStats && `Statistiques officielles: ${compact(item.officialStats)}`, item.wikiStats && `Statistiques Wiki: ${compact(item.wikiStats)}`,
    item.effects && `Effets disponibles: ${compact(item.effects)}`, item.damageTypes && `Répartition des dégâts: ${compact(item.damageTypes)}`,
  ].filter(Boolean).join("\n");
}
function source(item) {
  if (item.sourceType === "community_build") return `Build communautaire — ${item.creator || "source communautaire"}`;
  if (item.sourceType === "community_video") return `Vidéo YouTube communautaire — ${item.creator || "créateur sourcé"}`;
  if (item.sourceType === "community_guide") return `Guide communautaire — ${item.creator || "source fournie"}`;
  return item.wikiUrl ? "Warframe Wiki + dataset local" : (item.effectIds || item.sourceKey ? "Archon Shard dataset + Warframe Wiki" : "dataset local normalisé");
}
function docs(kind, items) {
  return (Array.isArray(items) ? items : []).filter(item => item?.name).map(item => {
    const name = String(item.name);
    const wiki = enrichmentByName.get(normalize(name));
    const enriched = { ...item, wikiDescription: wiki?.description || wiki?.extract || "", wikiStats: wiki?.stats || wiki?.statsParsed || null };
    const body = text(kind, enriched);
    return {
      id: `${kind}:${item.id || normalize(name).replaceAll(" ", "-")}`,
      kind,
      name,
      text: body,
      aliases: [name, item.id, item.compatName, item.weaponClass, item.type].filter(Boolean).map(String),
      tokens: tokens(`${name} ${enriched.description || ""} ${enriched.wikiDescription || ""} ${enriched.effect || ""} ${enriched.compatName || ""} ${enriched.type || ""} ${enriched.weaponClass || ""}`),
      source: wiki?.source ? `${source(item)}; ${wiki.source}` : source(item),
      sourceUrl: wiki?.wikiUrl || wiki?.url || item.wikiUrl || `https://wiki.warframe.com/w/${encodeURIComponent(name.replaceAll(" ", "_"))}`,
      creator: item.creator || undefined,
      publishedAt: item.publishedAt || undefined,
      sourceType: item.sourceType || undefined,
      validationStatus: item.validationStatus || wiki?.validationStatus || "not_checked",
    };
  });
}
function hasCombatProfile(item) {
  const damage = Number(item?.damage || item?.damageTypes?.total || 0);
  const crit = Number(item?.critChance || 0);
  const status = Number(item?.statusChance || 0);
  const fireRate = Number(item?.fireRate || 0);
  return damage > 0 || crit > 0 || status > 0 || fireRate > 0;
}
function parseCommunityPresets(sourceText) {
  const presets = [];
  const blocks = sourceText.match(/\{\n\s+id: "preset-[\s\S]*?\n\s+\},?/g) || [];
  for (const block of blocks) {
    const get = key => block.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1] || "";
    const getArray = key => {
      const match = block.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
      return match ? [...match[1].matchAll(/"([^"]+)"/g)].map(item => item[1]) : [];
    };
    const id = get("id");
    const targetItemName = get("targetItemName");
    if (!id || !targetItemName) continue;
    const modNames = getArray("modNames");
    const auraName = get("auraName");
    const exilusName = get("exilusName");
    const arcaneNames = getArray("arcaneNames");
    const missionType = get("missionType");
    const difficulty = get("difficulty");
    const creator = get("creator");
    const description = get("description");
    const allMods = [...(auraName ? [auraName] : []), ...(exilusName ? [exilusName] : []), ...modNames];
    const textBody = [
      `Type: community_build`, `Nom: ${get("name")}`, `Warframe/Arme cible: ${targetItemName}`,
      `Créateur: ${creator}`, `Mission: ${missionType}`, `Difficulté: ${difficulty}`,
      `Description: ${description}`, `Mods: ${allMods.join(" | ")}`,
      `Arcanes: ${arcaneNames.join(" | ")}`,
      `Source: preset communautaire local; à utiliser comme référence, jamais comme valeur officielle.`,
    ].join("\n");
    presets.push({
      id: `community_build:${id}`,
      kind: "community_build",
      name: get("name") || `${targetItemName} — build communautaire`,
      text: textBody,
      aliases: [targetItemName, get("name"), creator, missionType, difficulty, ...allMods].filter(Boolean),
      tokens: tokens(`${targetItemName} ${get("name")} ${creator} ${missionType} ${difficulty} ${description} ${allMods.join(" ")} ${arcaneNames.join(" ")}`),
      source: `Build communautaire — ${creator || "source locale"}`,
      sourceUrl: "",
      creator: creator || undefined,
      sourceType: "community_build",
      validationStatus: "community_reference",
      record: { targetItemName, modNames: allMods, arcaneNames, missionType, difficulty, creator },
    });
  }
  return presets;
}

const groups = [
  ["warframe", data.warframes], ["weapon", (data.weapons || []).filter(hasCombatProfile)], ["mod", data.mods],
  ["arcane", data.arcanes], ["companion", data.companions], ["archon_shard", data.archonShards],
];
const communityVideos = (Array.isArray(youtube.videos) ? youtube.videos : []).filter(video => video?.id && video?.title).map(video => ({
  ...video,
  name: video.title,
  type: "community_video",
  description: video.transcriptText || video.description || "",
  wikiUrl: video.url,
  sourceType: "community_video",
}));
const guideSections = googleGuideText.split(/\n(?=\s*(?:\d+\)|\d+\.|[A-Z]\.))/).map((section, index) => ({
  name: `Guide de la défense optimisée — section ${index + 1}`,
  type: "community_guide",
  description: section.trim(),
  creator: "Hannibalisme",
  publishedAt: "2025-07",
  wikiUrl: googleGuideUrl,
  sourceType: "community_guide",
  validationStatus: "community_reference",
})).filter(section => section.description.length > 80);
const communityBuilds = parseCommunityPresets(communityPresetsSource);
const documents = groups.flatMap(([kind, items]) => docs(kind, items)).concat(docs("community_video", communityVideos), docs("community_guide", guideSections), communityBuilds);
const hash = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
const output = { schemaVersion: 2, generatedAt: new Date().toISOString(), sourceHash: hash, documentCount: documents.length, documents };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
fs.writeFileSync(outputTsPath, `// Generated by scripts/build-rag-index.mjs. Do not edit manually.\n// This TypeScript snapshot avoids runtime JSON import assertions on Vercel.\nexport default ${JSON.stringify(output)} as const;\n`);
console.log(`[RAG] ${documents.length} documents générés dans ${outputPath}`);
console.log(`[RAG] Community builds indexés : ${communityBuilds.length}`);
console.log(`[RAG] TypeScript snapshot généré dans ${outputTsPath}`);
console.log(`[RAG] sourceHash=${hash}`);
