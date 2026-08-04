import { describe, expect, it } from "vitest"
import { computeAccountDynamic } from "@/lib/intelligence/account-dynamic"

// Lignes account_signals RÉELLES du compte Schneider (workspace KREDO),
// extraites en base le 2026-08-04.
const SCHNEIDER = [
  ...Array.from({ length: 7 }, () => ({ primary_source_id: null, detected_at: "2026-06-09T23:19:17.591809+00:00", relevance_score: 0, urgency_score: 0, confidence_score: 0.5 })),
  { primary_source_id: "37ea6b98-54a3-4e1b-98c2-511472aeb134", detected_at: "2026-07-08T22:59:25.46+00:00", relevance_score: 0.8, urgency_score: 0.4, confidence_score: 0.6 },
  { primary_source_id: "ae5b048b-2b48-44c2-95e6-a26114beebc1", detected_at: "2026-07-08T22:59:25.461+00:00", relevance_score: 0.8, urgency_score: 0.4, confidence_score: 0.6 },
  { primary_source_id: "32c5a0f4-8ea0-4b1c-9982-6bba436f4295", detected_at: "2026-07-08T22:59:25.46+00:00", relevance_score: 0.7, urgency_score: 0.5, confidence_score: 0.7 },
  { primary_source_id: "338188fa-84a2-4ed9-a7ac-58b8305f3022", detected_at: "2026-07-08T22:59:25.461+00:00", relevance_score: 0.7, urgency_score: 0.5, confidence_score: 0.7 },
  { primary_source_id: "7066b2bb-36e1-4c2c-b399-cf4d9097f303", detected_at: "2026-07-08T22:59:25.461+00:00", relevance_score: 0.8, urgency_score: 0.4, confidence_score: 0.6 },
]

describe("account-dynamic-v1 sur données réelles", () => {
  it("Schneider : 51/100, 5 preuves, 7 signaux FOLIO non sourcés écartés", () => {
    const r = computeAccountDynamic(SCHNEIDER, { now: new Date("2026-08-04T12:00:00Z") })
    expect(r.evidence_count).toBe(5)
    expect(r.source_refs).toHaveLength(5)
    expect(r.score).toBe(51)
    expect(r.label).toBe("Activité détectée modérée")
  })

  it("Thalès Alénia Space / Griesser : aucun signal, dynamique non mesurable", () => {
    const r = computeAccountDynamic([], { now: new Date("2026-08-04T12:00:00Z") })
    expect(r.score).toBeNull()
    expect(r.evidence_count).toBe(0)
  })
})
