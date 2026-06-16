"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { SurfaceCard } from "@/components/ui/SurfaceCard"

export type KpiCardDeltaTone = "positive" | "negative" | "neutral"
export type KpiCardSize = "compact" | "default" | "hero"

export interface KpiCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  label: string
  value: React.ReactNode
  context?: React.ReactNode
  delta?: React.ReactNode
  deltaTone?: KpiCardDeltaTone
  target?: React.ReactNode
  progress?: number
  icon?: React.ReactNode
  size?: KpiCardSize
  loading?: boolean
  href?: string
}

const sizeClasses: Record<KpiCardSize, { wrapper: string; value: string; label: string }> = {
  compact: {
    wrapper: "gap-3 p-4",
    value: "text-[length:var(--font-size-kpi-sm)] leading-[var(--line-height-kpi-sm)]",
    label: "text-[length:var(--font-size-label-sm)]",
  },
  default: {
    wrapper: "gap-4 p-5",
    value: "text-[length:var(--font-size-kpi-md)] leading-[var(--line-height-kpi-md)]",
    label: "text-[length:var(--font-size-label-sm)]",
  },
  hero: {
    wrapper: "gap-4 p-6",
    value: "text-[length:var(--font-size-kpi-lg)] leading-[var(--line-height-kpi-lg)]",
    label: "text-[length:var(--font-size-label-md)]",
  },
}

const deltaToneClasses: Record<KpiCardDeltaTone, string> = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-muted",
}

function clampProgress(progress?: number) {
  if (typeof progress !== "number" || Number.isNaN(progress)) {
    return undefined
  }

  return Math.min(100, Math.max(0, progress))
}

export function KpiCard({
  label,
  value,
  context,
  delta,
  deltaTone = "neutral",
  target,
  progress,
  icon,
  size = "default",
  loading = false,
  href,
  className,
  ...props
}: KpiCardProps) {
  const currentSize = sizeClasses[size]
  const normalizedProgress = clampProgress(progress)

  return (
    <SurfaceCard
      href={href}
      interactive={Boolean(href)}
      className={cn("h-full", className)}
      {...props}
    >
      <div className={cn("flex h-full flex-col", currentSize.wrapper)} aria-busy={loading || undefined}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium text-muted", currentSize.label)}>{label}</p>
            <div className="mt-2 flex items-end gap-2">
              <p
                className={cn(
                  "font-heading font-bold tracking-[-0.02em] text-heading",
                  currentSize.value,
                  loading && "text-transparent",
                )}
              >
                {value}
              </p>
              {delta ? (
                <span
                  className={cn(
                    "pb-1 text-[length:var(--font-size-label-sm)] font-medium leading-[var(--line-height-label-sm)]",
                    deltaToneClasses[deltaTone],
                    loading && "text-transparent",
                  )}
                >
                  {delta}
                </span>
              ) : null}
            </div>
          </div>

          {icon ? (
            <span
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-medium)] bg-canvas text-primary",
                loading && "opacity-0",
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
        </div>

        {context ? (
          <p className={cn("text-sm leading-6 text-body", loading && "text-transparent")}>{context}</p>
        ) : null}

        {target || normalizedProgress !== undefined ? (
          <div className="mt-auto space-y-2 pt-2">
            {target ? (
              <div className={cn("text-sm text-muted", loading && "text-transparent")}>{target}</div>
            ) : null}
            {normalizedProgress !== undefined ? (
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-canvas"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={normalizedProgress}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]"
                  style={{ width: `${normalizedProgress}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? <span className="sr-only">Chargement des indicateurs</span> : null}
      </div>
    </SurfaceCard>
  )
}
