import { formatEuroCompact } from "@/lib/formatters"
import type { MonthlyRevenueItem } from "./engagements-overview-types"

interface RevenueOverviewChartProps {
  monthly: MonthlyRevenueItem[]
  compact?: boolean
}

export function RevenueOverviewChart({ monthly, compact = false }: RevenueOverviewChartProps) {
  const width = 720
  const height = compact ? 180 : 205
  const margin = { top: 28, right: 8, bottom: 28, left: 42 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const totals = monthly.map((item) => item.assistanceTechnique + item.projects)
  const maxValue = Math.max(...totals, 1)
  const ceiling = maxValue * 1.18
  const slotWidth = plotWidth / monthly.length
  const barWidth = Math.min(34, slotWidth * 0.58)
  const baseline = margin.top + plotHeight
  const y = (value: number) => baseline - (value / ceiling) * plotHeight
  const summary = monthly
    .filter((item) => !item.isFuture && item.assistanceTechnique + item.projects > 0)
    .map((item) => `${item.label} : ${formatEuroCompact(item.assistanceTechnique + item.projects)}`)
    .join(", ")

  return (
    <div className="min-h-0 w-full">
      <p id="revenue-chart-summary" className="sr-only">
        Histogramme mensuel empilé du chiffre d’affaires réalisé. Assistance Technique en bleu plein,
        Projets en or hachuré. {summary || "Aucun chiffre d’affaires réalisé sur la période."}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={compact ? "h-[168px] w-full" : "h-[184px] w-full"}
        role="img"
        aria-labelledby="revenue-chart-title"
        aria-describedby="revenue-chart-summary"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="revenue-chart-title">CA mensuel réalisé — Assistance Technique et Projets</title>
        <defs>
          <pattern id="engagement-project-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="var(--color-dataviz-2)" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--color-surface)" strokeOpacity="0.45" strokeWidth="1.5" />
          </pattern>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const value = ceiling * ratio
          const tickY = y(value)
          return (
            <g key={ratio} aria-hidden="true">
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={tickY}
                y2={tickY}
                stroke="var(--color-border)"
                strokeOpacity={ratio === 0 ? 0.9 : 0.55}
                strokeDasharray={ratio === 0 ? undefined : "3 5"}
              />
              <text x={margin.left - 7} y={tickY + 3} textAnchor="end" fill="var(--color-muted)" fontSize="9" fontWeight="600">
                {formatEuroCompact(value)}
              </text>
            </g>
          )
        })}

        {monthly.map((item, index) => {
          const total = totals[index]
          const assistanceHeight = (item.assistanceTechnique / ceiling) * plotHeight
          const projectHeight = (item.projects / ceiling) * plotHeight
          const x = margin.left + index * slotWidth + (slotWidth - barWidth) / 2
          const totalY = y(total)

          return (
            <g key={item.month} aria-hidden="true">
              {item.isFuture ? (
                <rect
                  x={x}
                  y={margin.top}
                  width={barWidth}
                  height={plotHeight}
                  rx="2"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeDasharray="3 4"
                  opacity="0.65"
                />
              ) : total > 0 ? (
                <>
                  <rect
                    x={x}
                    y={baseline - assistanceHeight}
                    width={barWidth}
                    height={assistanceHeight}
                    rx={item.projects > 0 ? 0 : 2}
                    fill="var(--color-dataviz-1)"
                  />
                  {item.projects > 0 && (
                    <rect
                      x={x}
                      y={baseline - assistanceHeight - projectHeight}
                      width={barWidth}
                      height={projectHeight}
                      rx="2"
                      fill="url(#engagement-project-hatch)"
                      stroke="var(--color-dataviz-2)"
                      strokeWidth="0.6"
                    />
                  )}
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(11, totalY - 6)}
                    textAnchor="middle"
                    fill="var(--color-heading)"
                    fontSize="8.5"
                    fontWeight="700"
                  >
                    {formatEuroCompact(total).replace(" €", "")}
                  </text>
                </>
              ) : (
                <line
                  x1={x + 4}
                  x2={x + barWidth - 4}
                  y1={baseline - 1}
                  y2={baseline - 1}
                  stroke="var(--color-muted)"
                  strokeWidth="1.5"
                />
              )}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fill={item.isFuture ? "var(--color-muted)" : "var(--color-body)"}
                opacity={item.isFuture ? 0.7 : 1}
                fontSize="9"
                fontWeight="650"
              >
                {item.label}
              </text>
            </g>
          )
        })}
      </svg>

      <table className="sr-only">
        <caption>Détail mensuel du chiffre d’affaires réalisé</caption>
        <thead><tr><th>Mois</th><th>Assistance Technique</th><th>Projets</th></tr></thead>
        <tbody>
          {monthly.map((item) => (
            <tr key={item.month}>
              <th>{item.label}</th>
              <td>{item.isFuture ? "Mois futur" : formatEuroCompact(item.assistanceTechnique)}</td>
              <td>{item.isFuture ? "Mois futur" : formatEuroCompact(item.projects)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
