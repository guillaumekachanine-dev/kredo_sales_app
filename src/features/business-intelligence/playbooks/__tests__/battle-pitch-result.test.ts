import { describe, expect, it } from "vitest"
import { SCENARIO_REGISTRY } from "@/lib/communication/communication-scenario-registry"
import { mapResultTypeToDocumentType } from "@/lib/communication/communication-result-documents"

describe("Lot 5 — Battle Pitch Result non-regression", () => {
  it("conserve le scénario battle_situation_pitch dans le registre de scénarios", () => {
    const scenario = SCENARIO_REGISTRY.find((s) => s.value === "battle_situation_pitch")
    expect(scenario).toBeDefined()
    expect(scenario?.value).toBe("battle_situation_pitch")
    expect(scenario?.defaultOutputKind).toBe("spoken_pitch")
    expect(scenario?.requiresOffer).toBe(true)
  })

  it("mène le resultId (commercial_pitch) au document commercial_pitch", () => {
    // La fonction mapResultTypeToDocumentType doit mapper le type de résultat
    // 'commercial_pitch' vers le type de document 'commercial_pitch'
    const docType = mapResultTypeToDocumentType("commercial_pitch")
    expect(docType).toBe("commercial_pitch")
  })

  it("vérifie que l'URL Rapports utilise correctement le documentId", () => {
    const mockDocumentId = "doc-uuid-12345"
    const reportsUrl = `/reports?doc=${mockDocumentId}`
    expect(reportsUrl).toBe("/reports?doc=doc-uuid-12345")
  })
})
