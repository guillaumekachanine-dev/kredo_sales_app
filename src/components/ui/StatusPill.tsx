"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type StatusPillVariant =
  | "neutral"
  | "draft"
  | "inProgress"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "benchmark"

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string
  variant?: StatusPillVariant
  dot?: boolean
  icon?: React.ReactNode
}

const statusPillClasses: Record<StatusPillVariant, string> = {
  neutral: "border-border bg-canvas text-body",
  draft: "border-border bg-canvas text-muted",
  inProgress: "border-primary/15 bg-primary/[0.08] text-primary-deep",
  success: "border-success/15 bg-success/[0.10] text-success",
  warning: "border-warning/20 bg-warning/[0.12] text-[var(--color-status-warning-ink)]",
  danger: "border-danger/15 bg-danger/[0.10] text-danger",
  info: "border-info/15 bg-info/[0.10] text-info",
  benchmark: "border-brand-brass/25 bg-brand-brass/[0.08] text-brand-brass",
}

const statusPillDotClasses: Record<StatusPillVariant, string> = {
  neutral: "bg-muted",
  draft: "bg-muted",
  inProgress: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  benchmark: "bg-brand-brass",
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  function StatusPill(
    {
      label,
      variant = "neutral",
      dot = true,
      icon,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
          "text-[length:var(--font-size-label-sm)] font-medium leading-[var(--line-height-label-sm)]",
          statusPillClasses[variant],
          className,
        )}
        {...props}
      >
        {dot ? (
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", statusPillDotClasses[variant])}
          />
        ) : null}
        {icon ? (
          <span className="inline-flex size-3.5 shrink-0 items-center justify-center" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </span>
    )
  },
)

StatusPill.displayName = "StatusPill"
