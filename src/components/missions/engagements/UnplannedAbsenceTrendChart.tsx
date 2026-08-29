import { formatEuroCompact } from "@/lib/formatters"
import type { UnplannedAbsenceMonthPoint } from "./engagements-activity-types"

// ─────────────────────────────────────────────────────────────────────────────
//  Bloc 4 — Évolution mensuelle des absences non prévues (jours maladie CRA).
//  Histogramme compact : mois en X, jours en hauteur, tooltip natif avec
//  l'impact € estimé (CA / marge non réalisés). SVG maison, zéro dépendance.
// ─────────────────────────────────────────────────────────────────────────────

interface UnplannedAbsenceTrendChartProps {
  monthly: UnplannedAbsenceMonthPoint[]
}

const WIDTH = 520
const HEIGHT = 132
const MARGIN = { top: 14, right: 6, bottom: 20, left: 22 }

export function UnplannedAbsenceTrendChart({ monthly }: UnplannedAbsenceTrendChartProps) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const baseline = MARGIN.top + plotHeight

  const maxDays = Math.max(...monthly.map((point) => point.days), 1)
  const ceiling = maxDays * 1.2
  const slot = plotWidth / monthly.length
  const barWidth = Math.min(20, slot * 0.56)

  const totalDays = monthly.reduce((sum, point) => sum + point.days, 0)
  const summary = monthly
    .filter((point) => point.days > 0)
    .map((point) => `${point.label} ${point.days} j`)
    .join(", ")

  return (
    <div className="w-full">
      <p id="unplanned-absence-summary" className="sr-only">
        Jours d’absence non prévue par mois. Total {totalDays} jours.{" "}
        {summary || "Aucune absence non prévue enregistrée."}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[128px] w-full"
        role="img"
        aria-labelledby="unplanned-absence-title"
        aria-describedby="unplanned-absence-summary"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="unplanned-absence-title">Absences non prévues par mois</title>

        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={baseline}
          y2={baseline}
          stroke="var(--color-border)"
          strokeOpacity="0.9"
          aria-hidden="true"
        />

        {monthly.map((point, index) => {
          const height = point.days > 0 ? (point.days / ceiling) * plotHeight : 0
          const barX = MARGIN.left + slot * index + (slot - barWidth) / 2

          return (
            <g key={point.label}>
              {height > 0 ? (
                <rect
                  x={barX}
                  y={baseline - height}
                  width={barWidth}
                  height={height}
                  rx="1.5"
                  fill="var(--color-danger)"
                  fillOpacity="0.78"
                  aria-hidden="true"
                />
              ) : (
                <line
                  x1={barX + 3}
                  x2={barX + barWidth - 3}
                  y1={baseline - 1}
                  y2={baseline - 1}
                  stroke="var(--color-muted)"
                  strokeWidth="1.25"
                  aria-hidden="true"
                />
              )}
              <text
                x={barX + barWidth / 2}
                y={HEIGHT - 6}
                textAnchor="middle"
                fill="var(--color-muted)"
                fontSize="8"
                fontWeight="600"
              >
                {point.label.slice(0, 1)}
              </text>
              <rect
                x={MARGIN.left + slot * index}
                y={MARGIN.top}
                width={slot}
                height={plotHeight}
                fill="transparent"
              >
                <title>
                  {point.days === 0
                    ? `${point.label} · aucune absence non prévue`
                    : [
                        `${point.label} — ${point.days} j non prévus`,
                        `CA non réalisé estimé ${formatEuroCompact(point.lostRevenue)}`,
                        `Marge non réalisée estimée ${formatEuroCompact(point.lostMargin)}`,
                      ].join("\n")}
                </title>
              </rect>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
