import React from "react"
import { cn } from "@/lib/utils"
import type { TaskItem } from "@/lib/agenda/agenda-types"
import { formatMobileTimeLabel } from "./agenda-mobile-model"
import { StatusPill } from "@/components/ui/StatusPill"

import type { AgendaDomain } from "@/lib/agenda/agenda-types"

const DOMAIN_BG_CLASSES: Record<AgendaDomain, string> = {
  agenda: "bg-primary",
  missions: "bg-domain-mission-at",
  commerce: "bg-domain-account",
  recruitment: "bg-domain-recruitment",
  staffing: "bg-domain-need",
  consultants: "bg-domain-collaborator",
}

interface MobileTaskCardProps {
  item: TaskItem
  timezone: string
  onClick: () => void
  onToggleStatus?: () => void
}

export function MobileTaskCard({
  item,
  timezone,
  onClick,
  onToggleStatus,
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
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "w-full text-left bg-surface border border-border rounded-lg transition-all select-none cursor-pointer flex items-start gap-3 p-4 pl-5 relative shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
        "active:scale-[0.99] active:bg-surface-hover/70 duration-[150ms] ease-in-out"
      )}
      style={{ minHeight: "52px" }}
    >
      {/* Left domain rail */}
      {!isCompleted && (
        <span
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
            DOMAIN_BG_CLASSES[item.domain]
          )}
        />
      )}
      {/* Checkbox (Completion trigger with touch target >= 44px) */}
      <button
        type="button"
        onClick={(e) => {
          if (onToggleStatus) {
            e.stopPropagation() // Prevent opening detail drawer
            onToggleStatus()
          }
        }}
        className={cn(
          "p-3 -m-3 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          onToggleStatus ? "cursor-pointer" : "cursor-not-allowed"
        )}
        aria-label={isCompleted ? "Réouvrir la tâche" : "Compléter la tâche"}
      >
        <div
          className={cn(
            "size-5 rounded-md border flex items-center justify-center transition-colors",
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
      </button>

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
    </div>
  )
}
