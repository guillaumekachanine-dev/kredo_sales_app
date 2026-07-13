import type { ForecastRevenueResult as ForecastRevenueResultData } from "@/lib/intelligence/actions/forecast-revenue"
import { formatEuroCompact } from "@/lib/formatters"

function trendLabel(trend: ForecastRevenueResultData["summary"]["trend"]) {
  if (trend === "growing") return "Hausse"
  if (trend === "declining") return "Baisse"
  return "Stable"
}

function buildPoints(
  rows: ForecastRevenueResultData["months"],
  key: "pessimistic" | "realistic" | "optimistic",
  maxValue: number,
) {
  const width = 320
  const height = 160
  const left = 34
  const right = 14
  const top = 16
  const bottom = 30
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const step = rows.length > 1 ? plotWidth / (rows.length - 1) : plotWidth

  return rows.map((row, index) => {
    const x = left + index * step
    const y = top + plotHeight - (row[key] / maxValue) * plotHeight
    return { x, y, label: row.label, value: row[key] }
  })
}

function ForecastChart({ rows }: { rows: ForecastRevenueResultData["months"] }) {
  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] text-xs text-primary-fg/60">
        Aucune donnée de prévision disponible
      </div>
    )
  }

  const maxValue = Math.max(...rows.flatMap((row) => [row.pessimistic, row.realistic, row.optimistic]), 1) * 1.12
  const ticks = [0, maxValue / 2, maxValue]
  const pessimistic = buildPoints(rows, "pessimistic", maxValue)
  const realistic = buildPoints(rows, "realistic", maxValue)
  const optimistic = buildPoints(rows, "optimistic", maxValue)
  const pointString = (points: ReturnType<typeof buildPoints>) => points.map((point) => `${point.x},${point.y}`).join(" ")

  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
      <svg viewBox="0 0 320 160" className="w-full" role="img" aria-label="Prévision de chiffre d'affaires à trois scénarios">
        {ticks.map((tick) => {
          const y = 130 - (tick / maxValue) * 114
          return (
            <g key={tick}>
              <line x1={34} x2={306} y1={y} y2={y} stroke="var(--color-border)" strokeOpacity={tick === 0 ? 0.8 : 0.35} strokeDasharray={tick === 0 ? undefined : "4 5"} />
              <text x={29} y={y + 3} textAnchor="end" fill="var(--color-muted)" fontSize={8} fontWeight={600} fontFamily="inherit">
                {formatEuroCompact(tick)}
              </text>
            </g>
          )
        })}

        <polyline points={pointString(optimistic)} fill="none" stroke="var(--color-dataviz-4)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pointString(realistic)} fill="none" stroke="var(--color-dataviz-1)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pointString(pessimistic)} fill="none" stroke="var(--color-dataviz-2)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />

        {realistic.map((point, index) => (
          <g key={point.label}>
            <circle cx={point.x} cy={optimistic[index].y} r={3} fill="var(--color-dataviz-4)" />
            <circle cx={point.x} cy={point.y} r={3.5} fill="var(--color-dataviz-1)" />
            <circle cx={point.x} cy={pessimistic[index].y} r={3} fill="var(--color-dataviz-2)" />
            <text x={point.x} y={148} textAnchor="middle" fill="var(--color-muted)" fontSize={9} fontWeight={700} fontFamily="inherit">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-primary-fg/55">
        <Legend color="var(--color-dataviz-2)" label="Pessimiste" />
        <Legend color="var(--color-dataviz-1)" label="Réaliste" />
        <Legend color="var(--color-dataviz-4)" label="Optimiste" />
      </div>
    </div>
  )
}

export function ForecastRevenueResult({ result }: { result: ForecastRevenueResultData }) {
  return (
    <div className="space-y-4">
      <ForecastChart rows={result.months} />

      <div className="grid grid-cols-2 gap-2">
        <Metric label="T courant" value={formatEuroCompact(result.summary.q_current_realistic)} />
        <Metric label="T suivant" value={formatEuroCompact(result.summary.q_next_realistic)} />
        <Metric label="Couverture T+1" value={result.summary.missionsCoveringNextQuarter} />
        <Metric label="Tendance" value={trendLabel(result.summary.trend)} />
      </div>

      <div className="space-y-2.5">
        {result.months.map((month) => (
          <div key={month.month} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-primary-fg">{month.label}</p>
                <p className="mt-1 text-[11px] text-primary-fg/50">
                  Missions {formatEuroCompact(month.missionContribution)} · Pipe {formatEuroCompact(month.pipeContribution)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-primary-fg">{formatEuroCompact(month.realistic)}</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              <Scenario label="Bas" value={month.pessimistic} />
              <Scenario label="Réel" value={month.realistic} />
              <Scenario label="Haut" value={month.optimistic} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-[11px] leading-snug text-primary-fg/60">
        Pipe pondéré total : {formatEuroCompact(result.summary.pipeWeightedTotal)}. Missions finissant au prochain trimestre : {result.summary.missionsEndingNextQuarter}.
      </div>

      {result.sourceIssues.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
          Données partielles : {result.sourceIssues.join(" ")}
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className="mt-1 text-lg font-bold leading-none text-primary-fg">{value}</p>
    </div>
  )
}

function Scenario({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-primary-fg/[0.05] p-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/40">{label}</p>
      <p className="mt-1 text-xs font-bold text-primary-fg">{formatEuroCompact(value)}</p>
    </div>
  )
}
