import Link from "next/link"
import { DashboardAlert } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface AlertCardProps {
  alert: DashboardAlert
  className?: string
}

export function AlertCard({ alert, className }: AlertCardProps) {
  const { title, description, status, href } = alert

  const statusStyles = {
    success: {
      bg: "bg-success/5 hover:bg-success/10",
      border: "border-success/20",
      text: "text-success",
      icon: (
        <svg className="w-5 h-5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    warning: {
      bg: "bg-warning/5 hover:bg-warning/10",
      border: "border-warning/20",
      text: "text-warning",
      icon: (
        <svg className="w-5 h-5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    danger: {
      bg: "bg-danger/5 hover:bg-danger/10",
      border: "border-danger/20",
      text: "text-danger",
      icon: (
        <svg className="w-5 h-5 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    neutral: {
      bg: "bg-canvas hover:bg-surface-hover",
      border: "border-border",
      text: "text-heading",
      icon: (
        <svg className="w-5 h-5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    pending: {
      bg: "bg-accent/5 hover:bg-accent/10",
      border: "border-accent/20",
      text: "text-accent",
      icon: (
        <svg className="w-5 h-5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }[status]

  const cardContent = (
    <div className="flex gap-3 items-start">
      {statusStyles.icon}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-heading leading-tight truncate">
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-xs text-body leading-normal">
            {description}
          </p>
        )}
      </div>
      {href && (
        <svg className="w-4 h-4 text-muted shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  )

  const baseClasses = cn(
    "p-4 rounded-lg border transition-all duration-150",
    statusStyles.bg,
    statusStyles.border,
    href ? "cursor-pointer" : "",
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
