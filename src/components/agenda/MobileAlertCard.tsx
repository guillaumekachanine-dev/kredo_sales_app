import React from "react"
import { cn } from "@/lib/utils"
import type { AlertItem } from "@/lib/agenda/agenda-types"
import { formatMobileTimeLabel } from "./agenda-mobile-model"
import { Badge } from "@/components/ui/Badge"

interface MobileAlertCardProps {
  item: AlertItem
  timezone: string
  onClick: () => void
}

export function MobileAlertCard({
  item,
  timezone,
  onClick,
}: MobileAlertCardProps) {
  const getAlertKindLabel = () => {
    switch (item.alertKind) {
      case "schedule_conflict":
        return "Conflit horaire"
      case "week_tension":
        return "Semaine sous tension"
      case "overdue_task":
        return "Tâche en retard"
      case "deadline_at_risk":
        return "Échéance critique"
      default:
        return "Alerte"
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left bg-danger/[0.05] border border-danger/20 rounded-lg transition-all select-none cursor-pointer flex flex-col gap-2 p-4 shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-1",
        "active:scale-[0.99] active:bg-danger/[0.1] duration-[150ms] ease-in-out"
      )}
      style={{ minHeight: "52px" }}
    >
      <div className="flex items-center justify-between gap-2 w-full text-xs font-semibold text-muted">
        <span className="font-semibold text-danger">
          {formatMobileTimeLabel(item, timezone)}
        </span>
        <Badge
          variant="danger"
          size="sm"
          className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0 border-danger/30 bg-danger/[0.1] text-danger"
        >
          {getAlertKindLabel()}
        </Badge>
      </div>

      <div className="flex items-start gap-2.5 w-full mt-0.5">
        <div className="mt-0.5 text-danger">
          <svg className="size-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-sm font-bold text-heading leading-tight tracking-tight">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-xs text-body mt-0.5 leading-snug">{item.description}</p>
          )}
        </div>
      </div>
    </button>
  )
}
