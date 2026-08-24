"use client"

import { memo, useState } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import {
  getCoverageIndicator,
  type MobilePriorityItem,
} from "./mobile-priority-view-model"

export const MobilePriorityCard = memo(function MobilePriorityCard({
  item,
  onOpenActions,
  onOpenAccount,
  onWhyNowOpen,
}: {
  item: MobilePriorityItem
  onOpenActions: (accountId: string) => void
  onOpenAccount: (accountId: string) => void
  onWhyNowOpen: (accountId: string) => void
}) {
  const [whyNowOpen, setWhyNowOpen] = useState(false)
  const coverage = getCoverageIndicator(item.reachScore)

  const handleWhyNowToggle = () => {
    const next = !whyNowOpen
    setWhyNowOpen(next)
    if (next) onWhyNowOpen(item.accountId)
  }

  return (
    <SurfaceCard padding="none" radius="xl" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-heading leading-snug truncate">
              {item.accountName}
            </p>
            <p className="text-[11px] text-muted mt-0.5">{item.sector}</p>
          </div>
          <InactivityDot risk={item.inactivityRisk} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral" size="sm">{item.lifecycleLabel}</Badge>
          {item.priority === "haute" ? (
            <Badge variant="brass" size="sm" dot>{item.priorityLabel}</Badge>
          ) : null}
          <Badge variant={coverage.tone === "danger" ? "danger" : coverage.tone === "warning" ? "warning" : "success"} size="sm">
            Couv. {coverage.label.toLowerCase()}
          </Badge>
        </div>
      </div>

      {/* Recommendation */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted mb-0.5">
          Raison dominante
        </p>
        <p className="text-[13px] font-medium text-heading leading-snug">
          {item.recommendation.dominantReason}
        </p>

        <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted mt-2.5 mb-0.5">
          Action recommandée
        </p>
        <p className="text-xs font-medium text-primary">
          {item.recommendation.actionLabel}
        </p>

        {/* Activité et pipeline */}
        <div className="mt-3 flex items-center gap-3">
          <IndicatorChip label="Inactivité" value={item.inactivityRisk} />
          <span className="text-[11px] text-muted">·</span>
          <span className="text-[11px] text-body">
            {item.openOpportunityCount === 0
              ? "0 opp."
              : `${item.openOpportunityCount} opp. ouverte${item.openOpportunityCount > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Why Now Toggle */}
      <div className="px-4 py-1.5">
        <button
          type="button"
          onClick={handleWhyNowToggle}
          className="flex items-center gap-1 text-xs font-medium text-primary min-h-[44px]"
        >
          <svg
            className={cn("size-3.5 transition-transform duration-200", whyNowOpen && "rotate-180")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Pourquoi maintenant
        </button>
      </div>

      {/* Why Now Content */}
      {whyNowOpen ? (
        <div className="border-t border-border bg-surface-raised px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted mb-1">
            Pourquoi maintenant
          </p>
          <p className="text-xs text-body leading-relaxed">
            {item.recommendation.whyNow}
          </p>

          {item.recommendation.costOfInaction ? (
            <div className="mt-2.5 rounded-[var(--radius-medium)] border border-danger/15 bg-danger/[0.03] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-danger mb-0.5 flex items-center gap-1">
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Risque d&apos;inaction
              </p>
              <p className="text-xs text-heading leading-relaxed">
                {item.recommendation.costOfInaction}
              </p>
            </div>
          ) : null}

          {/* Indicateurs spécialisés */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <DetailIndicator label="Reach" value={item.reachScore} color={item.reachScore < 35 ? "danger" : "primary"} />
            <DetailIndicator label="Momentum" value={item.momentumScore} color={item.momentumScore < 25 ? "muted" : "info"} />
            <DetailIndicator label="Inactivité" value={item.inactivityRisk} color={item.inactivityRisk >= 70 ? "danger" : "primary"} />
          </div>

          {/* Factual evidence */}
          {item.evidence.length > 0 ? (
            <div className="mt-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted mb-1.5">
                Preuves factuelles
              </p>
              <ul className="flex flex-col gap-1">
                {item.evidence.map((e) => (
                  <li key={e.key} className="text-[11px] text-body leading-snug flex items-start gap-1.5">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
                    {e.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Data confidence */}
          {item.dataConfidence.isPartial ? (
            <div className="mt-2.5 flex items-center gap-1.5">
              <Badge variant="neutral" size="sm">
                <svg className="size-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Données {item.dataConfidence.level === "low" ? "limitées" : "partielles"}
              </Badge>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-border">
        <button
          type="button"
          onClick={() => onOpenActions(item.accountId)}
          disabled={item.primaryAction.disabled}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-medium)] px-4 py-2.5 text-[13px] font-medium min-h-[44px] transition-colors",
            item.primaryAction.disabled
              ? "bg-border text-muted cursor-not-allowed"
              : "bg-primary text-primary-fg",
          )}
        >
          <ActionIcon icon={item.primaryAction.icon} />
          {item.primaryAction.label}
        </button>
        <button
          type="button"
          onClick={() => onOpenActions(item.accountId)}
          className="flex size-11 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-body transition-colors"
          aria-label="Plus d'actions"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>
      </div>

      {/* Link to account */}
      <button
        type="button"
        onClick={() => onOpenAccount(item.accountId)}
        className="flex w-full items-center gap-1 border-t border-border px-4 py-2.5 text-xs font-medium text-primary min-h-[44px] transition-colors"
      >
        Ouvrir la fiche compte
        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </SurfaceCard>
  )
})

// ── Sub-components ───────────────────────────────────────────────────────────

function InactivityDot({ risk }: { risk: number }) {
  let color = "bg-muted"
  if (risk >= 80) color = "bg-danger"
  else if (risk >= 60) color = "bg-brand-brass"

  return (
    <span
      className={cn("mt-1 size-2 shrink-0 rounded-full", color)}
      title={`Risque d'inactivité : ${risk}/100`}
      aria-hidden="true"
    />
  )
}

function IndicatorChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-[11px] text-body">
      <span className="font-semibold text-heading">{value}</span>
      <span className="text-muted">/{label.charAt(0).toUpperCase()}</span>
    </span>
  )
}

const SCORE_BAR_COLORS: Record<string, string> = {
  "brand-brass": "bg-brand-brass",
  primary: "bg-primary",
  danger: "bg-danger",
  muted: "bg-muted",
  info: "bg-info",
}

function DetailIndicator({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-[var(--radius-small)] border border-border bg-surface px-2.5 py-2">
      <p className="text-[10px] text-muted font-medium">{label}</p>
      <p className="text-sm font-semibold text-heading mt-0.5">
        {value}<span className="text-[10px] text-muted font-normal">/100</span>
      </p>
      <div className="mt-1 h-[3px] rounded-full bg-border">
        <div
          className={cn("h-full rounded-full", SCORE_BAR_COLORS[color] ?? "bg-primary")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function ActionIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "calendar":
      return (
        <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    case "task":
      return (
        <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    case "opportunity":
      return (
        <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "advance":
      return (
        <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      )
    case "contact":
      return (
        <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    default:
      return null
  }
}
