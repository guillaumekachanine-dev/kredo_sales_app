"use client"

import { Button } from "@/components/ui/Button"

export function BusinessIntelligenceMobileHeader({ segmentName, onChangeSegment }: { segmentName: string; onChangeSegment: () => void }) {
  return (
    <header className="border-b border-border bg-surface px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-heading">Business Intelligence</h1>
          <p className="mt-1 max-w-[13rem] truncate text-xs font-semibold text-body">{segmentName}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onChangeSegment} aria-label={`Changer le segment actif, actuellement ${segmentName}`}>Changer</Button>
      </div>
    </header>
  )
}
