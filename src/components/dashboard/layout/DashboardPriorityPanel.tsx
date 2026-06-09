import { DashboardAlert, DashboardPriority } from "@/lib/dashboard/dashboard-types"
import { AlertCard } from "../widgets/AlertCard"
import { PriorityCard } from "../widgets/PriorityCard"
import { EmptyState } from "../widgets/EmptyState"
import { cn } from "@/lib/utils"

interface DashboardPriorityPanelProps {
  priorities: DashboardPriority[]
  alerts: DashboardAlert[]
  title?: string
  className?: string
}

export function DashboardPriorityPanel({
  priorities,
  alerts,
  title = "Priorités & Cadrage",
  className
}: DashboardPriorityPanelProps) {
  const hasItems = priorities.length > 0 || alerts.length > 0

  return (
    <div className={cn("bg-surface border border-border p-5 rounded-lg flex flex-col gap-4 h-full", className)}>
      <div>
        <h3 className="text-sm font-semibold text-heading leading-tight">
          {title}
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Actions urgentes et alertes système
        </p>
      </div>

      {!hasItems ? (
        <EmptyState
          title="Tout est à jour"
          description="Aucune alerte ni tâche prioritaire signalée pour cette section."
          className="py-12 bg-canvas/30"
        />
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin">
          {/* Alerts first */}
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}

          {/* Priorities next */}
          {priorities.map((priority) => (
            <PriorityCard key={priority.id} priority={priority} />
          ))}
        </div>
      )}
    </div>
  )
}
