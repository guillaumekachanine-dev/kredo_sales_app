"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type BadgeVariant =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "brass"

export type BadgeSize = "sm" | "md"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  icon?: React.ReactNode
}

const badgeVariantClasses: Record<BadgeVariant, string> = {
  neutral: "border-border bg-canvas text-body",
  brand: "border-primary/15 bg-primary/[0.08] text-primary-deep",
  info: "border-info/15 bg-info/[0.10] text-info",
  success: "border-success/15 bg-success/[0.10] text-success",
  warning: "border-warning/20 bg-warning/[0.12] text-[var(--color-status-warning-ink)]",
  danger: "border-danger/15 bg-danger/[0.10] text-danger",
  brass: "border-brand-brass/25 bg-brand-brass/[0.08] text-brand-brass",
}

const badgeSizeClasses: Record<BadgeSize, string> = {
  sm: "min-h-5 px-2 text-[length:var(--font-size-label-xs)] leading-[var(--line-height-label-xs)]",
  md: "min-h-6 px-2.5 text-[length:var(--font-size-label-sm)] leading-[var(--line-height-label-sm)]",
}

const badgeDotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-muted",
  brand: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  brass: "bg-brand-brass",
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    {
      variant = "neutral",
      size = "sm",
      dot = false,
      icon,
      className,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium",
          badgeVariantClasses[variant],
          badgeSizeClasses[size],
          className,
        )}
        {...props}
      >
        {dot ? (
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", badgeDotClasses[variant])}
          />
        ) : null}
        {icon ? (
          <span className="inline-flex size-3.5 shrink-0 items-center justify-center" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{children}</span>
      </span>
    )
  },
)

Badge.displayName = "Badge"
