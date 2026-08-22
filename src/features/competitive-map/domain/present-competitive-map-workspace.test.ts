import { describe, expect, it } from "vitest"
import {
  buildCompetitiveMapCatalog,
  presentCompetitiveMapSnapshot,
  type CompetitiveMapWorkspaceEntryRow,
} from "./present-competitive-map-workspace"
import { resolveCompetitiveMapSelection } from "./competitive-map-selection"

const sectors = [
  { id: "macro", slug: "industrie", name: "Industrie", level: "macro", parent_id: null },
  { id: "segment-a", slug: "spatial", name: "Spatial", level: "segment", parent_id: "macro" },
  { id: "segment-b", slug: "naval", name: "Naval", level: "segment", parent_id: "macro" },
]

const baseEntry: CompetitiveMapWorkspaceEntryRow = {
  id: "entry-a",
  company_id: "company-a",
  category: "leader",
  positioning: "Prime européen",
  forces: "Intégration complexe",
  vulnerabilite: "Cadence industrielle",
  angle_entree: "Digital thread",
  appetence_score: 28,
  accessibilite_score: 4,
  appetence_provisoire: false,
  confiance: "haute",
  empreinte_metier: 4,
  maturite_numerique: 3,
  is_benchmark_account: true,
  profile_json: {
    proposition_valeur: "Architectures critiques",
    differenciateurs: ["Souveraineté", "Multi-orbite"],
    chaine_valeur: { amont: "Conception", aval: "Opérations" },
    trigger_events: [{ date: "2026-06", fait: "Nouveau programme", source: "ESA" }],
    trous: ["Panel fournisseurs"],
    grilles: { ia_annonce_vs_deploye: "Discours IA fort, 0 déploiement" },
    couche_esn: { voie_entree_probable: "Auditer la maturité IA" },
  },
  companies: { id: "company-a", name: "Orbite SA" },
}

describe("competitive map workspace presenter", () => {
  it("ne catalogue que les segments cartographiés et retient leur dernier snapshot", () => {
    const catalog = buildCompetitiveMapCatalog([
      { segment_id: "segment-a", study_snapshot_date: "2026-07-01" },
      { segment_id: "segment-a", study_snapshot_date: "2026-08-01" },
      { segment_id: "segment-a", study_snapshot_date: "2026-08-01" },
      { segment_id: null, study_snapshot_date: "2026-08-01" },
    ], sectors)

    expect(catalog).toEqual([expect.objectContaining({
      segmentId: "segment-a",
      label: "Industrie › Spatial",
      latestSnapshotDate: "2026-08-01",
      actorCount: 2,
    })])
  })

  it("joint les faits sans inventer d’accessibilité et présente le profil narratif", () => {
    const [catalogItem] = buildCompetitiveMapCatalog([
      { segment_id: "segment-a", study_snapshot_date: "2026-08-01" },
    ], sectors)
    const snapshot = presentCompetitiveMapSnapshot({
      catalogItem,
      entryRows: [baseEntry, {
        ...baseEntry,
        id: "entry-b",
        company_id: "company-b",
        category: "challenger",
        accessibilite_score: null,
        is_benchmark_account: false,
        companies: { id: "company-b", name: "Satellite SAS" },
      }],
      factRows: [
        { target_id: "company-a", fact_type: "revenue_estimate", value_json: { amountMeur: 2360, exercice: 2025 }, value_text: null, normalized_value: "2360" },
        { target_id: "company-a", fact_type: "headcount_france", value_json: null, value_text: "4200", normalized_value: "4200" },
      ],
    })

    expect(snapshot.actors[0]).toMatchObject({
      name: "Orbite SA",
      revenueEstimateMeur: 2360,
      headcountFrance: "4200",
      businessFootprintScore: 4,
      digitalMaturityScore: 3,
      isPositioned: true,
      details: {
        propositionValeur: "Architectures critiques",
        differenciateurs: ["Souveraineté", "Multi-orbite"],
        triggers: ["2026-06 · Nouveau programme · ESA"],
        trous: ["Panel fournisseurs"],
        iaAnnonceVsDeploye: "Discours IA fort, 0 déploiement",
        coucheEsn: ["Voie entree probable : Auditer la maturité IA"],
      },
    })
    expect(snapshot.actors[1]).toMatchObject({ accessibilityScore: null, isPositioned: false })
  })

  it("synchronise une sélection valide et retombe sur le compte étalon", () => {
    const [catalogItem] = buildCompetitiveMapCatalog([
      { segment_id: "segment-a", study_snapshot_date: "2026-08-01" },
    ], sectors)
    const snapshot = presentCompetitiveMapSnapshot({ catalogItem, entryRows: [baseEntry], factRows: [] })

    expect(resolveCompetitiveMapSelection(snapshot.actors, "entry-a")).toBe("entry-a")
    expect(resolveCompetitiveMapSelection(snapshot.actors, "inconnu")).toBe("entry-a")
    expect(resolveCompetitiveMapSelection([], null)).toBeNull()
  })
})
