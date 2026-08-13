import { describe, expect, it } from "vitest"
import type { CompetitiveMapActor } from "../data/competitive-map-workspace-types"
import { buildCompetitiveMapUrl } from "./competitive-map-navigation"
import { resolveCompetitiveMapSelection } from "./competitive-map-selection"

function actor(id: string, benchmark = false): CompetitiveMapActor {
  return {
    id,
    companyId: `company-${id}`,
    name: id,
    category: "leader",
    categoryLabel: "Leaders",
    confidence: "haute",
    appetenceScore: 24,
    accessibilityScore: 3,
    appetenceProvisoire: false,
    isPositioned: true,
    isBenchmarkAccount: benchmark,
    revenueEstimateMeur: null,
    revenueExercice: null,
    revenuePerimetre: null,
    headcountFrance: null,
    positioning: null,
    forces: null,
    vulnerability: null,
    angleEntree: null,
    details: {
      propositionValeur: null,
      differenciateurs: [],
      dependances: [],
      chaineValeur: [],
      chantiersTechnologiques: [],
      triggers: [],
      lignesRouges: [],
      trous: [],
      metierChaineValeur: null,
      maillon: null,
      contratsMajeurs: [],
      grilles: [],
      coucheEsn: [],
      traductionCommerciale: [],
      iaAnnonceVsDeploye: null,
    },
  }
}

describe("sélection de la cartographie concurrentielle", () => {
  it("conserve un acteur valide puis retombe sur l'étalon au changement de segment", () => {
    const firstSegment = [actor("alpha", true), actor("beta")]
    const nextSegment = [actor("gamma"), actor("delta", true)]

    expect(resolveCompetitiveMapSelection(firstSegment, "beta")).toBe("beta")
    expect(resolveCompetitiveMapSelection(nextSegment, "beta")).toBe("delta")
  })

  it("construit l'URL canonique d'un changement de segment", () => {
    expect(buildCompetitiveMapUrl("segment spatial")).toBe(
      "/intelligence?tab=competitive_env&competitiveSegment=segment+spatial",
    )
  })
})
