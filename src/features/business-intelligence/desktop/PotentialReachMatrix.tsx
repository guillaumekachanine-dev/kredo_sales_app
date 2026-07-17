"use client"

import { useState, useMemo } from "react"

interface PotentialReachMatrixProps {
  points: {
    accountId: string
    name: string
    potential: number
    reach: number
    priority: number
  }[]
  selectedAccountId: string | null
  onSelectAccount: (id: string) => void
}

export function PotentialReachMatrix({ points, selectedAccountId, onSelectAccount }: PotentialReachMatrixProps) {
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null)
  const [focusedPointId, setFocusedPointId] = useState<string | null>(null)

  const activeTooltipId = hoveredPointId || focusedPointId || selectedAccountId

  const activePoint = useMemo(() => {
    return points.find(p => p.accountId === activeTooltipId) ?? null
  }, [points, activeTooltipId])

  const directlyLabelledIds = useMemo(() => new Set(
    points.toSorted((left, right) => right.priority - left.priority).slice(0, 2).map((point) => point.accountId),
  ), [points])

  const W = 500
  const H = 340
  const mL = 60
  const mR = 20
  const mT = 30
  const mB = 50

  const plotW = W - mL - mR
  const plotH = H - mT - mB

  const x = (reach: number) => mL + (reach / 100) * plotW
  const y = (potential: number) => mT + plotH - (potential / 100) * plotH
  const pointColor = (point: PotentialReachMatrixProps["points"][number]) => {
    if (point.potential >= 50 && point.reach >= 50) return "var(--color-success)"
    if (point.potential >= 50) return "var(--color-primary)"
    if (point.reach >= 50) return "var(--color-info)"
    return "var(--color-danger)"
  }

  // Tooltip details
  const TW = 160
  const TH = 90

  const tooltipCoords = !activePoint ? null : (() => {
    const px = x(activePoint.reach)
    const py = y(activePoint.potential)
    const tx = px + 12 + TW > W - mR ? px - 12 - TW : px + 12
    const ty = py - TH / 2 < mT ? mT : py - TH / 2 + TH > H - mB ? H - mB - TH : py - TH / 2
    return { x: tx, y: ty, px, py }
  })()

  return (
    <section className="flex min-h-[430px] min-w-0 flex-col rounded-xl border border-border bg-surface p-5">
      <h2 className="font-heading text-base font-bold text-heading">Matrice Potentiel × Reach</h2>
      <p className="mb-4 mt-1 text-xs text-muted">Croisement de la couverture relationnelle et du potentiel de développement.</p>
      
      <div className="flex-1 relative w-full flex items-center justify-center min-h-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="min-h-[340px] w-full"
          role="img"
          aria-label="Graphique à bulles croisant potentiel et reach des comptes"
        >
          <rect x={mL} y={mT} width={plotW / 2} height={plotH / 2} fill="var(--color-primary)" opacity="0.055" />
          <rect x={x(50)} y={mT} width={plotW / 2} height={plotH / 2} fill="var(--color-success)" opacity="0.075" />
          <rect x={mL} y={y(50)} width={plotW / 2} height={plotH / 2} fill="var(--color-danger)" opacity="0.055" />
          <rect x={x(50)} y={y(50)} width={plotW / 2} height={plotH / 2} fill="var(--color-info)" opacity="0.06" />
          <text x={mL + 12} y={mT + 18} fill="var(--color-primary)" fontSize={11} fontWeight={700}>À développer</text>
          <text x={x(50) + 12} y={mT + 18} fill="var(--color-success)" fontSize={11} fontWeight={700}>À activer</text>
          <text x={mL + 12} y={mT + plotH - 12} fill="var(--color-danger)" fontSize={11} fontWeight={700}>À surveiller</text>
          <text x={x(50) + 12} y={mT + plotH - 12} fill="var(--color-info)" fontSize={11} fontWeight={700}>À préserver</text>
          {/* Grid lines (25%, 50%, 75%) */}
          {[25, 50, 75].map(tick => (
            <g key={tick} opacity={0.25}>
              {/* Vertical grid */}
              <line
                x1={x(tick)} y1={mT}
                x2={x(tick)} y2={mT + plotH}
                stroke="var(--color-border)"
                strokeDasharray="3 3"
              />
              {/* Horizontal grid */}
              <line
                x1={mL} y1={y(tick)}
                x2={W - mR} y2={y(tick)}
                stroke="var(--color-border)"
                strokeDasharray="3 3"
              />
            </g>
          ))}

          {/* Axes */}
          <line
            x1={mL} y1={mT + plotH}
            x2={W - mR} y2={mT + plotH}
            stroke="var(--color-border)"
            strokeWidth={1.5}
          />
          <line
            x1={mL} y1={mT}
            x2={mL} y2={mT + plotH}
            stroke="var(--color-border)"
            strokeWidth={1.5}
          />

          {/* Quadrant boundary lines (50% solid) */}
          <line
            x1={mL} y1={y(50)}
            x2={W - mR} y2={y(50)}
            stroke="var(--color-border)"
            strokeOpacity={0.6}
            strokeDasharray="4 4"
          />
          <line
            x1={x(50)} y1={mT}
            x2={x(50)} y2={mT + plotH}
            stroke="var(--color-border)"
            strokeOpacity={0.6}
            strokeDasharray="4 4"
          />

          {/* Axis ticks and labels */}
          {[0, 50, 100].map(val => (
            <g key={val}>
              {/* X ticks */}
              <text
                x={x(val)}
                y={mT + plotH + 16}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fill="var(--color-muted)"
              >
                {val}%
              </text>
              {/* Y ticks */}
              <text
                x={mL - 8}
                y={y(val) + 3}
                textAnchor="end"
                fontSize={9}
                fontWeight={600}
                fill="var(--color-muted)"
              >
                {val}%
              </text>
            </g>
          ))}

          {/* Axis titles */}
          <text
            x={mL + plotW / 2}
            y={H - 12}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="var(--color-muted)"
          >
            Reach (Couverture relationnelle)
          </text>
          <text
            x={15}
            y={mT + plotH / 2}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="var(--color-muted)"
            transform={`rotate(-90 15 ${mT + plotH / 2})`}
          >
            Potentiel commercial
          </text>

          {/* Highlight lines for active point */}
          {tooltipCoords && (
            <g opacity={0.5}>
              <line
                x1={mL} y1={tooltipCoords.py}
                x2={tooltipCoords.px} y2={tooltipCoords.py}
                stroke="var(--color-dataviz-1)"
                strokeDasharray="2 3"
                strokeWidth={1}
              />
              <line
                x1={tooltipCoords.px} y1={tooltipCoords.py}
                x2={tooltipCoords.px} y2={mT + plotH}
                stroke="var(--color-dataviz-1)"
                strokeDasharray="2 3"
                strokeWidth={1}
              />
            </g>
          )}

          {/* Bubble Points */}
          {points.map(point => {
            const isSelected = selectedAccountId === point.accountId
            const isHovered = hoveredPointId === point.accountId
            const isFocused = focusedPointId === point.accountId
            
            // Map priority to radius
            const radius = isSelected || isHovered || isFocused
              ? 9
              : Math.max(4, 4 + (point.priority / 100) * 6)

            const cx = x(point.reach)
            const cy = y(point.potential)

            return (
              <g
                key={point.accountId}
                className="cursor-pointer outline-none group"
                onClick={() => onSelectAccount(point.accountId)}
                onMouseEnter={() => setHoveredPointId(point.accountId)}
                onMouseLeave={() => setHoveredPointId(null)}
                onFocus={() => setFocusedPointId(point.accountId)}
                onBlur={() => setFocusedPointId(null)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectAccount(point.accountId)
                  }
                }}
              >
                {/* Outer halo on select/hover */}
                {(isSelected || isHovered || isFocused) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 3}
                    fill="var(--color-dataviz-1)"
                    opacity={0.2}
                     className="transition-all duration-200 motion-reduce:transition-none"
                  />
                )}
                {/* Core point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={isSelected ? "var(--color-primary)" : pointColor(point)}
                  opacity={isSelected || isHovered || isFocused ? 1 : 0.75}
                  stroke={isSelected ? "var(--color-surface)" : "var(--color-border)"}
                  strokeWidth={1.5}
                   className="transition-all duration-200 motion-reduce:transition-none"
                />
                {(isSelected || directlyLabelledIds.has(point.accountId)) && (
                  <text x={cx + radius + 5} y={cy + 4} fill="var(--color-heading)" fontSize={9} fontWeight={700}>
                    {point.name.length > 18 ? `${point.name.slice(0, 16)}…` : point.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* Custom styled SVG Tooltip */}
          {activePoint && tooltipCoords && (
             <g style={{ pointerEvents: "none" }} className="animate-in fade-in duration-150 motion-reduce:animate-none motion-reduce:duration-0">
              <rect
                x={tooltipCoords.x}
                y={tooltipCoords.y}
                width={TW}
                height={TH}
                rx={6}
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth={1.2}
                style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.15))" }}
              />
              {/* Account name */}
              <text
                x={tooltipCoords.x + 10}
                y={tooltipCoords.y + 18}
                 fill="var(--color-heading)"
                fontSize={9.5}
                fontWeight={700}
              >
                {activePoint.name.length > 25 ? `${activePoint.name.slice(0, 23)}...` : activePoint.name}
              </text>
              <line
                x1={tooltipCoords.x + 6}
                y1={tooltipCoords.y + 24}
                x2={tooltipCoords.x + TW - 6}
                y2={tooltipCoords.y + 24}
                stroke="var(--color-border)"
                strokeOpacity={0.5}
              />
              {/* Metrics */}
              <text x={tooltipCoords.x + 10} y={tooltipCoords.y + 40} fill="var(--color-muted)" fontSize={8.5} fontWeight={500}>
                Potentiel :
              </text>
               <text x={tooltipCoords.x + TW - 10} y={tooltipCoords.y + 40} textAnchor="end" fill="var(--color-heading)" fontSize={8.5} fontWeight={700}>
                {activePoint.potential}%
              </text>

              <text x={tooltipCoords.x + 10} y={tooltipCoords.y + 54} fill="var(--color-muted)" fontSize={8.5} fontWeight={500}>
                Reach :
              </text>
               <text x={tooltipCoords.x + TW - 10} y={tooltipCoords.y + 54} textAnchor="end" fill="var(--color-heading)" fontSize={8.5} fontWeight={700}>
                {activePoint.reach}%
              </text>

              <text x={tooltipCoords.x + 10} y={tooltipCoords.y + 68} fill="var(--color-muted)" fontSize={8.5} fontWeight={500}>
                Priorité :
              </text>
              <text x={tooltipCoords.x + TW - 10} y={tooltipCoords.y + 68} textAnchor="end" fill="var(--color-dataviz-1)" fontSize={8.5} fontWeight={700}>
                {activePoint.priority}/100
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Screen Reader accessible summary table */}
      <table className="sr-only">
        <caption>Valeurs détaillées de la matrice Potentiel × Reach</caption>
        <thead>
          <tr>
            <th>Nom du compte</th>
            <th>Potentiel commercial</th>
            <th>Reach (Couverture relationnelle)</th>
            <th>Priorité d&apos;action</th>
          </tr>
        </thead>
        <tbody>
          {points.map(p => (
            <tr key={p.accountId}>
              <td>{p.name}</td>
              <td>{p.potential}%</td>
              <td>{p.reach}%</td>
              <td>{p.priority}/100</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
