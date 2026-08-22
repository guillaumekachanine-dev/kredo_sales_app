import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"

export type CommercialEligibility = "eligible" | "non_prospectable" | "unknown"

export type TerrainTopAccount = {
  id: string
  companyId: string
  name: string
  appetenceScore: number | null
  category: string | null
  categoryLabel: string | null
  entryAngle: string | null
  confidence: string | null
  isBenchmarkAccount: boolean
  commercialEligibility: CommercialEligibility
  relationType?: string | null
  lifecycleStatus?: string | null
}

export type TerrainTopAccountsModel = {
  ranked: TerrainTopAccount[]
  excludedBenchmark: TerrainTopAccount | null
  mode: "actionable" | "strict_fallback"
}

export function resolveCommercialEligibility(actor: {
  relationType?: string | null
  lifecycleStatus?: string | null
}): CommercialEligibility {
  const rel = actor.relationType?.trim().toLowerCase()
  const life = actor.lifecycleStatus?.trim().toLowerCase()

  const getRelCategory = (val?: string): "client" | "prospect" | "other" | null => {
    if (!val) return null
    if (val === "client") return "client"
    if (val === "prospect") return "prospect"
    return "other"
  }

  const getLifeCategory = (val?: string): "client" | "prospect" | "other" | null => {
    if (!val) return null
    if (val === "client" || val === "client_actif" || val === "client_dormant") return "client"
    if (val === "prospect" || val === "cible") return "prospect"
    return "other"
  }

  const relCat = getRelCategory(rel)
  const lifeCat = getLifeCategory(life)

  // Disagreement rule (§10): if both are present and contradict each other -> unknown
  if (relCat && lifeCat && relCat !== lifeCat) {
    return "unknown"
  }

  const effective = relCat ?? lifeCat

  if (effective === "client") return "non_prospectable"
  if (effective === "prospect") return "eligible"
  return "unknown"
}

export function buildTerrainTopAccounts(actors: CompetitiveMapActor[]): TerrainTopAccountsModel {
  const mappedAccounts: TerrainTopAccount[] = actors.map((actor) => ({
    id: actor.id,
    companyId: actor.companyId,
    name: actor.name,
    appetenceScore: actor.appetenceScore,
    category: actor.category,
    categoryLabel: actor.categoryLabel,
    entryAngle: actor.angleEntree,
    confidence: actor.confidence,
    isBenchmarkAccount: actor.isBenchmarkAccount,
    commercialEligibility: resolveCommercialEligibility(actor),
    relationType: actor.relationType,
    lifecycleStatus: actor.lifecycleStatus,
  }))

  const hasCrmProjection = mappedAccounts.some(
    (acc) =>
      Boolean(acc.relationType && acc.relationType.trim()) ||
      Boolean(acc.lifecycleStatus && acc.lifecycleStatus.trim()),
  )

  if (!hasCrmProjection) {
    const rankable = mappedAccounts
      .filter((acc) => acc.appetenceScore !== null && acc.appetenceScore > 0)
      .map((acc, index) => ({ acc, originalIndex: index }))

    rankable.sort((left, right) => {
      const scoreDiff = (right.acc.appetenceScore ?? 0) - (left.acc.appetenceScore ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      return left.originalIndex - right.originalIndex
    })

    return {
      ranked: rankable.slice(0, 3).map(({ acc }) => acc),
      excludedBenchmark: null,
      mode: "strict_fallback",
    }
  }

  const rankable = mappedAccounts
    .filter(
      (acc) =>
        acc.commercialEligibility !== "non_prospectable" &&
        acc.appetenceScore !== null &&
        acc.appetenceScore > 0,
    )
    .map((acc, index) => ({ acc, originalIndex: index }))

  rankable.sort((left, right) => {
    const scoreDiff = (right.acc.appetenceScore ?? 0) - (left.acc.appetenceScore ?? 0)
    if (scoreDiff !== 0) return scoreDiff
    return left.originalIndex - right.originalIndex
  })

  const ranked = rankable.slice(0, 3).map(({ acc }) => acc)

  const excludedBenchmark =
    mappedAccounts.find(
      (acc) => acc.isBenchmarkAccount && acc.commercialEligibility === "non_prospectable",
    ) ?? null

  return {
    ranked,
    excludedBenchmark,
    mode: "actionable",
  }
}
