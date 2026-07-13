import { getOpportunityStageLabel, isTerminalOpportunityStage, OPPORTUNITY_ACTIVE_STAGES, toCanonicalOpportunityStage } from "@/lib/opportunities/stages"
import { asNumber, daysSince } from "./shared"

export type PipelineInsightSeverity = "positive" | "warning" | "info"
export type PipelineInsightType = "stagnation" | "concentration" | "funnel_gap" | "momentum" | "health"
export type PipelineDeltaTone = "positive" | "negative" | "stable"

export type PipelineOpportunityRow = {
  id: string
  title: string
  stage: string | null
  companyId: string | null
  companyName: string | null
  weightedGain: number | null
  updatedAt: string | null
}

export type PipelineInteractionRow = {
  id: string
  opportunityId: string | null
  companyId: string | null
  occurredAt: string | null
}

export type PipelinePnlRow = {
  periodMonth: string
  revenueTotal: number
}

export type PipelineInsight = {
  type: PipelineInsightType
  title: string
  detail: string
  severity: PipelineInsightSeverity
}

export type PipelineStageDistributionRow = {
  stage: string
  stageLabel: string
  count: number
  weightedTotal: number
}

export type PipelineInsightsRulesResult = {
  weightedPipe: number
  weightedPipeDelta: number | null
  weightedPipeDeltaTone: PipelineDeltaTone
  openOpportunitiesCount: number
  stageDistribution: PipelineStageDistributionRow[]
  insights: PipelineInsight[]
}

export type BuildPipelineInsightsInput = {
  now: string
  opportunities: PipelineOpportunityRow[]
  interactions: PipelineInteractionRow[]
  pnlMonths: PipelinePnlRow[]
}

function deltaTone(delta: number | null): PipelineDeltaTone {
  if (delta === null || Math.abs(delta) < 1) return "stable"
  return delta > 0 ? "positive" : "negative"
}

function revenueDelta(pnlMonths: PipelinePnlRow[]): number | null {
  const sorted = [...pnlMonths].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth)).slice(-2)
  if (sorted.length < 2) return null
  return Math.round(sorted[1].revenueTotal - sorted[0].revenueTotal)
}

export function buildPipelineInsights(input: BuildPipelineInsightsInput): PipelineInsightsRulesResult {
  const now = new Date(input.now)
  const openOpportunities = input.opportunities.filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))
  const weightedPipe = Math.round(openOpportunities.reduce((sum, opportunity) => sum + asNumber(opportunity.weightedGain), 0))
  const weightedPipeDelta = revenueDelta(input.pnlMonths)
  const insights: PipelineInsight[] = []

  const stageDistribution = OPPORTUNITY_ACTIVE_STAGES.map((stage) => {
    const rows = openOpportunities.filter((opportunity) => toCanonicalOpportunityStage(opportunity.stage) === stage.value)
    return {
      stage: stage.value,
      stageLabel: getOpportunityStageLabel(stage.value),
      count: rows.length,
      weightedTotal: Math.round(rows.reduce((sum, opportunity) => sum + asNumber(opportunity.weightedGain), 0)),
    }
  }).filter((row) => row.count > 0 || openOpportunities.length > 0)

  const stagnant = openOpportunities.filter((opportunity) => {
    const age = daysSince(opportunity.updatedAt, now)
    return age !== null && age > 30
  })
  if (stagnant.length > 0) {
    const top = [...stagnant].sort((a, b) => asNumber(b.weightedGain) - asNumber(a.weightedGain))[0]
    insights.push({
      type: "stagnation",
      title: `${stagnant.length} opportunité${stagnant.length > 1 ? "s" : ""} stagnante${stagnant.length > 1 ? "s" : ""}`,
      detail: `${top.title} n'a pas bougé depuis plus de 30 jours.`,
      severity: "warning",
    })
  }

  const byCompany = new Map<string, { companyName: string; weightedTotal: number }>()
  for (const opportunity of openOpportunities) {
    if (!opportunity.companyId) continue
    const current = byCompany.get(opportunity.companyId) ?? { companyName: opportunity.companyName ?? "Client", weightedTotal: 0 }
    current.weightedTotal += asNumber(opportunity.weightedGain)
    byCompany.set(opportunity.companyId, current)
  }
  const topThree = Array.from(byCompany.values())
    .sort((a, b) => b.weightedTotal - a.weightedTotal)
    .slice(0, 3)
  const topThreeTotal = topThree.reduce((sum, row) => sum + row.weightedTotal, 0)
  if (weightedPipe > 0 && topThreeTotal / weightedPipe > 0.6) {
    insights.push({
      type: "concentration",
      title: "Pipe concentré",
      detail: `Les 3 premiers clients portent ${Math.round((topThreeTotal / weightedPipe) * 100)}% du pipe pondéré.`,
      severity: "warning",
    })
  }

  const emptyStages = OPPORTUNITY_ACTIVE_STAGES.filter((stage) => !openOpportunities.some((opportunity) => opportunity.stage === stage.value))
  if (openOpportunities.length > 0 && emptyStages.length > 0) {
    insights.push({
      type: "funnel_gap",
      title: "Funnel déséquilibré",
      detail: `${emptyStages.slice(0, 2).map((stage) => stage.label).join(", ")} sans opportunité ouverte.`,
      severity: "info",
    })
  }

  const openOpportunityIds = new Set(openOpportunities.map((opportunity) => opportunity.id))
  const openCompanyIds = new Set(openOpportunities.map((opportunity) => opportunity.companyId).filter(Boolean))
  const recentInteractionCount = input.interactions.filter((interaction) => {
    if (interaction.opportunityId && !openOpportunityIds.has(interaction.opportunityId)) return false
    if (!interaction.opportunityId && interaction.companyId && !openCompanyIds.has(interaction.companyId)) return false
    const age = daysSince(interaction.occurredAt, now)
    return age !== null && age <= 15
  }).length
  if (openOpportunities.length > 0 && recentInteractionCount === 0) {
    insights.push({
      type: "momentum",
      title: "Momentum commercial faible",
      detail: "Aucune interaction récente détectée sur les 15 derniers jours.",
      severity: "warning",
    })
  } else if (recentInteractionCount > 0) {
    insights.push({
      type: "momentum",
      title: "Activité commerciale récente",
      detail: `${recentInteractionCount} interaction${recentInteractionCount > 1 ? "s" : ""} détectée${recentInteractionCount > 1 ? "s" : ""} sur 15 jours.`,
      severity: "positive",
    })
  }

  if (insights.every((insight) => insight.severity !== "warning")) {
    insights.push({
      type: "health",
      title: "Pipe sans alerte majeure",
      detail: "Aucune concentration ou stagnation critique détectée.",
      severity: "positive",
    })
  }

  return {
    weightedPipe,
    weightedPipeDelta,
    weightedPipeDeltaTone: deltaTone(weightedPipeDelta),
    openOpportunitiesCount: openOpportunities.length,
    stageDistribution,
    insights: insights.slice(0, 10),
  }
}
