"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { getLifecycleLabel, getPriorityLabel, type ProspectionSummaryViewModel } from "./synthese-view-model"
import type { PortfolioTrustBundle } from "@/lib/prospection/portfolio-account-metrics"

function LightningIcon() {
  return (
    <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function QuestionIcon() {
  return (
    <svg className="size-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

type TrustTooltip = {
  potentiel: string | null
  reach: string | null
  momentum: string | null
}

function buildTooltips(trust: PortfolioTrustBundle | null): TrustTooltip {
  return {
    potentiel: trust?.accountPotential.formula ?? null,
    reach: trust?.accountReach.formula ?? null,
    momentum: trust?.accountMomentum30d.formula ?? null,
  }
}

function MetricWithTooltip({
  label,
  value,
  tooltip,
}: {
  label: string
  value: string
  tooltip: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative text-right">
      <p className="flex items-center justify-end gap-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
        {tooltip ? (
          // span role="button" to avoid <button> inside <button> (invalid HTML / hydration error)
          <span
            role="button"
            tabIndex={0}
            className="ml-0.5 inline-flex size-3 cursor-help items-center justify-center rounded-sm border border-border text-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            aria-label={`Formule ${label}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation()
                setOpen((prev) => !prev)
              }
            }}
          >
            <QuestionIcon />
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 font-semibold text-heading">{value}</p>
      {open && tooltip ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2 text-left text-xs leading-5 text-body"
          role="tooltip"
        >
          {tooltip}
        </div>
      ) : null}
    </div>
  )
}

export function WeeklyCommercialFocus({
  focusAccounts,
  selectedAccountId,
  onSelectAccount,
  trust,
  showHeader = true,
}: {
  focusAccounts: ProspectionSummaryViewModel["weeklyFocus"]
  selectedAccountId: string | null
  onSelectAccount: (accountId: string) => void
  trust?: PortfolioTrustBundle | null
  showHeader?: boolean
}) {
  const tooltips = buildTooltips(trust ?? null)

  const card = (
    <SurfaceCard>
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
                className={`w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] ${isSelected ? "bg-primary/[0.03]" : "hover:bg-surface-hover"}`}
                aria-pressed={isSelected}
              >
                <div className="flex items-start gap-4 px-4 py-3">
                  {/* Number + priority score */}
                  <div className="shrink-0 w-10 space-y-0.5 pt-0.5">
                    <p className="font-heading text-2xl font-bold text-heading leading-none">{index + 1}</p>
                    <p className="text-xs font-semibold text-brand-brass">{item.priorityScore}/100</p>
                  </div>

                  {/* Middle: name + badges + action */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-heading text-base font-bold text-heading">{item.account.name}</h3>
                      <Badge variant="neutral">{getLifecycleLabel(item.account.lifecycle)}</Badge>
                      <Badge variant={item.account.priority === "haute" ? "warning" : "neutral"}>
                        {getPriorityLabel(item.account.priority)}
                      </Badge>
                      <Badge variant="neutral">{item.account.sector}</Badge>
                    </div>

                    {/* Action recommandée — blue frame, brass title, white text */}
                    <div className="flex items-start gap-2 rounded-[var(--radius-medium)] bg-primary px-3 py-2">
                      <span className="mt-px text-brand-brass">
                        <LightningIcon />
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-brass">
                          Action recommandée
                        </p>
                        <p className="text-sm font-semibold text-primary-fg">
                          {item.recommendation.actionLabel}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <p className="text-sm leading-5 text-body">{item.recommendation.dominantReason}</p>
                    ) : null}
                  </div>

                  {/* Right: 4 indicators in 2×2 grid, top-right of the row */}
                  <div className="shrink-0 grid grid-cols-2 gap-x-4 gap-y-2">
                    <MetricWithTooltip
                      label="Potentiel"
                      value={`${item.account.potentialScore}/100`}
                      tooltip={tooltips.potentiel}
                    />
                    <MetricWithTooltip
                      label="Reach"
                      value={`${item.account.reachScore}/100`}
                      tooltip={tooltips.reach}
                    />
                    <MetricWithTooltip
                      label="Momentum"
                      value={`${item.momentumScore}/100`}
                      tooltip={tooltips.momentum}
                    />
                    <MetricWithTooltip
                      label="Engagement"
                      value={item.plannedCount > 0 ? `${item.plannedCount} planifié${item.plannedCount > 1 ? "s" : ""}` : "Aucun"}
                      tooltip={null}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </SurfaceCard>
  )

  if (!showHeader) {
    return card
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold text-heading">Focus commercial de la semaine</h2>
        <p className="text-sm leading-6 text-body">
          Shortlist resserrée des comptes qui demandent un arbitrage commercial immédiat.
        </p>
      </div>
      {card}
    </section>
  )
}
