"use client"

import { useMemo } from "react"
import { BusinessIntelligenceDesktopViewModel } from "../presenters/build-business-intelligence-desktop-model"

interface PotentialReachMatrixProps {
  points: BusinessIntelligenceDesktopViewModel["matrixPoints"]
  selectedAccountId: string | null
  onSelectAccount: (id: string) => void
}

export function PotentialReachMatrix({ points, selectedAccountId, onSelectAccount }: PotentialReachMatrixProps) {
  const width = 400
  const height = 300
  const padding = 40
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  const x = (reach: number) => padding + (reach / 100) * innerWidth
  const y = (potential: number) => height - padding - (potential / 100) * innerHeight

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm p-4 h-full flex flex-col">
      <h3 className="font-bold text-[var(--color-text-main)] mb-4 text-sm">Matrice Potentiel × Reach</h3>
      
      <div className="flex-1 relative w-full flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[300px]" role="img" aria-label="Matrice croisant le potentiel et la couverture relationnelle des comptes">
          {/* Axes */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--color-border)" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--color-border)" strokeWidth="1" />
          
          {/* Axis labels */}
          <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fill="var(--color-muted)">Reach (Couverture)</text>
          <text x={15} y={height / 2} textAnchor="middle" fontSize="12" fill="var(--color-muted)" transform={`rotate(-90 15 ${height / 2})`}>Potentiel</text>

          {/* Quadrant lines */}
          <line x1={padding} y1={y(50)} x2={width - padding} y2={y(50)} stroke="var(--color-border)" strokeDasharray="4 4" strokeWidth="1" />
          <line x1={x(50)} y1={padding} x2={x(50)} y2={height - padding} stroke="var(--color-border)" strokeDasharray="4 4" strokeWidth="1" />
          
          {/* Points */}
          {points.map((point) => {
            const isSelected = selectedAccountId === point.accountId
            const radius = isSelected ? 8 : Math.max(3, (point.priority / 100) * 8)
            
            return (
              <g 
                key={point.accountId} 
                className="cursor-pointer group outline-none" 
                onClick={() => onSelectAccount(point.accountId)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectAccount(point.accountId)
                  }
                }}
              >
                <circle 
                  cx={x(point.reach)} 
                  cy={y(point.potential)} 
                  r={radius} 
                  fill={isSelected ? "var(--color-dataviz-1)" : "var(--color-muted)"} 
                  opacity={isSelected ? 1 : 0.6}
                  stroke={isSelected ? "var(--color-surface)" : "none"}
                  strokeWidth="2"
                  className="transition-all duration-200 group-hover:opacity-100 group-hover:fill-[var(--color-dataviz-1)] group-focus:fill-[var(--color-dataviz-1)] group-focus:opacity-100"
                />
                <title>{`${point.name}\nPotentiel: ${point.potential}\nReach: ${point.reach}\nPriorité: ${point.priority}`}</title>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
