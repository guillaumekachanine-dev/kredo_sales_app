import Link from "next/link"
import { DashboardAction, DashboardSyncStatus } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  title: string
  description?: string
  primaryAction?: DashboardAction
  secondaryActions?: DashboardAction[]
  syncStatus?: DashboardSyncStatus
  device: "desktop" | "mobile"
  className?: string
  quickActions?: DashboardAction[]
}

export function DashboardHeader({
  title,
  description,
  primaryAction,
  secondaryActions,
  syncStatus,
  device,
  className,
  quickActions
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
            {syncStatus?.lastSyncLabel && (
              <p className="text-[10px] text-muted mt-0.5">
                {syncStatus.lastSyncLabel}
              </p>
            )}
            {description && (
              <p className="text-xs text-body mt-1 line-clamp-1">
                {description}
              </p>
            )}
          </div>
          {primaryAction && renderAction({ ...primaryAction, variant: "primary" })}
        </div>
      </header>
    )
  }

  // Desktop view: Clean, borderless header using grid layout to align quick actions with the sidebar column
  const finalQuickActions = quickActions || []

  return (
    <header className={cn("grid grid-cols-12 gap-5 items-center mb-4 bg-canvas", className)}>
      <div className="col-span-8">
        <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
          {title}
        </h1>
      </div>


      {finalQuickActions.length > 0 && (
        <div className="col-span-4 grid grid-cols-2 gap-2">
          {finalQuickActions.map((action) => {
            const baseActionClasses = "inline-flex items-center justify-center w-full min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded border border-border bg-surface text-brand-blue hover:bg-surface-hover transition-all duration-150 active:scale-98 truncate"
            
            if (action.href) {
              return (
                <Link key={action.id} href={action.href} className={baseActionClasses}>
                  {action.label}
                </Link>
              )
            }

            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className={baseActionClasses}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </header>
  )
}
