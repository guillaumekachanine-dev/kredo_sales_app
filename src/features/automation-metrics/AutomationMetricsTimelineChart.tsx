"use client"

import type { AutomationMetricsTimelinePoint } from "./automation-metrics-types"

function formatRate(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)} %`
}

function ratePath(points: AutomationMetricsTimelinePoint[], xFor: (index: number) => number, yFor: (value: number) => number): string {
  let path = ""
  let connected = false
  points.forEach((point, index) => {
    if (point.successRatePct === null) {
      connected = false
      return
    }
    path += `${connected ? "L" : "M"}${xFor(index)} ${yFor(point.successRatePct)} `
    connected = true
  })
  return path.trim()
}

export function AutomationMetricsTimelineChart({ timeline }: { timeline: AutomationMetricsTimelinePoint[] }) {
  const width = 760
  const height = 290
  const padding = { top: 20, right: 48, bottom: 42, left: 38 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const volumeMaximum = Math.max(1, ...timeline.map((point) => point.succeeded + point.failed))
  const step = timeline.length > 0 ? chartWidth / timeline.length : chartWidth
  const xFor = (index: number) => padding.left + step * index + step / 2
  const volumeY = (value: number) => padding.top + chartHeight - (value / volumeMaximum) * chartHeight
  const rateY = (value: number) => padding.top + chartHeight - (value / 100) * chartHeight
  const barWidth = Math.max(2, Math.min(28, step * 0.58))
  const labelEvery = timeline.length <= 8 ? 1 : timeline.length <= 31 ? 4 : 6
  const hasData = timeline.some((point) => point.succeeded + point.failed > 0)
  const path = ratePath(timeline, xFor, rateY)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/60" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-success" />Réussis</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-danger/75" />Échoués</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-3 bg-primary" />Taux de succès</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-px w-3 border-t border-dashed border-white/45" />Seuil 90 %</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Exécutions réussies et échouées, avec taux de succès, par période"
        className="h-auto w-full overflow-visible"
      >
        <title>Exécutions et fiabilité dans le temps</title>
        <desc>Les colonnes empilent les runs réussis et échoués. La courbe indique le taux de succès des runs décidés ; les runs sans décision ne créent pas de taux.</desc>
        <line x1={padding.left} x2={width - padding.right} y1={volumeY(0)} y2={volumeY(0)} stroke="rgba(255,255,255,0.18)" />
        <line x1={padding.left} x2={width - padding.right} y1={rateY(90)} y2={rateY(90)} stroke="rgba(255,255,255,0.42)" strokeDasharray="4 4" />
        <text x={width - padding.right + 5} y={rateY(90) + 3} fill="rgba(255,255,255,0.55)" fontSize="10">90 %</text>
        <text x={padding.left - 7} y={padding.top + 3} textAnchor="end" fill="rgba(255,255,255,0.55)" fontSize="10">{volumeMaximum}</text>
        <text x={padding.left - 7} y={volumeY(0) + 3} textAnchor="end" fill="rgba(255,255,255,0.55)" fontSize="10">0</text>

        {timeline.map((point, index) => {
          const successfulHeight = (point.succeeded / volumeMaximum) * chartHeight
          const failedHeight = (point.failed / volumeMaximum) * chartHeight
          const x = xFor(index) - barWidth / 2
          const successY = volumeY(0) - successfulHeight
          const failureY = successY - failedHeight
          const showLabel = index % labelEvery === 0 || index === timeline.length - 1

          return (
            <g key={point.key}>
              {point.succeeded > 0 ? <rect x={x} y={successY} width={barWidth} height={successfulHeight} rx="1.5" fill="var(--color-success)" /> : null}
              {point.failed > 0 ? <rect x={x} y={failureY} width={barWidth} height={failedHeight} rx="1.5" fill="var(--color-danger)" opacity="0.76" /> : null}
              {showLabel ? <text x={xFor(index)} y={height - 17} textAnchor="middle" fill="rgba(255,255,255,0.48)" fontSize="9">{point.label}</text> : null}
            </g>
          )
        })}

        {path ? <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {timeline.map((point, index) => point.successRatePct === null ? null : (
          <circle key={`${point.key}-rate`} cx={xFor(index)} cy={rateY(point.successRatePct)} r="2.5" fill="var(--color-primary)" stroke="#0f122c" strokeWidth="1" />
        ))}
        {!hasData ? <text x={width / 2} y={padding.top + chartHeight / 2} textAnchor="middle" fill="rgba(255,255,255,0.52)" fontSize="12">Aucune exécution sur cette période</text> : null}
      </svg>

      <div className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-[10px] text-white/55">
        Les colonnes ne représentent que les runs décidés. Les runs en attente, en cours et annulés restent comptés dans le KPI Exécutions, mais ne modifient pas le taux de succès.
      </div>
      <table className="sr-only">
        <caption>Données détaillées du graphique Exécutions et fiabilité dans le temps</caption>
        <thead><tr><th>Période</th><th>Réussis</th><th>Échoués</th><th>Taux de succès</th></tr></thead>
        <tbody>{timeline.map((point) => <tr key={`${point.key}-row`}><td>{point.label}</td><td>{point.succeeded}</td><td>{point.failed}</td><td>{formatRate(point.successRatePct)}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
