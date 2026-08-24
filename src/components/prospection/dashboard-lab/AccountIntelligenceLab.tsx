"use client"

import Link from "next/link"
import { formatDateTime } from "@/lib/formatters"
import { getPortfolioPeriodMetrics } from "@/lib/prospection/portfolio-account-metrics"
import type { DashboardLabInspection, DashboardLabViewModel } from "./dashboard-lab-types"
import { AccountIdentityLine, BlockFrame, LabEmptyState, MetricStrip } from "./DashboardLabShared"

export function AccountIntelligenceLab({
  viewModel,
  onSelectAccount,
  onInspect,
}: {
  viewModel: DashboardLabViewModel
  onSelectAccount: (accountId: string) => void
  onInspect: (inspection: DashboardLabInspection) => void
}) {
  if (viewModel.accounts.length === 0) {
    return <LabEmptyState title="Aucun compte" body="Aucun compte ne correspond aux filtres actifs." />
  }

  const orderedAccounts = viewModel.accounts.toSorted((left, right) => {
    const leftMetrics = getPortfolioPeriodMetrics(left, viewModel.filters.period)
    const rightMetrics = getPortfolioPeriodMetrics(right, viewModel.filters.period)
    const leftOpportunityWithoutPlan = left.openOpportunityCount > 0 && leftMetrics.plannedCount === 0
    const rightOpportunityWithoutPlan = right.openOpportunityCount > 0 && rightMetrics.plannedCount === 0
    if (leftOpportunityWithoutPlan !== rightOpportunityWithoutPlan) return rightOpportunityWithoutPlan ? 1 : -1
    if (leftMetrics.inactivityRiskScore !== rightMetrics.inactivityRiskScore) return rightMetrics.inactivityRiskScore - leftMetrics.inactivityRiskScore
    return left.name.localeCompare(right.name, "fr") || left.id.localeCompare(right.id)
  })
  const selectedAccount = viewModel.selectedAccount ?? orderedAccounts[0]
  const selectedMetrics = getPortfolioPeriodMetrics(selectedAccount, viewModel.filters.period)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
      <BlockFrame
        title="Lecture compte factuelle"
        subtitle="Opportunités sans action, inactivité, reach et momentum restent affichés séparément."
        meta={viewModel.trust.accountInactivityRisk}
        onInspect={() => onInspect({
          title: "Lecture compte factuelle",
          summary: "Aucune note synthétique n'entre dans l'ordre des comptes.",
          meta: viewModel.trust.accountInactivityRisk,
        })}
      >
        <div className="divide-y divide-border">
          {orderedAccounts.slice(0, 12).map((account) => {
            const metrics = getPortfolioPeriodMetrics(account, viewModel.filters.period)
            return (
              <button key={account.id} type="button" onClick={() => onSelectAccount(account.id)} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-surface-hover md:grid-cols-[minmax(0,1fr)_18rem]">
                <AccountIdentityLine account={account} selected={account.id === selectedAccount.id} />
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <MetricStrip label="Reach" value={`${account.reachScore}`} />
                  <MetricStrip label="Momentum" value={`${metrics.momentumScore}`} />
                  <MetricStrip label="Inactivité" value={`${metrics.inactivityRiskScore}`} />
                  <MetricStrip label="Opp." value={`${account.openOpportunityCount}`} />
                </div>
              </button>
            )
          })}
        </div>
      </BlockFrame>

      <BlockFrame title="Compte sélectionné" subtitle="Contexte utile au prochain mouvement." meta={viewModel.trust.accountReach} onInspect={() => onInspect({ title: "Compte sélectionné", summary: "Reach, activité et opportunités du compte actif.", meta: viewModel.trust.accountReach })}>
        <div className="space-y-4 px-5 py-4">
          <AccountIdentityLine account={selectedAccount} selected />
          <div className="grid grid-cols-2 gap-3">
            <MetricStrip label="Reach" value={`${selectedAccount.reachScore}/100`} />
            <MetricStrip label="Momentum" value={`${selectedMetrics.momentumScore}/100`} />
            <MetricStrip label="Inactivité" value={`${selectedMetrics.inactivityRiskScore}/100`} />
            <MetricStrip label="Actions planifiées" value={`${selectedMetrics.plannedCount}`} />
          </div>
          <p className="text-sm leading-6 text-body">{selectedAccount.nextDecision}</p>
          <p className="text-xs text-muted">Dernière activité : {formatDateTime(selectedAccount.latestCommercialActivityAt)}</p>
          <Link href={`/prospection/accounts/${selectedAccount.id}`} className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body hover:bg-surface-hover">Ouvrir le compte</Link>
        </div>
      </BlockFrame>
    </div>
  )
}
