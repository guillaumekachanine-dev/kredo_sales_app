import { SurfaceCard } from "@/components/ui/SurfaceCard"
import Link from "next/link"
import { DashboardAction } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface DashboardQuickActionsProps {
  actions?: DashboardAction[]
  className?: string
  showHeader?: boolean
}

export function DashboardQuickActions({ actions, className, showHeader = true }: DashboardQuickActionsProps) {
  if (!actions || actions.length === 0) return null

  const renderAction = (action: DashboardAction) => {
    const baseActionClasses = "inline-flex items-center justify-center w-full min-h-[44px] px-4 py-2 text-xs font-semibold rounded transition-all duration-150 active:scale-98 border"
    const variantClasses = {
      primary: "bg-primary text-primary-fg border-transparent hover:bg-primary/95 shadow-sm",
      secondary: "bg-white text-brand-blue border-border hover:bg-surface-hover",
      ghost: "text-body border-transparent hover:bg-surface-hover hover:text-heading"
    }[action.variant || "secondary"]

    const content = (
      <span className="flex items-center gap-2">
        {action.icon}
        {action.label}
        {/* Subtly indicate link direction */}
        {action.href && (
          <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        )}
      </span>
    )

    if (action.href) {
      return (
        <Link key={action.id} href={action.href} className={cn(baseActionClasses, variantClasses)}>
          {content}
        </Link>
      )
    }

    return (
      <button
        key={action.id}
        type="button"
        onClick={action.onClick}
        className={cn(baseActionClasses, variantClasses)}
      >
        {content}
      </button>
    )
  }

  return (
    <SurfaceCard className={cn("p-5 flex flex-col gap-4 h-full", className)}>
      {showHeader && (
        <div>
          <h3 className="text-sm font-semibold text-heading leading-tight">
            Actions Rapides
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Raccourcis et opérations contextualisées
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {actions.map(renderAction)}
      </div>
    </SurfaceCard>
  )
}
