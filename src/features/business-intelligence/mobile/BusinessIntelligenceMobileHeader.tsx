"use client"

import { Button } from "@/components/ui/Button"

export function BusinessIntelligenceMobileHeader({
  segmentName,
  onChangeSegment,
}: {
  segmentName: string
  onChangeSegment: () => void
}) {
  return (
    <header className="border-b border-edito-border bg-edito-surface px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-edito-muted">
            Business Intelligence
          </p>
          <h1 className="mt-0.5 font-heading text-2xl font-bold tracking-tight text-edito-navy">
            Terrain
          </h1>
          <p className="mt-0.5 truncate text-xs font-semibold text-edito-body">
            {segmentName}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onChangeSegment}
          aria-label={`Changer le segment actif, actuellement ${segmentName}`}
          className="border-edito-border bg-edito-surface text-edito-navy hover:bg-edito-canvas"
        >
          Changer
        </Button>
      </div>
    </header>
  )
}
