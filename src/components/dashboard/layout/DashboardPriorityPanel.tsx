import { SurfaceCard } from "@/components/ui/SurfaceCard"
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
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex flex-col mb-3 select-none">
        <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
          {title}
        </h3>
        <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
      </div>

      <div className="bg-surface border-0 rounded-xl p-5 shadow-sm flex-1 flex flex-col gap-4">
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
    </div>
  )
}

