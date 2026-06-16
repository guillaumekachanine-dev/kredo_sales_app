import React from "react"
import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

export type MobileHeroInsightTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"

export interface MobileHeroInsightProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  value?: React.ReactNode
  summary?: React.ReactNode
  primaryAction?: React.ReactNode
  secondaryAction?: React.ReactNode
  confidence?: React.ReactNode
  sourceLabel?: React.ReactNode
  updatedAt?: React.ReactNode
  icon?: React.ReactNode
  tone?: MobileHeroInsightTone
  className?: string
}

const toneAccentClasses: Record<MobileHeroInsightTone, string> = {
  neutral: "border-l-border",
  brand: "border-l-primary",
  info: "border-l-info",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
}

const toneBadgeVariant: Record<MobileHeroInsightTone, "neutral" | "brand" | "info" | "success" | "warning" | "danger"> = {
  neutral: "neutral",
  brand: "brand",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
}

export function MobileHeroInsight({
  eyebrow,
  title,
  value,
  summary,
  primaryAction,
  secondaryAction,
  confidence,
  sourceLabel,
  updatedAt,
  icon,
  tone = "neutral",
  className,
}: MobileHeroInsightProps) {
  const hasMeta = confidence || sourceLabel || updatedAt
  const hasActions = primaryAction || secondaryAction

  return (
    <SurfaceCard
      padding="default"
      radius="xl"
      className={cn("border-l-[3px]", toneAccentClasses[tone], className)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-large)] bg-surface-raised text-heading">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <div className="mb-2 text-[length:var(--font-size-label-sm)] font-medium uppercase tracking-[0.08em] text-muted">
                {eyebrow}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold leading-7 text-heading">
                {title}
              </h2>

              {value ? (
                <div className="text-[length:var(--font-size-kpi-lg)] font-semibold leading-[var(--line-height-kpi-lg)] text-heading">
                  {value}
                </div>
              ) : null}

              {summary ? (
                <p className="text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] text-body">
                  {summary}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {hasMeta ? (
          <div className="flex flex-wrap items-center gap-2">
            {confidence ? <Badge variant={toneBadgeVariant[tone]} size="md">{confidence}</Badge> : null}
            {sourceLabel ? <Badge variant="neutral" size="md">{sourceLabel}</Badge> : null}
            {updatedAt ? <Badge variant="neutral" size="md">{updatedAt}</Badge> : null}
          </div>
        ) : null}

        {hasActions ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {primaryAction ? <div className="sm:flex-1">{primaryAction}</div> : null}
            {secondaryAction ? <div className="sm:flex-1">{secondaryAction}</div> : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  )
}
