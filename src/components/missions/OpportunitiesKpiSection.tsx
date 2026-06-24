import { KpiCard } from "@/components/ui/KpiCard"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { getStageLabel } from "@/components/missions/opportunity-detail/opportunity-detail-options"
import type { MissionsListRow } from "@/components/missions/MissionsListView"
import { getOpportunityStageColor, OPPORTUNITY_ACTIVE_STAGES } from "@/lib/opportunities/stages"

const OPEN_STATUSES = new Set(["active", "pending"])

type MetricOpportunity = Pick<
  MissionsListRow,
  "status" | "stage" | "conviction" | "priority" | "acv" | "estimatedGain" | "targetCloseDate" | "nextActionAt"
>

function getOpenOpportunities(opportunities: MetricOpportunity[]) {
  return opportunities.filter((opportunity) => OPEN_STATUSES.has(opportunity.status))
}

function getOpportunityValue(opportunity: MetricOpportunity) {
  return opportunity.acv ?? opportunity.estimatedGain ?? 0
}

function getWeightedValue(opportunity: MetricOpportunity) {
  return getOpportunityValue(opportunity) * ((opportunity.conviction ?? 0) / 100)
}

function formatCompactEuro(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M€`
  if (abs >= 1_000) return `${Math.round(value / 1_000)} k€`
  return `${Math.round(value)} €`
}

function parseDate(input?: string | null) {
  if (!input) return null
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getDaysUntil(input?: string | null, now = new Date()) {
  const date = parseDate(input)
  if (!date) return null
  const diff = startOfDay(date).getTime() - startOfDay(now).getTime()
  return Math.round(diff / 86_400_000)
}

function getShare(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

export function OpportunitiesKpiSection({ opportunities }: { opportunities: MissionsListRow[] }) {
  const now = new Date()
  const openOpportunities = getOpenOpportunities(opportunities)
  const weightedPipe = openOpportunities.reduce((sum, opportunity) => sum + getWeightedValue(opportunity), 0)
  const avgConviction = openOpportunities.length
    ? Math.round(
        openOpportunities.reduce((sum, opportunity) => sum + (opportunity.conviction ?? 0), 0) / openOpportunities.length,
      )
    : 0

  const highPriorityCount = openOpportunities.filter((opportunity) => opportunity.priority === "haute").length
  const dueSoonCount = openOpportunities.filter((opportunity) => {
    const daysUntil = getDaysUntil(opportunity.nextActionAt, now)
    return daysUntil !== null && daysUntil <= 7
  }).length
  const overdueCount = openOpportunities.filter((opportunity) => {
    const daysUntil = getDaysUntil(opportunity.nextActionAt, now)
    return daysUntil !== null && daysUntil < 0
  }).length
  const noCloseDateCount = openOpportunities.filter((opportunity) => !parseDate(opportunity.targetCloseDate)).length

  const stageRows = OPPORTUNITY_ACTIVE_STAGES.map((stageDefinition) => {
    const stage = stageDefinition.value
    const stageOpportunities = openOpportunities.filter((opportunity) => opportunity.stage === stage)
    const weightedValue = stageOpportunities.reduce((sum, opportunity) => sum + getWeightedValue(opportunity), 0)
    return {
      stage,
      label: getStageLabel(stage),
      count: stageOpportunities.length,
      weightedValue,
      share: getShare(weightedValue, weightedPipe),
      color: getOpportunityStageColor(stage),
    }
  }).filter((row) => row.count > 0)

  const stageShareRemainder = Math.max(0, 100 - stageRows.reduce((sum, row) => sum + row.share, 0))

  const convictionBands = [
    {
      label: "Haute conviction",
      hint: "70%+",
      color: "var(--color-success)",
      count: openOpportunities.filter((opportunity) => (opportunity.conviction ?? 0) >= 70).length,
    },
    {
      label: "À consolider",
      hint: "40-69%",
      color: "var(--color-warning)",
      count: openOpportunities.filter((opportunity) => {
        const conviction = opportunity.conviction ?? 0
        return conviction >= 40 && conviction < 70
      }).length,
    },
    {
      label: "Fragiles",
      hint: "<40%",
      color: "var(--color-danger)",
      count: openOpportunities.filter((opportunity) => (opportunity.conviction ?? 0) < 40).length,
    },
  ].map((band) => ({
    ...band,
    share: getShare(band.count, openOpportunities.length),
  }))

  const closeBuckets = [
    {
      label: "0-30 j",
      hint: "closing proche",
      color: "var(--color-dataviz-1)",
      opportunities: openOpportunities.filter((opportunity) => {
        const daysUntil = getDaysUntil(opportunity.targetCloseDate, now)
        return daysUntil !== null && daysUntil >= 0 && daysUntil <= 30
      }),
    },
    {
      label: "31-60 j",
      hint: "milieu de pipe",
      color: "var(--color-dataviz-3)",
      opportunities: openOpportunities.filter((opportunity) => {
        const daysUntil = getDaysUntil(opportunity.targetCloseDate, now)
        return daysUntil !== null && daysUntil >= 31 && daysUntil <= 60
      }),
    },
    {
      label: "60 j+",
      hint: "pipe long",
      color: "var(--color-dataviz-6)",
      opportunities: openOpportunities.filter((opportunity) => {
        const daysUntil = getDaysUntil(opportunity.targetCloseDate, now)
        return daysUntil !== null && daysUntil > 60
      }),
    },
    {
      label: "Sans date",
      hint: "à cadrer",
      color: "var(--color-border-strong)",
      opportunities: openOpportunities.filter((opportunity) => !parseDate(opportunity.targetCloseDate)),
    },
  ].map((bucket) => {
    const weightedValue = bucket.opportunities.reduce((sum, opportunity) => sum + getWeightedValue(opportunity), 0)
    return {
      ...bucket,
      count: bucket.opportunities.length,
      weightedValue,
      share: getShare(weightedValue, weightedPipe),
    }
  })

  const maxCloseBucketValue = Math.max(1, ...closeBuckets.map((bucket) => bucket.weightedValue))

  return (
    <SurfaceCard className="overflow-hidden border border-border/80 bg-surface">
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.5fr)_20rem] lg:p-6">
        <div className="space-y-5">
          <div className="flex flex-col gap-2 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              <span className="inline-flex size-2 rounded-full bg-primary" aria-hidden="true" />
              Pilotage du pipe
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-heading">Vue KPI opportunités</h2>
                <p className="mt-1 max-w-2xl text-sm text-body">
                  Le pilotage repose ici sur trois questions: combien de pipe est réellement activable, où il se concentre dans le tunnel, et ce qui doit sortir vite.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>{openOpportunities.length} opportunité{openOpportunities.length > 1 ? "s" : ""} ouverte{openOpportunities.length > 1 ? "s" : ""}</span>
                <span>{avgConviction}% de conviction moyenne</span>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-heading">Maturité du pipe</h3>
                <p className="text-xs text-muted">Répartition du pipe pondéré par étape commerciale.</p>
              </div>

              <div className="overflow-hidden rounded-[var(--radius-large)] bg-canvas/55 p-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-border/70">
                  {stageRows.map((row) => (
                    <div
                      key={row.stage}
                      className="h-full transition-[width] duration-300"
                      style={{ width: `${row.share}%`, backgroundColor: row.color }}
                    />
                  ))}
                  {stageShareRemainder > 0 ? (
                    <div
                      className="h-full bg-border/80"
                      style={{ width: `${stageShareRemainder}%` }}
                    />
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  {stageRows.map((row) => (
                    <div key={row.stage} className="grid grid-cols-[minmax(0,1fr)_4.5rem_5.25rem] items-center gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: row.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate text-sm font-medium text-heading">{row.label}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border/60">
                          <div
                            className="h-full rounded-full transition-[width] duration-300"
                            style={{ width: `${Math.max(row.share, 6)}%`, backgroundColor: row.color }}
                          />
                        </div>
                      </div>
                      <div className="text-right text-xs text-body">
                        <span className="font-semibold tabular-nums text-heading">{row.count}</span> opp
                      </div>
                      <div className="text-right text-xs font-semibold tabular-nums text-heading">
                        {formatCompactEuro(row.weightedValue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-heading">Cadence & qualité</h3>
                <p className="text-xs text-muted">Conviction utile et horizon de sortie du pipe.</p>
              </div>

              <div className="space-y-4 rounded-[var(--radius-large)] bg-canvas/55 p-3">
                <div className="space-y-2">
                  {convictionBands.map((band) => (
                    <div key={band.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-body">{band.label}</span>
                        <span className="tabular-nums text-muted">
                          {band.count} opp · {band.share}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-border/60">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${Math.max(band.share, band.count > 0 ? 8 : 0)}%`, backgroundColor: band.color }}
                        />
                      </div>
                      <div className="text-[11px] text-muted">{band.hint}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2">
                  {closeBuckets.map((bucket) => (
                    <div key={bucket.label} className="flex flex-col justify-end gap-2">
                      <div className="flex h-24 items-end">
                        <div
                          className="w-full rounded-t-[14px] transition-[height] duration-300"
                          style={{
                            height: `${bucket.weightedValue > 0 ? Math.max((bucket.weightedValue / maxCloseBucketValue) * 100, 14) : 8}%`,
                            backgroundColor: bucket.color,
                            opacity: bucket.label === "Sans date" ? 0.72 : 0.95,
                          }}
                        />
                      </div>
                      <div className="space-y-0.5 text-center">
                        <div className="text-[11px] font-semibold text-heading">{bucket.label}</div>
                        <div className="text-[11px] text-muted">{bucket.count} opp</div>
                        <div className="text-[11px] font-medium tabular-nums text-body">{formatCompactEuro(bucket.weightedValue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>

        <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <KpiCard
            label="Pipe pondéré"
            value={weightedPipe > 0 ? formatCompactEuro(weightedPipe) : "—"}
            context="Valeur attendue ajustée par la conviction."
            target={highPriorityCount > 0 ? `${highPriorityCount} dossier${highPriorityCount > 1 ? "s" : ""} haute priorité` : "Aucune haute priorité"}
            size="hero"
            className="h-full"
          />

          <KpiCard
            label="Actions à déclencher"
            value={String(dueSoonCount)}
            context={
              overdueCount > 0
                ? `${overdueCount} en retard, ${noCloseDateCount} sans date de closing`
                : `${noCloseDateCount} sans date de closing`
            }
            delta={overdueCount > 0 ? `${overdueCount} en retard` : "sous contrôle"}
            deltaTone={overdueCount > 0 ? "negative" : "positive"}
            progress={openOpportunities.length ? Math.round((dueSoonCount / openOpportunities.length) * 100) : 0}
            size="default"
            className="h-full"
          />
        </aside>
      </div>
    </SurfaceCard>
  )
}
