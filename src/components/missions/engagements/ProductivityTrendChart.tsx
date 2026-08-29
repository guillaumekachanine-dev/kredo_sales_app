import { formatPct } from "@/lib/formatters"
import type { ProductivityMonthPoint } from "./engagements-activity-types"

// ─────────────────────────────────────────────────────────────────────────────
//  Bloc 1 — Productivité globale des collaborateurs en mission.
//  Courbe mensuelle du taux d'activité moyen (activity_rate_percent) + seuil
//  cible métier. SVG écrit à la main (stack dataviz KREDO), tooltip natif via
//  <title> sur des zones de survol invisibles — aucune dépendance graphique,
//  aucun JS.
// ─────────────────────────────────────────────────────────────────────────────

interface ProductivityTrendChartProps {
  monthly: ProductivityMonthPoint[]
  targetRate: number
}

const WIDTH = 760
const HEIGHT = 208
const MARGIN = { top: 18, right: 12, bottom: 26, left: 34 }

export function ProductivityTrendChart({ monthly, targetRate }: ProductivityTrendChartProps) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const baseline = MARGIN.top + plotHeight

  const observed = monthly
    .map((point) => point.rate)
    .filter((rate): rate is number => rate !== null)
  const hasData = observed.length > 0
  const yMin = Math.min(
    50,
    Math.floor((Math.min(...observed, targetRate) - 5) / 10) * 10,
  )
  const yMax = 100
  const yRange = Math.max(yMax - yMin, 1)

  const slot = plotWidth / monthly.length
  const x = (index: number) => MARGIN.left + slot * index + slot / 2
  const y = (value: number) =>
    baseline - ((Math.min(yMax, Math.max(yMin, value)) - yMin) / yRange) * plotHeight

  const linePoints = monthly
    .map((point, index) => (point.rate === null ? null : `${x(index)},${y(point.rate)}`))
    .filter((value): value is string => value !== null)
    .join(" ")

  const areaPath = (() => {
    const segments: string[] = []
    let open = false
    monthly.forEach((point, index) => {
      if (point.rate === null) {
        open = false
        return
      }
      if (!open) {
        segments.push(`M ${x(index)},${baseline} L ${x(index)},${y(point.rate)}`)
        open = true
      } else {
        segments.push(`L ${x(index)},${y(point.rate)}`)
      }
      const next = monthly[index + 1]
      if (!next || next.rate === null) {
        segments.push(`L ${x(index)},${baseline} Z`)
        open = false
      }
    })
    return segments.join(" ")
  })()

  const targetY = y(targetRate)

  const dotTone = (rate: number) =>
    rate >= targetRate
      ? "var(--color-success)"
      : rate >= 70
        ? "var(--color-warning)"
        : "var(--color-danger)"

  const summary = monthly
    .filter((point) => point.rate !== null)
    .map((point) => `${point.label} ${formatPct(point.rate)}`)
    .join(", ")

  return (
    <div className="w-full">
      <p id="productivity-trend-summary" className="sr-only">
        Courbe mensuelle du taux d’activité moyen des collaborateurs en mission,
        cible {formatPct(targetRate)}. {summary || "Aucun CRA disponible sur l’année."}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[200px] w-full"
        role="img"
        aria-labelledby="productivity-trend-title"
        aria-describedby="productivity-trend-summary"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="productivity-trend-title">
          Taux d’activité moyen mensuel des collaborateurs en mission
        </title>

        {[yMin, Math.round((yMin + yMax) / 2), yMax].map((value) => (
          <g key={value} aria-hidden="true">
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--color-border)"
              strokeOpacity={value === yMin ? 0.9 : 0.5}
              strokeDasharray={value === yMin ? undefined : "3 5"}
            />
            <text
              x={MARGIN.left - 7}
              y={y(value) + 3}
              textAnchor="end"
              fill="var(--color-muted)"
              fontSize="9"
              fontWeight="600"
            >
              {value}
            </text>
          </g>
        ))}

        {/* Seuil cible métier (ACTIVITY_THRESHOLDS.TARGET) */}
        <g aria-hidden="true">
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={targetY}
            y2={targetY}
            stroke="var(--color-primary)"
            strokeWidth="1.25"
            strokeDasharray="5 4"
          />
          <text
            x={WIDTH - MARGIN.right}
            y={targetY - 5}
            textAnchor="end"
            fill="var(--color-primary)"
            fontSize="9"
            fontWeight="700"
          >
            Cible {targetRate} %
          </text>
        </g>

        {hasData && (
          <>
            <path d={areaPath} fill="var(--color-dataviz-1)" fillOpacity="0.08" aria-hidden="true" />
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--color-dataviz-1)"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            />
          </>
        )}

        {monthly.map((point, index) => (
          <g key={point.label}>
            {point.rate !== null && (
              <circle
                cx={x(index)}
                cy={y(point.rate)}
                r="3.4"
                fill="var(--color-surface)"
                stroke={dotTone(point.rate)}
                strokeWidth="2"
                aria-hidden="true"
              />
            )}
            <text
              x={x(index)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fill={point.isFuture ? "var(--color-muted)" : "var(--color-body)"}
              opacity={point.isFuture ? 0.7 : 1}
              fontSize="9"
              fontWeight="650"
            >
              {point.label}
            </text>
            <rect
              x={MARGIN.left + slot * index}
              y={MARGIN.top}
              width={slot}
              height={plotHeight}
              fill="transparent"
            >
              <title>
                {point.craCount === 0
                  ? `${point.label} · aucun CRA`
                  : [
                      `${point.label} — activité ${formatPct(point.rate)}`,
                      `${point.billableDays} j facturés`,
                      `${point.ptoDays} j congés`,
                      `${point.sickDays} j maladie`,
                      `${point.nonBillableDays} j non facturables`,
                      `${point.craCount} CRA`,
                    ].join("\n")}
              </title>
            </rect>
          </g>
        ))}
      </svg>

      <table className="sr-only">
        <caption>Taux d’activité moyen mensuel</caption>
        <thead>
          <tr>
            <th>Mois</th>
            <th>Taux</th>
            <th>Jours facturés</th>
            <th>Congés</th>
            <th>Maladie</th>
          </tr>
        </thead>
        <tbody>
          {monthly.map((point) => (
            <tr key={point.label}>
              <th>{point.label}</th>
              <td>{point.rate === null ? "—" : formatPct(point.rate)}</td>
              <td>{point.billableDays}</td>
              <td>{point.ptoDays}</td>
              <td>{point.sickDays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
