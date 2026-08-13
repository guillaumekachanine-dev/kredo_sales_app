import type { CompetitiveMapCategory } from "../domain/competitive-map-output"
import type { CompetitiveMapSegmentOption } from "../components/CompetitiveMapImportWizard"
export type CompetitiveMapCatalogItem = {
  segmentId: string
  segmentSlug: string
  segmentName: string
  macroName: string
  label: string
  latestSnapshotDate: string
  actorCount: number
}

export type CompetitiveMapActorDetails = {
  propositionValeur: string | null
  differenciateurs: string[]
  dependances: string[]
  chaineValeur: string[]
  chantiersTechnologiques: string[]
  triggers: string[]
  lignesRouges: string[]
  trous: string[]
  metierChaineValeur: string | null
  maillon: string | null
  contratsMajeurs: string[]
  grilles: string[]
  coucheEsn: string[]
  traductionCommerciale: string[]
  iaAnnonceVsDeploye: string | null
}

export type CompetitiveMapActor = {
  id: string
  companyId: string
  name: string
  category: CompetitiveMapCategory
  categoryLabel: string
  confidence: string
  appetenceScore: number | null
  accessibilityScore: number | null
  appetenceProvisoire: boolean
  isPositioned: boolean
  isBenchmarkAccount: boolean
  revenueEstimateMeur: number | null
  revenueExercice: number | null
  revenuePerimetre: string | null
  headcountFrance: string | null
  positioning: string | null
  forces: string | null
  vulnerability: string | null
  angleEntree: string | null
  details: CompetitiveMapActorDetails
}

export type CompetitiveMapSnapshot = {
  segmentId: string
  segmentLabel: string
  snapshotDate: string
  actors: CompetitiveMapActor[]
}

export type CompetitiveMapWorkspace = {
  state: "ready" | "empty" | "error"
  catalog: CompetitiveMapCatalogItem[]
  allSegments: CompetitiveMapSegmentOption[]
  selectedSegmentId: string | null
  snapshot: CompetitiveMapSnapshot | null
  error: string | null
}
