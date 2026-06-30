"use client"

import { useId, useRef, useState, type CSSProperties } from "react"
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

// Color encoding — multi-stop spectral gradient mapped to reachScore (0→100).
// Stops: navy → cyan → emerald → amber → magenta (cold to warm).
// Inline HSL values are intentional — these are data-driven computed colors,
// not design tokens, following the same pattern as the opacity-based halo.
type ColorStop = { at: number; h: number; s: number; l: number }

// Rainbow spectrum — visible light from red (low reach) to violet/magenta (high reach).
const REACH_STOPS: ColorStop[] = [
  { at: 0,   h: 0,   s: 100, l: 50 }, // red
  { at: 17,  h: 25,  s: 100, l: 54 }, // orange
  { at: 33,  h: 58,  s: 100, l: 50 }, // yellow
  { at: 50,  h: 122, s: 76,  l: 40 }, // green
  { at: 67,  h: 188, s: 80,  l: 46 }, // cyan
  { at: 83,  h: 228, s: 85,  l: 52 }, // blue
  { at: 100, h: 288, s: 78,  l: 48 }, // violet / magenta
]

function interpolateStops(stops: ColorStop[], t: number) {
  const clamped = Math.max(0, Math.min(100, t))
  let lo = stops[0]
  let hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].at && clamped <= stops[i + 1].at) {
      lo = stops[i]
      hi = stops[i + 1]
      break
    }
  }
  const span = hi.at - lo.at
  const progress = span === 0 ? 0 : (clamped - lo.at) / span
  return {
    h: lo.h + (hi.h - lo.h) * progress,
    s: lo.s + (hi.s - lo.s) * progress,
    l: lo.l + (hi.l - lo.l) * progress,
  }
}

function pointColorStyle(reachScore: number): CSSProperties {
  const { h, s, l } = interpolateStops(REACH_STOPS, reachScore)
  return {
    backgroundColor: `hsl(${h}, ${s}%, ${l}%)`,
    borderColor: `hsl(${h}, ${s}%, ${Math.max(20, l - 12)}%)`,
  }
}

function haloColorStyle(reachScore: number): CSSProperties {
  // Complementary hue: opposite on the color wheel (+180°).
  const { h, s } = interpolateStops(REACH_STOPS, reachScore)
  return { borderColor: `hsl(${(h + 180) % 360}, ${s}%, 58%)` }
}

const GRADIENT_STYLE: CSSProperties = {
  background: [
    "linear-gradient(to right,",
    "hsl(0, 100%, 50%),",     // red
    "hsl(25, 100%, 54%),",    // orange
    "hsl(58, 100%, 50%),",    // yellow
    "hsl(122, 76%, 40%),",    // green
    "hsl(188, 80%, 46%),",    // cyan
    "hsl(228, 85%, 52%),",    // blue
    "hsl(288, 78%, 48%))",    // violet / magenta
  ].join(" "),
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
  const [matrixQuery, setMatrixQuery] = useState("")
  const pointRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const inputId = useId()

  const queryLower = matrixQuery.trim().toLowerCase()
  const filteredByQuery = queryLower
    ? accounts.filter((a) => a.name.toLowerCase().includes(queryLower))
    : accounts

  const ranked = [...filteredByQuery]
    .sort((left, right) => getPortfolioPeriodMetrics(right, period).actionPriorityScore - getPortfolioPeriodMetrics(left, period).actionPriorityScore)
    .slice(0, 28)

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null

  const matrixAccounts = scope === "all"
    ? filteredByQuery
    : selectedAccount && !ranked.some((account) => account.id === selectedAccount.id)
      ? [...ranked, selectedAccount]
      : ranked

  const points = buildMatrixPoints(matrixAccounts, period)
  const counts = quadrantCounts(matrixAccounts)
  const activePoint = points.find((point) => point.account.id === (activePointId ?? selectedAccountId)) ?? null
  const activeTooltipId = activePoint ? `matrix-tooltip-${activePoint.account.id}` : undefined

  const countLabel = filteredByQuery.length !== accounts.length
    ? `${filteredByQuery.length} / ${accounts.length} comptes`
    : `${accounts.length} comptes`

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold text-heading">Potentiel et couverture commerciale</h2>
        <p className="text-sm leading-6 text-body">{summarySentence}</p>
      </div>

      {/* Single toolbar row: input → scope selector → réinitialiser → count */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <label htmlFor={inputId} className="sr-only">Rechercher un compte</label>
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            type="search"
            value={matrixQuery}
            onChange={(e) => setMatrixQuery(e.target.value)}
            placeholder="Rechercher un compte…"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 pr-8 text-sm text-body placeholder:text-muted focus:border-primary/40 focus:outline-none"
          />
          {matrixQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setMatrixQuery("")}
              aria-label="Effacer"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-base leading-none text-muted hover:text-heading"
            >
              ×
            </button>
          )}
        </div>

        {/* Scope selector */}
        <div className="flex shrink-0 items-center gap-1 rounded-[var(--radius-medium)] border border-border p-0.5">
          <Button variant={scope === "priority" ? "primary" : "ghost"} size="sm" onClick={() => setScope("priority")}>
            Prioritaires
          </Button>
          <Button variant={scope === "all" ? "primary" : "ghost"} size="sm" onClick={() => setScope("all")}>
            Tous
          </Button>
        </div>

        {/* Réinitialiser */}
        <button
          type="button"
          onClick={() => setMatrixQuery("")}
          className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-heading"
        >
          Réinitialiser
        </button>

        {/* Result count */}
        <span className="shrink-0 whitespace-nowrap text-xs text-muted">{countLabel}</span>
      </div>

      <SurfaceCard className="overflow-hidden">
        <div className="grid gap-4 px-5 py-4">
          <div
            className="relative overflow-hidden rounded-[var(--radius-large)] border border-border bg-canvas p-4"
            role="group"
            aria-label="Matrice potentiel et couverture commerciale"
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

                    {/* Halo — complementary color to the point, opacity = momentum */}
                    <span
                      className="absolute inset-[-8px] rounded-full border"
                      style={{
                        ...haloColorStyle(point.account.reachScore),
                        opacity: 0.15 + (point.momentumScore / 100) * 0.7,
                      }}
                      aria-hidden="true"
                    />

                    {/* Point — HSL gradient from cold (left) to warm/magenta (right) */}
                    <span
                      className={`absolute inset-0 rounded-full border transition-transform ${isSelected ? "scale-[1.12]" : ""}`}
                      style={pointColorStyle(point.account.reachScore)}
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

              <div className="absolute inset-y-6 left-1 flex flex-col justify-between text-[11px] text-muted">
                <span>Potentiel élevé</span>
                <span>Potentiel faible</span>
              </div>
            </div>
          </div>

          {/* Color spectrum axis — visual legend for the cold→warm gradient by reach */}
          <div className="flex items-center gap-3 px-1">
            <span className="shrink-0 text-[11px] text-muted">Reach faible</span>
            <div
              className="h-1.5 flex-1 rounded-full"
              style={GRADIENT_STYLE}
              aria-hidden="true"
            />
            <span className="shrink-0 text-[11px] text-muted">Reach fort</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <LegendCard
              label="Couleur"
              value="Couverture commerciale"
              context="Dégradé froid → chaud selon le reach. Bleu = faible couverture, magenta = couverture solide."
            />
            <LegendCard
              label="Halo"
              value="Momentum (opacité)"
              context="Teinte complémentaire au point. L'opacité traduit la densité d'activité récente."
            />
            <LegendCard
              label="Taille"
              value="Densité de contacts"
              context="Les points les plus grands représentent les comptes avec le plus de contacts identifiés."
            />
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
