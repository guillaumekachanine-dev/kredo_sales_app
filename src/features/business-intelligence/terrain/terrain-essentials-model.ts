import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import {
  buildSectorValueChainSummary,
  type SectorValueChainSummaryStep,
} from "../chapters/sector-value-chain-summary"
import {
  parseCriticalDependencies,
  type SectorCriticalDependency,
} from "../chapters/sector-analysis-model"

type LoadedWorkspace = Extract<
  BusinessIntelligenceSegmentWorkspace,
  { state: "ready" | "empty" }
>

export type TerrainValueChainEndpoint = SectorValueChainSummaryStep

export type TerrainCriticalDependency = SectorCriticalDependency

export type TerrainEssentialsModel = {
  valueChainEndpoints: TerrainValueChainEndpoint[]
  criticalDependencies: TerrainCriticalDependency[]
}

const CRITICALITY_RANK: Record<string, number> = {
  haute: 3,
  moyenne: 2,
  faible: 1,
}

export function selectTerrainValueChainEndpoints(
  steps: SectorValueChainSummaryStep[],
): SectorValueChainSummaryStep[] {
  if (steps.length === 0) return []
  if (steps.length === 1) return [steps[0]]
  return [steps[0], steps[steps.length - 1]]
}

export function selectTerrainCriticalDependencies(
  dependencies: SectorCriticalDependency[],
): SectorCriticalDependency[] {
  if (dependencies.length === 0) return []

  const indexed = dependencies.map((dep, index) => ({ dep, originalIndex: index }))

  indexed.sort((left, right) => {
    const rankLeft = left.dep.criticite ? (CRITICALITY_RANK[left.dep.criticite] ?? 0) : 0
    const rankRight = right.dep.criticite ? (CRITICALITY_RANK[right.dep.criticite] ?? 0) : 0
    const rankDiff = rankRight - rankLeft
    if (rankDiff !== 0) return rankDiff
    return left.originalIndex - right.originalIndex
  })

  return indexed.slice(0, 2).map(({ dep }) => dep)
}

export function buildTerrainEssentials(
  workspace: LoadedWorkspace,
): TerrainEssentialsModel | null {
  const summary = buildSectorValueChainSummary(workspace.valueChain)
  const steps = summary?.steps ?? []
  const valueChainEndpoints = selectTerrainValueChainEndpoints(steps)

  const rawDependencies = parseCriticalDependencies(workspace.knowledge.playbook)
  const criticalDependencies = selectTerrainCriticalDependencies(rawDependencies)

  if (valueChainEndpoints.length === 0 && criticalDependencies.length === 0) {
    return null
  }

  return {
    valueChainEndpoints,
    criticalDependencies,
  }
}
