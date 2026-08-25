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
      <div className="flex h-40 items-center justify-center border-y border-edito-border text-xs font-medium text-edito-muted">
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
    <figure className="border-b border-edito-border pb-6">
      <svg viewBox="0 0 320 176" className="w-full overflow-visible" role="img" aria-label="Prévision de chiffre d'affaires à trois scénarios">
        {ticks.map((tick) => {
          const y = 130 - (tick / maxValue) * 114
          return (
            <g key={tick}>
              <line x1={34} x2={306} y1={y} y2={y} stroke="var(--color-edito-border)" strokeOpacity={tick === 0 ? 0.9 : 0.62} strokeDasharray={tick === 0 ? undefined : "3 5"} />
              <text x={29} y={y + 3} textAnchor="end" fill="var(--color-edito-muted)" fontSize={8} fontWeight={600} fontFamily="inherit">
                {formatEuroCompact(tick)}
              </text>
            </g>
          )
        })}

        <polyline points={pointString(optimistic)} fill="none" stroke="var(--color-edito-muted)" strokeOpacity={0.58} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
        <polyline points={pointString(pessimistic)} fill="none" stroke="var(--color-edito-muted)" strokeOpacity={0.58} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
        <polyline points={pointString(realistic)} fill="none" stroke="var(--color-brand-primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {realistic.map((point, index) => (
          <g key={point.label}>
            <circle cx={point.x} cy={optimistic[index].y} r={3} fill="var(--color-edito-surface)" stroke="var(--color-edito-muted)" strokeOpacity={0.7} strokeWidth={1.2} />
            <circle cx={point.x} cy={pessimistic[index].y} r={3} fill="var(--color-edito-surface)" stroke="var(--color-edito-muted)" strokeOpacity={0.7} strokeWidth={1.2} />
            <circle cx={point.x} cy={point.y} r={5} fill="var(--color-edito-surface)" stroke="var(--color-brand-primary)" strokeOpacity={0.35} strokeWidth={1.5} />
            <circle cx={point.x} cy={point.y} r={3.25} fill="var(--color-brand-primary)" />
            <text x={point.x} y={148} textAnchor="middle" fill="var(--color-edito-heading)" fontSize={9} fontWeight={700} fontFamily="inherit">
              {point.label}
            </text>
            <text x={point.x} y={160} textAnchor="middle" fill="var(--color-edito-body)" fontSize={8} fontWeight={600} fontFamily="inherit">
              {formatEuroCompact(point.value)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] font-semibold text-edito-body">
        <Legend color="var(--color-edito-muted)" label="Bas" secondary />
        <Legend color="var(--color-brand-primary)" label="Réel" />
        <Legend color="var(--color-edito-muted)" label="Haut" secondary />
      </div>
      <figcaption className="mt-3 text-center text-[10px] italic leading-relaxed text-edito-muted">
        Scénarios confondus sur la période
      </figcaption>
    </figure>
  )
}

export function ForecastRevenueResult({ result }: { result: ForecastRevenueResultData }) {
  return (
    <div className="px-5 pb-6 pt-6 text-edito-body">
      <section className="border-b border-edito-border pb-6" aria-labelledby="forecast-next-quarter">
        <p id="forecast-next-quarter" className="text-[11px] font-bold uppercase tracking-[0.18em] text-edito-heading">
          T suivant
        </p>
        <p className="mt-2 font-heading text-[clamp(3rem,16cqi,4.75rem)] font-black leading-none tracking-[-0.045em] text-edito-navy">
          {formatEuroCompact(result.summary.q_next_realistic)}
        </p>

        <dl className="mt-6 grid grid-cols-3">
          <Metric label="T courant" value={formatEuroCompact(result.summary.q_current_realistic)} />
          <Metric label="Couverture T+1" value={result.summary.missionsCoveringNextQuarter} separated />
          <Metric label="Tendance" value={trendLabel(result.summary.trend)} separated />
        </dl>
      </section>

      <div className="pt-6">
        <ForecastChart rows={result.months} />
      </div>

      <section aria-label="Détail mensuel">
        {result.months.map((month) => (
          <article key={month.month} className="border-b border-edito-border py-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-heading text-sm font-black leading-tight text-edito-navy">{month.label}</h4>
              <p className="shrink-0 text-sm font-black leading-tight text-brand-primary">{formatEuroCompact(month.realistic)}</p>
            </div>
            <p className="mt-2 text-[10px] font-medium leading-relaxed text-edito-body">
              Missions {formatEuroCompact(month.missionContribution)} <span aria-hidden="true">·</span> Pipe {formatEuroCompact(month.pipeContribution)} <span aria-hidden="true">·</span> Bas {formatEuroCompact(month.pessimistic)} <span aria-hidden="true">·</span>{" "}
              <strong className="font-bold text-brand-primary">Réel {formatEuroCompact(month.realistic)}</strong>{" "}
              <span aria-hidden="true">·</span> Haut {formatEuroCompact(month.optimistic)}
            </p>
          </article>
        ))}
      </section>

      <dl className="space-y-1 border-b border-edito-border py-4 text-[11px] leading-relaxed text-edito-body">
        <div>
          <dt className="inline font-semibold">Pipe pondéré total :</dt>{" "}
          <dd className="inline font-bold text-brand-primary">{formatEuroCompact(result.summary.pipeWeightedTotal)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Missions finissant au prochain trimestre :</dt>{" "}
          <dd className="inline font-bold text-brand-primary">{result.summary.missionsEndingNextQuarter}</dd>
        </div>
      </dl>

      {result.sourceIssues.length > 0 && (
        <aside className="mt-4 border-l-2 border-edito-brass pl-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-edito-heading">Données partielles</p>
          <p className="mt-1 text-[11px] leading-relaxed text-edito-muted">{result.sourceIssues.join(" ")}</p>
        </aside>
      )}
    </div>
  )
}

function Legend({ color, label, secondary = false }: { color: string; label: string; secondary?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-0 w-6 border-t-2 ${secondary ? "border-dashed opacity-70" : "relative"}`}
        style={{ borderColor: color }}
      />
      {label}
    </span>
  )
}

function Metric({ label, value, separated = false }: { label: string; value: number | string; separated?: boolean }) {
  return (
    <div className={separated ? "border-l border-edito-border pl-3" : "pr-3"}>
      <dt className="text-[9px] font-semibold leading-tight text-edito-muted">{label}</dt>
      <dd className="mt-1 text-[clamp(0.75rem,3.8cqi,0.95rem)] font-black leading-tight text-brand-primary">{value}</dd>
    </div>
  )
}
