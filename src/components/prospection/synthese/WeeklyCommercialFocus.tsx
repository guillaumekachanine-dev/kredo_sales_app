"use client"

import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { getLifecycleLabel, getPriorityLabel, type ProspectionSummaryViewModel } from "./synthese-view-model"

export function WeeklyCommercialFocus({
  focusAccounts,
  selectedAccountId,
  onSelectAccount,
}: {
  focusAccounts: ProspectionSummaryViewModel["weeklyFocus"]
  selectedAccountId: string | null
  onSelectAccount: (accountId: string) => void
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold text-heading">Focus commercial de la semaine</h2>
        <p className="text-sm leading-6 text-body">
          Shortlist resserrée des comptes qui demandent un arbitrage commercial immédiat.
        </p>
      </div>

      <SurfaceCard className="overflow-hidden">
        {focusAccounts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            Aucun compte ne ressort sur ce jeu de filtres.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {focusAccounts.map((item, index) => {
              const isSelected = item.account.id === selectedAccountId

              return (
                <button
                  key={item.account.id}
                  type="button"
                  onClick={() => onSelectAccount(item.account.id)}
                  className="w-full text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]"
                  aria-pressed={isSelected}
                >
                  <div className="grid gap-4 px-5 py-4 xl:grid-cols-[3rem_minmax(0,1.35fr)_minmax(18rem,0.95fr)]">
                    <div className="space-y-1">
                      <p className="font-heading text-2xl font-bold text-heading">{index + 1}</p>
                      <p className="text-xs font-semibold text-brand-brass">{item.priorityScore}/100</p>
                    </div>

                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-heading">{item.account.name}</h3>
                        <Badge variant="neutral">{getLifecycleLabel(item.account.lifecycle)}</Badge>
                        <Badge variant={item.account.priority === "haute" ? "warning" : "neutral"}>
                          {getPriorityLabel(item.account.priority)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted">{item.account.sector}</p>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Raison dominante</p>
                        <p className="text-sm leading-6 text-heading">{item.recommendation.dominantReason}</p>
                      </div>
                      <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Action recommandée</p>
                        <p className="mt-1 text-sm font-semibold text-heading">{item.recommendation.actionLabel}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="grid grid-cols-2 gap-3 text-sm text-body">
                        <MetricItem label="Potentiel" value={`${item.account.potentialScore}/100`} />
                        <MetricItem label="Reach" value={`${item.account.reachScore}/100`} />
                        <MetricItem label="Momentum" value={`${item.momentumScore}/100`} />
                        <MetricItem
                          label="Engagement"
                          value={item.plannedCount > 0 ? `${item.plannedCount} planifié${item.plannedCount > 1 ? "s" : ""}` : "Aucun"}
                        />
                      </div>
                      {isSelected ? (
                        <div className="grid gap-2 rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-3 text-sm text-body">
                          <div>
                            <p className="font-semibold text-heading">Pourquoi maintenant</p>
                            <p className="mt-1 leading-6">{item.recommendation.whyNow}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-heading">Coût d&apos;inaction</p>
                            <p className="mt-1 leading-6">{item.recommendation.costOfInaction}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </SurfaceCard>
    </section>
  )
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-heading">{value}</p>
    </div>
  )
}
