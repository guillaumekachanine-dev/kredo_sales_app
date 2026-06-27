"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  getPortfolioPeriodMetrics,
  type ProspectionPeriod,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"

type MatrixScope = "priority" | "all"

type MatrixPoint = {
  account: ProspectionPortfolioAccount
  x: number
  y: number
  offsetX: number
  offsetY: number
  size: number
  priorityScore: number
  momentumScore: number
}

function clampToCanvas(value: number) {
  return Math.min(94, Math.max(6, value))
}

function pointSize(contactCount: number) {
  return Math.min(24, 10 + contactCount)
}

function roundOffset(value: number) {
  return Math.round(value * 1000) / 1000
}

function buildMatrixPoints(accounts: ProspectionPortfolioAccount[], period: ProspectionPeriod) {
  const buckets = new Map<string, MatrixPoint[]>()

  for (const account of accounts) {
    const periodMetrics = getPortfolioPeriodMetrics(account, period)
    const x = clampToCanvas(account.reachScore)
    const y = clampToCanvas(100 - account.potentialScore)
    const key = `${Math.round(x / 6)}-${Math.round(y / 6)}`
    const point = {
      account,
      x,
      y,
      offsetX: 0,
      offsetY: 0,
      size: pointSize(account.contactCount),
      priorityScore: periodMetrics.actionPriorityScore,
      momentumScore: periodMetrics.momentumScore,
    }

    const current = buckets.get(key) ?? []
    current.push(point)
    buckets.set(key, current)
  }

  return Array.from(buckets.values()).flatMap((bucket) => {
    const sortedBucket = bucket.toSorted((left, right) => left.account.id.localeCompare(right.account.id))

    return sortedBucket.map((point, index) => {
      if (sortedBucket.length === 1) {
        return point
      }

      const angle = (2 * Math.PI * index) / sortedBucket.length
      const ring = Math.floor(index / 6)
      const radius = 8 + ring * 5

      return {
        ...point,
        offsetX: roundOffset(Math.cos(angle) * radius),
        offsetY: roundOffset(Math.sin(angle) * radius),
      }
    })
  })
}

function quadrantCounts(accounts: ProspectionPortfolioAccount[]) {
  return {
    topLeft: accounts.filter((account) => account.potentialScore >= 50 && account.reachScore < 50).length,
    topRight: accounts.filter((account) => account.potentialScore >= 50 && account.reachScore >= 50).length,
    bottomLeft: accounts.filter((account) => account.potentialScore < 50 && account.reachScore < 50).length,
    bottomRight: accounts.filter((account) => account.potentialScore < 50 && account.reachScore >= 50).length,
  }
}

function findNextPoint(current: MatrixPoint, points: MatrixPoint[], direction: "up" | "down" | "left" | "right") {
  let best: MatrixPoint | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of points) {
    if (candidate.account.id === current.account.id) continue

    const dx = candidate.x + candidate.offsetX - (current.x + current.offsetX)
    const dy = candidate.y + candidate.offsetY - (current.y + current.offsetY)

    if (direction === "up" && dy >= 0) continue
    if (direction === "down" && dy <= 0) continue
    if (direction === "left" && dx >= 0) continue
    if (direction === "right" && dx <= 0) continue

    const axisDistance = direction === "up" || direction === "down" ? Math.abs(dy) : Math.abs(dx)
    const crossDistance = direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy)
    const score = axisDistance * 4 + crossDistance

    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best
}

function priorityClasses(priorityScore: number) {
  if (priorityScore >= 80) {
    return "border-brand-brass bg-brand-brass"
  }
  if (priorityScore >= 65) {
    return "border-primary bg-primary"
  }
  return "border-border bg-muted"
}

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
  const [scope, setScope] = useState<MatrixScope>("priority")
  const [activePointId, setActivePointId] = useState<string | null>(null)
  const pointRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const ranked = [...accounts]
    .sort((left, right) => getPortfolioPeriodMetrics(right, period).actionPriorityScore - getPortfolioPeriodMetrics(left, period).actionPriorityScore)
    .slice(0, 28)
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null
  const matrixAccounts = scope === "all"
    ? accounts
    : selectedAccount && !ranked.some((account) => account.id === selectedAccount.id)
      ? [...ranked, selectedAccount]
      : ranked

  const points = buildMatrixPoints(matrixAccounts, period)
  const counts = quadrantCounts(matrixAccounts)
  const activePoint = points.find((point) => point.account.id === (activePointId ?? selectedAccountId)) ?? null
  const activeTooltipId = activePoint ? `matrix-tooltip-${activePoint.account.id}` : undefined

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-bold text-heading">Potentiel et couverture commerciale</h2>
          <p className="text-sm leading-6 text-body">{summarySentence}</p>
        </div>
        <div className="flex items-center gap-1 rounded-[var(--radius-medium)] border border-border p-0.5">
          <Button variant={scope === "priority" ? "primary" : "ghost"} size="sm" onClick={() => setScope("priority")}>
            Prioritaires
          </Button>
          <Button variant={scope === "all" ? "primary" : "ghost"} size="sm" onClick={() => setScope("all")}>
            Tous
          </Button>
        </div>
      </div>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <p id="matrix-description" className="text-sm leading-6 text-body">
            Axe horizontal&nbsp;: reach commercial proxy. Axe vertical&nbsp;: potentiel compte. Taille du point&nbsp;: densité de contacts.
            Halo&nbsp;: momentum. Couleur&nbsp;: priorité commerciale.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-4">
          <div
            className="relative overflow-hidden rounded-[var(--radius-large)] border border-border bg-canvas p-4"
            role="group"
            aria-label="Matrice potentiel et couverture commerciale"
            aria-describedby="matrix-description"
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="50" x2="50" y1="0" y2="100" stroke="var(--color-border)" strokeDasharray="2 2" />
              <line x1="0" x2="100" y1="50" y2="50" stroke="var(--color-border)" strokeDasharray="2 2" />
            </svg>

            <QuadrantBadge className="left-4 top-4" label="Fort potentiel / reach fragile" count={counts.topLeft} />
            <QuadrantBadge className="right-4 top-4" label="Fort potentiel / couverture solide" count={counts.topRight} />
            <QuadrantBadge className="left-4 bottom-10" label="Potentiel limité / reach fragile" count={counts.bottomLeft} />
            <QuadrantBadge className="right-4 bottom-10" label="Potentiel limité / couverture solide" count={counts.bottomRight} />

            <div className="relative h-[34rem]">
              {points.map((point) => {
                const isSelected = point.account.id === selectedAccountId
                const isActive = point.account.id === activePoint?.account.id

                return (
                  <button
                    key={point.account.id}
                    ref={(element) => {
                      pointRefs.current[point.account.id] = element
                    }}
                    type="button"
                    onClick={() => onSelectAccount(point.account.id)}
                    onFocus={() => setActivePointId(point.account.id)}
                    onBlur={() => setActivePointId(null)}
                    onPointerEnter={() => setActivePointId(point.account.id)}
                    onPointerLeave={() => setActivePointId(null)}
                    onKeyDown={(event) => {
                      let direction: "up" | "down" | "left" | "right" | null = null

                      if (event.key === "ArrowUp") direction = "up"
                      if (event.key === "ArrowDown") direction = "down"
                      if (event.key === "ArrowLeft") direction = "left"
                      if (event.key === "ArrowRight") direction = "right"
                      if (!direction) return

                      event.preventDefault()
                      const nextPoint = findNextPoint(point, points, direction)
                      if (!nextPoint) return
                      onSelectAccount(nextPoint.account.id)
                      pointRefs.current[nextPoint.account.id]?.focus()
                    }}
                    className="group absolute rounded-full focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]"
                    style={{
                      left: `calc(${point.x}% + ${point.offsetX}px)`,
                      top: `calc(${point.y}% + ${point.offsetY}px)`,
                      width: `${point.size}px`,
                      height: `${point.size}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    aria-label={`${point.account.name}, potentiel ${point.account.potentialScore}/100, reach ${point.account.reachScore}/100, priorité ${point.priorityScore}/100`}
                    aria-describedby={isActive ? activeTooltipId : undefined}
                    aria-pressed={isSelected}
                  >
                    {(isSelected || isActive) ? (
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-heading">
                        {point.account.name}
                      </span>
                    ) : null}
                    <span
                      className="absolute inset-[-8px] rounded-full border border-info/45"
                      style={{ opacity: 0.15 + (point.momentumScore / 100) * 0.7 }}
                      aria-hidden="true"
                    />
                    <span
                      className={`absolute inset-0 rounded-full border ${priorityClasses(point.priorityScore)} ${isSelected ? "scale-[1.12]" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                )
              })}

              {activePoint ? (
                <div
                  id={activeTooltipId}
                  className="absolute right-4 top-4 max-w-xs rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-3 text-sm text-body"
                >
                  <p className="font-semibold text-heading">{activePoint.account.name}</p>
                  <p className="mt-1 text-xs text-muted">{activePoint.account.sector}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <TooltipMetric label="Potentiel" value={`${activePoint.account.potentialScore}/100`} />
                    <TooltipMetric label="Reach" value={`${activePoint.account.reachScore}/100`} />
                    <TooltipMetric label="Momentum" value={`${activePoint.momentumScore}/100`} />
                    <TooltipMetric label="Priorité" value={`${activePoint.priorityScore}/100`} />
                  </div>
                </div>
              ) : null}

              <div className="absolute inset-x-6 bottom-2 flex justify-between text-[11px] text-muted">
                <span>Reach faible</span>
                <span>Reach fort</span>
              </div>
              <div className="absolute inset-y-6 left-1 flex flex-col justify-between text-[11px] text-muted">
                <span>Potentiel élevé</span>
                <span>Potentiel faible</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <LegendCard label="Couleur" value="Priorité commerciale" context="Brass = plus prioritaire, cobalt = priorité intermédiaire." />
            <LegendCard label="Halo" value="Momentum" context="Plus le halo est visible, plus le compte montre une activité récente dense." />
            <LegendCard label="Taille" value="Densité de contacts" context="Les points les plus grands représentent les comptes avec le plus de contacts identifiés." />
          </div>
        </div>
      </SurfaceCard>
    </section>
  )
}

function QuadrantBadge({
  className,
  label,
  count,
}: {
  className: string
  label: string
  count: number
}) {
  return (
    <div className={`absolute rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-body ${className}`}>
      {count} · {label}
    </div>
  )
}

function TooltipMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-heading">{value}</p>
    </div>
  )
}

function LegendCard({
  label,
  value,
  context,
}: {
  label: string
  value: string
  context: string
}) {
  return (
    <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-heading">{value}</p>
      <p className="mt-2 text-sm leading-6 text-body">{context}</p>
    </div>
  )
}
