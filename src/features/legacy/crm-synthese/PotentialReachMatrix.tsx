"use client"

import { useMemo } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  getPortfolioPeriodMetrics,
  type ProspectionPeriod,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"

export function PotentialReachMatrix({
  accounts,
  period,
  selectedAccountId,
  onSelectAccount,
  summarySentence,
}: {
  accounts: ProspectionPortfolioAccount[]
  period: ProspectionPeriod
  selectedAccountId: string | null
  onSelectAccount: (accountId: string) => void
  summarySentence: string
}) {
  const points = useMemo(() => accounts.map((account) => ({
    account,
    metrics: getPortfolioPeriodMetrics(account, period),
  })), [accounts, period])

  return (
    <SurfaceCard className="space-y-4 px-5 py-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-heading">Momentum et couverture commerciale</h2>
        <p className="mt-1 text-sm text-body">{summarySentence}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {points.map(({ account, metrics }) => {
          const selected = account.id === selectedAccountId
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelectAccount(account.id)}
              aria-pressed={selected}
              className={`rounded-[var(--radius-medium)] border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/[0.05]" : "border-border bg-canvas hover:bg-surface-hover"}`}
            >
              <p className="truncate font-semibold text-heading">{account.name}</p>
              <p className="mt-1 text-xs text-muted">{account.sector}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-muted">Reach</dt><dd className="font-semibold text-heading">{account.reachScore}</dd></div>
                <div><dt className="text-muted">Momentum</dt><dd className="font-semibold text-heading">{metrics.momentumScore}</dd></div>
                <div><dt className="text-muted">Inactivité</dt><dd className="font-semibold text-heading">{metrics.inactivityRiskScore}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-body">{account.openOpportunityCount} opportunité(s) ouverte(s) · {metrics.plannedCount} engagement(s) planifié(s)</p>
            </button>
          )
        })}
      </div>
    </SurfaceCard>
  )
}
