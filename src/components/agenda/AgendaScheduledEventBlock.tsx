import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import {
  formatAgendaTimeLabel,
  getAgendaBusinessStatusLabel,
  getAgendaTemporalStateLabel,
  type AgendaScheduledPlacement,
} from "./agenda-desktop-model"

interface AgendaScheduledEventBlockProps {
  placement: AgendaScheduledPlacement
  timezone: string
  onClick: () => void
}

export function AgendaScheduledEventBlock({
  placement,
  timezone,
  onClick,
}: AgendaScheduledEventBlockProps) {
  const { item } = placement

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute overflow-hidden rounded-[var(--radius-medium)] border px-2.5 py-2 text-left",
        "bg-surface shadow-none transition-colors hover:bg-surface-hover",
        "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]",
        placement.hasConflict
          ? "border-danger/35 bg-danger/[0.05]"
          : item.businessStatus === "cancelled"
            ? "border-border bg-canvas/80"
            : "border-primary/20 bg-primary/[0.04]",
      )}
      style={{
        top: `${placement.topPct}%`,
        height: `${placement.heightPct}%`,
        left: `${(placement.columnIndex / placement.columnCount) * 100}%`,
        width: `${100 / placement.columnCount}%`,
      }}
      aria-label={`${item.title}, ${formatAgendaTimeLabel(item, timezone)}`}
    >
      <div className="flex min-h-full flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[12px] font-semibold leading-4 text-heading">
            {item.title}
          </p>
          {placement.hasConflict ? (
            <span className="mt-0.5 inline-flex size-2 shrink-0 rounded-full bg-danger" aria-hidden="true" />
          ) : null}
        </div>

        <p className="text-[11px] font-medium leading-4 text-body">
          {formatAgendaTimeLabel(item, timezone)}
        </p>

        {item.subtitle ? (
          <p className="line-clamp-2 text-[11px] leading-4 text-muted">
            {item.subtitle}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {item.companyLabel ? (
            <Badge variant="neutral" size="sm">
              {item.companyLabel}
            </Badge>
          ) : null}
          {placement.hasLinkedTask ? (
            <Badge variant="info" size="sm">
              Tâche liée
            </Badge>
          ) : null}
          {(item.businessStatus === "cancelled" || item.businessStatus === "completed") ? (
            <Badge variant="warning" size="sm">
              {getAgendaBusinessStatusLabel(item)}
            </Badge>
          ) : null}
          {placement.hasConflict ? (
            <Badge variant="danger" size="sm">
              Conflit
            </Badge>
          ) : null}
          {item.businessStatus !== "cancelled" && item.businessStatus !== "completed" && item.temporalState !== "upcoming" ? (
            <Badge variant="brand" size="sm">
              {getAgendaTemporalStateLabel(item)}
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  )
}
