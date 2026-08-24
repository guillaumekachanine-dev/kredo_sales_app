"use client"

import { useMemo, useState } from "react"

interface MomentumReachMatrixProps {
  points: {
    accountId: string
    name: string
    momentum: number
    reach: number
    openOpportunityCount: number
    signalUrgency: number | null
  }[]
  selectedAccountId: string | null
  onSelectAccount: (id: string) => void
}

export function PotentialReachMatrix({ points, selectedAccountId, onSelectAccount }: MomentumReachMatrixProps) {
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null)
  const activePointId = hoveredPointId ?? selectedAccountId
  const activePoint = useMemo(
    () => points.find((point) => point.accountId === activePointId) ?? null,
    [activePointId, points],
  )

  const width = 500
  const height = 340
  const margin = { left: 58, right: 22, top: 28, bottom: 48 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const x = (reach: number) => margin.left + (reach / 100) * plotWidth
  const y = (momentum: number) => margin.top + plotHeight - (momentum / 100) * plotHeight

  return (
    <section className="flex min-h-[430px] min-w-0 flex-col rounded-xl border border-border/30 bg-surface/30 p-5">
      <h2 className="font-heading text-sm font-bold text-heading">Momentum × Reach</h2>
      <p className="mb-4 mt-1 text-xs text-muted">Deux dimensions explicites : activité commerciale récente et couverture relationnelle.</p>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-h-[340px] w-full" role="img" aria-label="Graphique croisant momentum et reach des comptes">
          <rect x={margin.left} y={margin.top} width={plotWidth / 2} height={plotHeight / 2} fill="var(--color-surface-hover)" opacity="0.18" />
          <rect x={x(50)} y={margin.top} width={plotWidth / 2} height={plotHeight / 2} fill="var(--color-surface-hover)" opacity="0.08" />
          <rect x={margin.left} y={y(50)} width={plotWidth / 2} height={plotHeight / 2} fill="var(--color-surface-hover)" opacity="0.12" />
          <rect x={x(50)} y={y(50)} width={plotWidth / 2} height={plotHeight / 2} fill="var(--color-surface-hover)" opacity="0.04" />
          <text x={margin.left + 10} y={margin.top + 17} fill="var(--color-body)" fontSize={10} fontWeight={700}>Relation à élargir</text>
          <text x={x(50) + 10} y={margin.top + 17} fill="var(--color-body)" fontSize={10} fontWeight={700}>Dynamique établie</text>
          <text x={margin.left + 10} y={margin.top + plotHeight - 10} fill="var(--color-body)" fontSize={10} fontWeight={700}>Relation inactive</text>
          <text x={x(50) + 10} y={margin.top + plotHeight - 10} fill="var(--color-body)" fontSize={10} fontWeight={700}>Couverture sans activité</text>
          {[25, 50, 75].map((tick) => (
            <g key={tick} opacity={0.25}>
              <line x1={x(tick)} y1={margin.top} x2={x(tick)} y2={margin.top + plotHeight} stroke="var(--color-border)" strokeDasharray="3 3" />
              <line x1={margin.left} y1={y(tick)} x2={width - margin.right} y2={y(tick)} stroke="var(--color-border)" strokeDasharray="3 3" />
              <text x={x(tick)} y={height - 22} textAnchor="middle" fill="var(--color-muted)" fontSize={10}>{tick}</text>
              <text x={margin.left - 12} y={y(tick) + 3} textAnchor="end" fill="var(--color-muted)" fontSize={10}>{tick}</text>
            </g>
          ))}
          <line x1={margin.left} y1={margin.top + plotHeight} x2={width - margin.right} y2={margin.top + plotHeight} stroke="var(--color-border)" />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} stroke="var(--color-border)" />
          <text x={margin.left + plotWidth / 2} y={height - 6} textAnchor="middle" fill="var(--color-body)" fontSize={11}>Reach</text>
          <text transform={`translate(14 ${margin.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" fill="var(--color-body)" fontSize={11}>Momentum</text>

          {points.map((point) => {
            const selected = point.accountId === selectedAccountId
            const radius = Math.min(11, 5 + point.openOpportunityCount * 1.5)
            return (
              <circle
                key={point.accountId}
                cx={x(point.reach)}
                cy={y(point.momentum)}
                r={selected ? radius + 2 : radius}
                fill={selected ? "var(--color-primary)" : "var(--color-body)"}
                 opacity={selected ? 1 : 0.7}
                 className="transition-all duration-200 motion-reduce:transition-none"
                tabIndex={0}
                role="button"
                aria-label={`${point.name}, reach ${point.reach}, momentum ${point.momentum}, ${point.openOpportunityCount} opportunités ouvertes`}
                onClick={() => onSelectAccount(point.accountId)}
                onMouseEnter={() => setHoveredPointId(point.accountId)}
                onMouseLeave={() => setHoveredPointId(null)}
                onFocus={() => setHoveredPointId(point.accountId)}
                onBlur={() => setHoveredPointId(null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onSelectAccount(point.accountId)
                  }
                }}
              />
            )
          })}
        </svg>

        {activePoint ? (
          <div className="pointer-events-none absolute right-3 top-3 max-w-52 rounded-lg border border-border/40 bg-surface px-3 py-2 text-xs shadow-lg">
            <p className="font-semibold text-heading">{activePoint.name}</p>
            <p className="mt-1 text-body">Reach {activePoint.reach} · Momentum {activePoint.momentum}</p>
            <p className="mt-1 text-muted">{activePoint.openOpportunityCount} opportunité(s) ouverte(s){activePoint.signalUrgency === null ? "" : ` · urgence ${activePoint.signalUrgency}`}</p>
          </div>
        ) : null}
       </div>

      <table className="sr-only">
        <caption>Valeurs détaillées de la matrice Momentum × Reach</caption>
        <thead>
          <tr>
            <th>Nom du compte</th>
            <th>Momentum commercial</th>
            <th>Reach relationnel</th>
            <th>Opportunités ouvertes</th>
            <th>Urgence du signal</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.accountId}>
              <td>{point.name}</td>
              <td>{point.momentum}</td>
              <td>{point.reach}</td>
              <td>{point.openOpportunityCount}</td>
              <td>{point.signalUrgency ?? "Non renseignée"}</td>
            </tr>
          ))}
        </tbody>
      </table>
     </section>
   )
 }
