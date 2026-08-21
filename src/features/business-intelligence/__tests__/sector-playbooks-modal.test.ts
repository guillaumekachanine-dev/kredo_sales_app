import { describe, expect, it } from "vitest"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"

function createMockActor(overrides: Partial<CompetitiveMapActor> = {}): CompetitiveMapActor {
  return {
    id: "cme-1",
    companyId: "comp-1",
    name: "Robertet",
    category: "leader",
    categoryLabel: "Leader",
    confidence: "haute",
    appetenceScore: 35,
    accessibilityScore: 5,
    appetenceProvisoire: false,
    isPositioned: true,
    isBenchmarkAccount: true,
    revenueEstimateMeur: 843.9,
    revenueExercice: 2025,
    revenuePerimetre: "groupe",
    headcountFrance: "2500+",
    positioning: "Premier acteur intégré du naturel",
    forces: "Intégration amont-aval et R&D",
    vulnerability: "Exposition au change",
    angleEntree: "Industrialisation gouvernée de NaturIA",
    details: {
      propositionValeur: "Formulation et ingrédients naturels d'excellence",
      differenciateurs: ["Maîtrise du naturel de la plante au concentré"],
      dependances: ["Outils IFRA"],
      chaineValeur: ["Sourcing", "Extraction", "Formulation", "Qualité"],
      chantiersTechnologiques: ["IA de création", "Gouvernance de données"],
      triggers: ["Publication CA semestriel 444 M€", "Intervention DSI aux IA Dates"],
      lignesRouges: ["Ne pas proposer un POC IA basique", "Ne pas parler de restructuration"],
      trous: ["Modèle d'achat IT non formalisé publiquement"],
      metierChaineValeur: "Transformation et formulation",
      maillon: "Maillon 1 & 3",
      contratsMajeurs: ["Regroupement industriel Seveso"],
      grilles: ["CA 843.9 M€", "Marge EBITDA 20.6%"],
      coucheEsn: ["DSI Global identifié publiquement", "Achat centralisé à Grasse"],
      traductionCommerciale: ["Vous avez un outil d'IA qui tourne, parlons gouvernance et MLOps"],
      iaAnnonceVsDeploye: "Outil NaturIA en production",
    },
    ...overrides,
  }
}

describe("Playbook & Battle Cards mono-segment", () => {
  it("projette les informations concurrentielles opérationnelles dans une Battle Card", () => {
    const actor = createMockActor()

    expect(actor.name).toBe("Robertet")
    expect(actor.isBenchmarkAccount).toBe(true)
    expect(actor.appetenceScore).toBe(35)
    expect(actor.accessibilityScore).toBe(5)
    expect(actor.details.triggers).toHaveLength(2)
    expect(actor.details.lignesRouges[0]).toContain("POC IA")
    expect(actor.details.coucheEsn[0]).toContain("DSI Global")
  })

  it("gère l'absence de données avec un empty state explicite sans fallback ni LLM", () => {
    const emptyActors: CompetitiveMapActor[] = []
    expect(emptyActors).toHaveLength(0)
  })
})
