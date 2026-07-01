import React from "react"
import { cn } from "@/lib/utils"
import type { AvailabilityBlockItem } from "@/lib/agenda/agenda-types"
import { formatMobileTimeLabel } from "./agenda-mobile-model"
import { Badge } from "@/components/ui/Badge"

interface MobileAvailabilityCardProps {
  item: AvailabilityBlockItem
  timezone: string
  onClick: () => void
}

export function MobileAvailabilityCard({
  item,
  timezone,
  onClick,
}: MobileAvailabilityCardProps) {
  const isAbsence = item.sourceType === "collaborator_absence"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left bg-canvas/40 border border-border rounded-xl transition-all select-none cursor-pointer flex flex-col gap-2.5 p-4 shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
        "active:scale-[0.99] active:bg-surface-hover/70 duration-200"
      )}
      style={{ minHeight: "52px" }}
    >
      <div className="flex items-center justify-between gap-2 w-full text-xs font-semibold text-muted">
        <span className="font-semibold text-body">
          {formatMobileTimeLabel(item, timezone)}
        </span>
        <Badge
          variant={isAbsence ? "neutral" : "warning"}
          size="sm"
          className="font-bold uppercase tracking-wider text-[9px] px-1.5 py-0"
        >
          {isAbsence ? "Absence" : "Fermeture"}
        </Badge>
      </div>

      <div className="flex items-start gap-2 w-full mt-0.5">
        <div className="mt-0.5">
          {isAbsence ? (
            <svg className="size-4 text-muted stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          ) : (
            <svg className="size-4 text-warning stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.5a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75h-3.5A.75.75 0 0 0 6 14v3.25c0 .414.336.75.75.75Z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-sm font-semibold text-heading leading-tight tracking-tight">
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="text-xs text-muted mt-0.5 font-medium">{item.subtitle}</p>
          )}
        </div>
      </div>
    </button>
  )
}
