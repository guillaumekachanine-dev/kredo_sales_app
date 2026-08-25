import type { ForecastRevenueResult as ForecastRevenueResultData } from "@/lib/intelligence/actions/forecast-revenue"
import { formatEuroCompact } from "@/lib/formatters"
import { cn } from "@/lib/utils"

function trendLabel(trend: ForecastRevenueResultData["summary"]["trend"]) {
  if (trend === "growing") return "Hausse"
  if (trend === "declining") return "Baisse"
  return "Stable"
}

function getIntensityLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0) return 0
  const ratio = value / max
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function intensityClasses(level: number): string {
  switch (level) {
    case 0:
      return "border-edito-border/40 bg-edito-chip/50 text-edito-muted font-normal"
    case 1:
      return "border-brand-primary/20 bg-brand-primary/10 text-edito-navy font-semibold"
    case 2:
      return "border-brand-primary/35 bg-brand-primary/25 text-edito-navy font-bold"
    case 3:
      return "border-brand-primary/55 bg-brand-primary/50 text-edito-navy font-black"
    case 4:
      return "border-brand-primary bg-brand-primary text-white font-black"
    default:
      return "border-edito-border/40 bg-edito-chip/50 text-edito-muted font-normal"
  }
}

export function ForecastRevenueResult({ result }: { result: ForecastRevenueResultData }) {
  const maxMonthValue = Math.max(...result.months.map((m) => m.realistic), 1)
  const maxCellVal = Math.max(
    ...(result.clientBreakdown ?? []).flatMap((c) => c.months.map((m) => m.revenue)),
    1,
  )

  return (
    <div className="px-5 pb-6 pt-5 text-edito-body">
      {/* A — Synthèse */}
      <section className="border-b border-edito-border pb-5" aria-labelledby="forecast-next-quarter">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <p id="forecast-next-quarter" className="text-[11px] font-bold uppercase tracking-wider text-edito-muted">
            CA projeté — prochain trimestre
          </p>
          <p className="font-heading text-2xl font-black tracking-tight text-edito-navy">
            {formatEuroCompact(result.summary.q_next_realistic)}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-edito-border/60 pt-4">
          <Metric label="CA projeté — trimestre en cours" value={formatEuroCompact(result.summary.q_current_realistic)} />
          <Metric label="Missions actives sur le prochain trimestre" value={result.summary.missionsCoveringNextQuarter} separated />
          <Metric label="Tendance du CA" value={trendLabel(result.summary.trend)} separated />
        </dl>
      </section>

      {/* B — Projection mensuelle */}
      <section aria-labelledby="forecast-monthly-title" className="border-b border-edito-border py-5">
        <div>
          <h3 id="forecast-monthly-title" className="font-heading text-xs font-black uppercase tracking-wider text-edito-heading">
            Projection mensuelle du CA
          </h3>
          <p className="mt-0.5 text-[10px] font-medium text-edito-muted">
            Missions actives + pipe commercial pondéré
          </p>
        </div>

        {result.months.length === 0 ? (
          <div className="mt-4 flex h-28 items-center justify-center text-xs text-edito-muted">
            Aucune donnée de prévision disponible
          </div>
        ) : (
          <div className="mt-4 flex h-36 items-end justify-around gap-3 px-1">
            {result.months.map((month) => {
              const heightPct = Math.max(14, Math.round((month.realistic / maxMonthValue) * 100))
              return (
                <div key={month.month} className="flex flex-1 flex-col items-center justify-end h-full gap-1.5">
                  <span className="text-[11px] font-black text-edito-navy">
                    {formatEuroCompact(month.realistic)}
                  </span>
                  <div className="w-full max-w-[52px] flex-1 flex flex-col justify-end">
                    <div
                      className="w-full rounded-t-md bg-brand-primary transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                      aria-label={`${month.label} : ${formatEuroCompact(month.realistic)}`}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-edito-heading">
                    {month.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* C — Répartition clients */}
      <section aria-labelledby="forecast-clients-title" className="border-b border-edito-border py-5">
        <div>
          <h3 id="forecast-clients-title" className="font-heading text-xs font-black uppercase tracking-wider text-edito-heading">
            Répartition clients
          </h3>
          <p className="mt-0.5 text-[10px] font-medium text-edito-muted">
            Facturation missions projetée (hors pipe non attribué)
          </p>
        </div>

        {!result.clientBreakdown || result.clientBreakdown.length === 0 ? (
          <div className="mt-4 rounded border border-dashed border-edito-border p-4 text-center text-xs text-edito-muted">
            Aucune mission active avec client sur la période
          </div>
        ) : (
          <div className="mt-4 w-full" role="grid" aria-label="Répartition du CA projeté par client">
            <div className="grid grid-cols-[minmax(90px,1.2fr)_repeat(3,minmax(0,1fr))] gap-1.5 pb-2" role="row">
              <span role="columnheader" className="self-end text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                Client
              </span>
              {result.months.map((m) => (
                <span key={m.month} role="columnheader" className="text-center text-[10px] font-bold text-edito-heading">
                  {m.label}
                </span>
              ))}
            </div>

            <div className="space-y-1.5">
              {result.clientBreakdown.map((client) => (
                <div
                  key={client.companyId ?? client.companyName}
                  className="grid grid-cols-[minmax(90px,1.2fr)_repeat(3,minmax(0,1fr))] gap-1.5 items-center"
                  role="row"
                >
                  <span
                    role="rowheader"
                    className="truncate pr-1 text-[10px] font-semibold text-edito-heading"
                    title={client.companyName}
                  >
                    {client.companyName}
                  </span>
                  {client.months.map((mCell) => {
                    const level = getIntensityLevel(mCell.revenue, maxCellVal)
                    return (
                      <div
                        key={mCell.month}
                        role="gridcell"
                        className={cn(
                          "flex h-9 items-center justify-center rounded-sm border px-1 text-center font-mono text-[9px] transition-colors",
                          intensityClasses(level)
                        )}
                        title={`${client.companyName} · ${mCell.revenue > 0 ? formatEuroCompact(mCell.revenue) : "0 €"}`}
                      >
                        {mCell.revenue > 0 ? formatEuroCompact(mCell.revenue) : "—"}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* D — Indicateurs complémentaires */}
      <section aria-labelledby="forecast-complementary-title" className="pt-5">
        <dl className="space-y-2.5 text-[11px] leading-relaxed text-edito-body">
          <div className="flex items-center justify-between border-b border-edito-border/50 pb-2.5">
            <dt className="font-semibold text-edito-heading">Pipe pondéré total :</dt>
            <dd className="font-bold text-brand-primary">{formatEuroCompact(result.summary.pipeWeightedTotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="font-semibold text-edito-heading">Missions finissant au prochain trimestre :</dt>
            <dd className="font-bold text-brand-primary">{result.summary.missionsEndingNextQuarter}</dd>
          </div>
        </dl>

        {result.sourceIssues.length > 0 && (
          <aside className="mt-4 border-l-2 border-edito-brass pl-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-edito-heading">Données partielles</p>
            <p className="mt-1 text-[11px] leading-relaxed text-edito-muted">{result.sourceIssues.join(" ")}</p>
          </aside>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, separated = false }: { label: string; value: number | string; separated?: boolean }) {
  return (
    <div className={separated ? "border-l border-edito-border/60 pl-2.5" : "pr-1"}>
      <dt className="text-[9px] font-semibold leading-tight text-edito-muted">{label}</dt>
      <dd className="mt-1 font-heading text-xs sm:text-sm font-black leading-tight text-brand-primary">{value}</dd>
    </div>
  )
}
