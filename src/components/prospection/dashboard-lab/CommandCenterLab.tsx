"use client"

import { getPortfolioPeriodMetrics } from "@/lib/prospection/portfolio-account-metrics"
import type { DashboardLabInspection, DashboardLabViewModel } from "./dashboard-lab-types"
import { AccountIdentityLine, BlockFrame, LabEmptyState, MetricStrip } from "./DashboardLabShared"

export function CommandCenterLab({
  viewModel,
  onSelectAccount,
  onInspect,
}: {
  viewModel: DashboardLabViewModel
  onSelectAccount: (accountId: string) => void
  onInspect: (inspection: DashboardLabInspection) => void
}) {
  if (viewModel.accounts.length === 0) {
    return <LabEmptyState title="Aucun compte" body="Aucun arbitrage à présenter pour ces filtres." />
  }

  const shortlist = viewModel.accounts.toSorted((left, right) => {
    const leftMetrics = getPortfolioPeriodMetrics(left, viewModel.filters.period)
    const rightMetrics = getPortfolioPeriodMetrics(right, viewModel.filters.period)
    const leftOpportunityWithoutPlan = left.openOpportunityCount > 0 && leftMetrics.plannedCount === 0
    const rightOpportunityWithoutPlan = right.openOpportunityCount > 0 && rightMetrics.plannedCount === 0
    if (leftOpportunityWithoutPlan !== rightOpportunityWithoutPlan) return rightOpportunityWithoutPlan ? 1 : -1
    if (leftMetrics.inactivityRiskScore !== rightMetrics.inactivityRiskScore) return rightMetrics.inactivityRiskScore - leftMetrics.inactivityRiskScore
    return left.name.localeCompare(right.name, "fr") || left.id.localeCompare(right.id)
  }).slice(0, 7)

  return (
    <BlockFrame
      title="Comptes à arbitrer"
      subtitle="Ordre explicite : opportunité sans action, relation inactive, puis nom."
      meta={viewModel.trust.accountInactivityRisk}
      onInspect={() => onInspect({
        title: "Comptes à arbitrer",
        summary: "La shortlist ne combine aucun indicateur en note globale.",
        meta: viewModel.trust.accountInactivityRisk,
      })}
    >
      <div className="divide-y divide-border">
        {shortlist.map((account, index) => {
          const metrics = getPortfolioPeriodMetrics(account, viewModel.filters.period)
          return (
            <button key={account.id} type="button" onClick={() => onSelectAccount(account.id)} className="grid w-full gap-4 px-5 py-4 text-left hover:bg-surface-hover md:grid-cols-[2rem_minmax(0,1fr)_20rem]">
              <span className="font-heading text-xl font-bold text-heading">{index + 1}</span>
              <div><AccountIdentityLine account={account} selected={account.id === viewModel.selectedAccountId} /><p className="mt-2 text-sm text-body">{account.nextDecision}</p></div>
              <div className="grid grid-cols-4 gap-2">
                <MetricStrip label="Opp." value={`${account.openOpportunityCount}`} />
                <MetricStrip label="Planifié" value={`${metrics.plannedCount}`} />
                <MetricStrip label="Reach" value={`${account.reachScore}`} />
                <MetricStrip label="Inactivité" value={`${metrics.inactivityRiskScore}`} />
              </div>
            </button>
          )
        })}
      </div>
    </BlockFrame>
  )
}
