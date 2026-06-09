import { DashboardSyncStatus } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface SyncStatusBadgeProps {
  syncStatus: DashboardSyncStatus
  className?: string
}

export function SyncStatusBadge({ syncStatus, className }: SyncStatusBadgeProps) {
  const { source, lastSyncLabel, status } = syncStatus

  const dotColor = {
    ok: "bg-success",
    warning: "bg-warning",
    error: "bg-danger",
    pending: "bg-primary animate-pulse"
  }[status]

  return (
    <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded bg-canvas border border-border text-[11px] font-mono", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
      <span className="text-body font-medium">{source}</span>
      {lastSyncLabel && (
        <>
          <span className="text-muted/60">|</span>
          <span className="text-muted">{lastSyncLabel}</span>
        </>
      )}
    </div>
  )
}
