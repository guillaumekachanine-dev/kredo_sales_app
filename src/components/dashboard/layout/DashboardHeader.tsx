import Link from "next/link"
import { DashboardAction, DashboardSyncStatus } from "@/lib/dashboard/dashboard-types"
import { SyncStatusBadge } from "../widgets/SyncStatusBadge"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  title: string
  description?: string
  primaryAction?: DashboardAction
  secondaryActions?: DashboardAction[]
  syncStatus?: DashboardSyncStatus
  device: "desktop" | "mobile"
  className?: string
}

export function DashboardHeader({
  title,
  description,
  primaryAction,
  secondaryActions,
  syncStatus,
  device,
  className
}: DashboardHeaderProps) {
  const isMobile = device === "mobile"

  const renderAction = (action: DashboardAction) => {
    const baseActionClasses = "inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded transition-all duration-150 active:scale-95"
    const variantClasses = {
      primary: "bg-primary text-primary-fg hover:bg-primary/95",
      secondary: "bg-surface text-heading border border-border hover:bg-surface-hover",
      ghost: "text-body hover:bg-surface-hover"
    }[action.variant || "secondary"]

    const content = <span>{action.label}</span>

    if (action.href) {
      return (
        <Link key={action.id} href={action.href} className={cn(baseActionClasses, variantClasses)}>
          {content}
        </Link>
      )
    }

    return (
      <button key={action.id} className={cn(baseActionClasses, variantClasses)}>
        {content}
      </button>
    )
  }

  if (isMobile) {
    return (
      <header className={cn("flex flex-col gap-3 pb-4 border-b border-border bg-canvas", className)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-heading tracking-tight text-heading">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-body mt-0.5 line-clamp-1">
                {description}
              </p>
            )}
          </div>
          {primaryAction && renderAction({ ...primaryAction, variant: "primary" })}
        </div>
        {syncStatus && (
          <div className="flex items-center">
            <SyncStatusBadge syncStatus={syncStatus} className="bg-surface border-border/60" />
          </div>
        )}
      </header>
    )
  }

  return (
    <header className={cn("flex items-center justify-between border-b border-border pb-5 mb-6 bg-canvas gap-4", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
            {title}
          </h1>
          {syncStatus && (
            <SyncStatusBadge syncStatus={syncStatus} />
          )}
        </div>
        {description && (
          <p className="text-xs text-body mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {secondaryActions?.map(renderAction)}
        {primaryAction && renderAction(primaryAction)}
      </div>
    </header>
  )
}
