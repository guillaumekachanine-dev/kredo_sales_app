import React from "react"
import { cn } from "@/lib/utils"
import type { TaskItem } from "@/lib/agenda/agenda-types"
import { formatMobileTimeLabel } from "./agenda-mobile-model"
import { StatusPill } from "@/components/ui/StatusPill"

interface MobileTaskCardProps {
  item: TaskItem
  timezone: string
  onClick: () => void
}

export function MobileTaskCard({
  item,
  timezone,
  onClick,
}: MobileTaskCardProps) {
  const isCompleted = item.businessStatus === "completed"

  const getPriorityVariant = () => {
    switch (item.priority) {
      case "high":
        return "danger"
      case "normal":
        return "warning"
      default:
        return "neutral"
    }
  }

  const getPriorityLabel = () => {
    switch (item.priority) {
      case "high":
        return "Priorité Haute"
      case "normal":
        return "Priorité Normale"
      default:
        return "Priorité Basse"
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left bg-surface border border-border rounded-xl transition-all select-none cursor-pointer flex items-start gap-3 p-4 shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
        "active:scale-[0.99] active:bg-surface-hover/70 duration-200"
      )}
      style={{ minHeight: "52px" }}
    >
      {/* Checkbox (Read-only status indicator) */}
      <div className="pt-0.5">
        <div
          className={cn(
            "size-5 rounded-md border flex items-center justify-center transition-colors cursor-not-allowed",
            isCompleted
              ? "bg-success border-success text-success-fg"
              : "border-muted/50 bg-canvas"
          )}
        >
          {isCompleted && (
            <svg className="size-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 w-full">
        {/* Title */}
        <h3
          className={cn(
            "font-heading text-sm font-semibold text-heading leading-tight tracking-tight",
            isCompleted && "line-through text-muted/60"
          )}
        >
          {item.title}
        </h3>

        {/* Info row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="font-medium text-body">
            {formatMobileTimeLabel(item, timezone)}
          </span>

          <span className="text-muted/40 font-normal">|</span>

          <StatusPill
            variant={getPriorityVariant()}
            label={getPriorityLabel()}
            dot
            className="text-[10px] py-0.5 px-2 font-semibold"
          />

          {item.companyLabel && (
            <>
              <span className="text-muted/40 font-normal">|</span>
              <span className="truncate max-w-[120px] font-medium text-muted">
                {item.companyLabel}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
