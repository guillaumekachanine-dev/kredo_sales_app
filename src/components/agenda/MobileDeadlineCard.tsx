import React from "react"
import { cn } from "@/lib/utils"
import type { DeadlineItem } from "@/lib/agenda/agenda-types"
import { formatMobileTimeLabel } from "./agenda-mobile-model"
import { Badge } from "@/components/ui/Badge"

import type { AgendaDomain } from "@/lib/agenda/agenda-types"

const DOMAIN_BG_CLASSES: Record<AgendaDomain, string> = {
  agenda: "bg-primary",
  missions: "bg-domain-mission-at",
  commerce: "bg-domain-account",
  recruitment: "bg-domain-recruitment",
  staffing: "bg-domain-need",
  consultants: "bg-domain-collaborator",
}

interface MobileDeadlineCardProps {
  item: DeadlineItem
  timezone: string
  onClick: () => void
}

export function MobileDeadlineCard({
  item,
  timezone,
  onClick,
}: MobileDeadlineCardProps) {
  const getSourceTypeLabel = () => {
    switch (item.sourceType) {
      case "mission":
        return "Mission"
      case "opportunity":
        return "Opportunité"
      case "candidate_hiring_milestone":
        return "Recrutement"
      default:
        return "Échéance"
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left bg-surface border border-border rounded-lg transition-all select-none cursor-pointer flex flex-col gap-2 p-4 pl-5 relative shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
        "active:scale-[0.99] active:bg-surface-hover/70 duration-[150ms] ease-in-out"
      )}
      style={{ minHeight: "52px" }}
    >
      {/* Left domain rail */}
      {item.businessStatus !== "cancelled" && (
        <span
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
            DOMAIN_BG_CLASSES[item.domain]
          )}
        />
      )}
      <div className="flex items-center justify-between gap-2 w-full text-xs font-semibold text-muted">
        <span className="font-medium text-body">
          {formatMobileTimeLabel(item, timezone)}
        </span>
        <Badge variant="neutral" size="sm" className="font-bold uppercase tracking-wider text-[9px] px-1.5 py-0">
          {getSourceTypeLabel()}
        </Badge>
      </div>

      <div className="flex flex-col gap-1 w-full mt-0.5">
        <h3 className="font-heading text-sm font-bold text-heading leading-tight tracking-tight flex items-center gap-1.5">
          <svg className="size-4 text-warning stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-5.605-11.345M3 15V6m0 0 6-1.5m11.5 3v6" />
          </svg>
          {item.title}
        </h3>

        {(item.companyLabel || item.personLabel) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mt-0.5">
            {item.companyLabel && (
              <span className="inline-flex items-center gap-1">
                <span className="text-muted/60">Compte :</span>
                <span className="font-semibold text-body">{item.companyLabel}</span>
              </span>
            )}
            {item.personLabel && (
              <span className="inline-flex items-center gap-1">
                <span className="text-muted/60">Cible :</span>
                <span className="font-semibold text-body">{item.personLabel}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
