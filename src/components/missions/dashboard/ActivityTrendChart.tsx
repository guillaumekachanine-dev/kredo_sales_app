import type { EngagementsOverviewViewModel } from "./engagements-overview-types"

interface ActivityTrendChartProps {
  trend: EngagementsOverviewViewModel["activity"]["monthlyTrend"]
}

export function ActivityTrendChart({ trend }: ActivityTrendChartProps) {
  const width = 520
  const height = 72
  const marginX = 10
  const usableWidth = width - marginX * 2
  const values = trend.map((item) => item.rate)
  const observed = values.filter((value): value is number => value !== null)
  const minValue = Math.min(...observed, 0)
  const maxValue = Math.max(...observed, 100)
  const range = Math.max(maxValue - minValue, 1)
  const x = (index: number) => marginX + (index / Math.max(1, trend.length - 1)) * usableWidth
  const y = (value: number) => 52 - ((value - minValue) / range) * 38
  const points = trend
    .map((item, index) => item.rate === null ? null : `${x(index)},${y(item.rate)}`)
    .filter((value): value is string => value !== null)
    .join(" ")

  return (
    <div>
      <p id="activity-trend-summary" className="sr-only">
        Tendance mensuelle du taux d’activité pondéré. {trend
          .filter((item) => item.rate !== null)
          .map((item) => `${item.label} ${item.rate}%`)
          .join(", ") || "Aucune activité validée."}
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[66px] w-full" role="img" aria-label="Tendance mensuelle du taux d’activité" aria-describedby="activity-trend-summary">
        <line x1={marginX} x2={width - marginX} y1="52" y2="52" stroke="var(--color-border)" />
        {points && <polyline points={points} fill="none" stroke="var(--color-dataviz-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {trend.map((item, index) => (
          <g key={item.month} aria-hidden="true">
            {item.rate !== null && (
              <circle cx={x(index)} cy={y(item.rate)} r="3" fill="var(--color-surface)" stroke="var(--color-dataviz-1)" strokeWidth="2" />
            )}
            <text x={x(index)} y="68" textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontWeight="600">
              {item.label.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
