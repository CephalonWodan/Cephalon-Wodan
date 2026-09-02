import { describe, expect, it } from "vitest";
import { buildRagContext, getRagDiagnostics, retrieveRagEvidence } from "./rag-retriever";

describe("Cephalon Codex RAG retrieval", () => {
  it("indexes every catalog family from the generated index", () => {
    const diagnostics = getRagDiagnostics();
    expect(diagnostics.documents).toBeGreaterThan(2000);
    expect(diagnostics.byKind.warframe).toBeGreaterThan(100);
    expect(diagnostics.byKind.weapon).toBeGreaterThan(500);
    expect(diagnostics.byKind.mod).toBeGreaterThan(1000);
    expect(diagnostics.byKind.archon_shard).toBeGreaterThan(0);
  });

  it("prioritizes the active Warframe and relevant mission evidence", () => {
    const evidence = retrieveRagEvidence({
      query: "Optimise Wisp pour Défense avec puissance des capacités",
      language: "fr",
      missionType: "defense",
      buildContext: { warframe: { name: "Wisp Prime" } },
      advancedOptions: { optimizationFocus: "strength" },
    });
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.some(item => /Wisp/i.test(item.name))).toBe(true);
    expect(evidence.every(item => item.source.length > 0)).toBe(true);
  });

  it("retrieves exact item families for a weapon and archon shard query", () => {
    const evidence = retrieveRagEvidence({
      query: "Paris Prime Incarnon et éclat rouge tauforgé puissance",
      language: "fr",
      buildContext: { primaryWeapon: "Paris Prime", archonShards: ["Red Tauforged"] },
    });
    expect(evidence.some(item => /Paris/i.test(item.name))).toBe(true);
    expect(evidence.some(item => item.kind === "archon_shard")).toBe(true);
  });

  it("retrieves recent creator videos as community sources", () => {
    const evidence = retrieveRagEvidence({ query: "YouTube MHBlacky guide build", language: "fr" });
    expect(evidence.some(item => item.kind === "community_video")).toBe(true);
    expect(evidence.filter(item => item.kind === "community_video").every(item => item.source.includes("YouTube"))).toBe(true);
  });

  it("retrieves the supplied defense guide as a community reference", () => {
    const evidence = retrieveRagEvidence({ query: "Défense équipe maps vagues Helminth nuker buffer", language: "fr", missionType: "defense" });
    expect(evidence.some(item => item.kind === "community_guide")).toBe(true);
    expect(evidence.filter(item => item.kind === "community_guide").every(item => item.source.includes("Guide communautaire"))).toBe(true);
  });

  it("returns bounded, source-aware prompt context", () => {
    const context = buildRagContext({ query: "Comment fonctionne Vitality ?", language: "fr" });
    expect(context.evidence.length).toBeLessThanOrEqual(8);
    expect(context.instructions).toContain("Ne fabrique jamais");
    expect(context.instructions).toContain("Sources récupérées");
  });
});
