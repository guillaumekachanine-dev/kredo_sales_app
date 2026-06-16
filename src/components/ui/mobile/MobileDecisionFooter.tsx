import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

export interface MobileDecisionFooterProps {
  primaryAction: React.ReactNode
  secondaryAction?: React.ReactNode
  summary?: React.ReactNode
  className?: string
}

export function MobileDecisionFooter({
  primaryAction,
  secondaryAction,
  summary,
  className,
}: MobileDecisionFooterProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[calc(var(--z-bottom-nav)-1)] px-4",
        "bottom-[var(--layout-mobile-content-bottom-offset)]",
        className,
      )}
    >
      <SurfaceCard
        padding="default"
        radius="xl"
        className="pointer-events-auto"
      >
        <div className="flex flex-col gap-3">
          {summary ? (
            <div className="text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] text-body">
              {summary}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <div>{primaryAction}</div>
            {secondaryAction ? <div>{secondaryAction}</div> : null}
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
