"use client"

import Link from "next/link"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { KpiCard } from "@/components/ui/KpiCard"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { StatusPill } from "@/components/ui/StatusPill"
import { DiagnosticSection } from "@/components/intelligence/diagnostic/DiagnosticSection"
import "./cockpit-desktop.css"

import type {
  CockpitDashboardData,
  CockpitStatus,
} from "@/lib/cockpit/cockpit-data"
import type { WorkspaceDiagnosticSnapshot } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

function deltaTone(status: CockpitStatus): "positive" | "negative" | "neutral" {
  if (status === "success") return "positive"
  if (status === "danger") return "negative"
  return "neutral"
}

function euroTick(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M€`
  return `${Math.round(value / 1_000)} k€`
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

function RailSummary({
  accounts,
  financeWatch,
}: Pick<CockpitDashboardData, "accounts" | "financeWatch">) {
  return (
    <div className="flex flex-col gap-4">
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
                className="rounded-[var(--radius-large)] border border-border bg-canvas/55 p-4 transition-colors hover:bg-surface-hover kredo-rail-account"
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
  diagnostic,
}: {
  data: CockpitDashboardData
  diagnostic: WorkspaceDiagnosticSnapshot | null
}) {
  return (
    <DesktopAnalyticalPage
      className="kredo-cockpit-desktop"
      eyebrow="Centre de profit"
      title="Cockpit"
      maxWidth="full"
      railWidth="wide"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/missions"
            className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-surface-hover hover:text-heading cursor-pointer"
          >
            Voir les missions
          </Link>
          <Link
            href="/prospection/accounts"
            className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-surface-hover hover:text-heading cursor-pointer"
          >
            Voir les comptes
          </Link>
        </div>
      }
      toolbar={<DiagnosticSection initialSnapshot={diagnostic} />}
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
          accounts={data.accounts}
          financeWatch={data.financeWatch}
        />
      }
    >
      <RevenueTrajectory {...data.trajectory} />
    </DesktopAnalyticalPage>
  )
}
