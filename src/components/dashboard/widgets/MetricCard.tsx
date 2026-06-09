import Link from "next/link"
import { DashboardMetric } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  metric: DashboardMetric
  className?: string
}

export function MetricCard({ metric, className }: MetricCardProps) {
  const { label, value, description, trend, status, href } = metric

  // Determine status-specific colors
  const statusColors = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-body",
    pending: "text-accent"
  }

  const statusBorder = status ? {
    success: "border-l-4 border-l-success",
    warning: "border-l-4 border-l-warning",
    danger: "border-l-4 border-l-danger",
    neutral: "",
    pending: "border-l-4 border-l-accent"
  }[status] : ""

  const trendIcon = trend && {
    up: (
      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
      </svg>
    ),
    down: (
      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
      </svg>
    ),
    stable: (
      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
      </svg>
    )
  }[trend.direction]

  const trendColor = trend && {
    up: "text-success bg-success/5 border-success/10",
    down: "text-danger bg-danger/5 border-danger/10",
    stable: "text-muted bg-canvas border-border"
  }[trend.direction]

  const cardContent = (
    <>
      <div className="flex justify-between items-start gap-4">
        <span className="text-xs font-medium text-muted uppercase tracking-wider line-clamp-1">
          {label}
        </span>
        {status && status !== "neutral" && (
          <span className={cn("inline-flex w-2 h-2 rounded-full", {
            "bg-success": status === "success",
            "bg-warning": status === "warning",
            "bg-danger": status === "danger",
            "bg-accent": status === "pending"
          })} />
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className={cn("text-2xl font-bold tracking-tight text-heading", status && statusColors[status])}>
          {value}
        </span>
      </div>

      {(description || trend) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5 text-xs">
          <span className="text-muted truncate">{description}</span>
          {trend && (
            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border font-mono text-[10px] font-medium", trendColor)}>
              {trendIcon}
              {trend.label}
            </span>
          )}
        </div>
      )}
    </>
  )

  const baseClasses = cn(
    "bg-surface border border-border p-5 rounded-lg flex flex-col justify-between transition-all duration-200",
    statusBorder,
    href ? "hover:border-primary/30 hover:shadow-[0_2px_8px_-3px_rgba(37,84,184,0.08)] hover:-translate-y-0.5 cursor-pointer" : "",
    className
  )

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {cardContent}
      </Link>
    )
  }

  return (
    <div className={baseClasses}>
      {cardContent}
    </div>
  )
}
