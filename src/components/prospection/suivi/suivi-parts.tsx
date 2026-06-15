// Helpers spécifiques au module « Suivi des Actions ».
// Primitives purement présentationnelles, sans état, sans dépendance données.
// Les primitives génériques (StatusDot, ProgressBar…) vivent dans ../prospection-parts
// et sont re-exportées ici pour que les vues gardent un seul point d'import.

import { cn } from "@/lib/utils"
import { STATUS_TEXT, STATUS_DOT, StatusDot, ProgressBar, CompanyLink } from "../prospection-parts"
import type { SuiviChannel, SuiviStatus, SuiviImpulsionKpi, SuiviActionCritique, SuiviRelanceIA } from "@/lib/prospection/suivi-data"

export { STATUS_TEXT, STATUS_DOT, StatusDot, ProgressBar, CompanyLink }

// ── Icônes canal ─────────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<SuiviChannel, React.ReactNode> = {
  call: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  email: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  linkedin: (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  meeting: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  task: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
}

const CHANNEL_LABEL: Record<SuiviChannel, string> = {
  call: "Appel",
  email: "Email",
  linkedin: "LinkedIn",
  meeting: "RDV",
  task: "Tâche",
}

// ── Chip canal ───────────────────────────────────────────────────────────────

export function ChannelChip({ channel }: { channel: SuiviChannel }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-body">
      <span className="text-muted">{CHANNEL_ICON[channel]}</span>
      {CHANNEL_LABEL[channel]}
    </span>
  )
}

// ── Icône canal (pour le flux d'actions mobile) ──────────────────────────────

export function ChannelIconCircle({ channel, className }: { channel: SuiviChannel; className?: string }) {
  const COLOR: Record<SuiviChannel, string> = {
    call: "bg-primary/[0.08] text-primary",
    email: "bg-success/[0.08] text-success",
    linkedin: "bg-primary/[0.08] text-primary",
    meeting: "bg-warning/[0.08] text-warning",
    task: "bg-muted/[0.12] text-muted",
  }
  return (
    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full", COLOR[channel], className)}>
      {CHANNEL_ICON[channel]}
    </span>
  )
}

export { CHANNEL_LABEL }

// ── Badge "Retard" ────────────────────────────────────────────────────────────

export function RetardBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-danger/[0.08] px-2 py-0.5 text-[10px] font-bold text-danger border border-danger/20">
      {label}
    </span>
  )
}

// ── Badge priorité ───────────────────────────────────────────────────────────

export function PriorityBadge({ status = "danger" }: { status?: SuiviStatus }) {
  const STYLES: Record<SuiviStatus, string> = {
    danger: "bg-danger/[0.08] text-danger border-danger/20",
    warning: "bg-warning/[0.08] text-warning border-warning/20",
    success: "bg-success/[0.08] text-success border-success/20",
    neutral: "bg-muted/[0.08] text-muted border-muted/20",
  }
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold", STYLES[status])}>
      Priority
    </span>
  )
}

// ── Avatar initiales ──────────────────────────────────────────────────────────

export function AvatarInitials({
  initials,
  status = "neutral",
  className,
}: {
  initials: string
  status?: SuiviStatus
  className?: string
}) {
  const RING: Record<SuiviStatus, string> = {
    danger: "ring-2 ring-danger/40",
    warning: "ring-2 ring-warning/30",
    success: "ring-2 ring-success/30",
    neutral: "ring-1 ring-border",
  }
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-extrabold select-none",
        RING[status],
        className
      )}
    >
      {initials}
    </span>
  )
}

// ── Mini graphe IA (barres) ──────────────────────────────────────────────────
// Simule un mini sparkbar pour ai_success_prediction / ai_recommended_step.

export function AiSparkBars({
  value,
  color = "bg-primary",
  className,
}: {
  value: number // 0.0-1.0
  color?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(1, value))
  const barCount = 5
  const filledBars = Math.round(pct * barCount)
  return (
    <span className={cn("inline-flex items-end gap-[2px]", className)}>
      {Array.from({ length: barCount }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block w-[3px] rounded-sm transition-all",
            i < filledBars ? color : "bg-border"
          )}
          style={{ height: `${6 + i * 2}px` }}
        />
      ))}
    </span>
  )
}

// ── Jauge circulaire (urgences) — SVG inline ────────────────────────────────

export function GaugeArc({ value, max = 20 }: { value: number; max?: number }) {
  const pct = Math.min(1, value / max)
  const r = 30
  const cx = 40
  const cy = 44
  // Arc de 200° centré en bas
  const startAngle = -200 / 2 // -100° depuis le haut
  const arc = 200

  function polarToXY(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const startDeg = -90 + startAngle // -190
  const endAllDeg = startDeg + arc   // 10
  const endFillDeg = startDeg + arc * pct

  const s = polarToXY(startDeg)
  const eAll = polarToXY(endAllDeg)
  const eFill = polarToXY(endFillDeg)

  const arcPath = (fromX: number, fromY: number, toX: number, toY: number, largeArc: 0 | 1) =>
    `M ${fromX} ${fromY} A ${r} ${r} 0 ${largeArc} 1 ${toX} ${toY}`

  const bgLarge: 0 | 1 = arc > 180 ? 1 : 0
  const fillDeg = arc * pct
  const fillLarge: 0 | 1 = fillDeg > 180 ? 1 : 0

  const strokeColor = pct < 0.3 ? "#2C7D5C" : pct < 0.6 ? "#C08A20" : "#BE3E3E"

  return (
    <svg width="80" height="56" viewBox="0 0 80 56" className="overflow-visible">
      {/* Track */}
      <path
        d={arcPath(s.x, s.y, eAll.x, eAll.y, bgLarge)}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Fill */}
      {pct > 0 && (
        <path
          d={arcPath(s.x, s.y, eFill.x, eFill.y, fillLarge)}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
      {/* Value */}
      <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
        className="text-heading font-extrabold"
        style={{ fontSize: 18, fontWeight: 800, fill: "var(--color-heading)", fontFamily: "var(--font-heading)" }}
      >
        {value}
      </text>
    </svg>
  )
}

// ── Workload sparkline (mini area chart) ──────────────────────────────────────

export function WorkloadSparkline({ pct }: { pct: number }) {
  // Points simulant une courbe de charge de travail
  const pts = [0.5, 0.6, 0.55, 0.7, 0.75, 0.68, pct / 100]
  const w = 80
  const h = 28
  const points = pts.map((v, i) => ({
    x: (i / (pts.length - 1)) * w,
    y: h - v * h,
  }))
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const fillD = `${pathD} L ${w} ${h} L 0 ${h} Z`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#spark-fill)" />
      <path d={pathD} fill="none" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── KPI Card dispatcher ───────────────────────────────────────────────────────

import React from "react"
import type {} from "react"

export function ImpulsionKpiCard({ kpi }: { kpi: SuiviImpulsionKpi }) {
  if (kpi.variant === "gauge") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider leading-tight">{kpi.label}</span>
        <div className="flex items-end justify-center pt-1">
          <GaugeArc value={Number(kpi.value)} max={kpi.gaugeMax ?? 20} />
        </div>
      </div>
    )
  }

  if (kpi.variant === "progress") {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider leading-tight">{kpi.label}</span>
        <span className="text-2xl font-extrabold text-heading leading-none tabular-nums">{kpi.value}</span>
        <ProgressBar value={kpi.numericValue ?? 0} status="neutral" />
        <span className="text-[10px] text-muted text-right">{kpi.subLabel}</span>
      </div>
    )
  }

  if (kpi.variant === "big") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider leading-tight">{kpi.label}</span>
        <span className={cn("text-4xl font-extrabold leading-none tabular-nums mt-2", STATUS_TEXT[kpi.status])}>
          {kpi.value}
        </span>
        {kpi.numericValue !== undefined && (
          <div className="mt-2">
            <WorkloadSparkline pct={kpi.numericValue} />
          </div>
        )}
      </div>
    )
  }

  // workload
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider leading-tight">{kpi.label}</span>
      <span className={cn("text-2xl font-extrabold leading-none tabular-nums mt-1", STATUS_TEXT[kpi.status])}>
        {kpi.value}
      </span>
      {kpi.numericValue !== undefined && (
        <div className="mt-2">
          <WorkloadSparkline pct={kpi.numericValue} />
        </div>
      )}
    </div>
  )
}

// ── Action Critique Card ──────────────────────────────────────────────────────

export function ActionCritiqueCard({
  action,
  onConsigner,
}: {
  action: SuiviActionCritique
  onConsigner?: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-sm",
        action.status === "danger" ? "border-danger/30 bg-gradient-to-r from-danger/[0.02] to-transparent" : "border-border"
      )}
    >
      {/* Row 1 : avatar + meta + retard badge */}
      <div className="flex items-start gap-3">
        <AvatarInitials initials={action.avatarInitials} status={action.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-heading truncate">{action.consultantName}</span>
            <RetardBadge label={action.overdueLabel} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-muted">{/* channel icon inline */}</span>
            <ChannelChip channel={action.channel} />
            {action.practice && (
              <span className="text-[10px] text-muted">{action.practice}</span>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 : description */}
      <p className="text-xs text-body leading-relaxed line-clamp-2">{action.description}</p>

      {/* Row 3 : meta (date + badges) + CTA */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {action.overdueLabel}
        </span>
        <PriorityBadge status={action.status} />
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => onConsigner?.(action.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/[0.07] border border-primary/20 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
          >
            Consigner l&apos;Action
          </button>
        </div>
      </div>

      {/* Row 4 : AI prediction + step */}
      <div className="flex items-center gap-3 pt-1 border-t border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-mono text-muted whitespace-nowrap">ai_success_prediction</span>
          <AiSparkBars value={action.aiSuccessPrediction} color="bg-primary" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-mono text-muted whitespace-nowrap">ai_recommended_next_step</span>
          <AiSparkBars value={action.aiSuccessPrediction * 0.85} color="bg-success" />
        </div>
      </div>
    </div>
  )
}

// ── Relance IA Card ───────────────────────────────────────────────────────────

export function RelanceIACard({
  relance,
  onPlanifier,
}: {
  relance: SuiviRelanceIA
  onPlanifier?: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-sm hover:border-primary/30">
      {/* Row 1 : avatar + meta */}
      <div className="flex items-start gap-3">
        <AvatarInitials initials={relance.avatarInitials} status="neutral" className="bg-primary/[0.08] text-primary ring-1 ring-primary/20" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-heading truncate">{relance.company}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ChannelChip channel={relance.channel} />
            <span className="text-[10px] text-muted truncate">{relance.sector}</span>
          </div>
        </div>
      </div>

      {/* Row 2 : description */}
      <p className="text-xs text-body leading-relaxed line-clamp-2">{relance.description}</p>

      {/* Row 3 : CTA */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => onPlanifier?.(relance.id)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-primary-deep"
        >
          Planifier l&apos;Action
        </button>
      </div>

      {/* Row 4 : AI strips */}
      <div className="flex items-center gap-3 pt-1 border-t border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-mono text-muted whitespace-nowrap">ai_success_prediction</span>
          <AiSparkBars value={relance.aiSuccessPrediction} color="bg-primary" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-mono text-muted whitespace-nowrap">ai_recommended_next_step</span>
          <AiSparkBars value={relance.aiSuccessPrediction * 0.8} color="bg-success" />
        </div>
      </div>
    </div>
  )
}

// ── Legacy exports (rétrocompatibilité avec les anciens imports éventuels) ────

export type SuiviDeadlineChannel = SuiviChannel

const HORIZON_LABEL: Record<"court_terme" | "moyen_terme" | "long_terme", string> = {
  court_terme: "Court terme",
  moyen_terme: "Moyen terme",
  long_terme: "Long terme",
}

export function HorizonBadge({ horizon }: { horizon: "court_terme" | "moyen_terme" | "long_terme" }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/[0.07] px-2 py-0.5 text-[10px] font-medium text-primary">
      {HORIZON_LABEL[horizon]}
    </span>
  )
}

export function ChannelTag({ channel }: { channel: SuiviChannel }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
      {CHANNEL_LABEL[channel]}
    </span>
  )
}

export function CampaignStatusPill({ status }: { status: "active" | "paused" | "draft" | "done" }) {
  const MAP: Record<string, { label: string; status: SuiviStatus }> = {
    active: { label: "Active", status: "success" },
    paused: { label: "En pause", status: "warning" },
    draft: { label: "Brouillon", status: "neutral" },
    done: { label: "Terminée", status: "neutral" },
  }
  const { label, status: tone } = MAP[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", STATUS_TEXT[tone])}>
      <StatusDot status={tone} />
      {label}
    </span>
  )
}
