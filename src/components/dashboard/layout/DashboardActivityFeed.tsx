import Link from "next/link"
import { DashboardActivity } from "@/lib/dashboard/dashboard-types"
import { EmptyState } from "../widgets/EmptyState"
import { cn } from "@/lib/utils"

interface DashboardActivityFeedProps {
  activities?: DashboardActivity[]
  className?: string
}

export function DashboardActivityFeed({ activities, className }: DashboardActivityFeedProps) {
  const hasItems = activities && activities.length > 0

  return (
    <div className={cn("bg-surface border border-border p-5 rounded-lg flex flex-col h-full", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-heading leading-tight">
          Activité Récente
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Historique des derniers événements
        </p>
      </div>

      {!hasItems ? (
        <EmptyState
          title="Aucune activité"
          description="Les actions et mises à jour apparaîtront ici au fil de l'eau."
          className="py-12 bg-canvas/30"
        />
      ) : (
        <div className="flex-1 flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => {
              const isLast = activityIdx === activities.length - 1
              const itemContent = (
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-6 w-6 rounded-full bg-canvas flex items-center justify-center ring-4 ring-surface text-[10px] text-muted border border-border">
                      ●
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs font-semibold text-heading">
                      {activity.label}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-body mt-0.5">
                        {activity.description}
                      </p>
                    )}
                    {activity.dateLabel && (
                      <time className="text-[10px] text-muted font-mono mt-1 block">
                        {activity.dateLabel}
                      </time>
                    )}
                  </div>
                </div>
              )

              return (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {!isLast && (
                      <span className="absolute top-4 left-3 -ml-px h-full w-0.5 bg-border/60" aria-hidden="true" />
                    )}
                    {activity.href ? (
                      <Link href={activity.href} className="block group hover:bg-canvas/30 rounded p-1 -m-1 transition-colors">
                        {itemContent}
                      </Link>
                    ) : (
                      <div>{itemContent}</div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
