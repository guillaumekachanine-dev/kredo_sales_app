import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { DashboardPriority } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface PriorityCardProps {
  priority: DashboardPriority
  className?: string
}

export function PriorityCard({ priority, className }: PriorityCardProps) {
  const { title, description, dueLabel, status, href } = priority

  const statusToAccent: Record<string, "none" | "primary" | "success" | "warning" | "danger"> = {
    success: "success",
    warning: "warning",
    danger: "danger",
    neutral: "none",
    pending: "primary"
  }
  const accent = status ? (statusToAccent[status] || "none") : "none"

  const dueBadgeStyle = status ? {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    neutral: "bg-canvas text-muted border-border",
    pending: "bg-accent/10 text-accent border-accent/20"
  }[status] : "bg-canvas text-muted border-border"

  const cardContent = (
    <div className="flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-heading leading-snug line-clamp-2">
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-xs text-body line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      
      {dueLabel && (
        <span className={cn("shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border font-mono", dueBadgeStyle)}>
          {dueLabel}
        </span>
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
