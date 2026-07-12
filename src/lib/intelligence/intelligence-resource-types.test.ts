import { describe, expect, it } from "vitest"
import {
  classifyIntelligenceResultType,
  isLegacyPhase4RoadmapFallback,
} from "./intelligence-resource-types"
import { buildPanelResourceCounts } from "./account-panel-data"
import type { PanelResultRow } from "./account-panel-data"

function result(overrides: Partial<PanelResultRow>): PanelResultRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    result_type: overrides.result_type ?? "process_diagnostic",
    status: overrides.status ?? "succeeded",
    needs_review: overrides.needs_review ?? false,
    phase: overrides.phase ?? 3,
    created_at: overrides.created_at ?? "2026-07-01T10:00:00.000Z",
    completed_at: overrides.completed_at ?? null,
  }
}

describe("intelligence resource classification", () => {
  it("classifies canonical result_type values", () => {
    expect(classifyIntelligenceResultType("process_diagnostic")).toBe("analyses")
    expect(classifyIntelligenceResultType("communication")).toBe("communications")
    expect(classifyIntelligenceResultType("client_summary")).toBe("reports")
    expect(classifyIntelligenceResultType("roadmap")).toBe("roadmaps")
    expect(classifyIntelligenceResultType("unknown")).toBeNull()
  })

  it("classifies the real result_type values produced in prod (vérifiés en base 2026-07-07)", () => {
    expect(classifyIntelligenceResultType("commercial_pitch")).toBe("communications")
    expect(classifyIntelligenceResultType("prise_de_parole")).toBe("communications")
    expect(classifyIntelligenceResultType("activity_commercial")).toBe("reports")
    expect(classifyIntelligenceResultType("activity_recruitment")).toBe("reports")
    expect(classifyIntelligenceResultType("weekly_manager")).toBe("reports")
  })

  it("keeps legacy pitch/pitch_mail aliases classified (pré-rename intel-020-pitch-mail)", () => {
    expect(classifyIntelligenceResultType("pitch")).toBe("communications")
    expect(classifyIntelligenceResultType("pitch_mail")).toBe("communications")
  })

  it("no longer classifies the never-produced generic 'report' placeholder", () => {
    expect(classifyIntelligenceResultType("report")).toBeNull()
  })

  it("counts succeeded, needs_review and failed separately", () => {
    const counts = buildPanelResourceCounts([
      result({ id: "a", status: "succeeded", needs_review: false }),
      result({ id: "b", status: "succeeded", needs_review: true }),
      result({ id: "c", status: "failed", needs_review: false }),
    ], {})

    expect(counts.analyses.engine.succeeded).toBe(1)
    expect(counts.analyses.engine.needsReview).toBe(1)
    expect(counts.analyses.engine.failed).toBe(1)
    expect(counts.analyses.engine.available).toBe(2)
  })

  it("distinguishes engine and legacy FOLIO resources", () => {
    const counts = buildPanelResourceCounts([
      result({ id: "communication-1", result_type: "communication", phase: 5 }),
    ], {
      analysis_data: { synthese_consultant: "Legacy analysis" },
      pitches: [{ objet_mail: "Legacy pitch" }, { objet_mail: "Second pitch" }],
    })

    expect(counts.communications.engine.available).toBe(1)
    expect(counts.communications.legacy.count).toBe(2)
    expect(counts.analyses.legacy.available).toBe(true)
    expect(counts.analyses.legacy.source).toBe("folio_metadata")
  })

  it("keeps roadmap result_type as durable rule and phase 4 as legacy fallback only", () => {
    expect(isLegacyPhase4RoadmapFallback(result({
      result_type: "client_summary",
      phase: 4,
      status: "succeeded",
    }))).toBe(true)
    expect(isLegacyPhase4RoadmapFallback(result({
      result_type: "roadmap",
      phase: 4,
      status: "succeeded",
    }))).toBe(false)

    const counts = buildPanelResourceCounts([
      result({ id: "legacy-phase-4", result_type: "client_summary", phase: 4 }),
      result({ id: "roadmap", result_type: "roadmap", phase: 4 }),
    ], {})

    expect(counts.roadmaps.engine.available).toBe(1)
    expect(counts.roadmaps.legacy.available).toBe(true)
    expect(counts.roadmaps.legacy.source).toBe("phase4_legacy")
  })
})
