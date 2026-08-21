// WARFRAME SET BUILDER — Elemental damage resolution
// Tenno Codex HUD: expose deterministic primary/combined/conversion states for the Builder summary.
// Keep official combination rules here so the damage engine and the visual summary share one source of truth.

import type { Mod } from "./warframe-data";

export type PrimaryElementKey = "heat" | "cold" | "electricity" | "toxin";
export type CombinedElementKey = "blast" | "gas" | "radiation" | "magnetic" | "viral" | "corrosive";
export type ElementalKey = PrimaryElementKey | CombinedElementKey;
export type ElementalDisplayKind = "primary" | "combined" | "conversion";

export interface ElementalDamageBreakdown {
  key: ElementalKey;
  name: string;
  damage: number;
  color: string;
  kind: ElementalDisplayKind;
  components?: string[];
}

export interface ElementalConversionInfo {
  target: ElementalDamageBreakdown;
  sourceMod: string;
  description: string;
}

export interface ElementalResolution {
  elements: ElementalDamageBreakdown[];
  conversion?: ElementalConversionInfo;
}

type ElementDefinition = {
  key: ElementalKey;
  label: string;
  color: string;
  aliases: string[];
};

type ElementalContribution = {
  key: ElementalKey;
  percent: number;
  order: number;
};

type PrimaryBucket = {
  key: PrimaryElementKey;
  percent: number;
  order: number;
};

const ELEMENTS: Record<ElementalKey, ElementDefinition> = {
  heat: { key: "heat", label: "Feu", color: "#ff6b35", aliases: ["heat", "feu"] },
  cold: { key: "cold", label: "Glace", color: "#42a5f5", aliases: ["cold", "freeze", "glace"] },
  electricity: { key: "electricity", label: "Électricité", color: "#ab47bc", aliases: ["electricity", "electric", "electrique", "electricite", "électricité"] },
  toxin: { key: "toxin", label: "Toxine", color: "#66bb6a", aliases: ["toxin", "poison", "toxine"] },
  blast: { key: "blast", label: "Explosion", color: "#f59e0b", aliases: ["blast", "explosion"] },
  gas: { key: "gas", label: "Gaz", color: "#84cc16", aliases: ["gas", "gaz"] },
  radiation: { key: "radiation", label: "Radiation", color: "#ffd700", aliases: ["radiation"] },
  magnetic: { key: "magnetic", label: "Magnétique", color: "#c084fc", aliases: ["magnetic", "magnetique", "magnétique"] },
  viral: { key: "viral", label: "Viral", color: "#26c6da", aliases: ["viral"] },
  corrosive: { key: "corrosive", label: "Corrosif", color: "#ffa726", aliases: ["corrosive", "corrosif"] },
};

const PRIMARY_KEYS: PrimaryElementKey[] = ["heat", "cold", "electricity", "toxin"];

const COMBINATIONS: Record<string, CombinedElementKey> = {
  "cold+heat": "blast",
  "electricity+toxin": "corrosive",
  "heat+toxin": "gas",
  "cold+electricity": "magnetic",
  "electricity+heat": "radiation",
  "cold+toxin": "viral",
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getElementDefinition(key: ElementalKey): ElementDefinition {
  return ELEMENTS[key];
}

function getElementKeys(text: string): ElementalKey[] {
  const normalized = normalizeText(text);
  return (Object.keys(ELEMENTS) as ElementalKey[]).filter(key => {
    const definition = getElementDefinition(key);
    return definition.aliases.some(alias => normalized.includes(normalizeText(alias)));
  });
}

function findConversionTarget(text: string): ElementalKey | undefined {
  const normalized = normalizeText(text);
  const conversionWord = /(?:convert|converted|converts|conversion|converti|convertir|convertis)/;
  const globalElementalScope = /(?:all\s+(?:elemental\s+)?damage(?:\s+types?)?|all\s+elemental(?:\s+damage)?|every\s+(?:elemental\s+)?damage(?:\s+types?)?|tous?\s+les\s+types?\s+de\s+degats?\s+elementaires?|tous?\s+les\s+degats?\s+elementaires?|totalite\s+des\s+degats?\s+elementaires?|100\s*%\s+(?:of\s+)?(?:elemental\s+)?damage(?:\s+types?)?)/;

  // The exception is intentionally narrow: a normal “20% of Damage converted to …” effect
  // must not disable ordinary elemental fusion. We require an explicit global phrase that
  // refers to elemental damage/types, rather than any sentence that happens to contain “all”.
  const hasGlobalElementalConversion = conversionWord.test(normalized) && globalElementalScope.test(normalized);
  if (!hasGlobalElementalConversion) return undefined;

  const targets = getElementKeys(normalized);
  return targets.length > 0 ? targets[targets.length - 1] : undefined;
}

function mergeDisplayRows(rows: ElementalDamageBreakdown[]): ElementalDamageBreakdown[] {
  const byKey = new Map<ElementalKey, ElementalDamageBreakdown>();
  rows.forEach(row => {
    const current = byKey.get(row.key);
    if (!current) {
      byKey.set(row.key, { ...row, components: row.components ? [...row.components] : undefined });
      return;
    }

    const kind: ElementalDisplayKind = current.kind === "conversion" || row.kind === "conversion"
      ? "conversion"
      : current.kind === "combined" || row.kind === "combined"
        ? "combined"
        : "primary";
    const components = Array.from(new Set([...(current.components || []), ...(row.components || [])]));
    byKey.set(row.key, {
      ...current,
      damage: current.damage + row.damage,
      kind,
      components: components.length > 0 ? components : undefined,
    });
  });
  return Array.from(byKey.values());
}

function toDisplayRow(key: ElementalKey, percent: number, baseDamage: number, kind: ElementalDisplayKind, components?: string[]): ElementalDamageBreakdown {
  const definition = getElementDefinition(key);
  return {
    key,
    name: definition.label,
    damage: Math.round(baseDamage * (percent / 100)),
    color: definition.color,
    kind,
    components,
  };
}

function combinePrimaryBuckets(buckets: PrimaryBucket[], baseDamage: number): ElementalDamageBreakdown[] {
  const ordered = [...buckets].sort((a, b) => a.order - b.order);
  const rows: ElementalDamageBreakdown[] = [];

  // Mod placement is the deterministic ordering source. Every adjacent pair of distinct
  // primary elements creates one official secondary element; repeated copies of the same
  // primary are accumulated before pairing so two Heat mods still combine with Cold once.
  for (let index = 0; index < ordered.length; index += 2) {
    const first = ordered[index];
    const second = ordered[index + 1];
    if (!second) {
      rows.push(toDisplayRow(first.key, first.percent, baseDamage, "primary"));
      continue;
    }

    const pair = [first.key, second.key].sort().join("+");
    const combined = COMBINATIONS[pair];
    if (!combined) {
      rows.push(toDisplayRow(first.key, first.percent, baseDamage, "primary"));
      rows.push(toDisplayRow(second.key, second.percent, baseDamage, "primary"));
      continue;
    }

    const firstLabel = getElementDefinition(first.key).label;
    const secondLabel = getElementDefinition(second.key).label;
    rows.push(toDisplayRow(combined, first.percent + second.percent, baseDamage, "combined", [firstLabel, secondLabel]));
  }

  return rows;
}

export function resolveElementalDamage(mods: (Mod | null)[], baseDamage: number): ElementalResolution {
  const primaryBuckets = new Map<PrimaryElementKey, PrimaryBucket>();
  const directCombined: ElementalContribution[] = [];
  let conversion: { target: ElementalKey; sourceMod: string; description: string } | undefined;

  mods.forEach((mod, index) => {
    if (!mod) return;
    const text = `${mod.effect || ""} ${mod.description || ""}`;
    const conversionTarget = findConversionTarget(text);
    if (conversionTarget && !conversion) {
      conversion = {
        target: conversionTarget,
        sourceMod: mod.name,
        description: mod.effect || mod.description,
      };
      return;
    }

    const keys = getElementKeys(text);
    const primaryKey = keys.find(key => PRIMARY_KEYS.includes(key as PrimaryElementKey)) as PrimaryElementKey | undefined;
    if (primaryKey) {
      const current = primaryBuckets.get(primaryKey);
      const percent = 15 * ((mod.selectedRank ?? mod.maxRank) + 1);
      if (current) {
        current.percent += percent;
      } else {
        primaryBuckets.set(primaryKey, { key: primaryKey, percent, order: index });
      }
    }

    const secondaryKey = keys.find(key => !PRIMARY_KEYS.includes(key as PrimaryElementKey)) as CombinedElementKey | undefined;
    if (secondaryKey) {
      directCombined.push({
        key: secondaryKey,
        percent: 30 * ((mod.selectedRank ?? mod.maxRank) + 1),
        order: index,
      });
    }
  });

  const fusionRows = combinePrimaryBuckets(Array.from(primaryBuckets.values()), baseDamage);
  const directRows = directCombined
    .sort((a, b) => a.order - b.order)
    .map(source => toDisplayRow(source.key, source.percent, baseDamage, "combined"));
  const normalRows = mergeDisplayRows([...fusionRows, ...directRows]);

  if (!conversion) {
    return { elements: normalRows };
  }

  const convertedSourceLabels = normalRows.map(row => row.name);
  const totalElementalDamage = normalRows.reduce((total, row) => total + row.damage, 0);
  const convertedRow: ElementalDamageBreakdown = {
    ...toDisplayRow(conversion.target, 0, baseDamage, "conversion", Array.from(new Set(convertedSourceLabels))),
    damage: totalElementalDamage,
  };
  return {
    elements: [convertedRow],
    conversion: {
      target: convertedRow,
      sourceMod: conversion.sourceMod,
      description: conversion.description,
    },
  };
}

export function getElementalDisplayLabel(kind: ElementalDisplayKind): string {
  if (kind === "conversion") return "CONVERSION";
  if (kind === "combined") return "FUSION";
  return "PRIMAIRE";
}
