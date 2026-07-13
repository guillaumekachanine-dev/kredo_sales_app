import { describe, expect, it } from "vitest"
import { parseWorkspaceDiagnostic } from "./parse-diagnostic-content"

function validDiagnostic() {
  return {
    schema_version: 1,
    generatedAt: "2026-07-13T08:00:00.000Z",
    periodLabel: "Semaine du 13 juillet 2026",
    executiveSummary: "Le portefeuille reste solide, avec un risque de continuité à traiter.",
    correlations: [
      {
        id: "continuity-risk",
        title: "Continuité commerciale et delivery",
        narrative: "Les fins de mission croisent un pipe insuffisamment activé.",
        axes: ["commerce", "delivery"],
        severity: "warning",
        evidenceRefs: [{ metric: "delivery.missionsEndingSoon", value: "Missions concernées" }],
      },
    ],
    priorities: [
      {
        rank: 1,
        action: "Sécuriser les renouvellements",
        rationale: "La continuité dépend de décisions proches.",
        relatedCorrelationIds: ["continuity-risk"],
      },
    ],
    watchList: [
      {
        signal: "Concentration du pipe",
        horizon: "Court terme",
        triggerCondition: "Devient critique si le pipe se contracte.",
      },
    ],
    strengths: [{ observation: "La marge consolidée reste positive." }],
  }
}

describe("parseWorkspaceDiagnostic", () => {
  it("accepte le contrat canonique", () => {
    const result = parseWorkspaceDiagnostic(validDiagnostic())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.correlations[0].axes).toEqual(["commerce", "delivery"])
  })

  it("rejette une pseudo-corrélation mono-axe", () => {
    const input = validDiagnostic()
    input.correlations[0].axes = ["commerce"]
    const result = parseWorkspaceDiagnostic(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("au moins deux axes")
  })

  it("accepte une pseudo-corrélation mono-axe en mode affichage", () => {
    const input = validDiagnostic()
    input.correlations[0].axes = ["commerce"]
    const result = parseWorkspaceDiagnostic(input, { allowMonoAxisCorrelations: true })
    expect(result.ok).toBe(true)
  })

  it("rejette une priorité non reliée à une corrélation existante", () => {
    const input = validDiagnostic()
    input.priorities[0].relatedCorrelationIds = ["unknown"]
    const result = parseWorkspaceDiagnostic(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("corrélation inconnue")
  })

  it("rejette les sorties qui dépassent les limites de hiérarchisation", () => {
    const input = validDiagnostic()
    input.strengths = Array.from({ length: 4 }, (_, index) => ({
      observation: `Force ${index}`,
    }))
    const result = parseWorkspaceDiagnostic(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("limite de 3")
  })
})
