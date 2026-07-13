import { CockpitSectionHeading } from "@/components/cockpit/desktop/CockpitSectionHeading"

import type { CockpitTrajectory as CockpitTrajectoryData } from "@/lib/cockpit/cockpit-desktop-types"

function euroTick(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—"
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M€`
  return `${Math.round(value / 1_000)} k€`
}

export function CockpitTrajectory({ trajectory }: { trajectory: CockpitTrajectoryData }) {
  const { points, ytdRevenueActual, ytdRevenueTarget, ytdMarginActual, ytdMarginTarget } = trajectory
  const width = 640
  const height = 178
  const paddingX = 18
  const paddingTop = 14
  const paddingBottom = 24
  const maxRevenue = Math.max(...points.map((point) => Math.max(point.revenueActual ?? 0, point.revenueTarget)), 1)
  const safeLastIndex = Math.max(1, points.length - 1)
  const xFor = (index: number) => paddingX + (index * (width - paddingX * 2)) / safeLastIndex
  const yFor = (value: number) => paddingTop + (1 - value / maxRevenue) * (height - paddingTop - paddingBottom)
  const actualPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.revenueActual ?? 0)}`).join(" ")
  const targetPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.revenueTarget)}`).join(" ")
  const delta = ytdRevenueActual !== null && ytdRevenueTarget !== null ? ytdRevenueActual - ytdRevenueTarget : null

  return (
    <section className="kredo-cockpit-desktop__panel kredo-cockpit-desktop__trajectory">
      <CockpitSectionHeading eyebrow="Horizon 90 jours" title="Trajectoire et exposition à venir">
        <span className="kredo-cockpit-desktop__section-caption">
          {delta === null ? "Données en attente" : `${delta >= 0 ? "+" : ""}${euroTick(delta)} vs plan`}
        </span>
      </CockpitSectionHeading>

      <div className="mt-4 flex items-center gap-5 text-xs font-semibold">
        <span className="text-primary">Réel</span>
        <span className="text-brand-brass">Plan</span>
      </div>
      <div className="mt-2 overflow-hidden border-y border-border/75 py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-[154px] w-full" role="img" aria-label="Trajectoire du chiffre d’affaires réel et du plan">
          {[0.25, 0.5, 0.75].map((step) => (
            <line
              key={step}
              x1={paddingX}
              y1={yFor(maxRevenue * step)}
              x2={width - paddingX}
              y2={yFor(maxRevenue * step)}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
          ))}
          <path d={targetPath} fill="none" stroke="var(--color-brand-brass)" strokeWidth="2" strokeDasharray="5 4" />
          <path d={actualPath} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={point.monthLabel}>
              <circle cx={xFor(index)} cy={yFor(point.revenueActual ?? 0)} r="3" fill="var(--color-bg-surface)" stroke="var(--color-primary)" strokeWidth="1.5" />
              <text x={xFor(index)} y={height - 5} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10">
                {point.monthLabel}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div><p className="kredo-cockpit-desktop__metric-label">CA réel</p><p className="mt-1 text-sm font-semibold text-heading">{euroTick(ytdRevenueActual)}</p></div>
        <div><p className="kredo-cockpit-desktop__metric-label">CA cible</p><p className="mt-1 text-sm font-semibold text-heading">{euroTick(ytdRevenueTarget)}</p></div>
        <div><p className="kredo-cockpit-desktop__metric-label">Marge YTD</p><p className="mt-1 text-sm font-semibold text-heading">{ytdMarginActual === null ? "—" : `${ytdMarginActual.toFixed(1)}%`}{ytdMarginTarget !== null ? <span className="ml-1 text-xs font-normal text-muted">/ {ytdMarginTarget}%</span> : null}</p></div>
      </div>
    </section>
  )
}
