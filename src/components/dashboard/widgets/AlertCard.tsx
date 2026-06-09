import { SurfaceCard } from "@/components/ui/SurfaceCard"
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
      text: "text-success",
      icon: (
        <svg className="w-5 h-5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    warning: {
      text: "text-warning",
      icon: (
        <svg className="w-5 h-5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    danger: {
      text: "text-danger",
      icon: (
        <svg className="w-5 h-5 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    neutral: {
      text: "text-heading",
      icon: (
        <svg className="w-5 h-5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    pending: {
      text: "text-accent",
      icon: (
        <svg className="w-5 h-5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }[status]

  const statusToAccent: Record<string, "none" | "primary" | "success" | "warning" | "danger"> = {
    success: "success",
    warning: "warning",
    danger: "danger",
    neutral: "none",
    pending: "primary"
  }
  const accent = status ? (statusToAccent[status] || "none") : "none"

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

  return (
    <SurfaceCard
      accent={accent}
      href={href}
      className={cn(
        "p-4 transition-all duration-150",
        href ? "hover:border-primary/20 hover:bg-surface-hover/30" : "",
        className
      )}
    >
      {cardContent}
    </SurfaceCard>
  )
}
