import Link from "next/link"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { KpiCard } from "@/components/ui/KpiCard"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { InsightCard } from "@/components/ui/InsightCard"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { CockpitFlowCanvas } from "@/components/cockpit/CockpitFlowCanvas"
import type {
  CockpitAttentionItem,
  CockpitDashboardData,
  CockpitHealthAxis,
  CockpitRenewalItem,
  CockpitStatus,
} from "@/lib/cockpit/cockpit-data"

function deltaTone(status: CockpitStatus): "positive" | "negative" | "neutral" {
  if (status === "success") return "positive"
  if (status === "danger") return "negative"
  return "neutral"
}

function pillVariant(status: CockpitStatus): StatusPillVariant {
  if (status === "success") return "success"
  if (status === "warning") return "warning"
  if (status === "danger") return "danger"
  return "neutral"
}

function euroTick(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M€`
  return `${Math.round(value / 1_000)} k€`
}

function HeaderActionLink({
  href,
  label,
  tone = "default",
}: {
  href: string
  label: string
  tone?: "default" | "primary"
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-10 items-center rounded-[var(--radius-medium)] border px-4 text-sm font-semibold transition-colors",
        tone === "primary"
          ? "border-transparent bg-primary text-primary-fg hover:bg-primary-deep"
          : "border-border bg-surface text-heading hover:bg-surface-hover",
      ].join(" ")}
    >
      {label}
    </Link>
  )
}

function HealthConstellation({ axes }: { axes: CockpitHealthAxis[] }) {
  const center = 170
  const outerRadius = 108
  const labelRadius = 145
  const ringLevels = [0.25, 0.5, 0.75, 1]
  const polygon = axes
    .map((axis, index) => {
      const angle = ((Math.PI * 2) / axes.length) * index - Math.PI / 2
      const radius = outerRadius * (axis.score / 100)
      const x = center + Math.cos(angle) * radius
      const y = center + Math.sin(angle) * radius
      return `${x},${y}`
    })
    .join(" ")

  return (
    <SurfaceCard className="h-full">
      <div className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Lecture Multi-Axes
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Situation du centre de profit
            </h2>
          </div>
          <StatusPill
            label={`${Math.round(axes.reduce((sum, axis) => sum + axis.score, 0) / axes.length)}/100`}
            variant="inProgress"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="grid gap-3">
            {axes.map((axis) => (
              <div
                key={axis.id}
                className="rounded-[var(--radius-large)] border border-border bg-canvas/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-heading">{axis.label}</p>
                  <StatusPill
                    label={`${axis.score}`}
                    variant={pillVariant(axis.status)}
                  />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className={[
                      "h-full rounded-full",
                      axis.status === "success"
                        ? "bg-success"
                        : axis.status === "danger"
                          ? "bg-danger"
                          : "bg-warning",
                    ].join(" ")}
                    style={{ width: `${axis.score}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-body">{axis.detail}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[var(--radius-large)] border border-border bg-primary/[0.04] p-4">
            <svg viewBox="0 0 340 340" className="mx-auto aspect-square w-full max-w-[28rem]">
              {ringLevels.map((level) => (
                <circle
                  key={level}
                  cx={center}
                  cy={center}
                  r={outerRadius * level}
                  fill="none"
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="3 7"
                />
              ))}

              {axes.map((axis, index) => {
                const angle = ((Math.PI * 2) / axes.length) * index - Math.PI / 2
                const x2 = center + Math.cos(angle) * outerRadius
                const y2 = center + Math.sin(angle) * outerRadius
                const lx = center + Math.cos(angle) * labelRadius
                const ly = center + Math.sin(angle) * labelRadius

                return (
                  <g key={axis.id}>
                    <line
                      x1={center}
                      y1={center}
                      x2={x2}
                      y2={y2}
                      stroke="currentColor"
                      className="text-border"
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      className="fill-[var(--color-text-secondary)] text-[11px] font-semibold"
                    >
                      {axis.label}
                    </text>
                  </g>
                )
              })}

              <polygon
                points={polygon}
                fill="var(--color-brand-primary)"
                fillOpacity="0.18"
                stroke="var(--color-brand-primary)"
                strokeOpacity="0.75"
                strokeWidth="2"
              />

              {axes.map((axis, index) => {
                const angle = ((Math.PI * 2) / axes.length) * index - Math.PI / 2
                const radius = outerRadius * (axis.score / 100)
                const x = center + Math.cos(angle) * radius
                const y = center + Math.sin(angle) * radius

                return (
                  <circle
                    key={axis.id}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="currentColor"
                    className={
                      axis.status === "success"
                        ? "text-success"
                        : axis.status === "danger"
                          ? "text-danger"
                          : "text-warning"
                    }
                  />
                )
              })}

              <circle
                cx={center}
                cy={center}
                r="30"
                fill="var(--color-bg-surface)"
                stroke="currentColor"
                className="text-border"
              />
              <text
                x={center}
                y={center - 4}
                textAnchor="middle"
                className="fill-[var(--color-text-primary)] text-[12px] font-semibold"
              >
                Santé
              </text>
              <text
                x={center}
                y={center + 15}
                textAnchor="middle"
                className="fill-[var(--color-brand-primary)] text-[18px] font-bold"
              >
                {Math.round(axes.reduce((sum, axis) => sum + axis.score, 0) / axes.length)}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </SurfaceCard>
  )
}

function RevenueTrajectory({
  points,
  ytdRevenueActual,
  ytdRevenueTarget,
  ytdMarginActual,
  ytdMarginTarget,
}: CockpitDashboardData["trajectory"]) {
  const width = 640
  const height = 260
  const paddingX = 28
  const paddingTop = 20
  const paddingBottom = 30
  const maxRevenue = Math.max(
    ...points.map((point) => Math.max(point.revenueActual ?? 0, point.revenueTarget)),
    1,
  )

  const xFor = (index: number) =>
    paddingX + (index * (width - paddingX * 2)) / Math.max(1, points.length - 1)
  const yFor = (value: number) =>
    paddingTop + (1 - value / maxRevenue) * (height - paddingTop - paddingBottom)

  const actualPath = points
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L"
      return `${prefix} ${xFor(index)} ${yFor(point.revenueActual ?? 0)}`
    })
    .join(" ")
  const areaPath = `${actualPath} L ${xFor(points.length - 1)} ${height - paddingBottom} L ${xFor(0)} ${height - paddingBottom} Z`
  const targetPath = points
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L"
      return `${prefix} ${xFor(index)} ${yFor(point.revenueTarget)}`
    })
    .join(" ")

  const delta = ytdRevenueActual - ytdRevenueTarget
  const deltaLabel = `${delta >= 0 ? "+" : ""}${euroTick(delta)}`

  return (
    <SurfaceCard className="h-full">
      <div className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Trajectoire
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Revenu réel vs plan 2026
            </h2>
          </div>
          <StatusPill
            label={deltaLabel}
            variant={delta >= 0 ? "success" : "warning"}
          />
        </div>

        <div className="overflow-hidden rounded-[var(--radius-large)] border border-border bg-canvas/50 p-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
            {[0.25, 0.5, 0.75, 1].map((step) => {
              const y = yFor(maxRevenue * step)
              return (
                <line
                  key={step}
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="4 6"
                />
              )
            })}

            <path d={areaPath} fill="var(--color-brand-primary)" fillOpacity="0.10" />
            <path
              d={targetPath}
              fill="none"
              stroke="var(--color-brand-brass)"
              strokeOpacity="0.95"
              strokeWidth="2.5"
              strokeDasharray="8 8"
            />
            <path
              d={actualPath}
              fill="none"
              stroke="var(--color-brand-primary)"
              strokeOpacity="0.95"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) => (
              <g key={point.monthLabel}>
                <circle
                  cx={xFor(index)}
                  cy={yFor(point.revenueActual ?? 0)}
                  r="4"
                  fill="var(--color-bg-surface)"
                  stroke="var(--color-brand-primary)"
                  strokeOpacity="0.95"
                  strokeWidth="2"
                />
                <text
                  x={xFor(index)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-[var(--color-text-secondary)] text-[11px] font-medium"
                >
                  {point.monthLabel}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[var(--radius-large)] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              YTD réel
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">
              {euroTick(ytdRevenueActual)}
            </p>
          </div>
          <div className="rounded-[var(--radius-large)] border border-brand-brass/25 bg-brand-brass/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              YTD cible
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">
              {euroTick(ytdRevenueTarget)}
            </p>
          </div>
          <div className="rounded-[var(--radius-large)] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Marge YTD
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">
              {ytdMarginActual !== null ? `${ytdMarginActual.toFixed(1)}%` : "—"}
            </p>
            <p className="mt-1 text-sm text-body">cible {ytdMarginTarget}%</p>
          </div>
        </div>
      </div>
    </SurfaceCard>
  )
}

function AttentionStack({ items }: { items: CockpitAttentionItem[] }) {
  return (
    <SurfaceCard className="h-full">
      <div className="flex h-full flex-col gap-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Arbitrages
          </p>
          <h2 className="mt-2 text-lg font-semibold text-heading">
            Points de tension
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-[var(--radius-large)] border border-border bg-canvas/55 p-4 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-heading">{item.title}</p>
                  <p className="mt-1 text-sm text-body">{item.subtitle}</p>
                </div>
                <StatusPill label={item.actionLabel} variant={pillVariant(item.status)} />
              </div>
              <p className="mt-3 text-sm leading-6 text-body">{item.detail}</p>
            </Link>
          ))}
        </div>
      </div>
    </SurfaceCard>
  )
}

function RenewalWatch({ renewals }: { renewals: CockpitRenewalItem[] }) {
  return (
    <SurfaceCard className="h-full">
      <div className="flex h-full flex-col gap-4 p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Continuité Delivery
          </p>
          <h2 className="mt-2 text-xl font-semibold text-heading">
            Renouvellements et sorties à surveiller
          </h2>
        </div>

        <div className="grid gap-3">
          {renewals.map((item) => (
            <div
              key={item.id}
              className="grid items-center gap-3 rounded-[var(--radius-large)] border border-border bg-canvas/55 p-4 md:grid-cols-[minmax(0,1.3fr)_auto_auto_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-heading">{item.company}</p>
                <p className="mt-1 truncate text-sm text-body">{item.title}</p>
              </div>
              <StatusPill label={item.dueLabel} variant={pillVariant(item.status)} />
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Marge</p>
                <p className="mt-1 text-sm font-semibold text-heading">{item.marginLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">CA trim.</p>
                <p className="mt-1 text-sm font-semibold text-heading">{item.revenueLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SurfaceCard>
  )
}

function RailSummary({
  headline,
  recommendation,
  accounts,
  financeWatch,
}: Pick<CockpitDashboardData, "headline" | "recommendation" | "accounts" | "financeWatch">) {
  return (
    <div className="flex flex-col gap-4">
      <InsightCard
        eyebrow="Lecture IA"
        title="Ce qui compte maintenant"
        summary={headline}
        recommendation={recommendation}
        sourceLabel="finance · staffing · prospection · missions"
      />

      <SurfaceCard>
        <div className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Comptes à animer
            </p>
            <h3 className="mt-2 text-lg font-semibold text-heading">
              Activation ciblée
            </h3>
          </div>
          <div className="flex flex-col gap-3">
            {accounts.map((item) => (
              <Link
                key={item.id}
                href={`/prospection/accounts/${item.id}`}
                className="rounded-[var(--radius-large)] border border-border bg-canvas/55 p-4 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-heading">{item.name}</p>
                    <p className="mt-1 text-sm text-body">{item.sector}</p>
                  </div>
                  <StatusPill label={item.scoreLabel} variant="info" />
                </div>
                <p className="mt-3 text-sm text-body">{item.lifecycleLabel}</p>
              </Link>
            ))}
          </div>
        </div>
      </SurfaceCard>

      {financeWatch.length > 0 ? (
        <AlertBlock
          variant="warning"
          title="Facturation à surveiller"
          description={`${financeWatch[0].clientName} · ${financeWatch[0].detail} · ${financeWatch[0].valueLabel}`}
          href="/finance"
        />
      ) : null}
    </div>
  )
}

export function CockpitDesktopDashboard({
  data,
}: {
  data: CockpitDashboardData
}) {
  return (
    <DesktopAnalyticalPage
      eyebrow="Centre de profit"
      title="Cockpit"
      maxWidth="full"
      railWidth="wide"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <HeaderActionLink href="/missions" label="Voir les missions" />
          <HeaderActionLink href="/staffing" label="Arbitrer le staffing" />
          <HeaderActionLink href="/prospection" label="Animer le pipe" />
          <HeaderActionLink href="/finance" label="Ouvrir la finance" tone="primary" />
        </div>
      }
      kpis={
        <div className="grid gap-4 xl:grid-cols-4">
          {data.kpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              context={kpi.detail}
              delta={kpi.trendBadge}
              deltaTone={deltaTone(kpi.status)}
              accent={kpi.id === "c-weighted-pipe" ? "brass" : "none"}
            />
          ))}
        </div>
      }
      rail={
        <RailSummary
          headline={data.headline}
          recommendation={data.recommendation}
          accounts={data.accounts}
          financeWatch={data.financeWatch}
        />
      }
      lowerContent={
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <RenewalWatch renewals={data.renewals} />
          <AttentionStack items={data.attentionItems} />
        </div>
      }
    >
      <div className="grid gap-6">
        <HealthConstellation axes={data.healthAxes} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <RevenueTrajectory {...data.trajectory} />
          <SurfaceCard className="h-full">
            <div className="p-6">
              <CockpitFlowCanvas flow={data.flow} />
            </div>
          </SurfaceCard>
        </div>
      </div>
    </DesktopAnalyticalPage>
  )
}
