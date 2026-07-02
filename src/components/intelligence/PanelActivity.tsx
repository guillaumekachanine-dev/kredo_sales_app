"use client"

import type { PanelActivityItem } from "@/lib/intelligence/account-panel-types"

interface PanelActivityProps {
  activity: PanelActivityItem[]
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

function OpportunityLine({ item }: { item: Extract<PanelActivityItem, { type: "opportunity" }> }) {
  const opp = item.opportunity
  return (
    <li className="flex items-start gap-2.5 rounded-md border border-primary-fg/8 bg-primary-fg/[0.03] px-2.5 py-2 transition-colors hover:bg-primary-fg/[0.06]">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-brand-brass/20 text-[10px] font-bold text-brand-brass">
        O
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-primary-fg/90">{opp.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-primary-fg/45">
          <span>{opp.stageLabel}</span>
          {opp.nextActionAt && (
            <>
              <span>·</span>
              <span>{formatDate(opp.nextActionAt)}</span>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

function EventLine({ item }: { item: Extract<PanelActivityItem, { type: "event" }> }) {
  const ev = item.event
  return (
    <li className="flex items-start gap-2.5 rounded-md border border-primary-fg/8 bg-primary-fg/[0.03] px-2.5 py-2 transition-colors hover:bg-primary-fg/[0.06]">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary-fg/70">
        E
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-primary-fg/90">{ev.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-primary-fg/45">
          <span>{formatDate(ev.startsAt)}</span>
        </div>
      </div>
    </li>
  )
}

export function PanelActivity({ activity }: PanelActivityProps) {
  if (activity.length === 0) {
    return (
      <p className="text-[11px] italic text-primary-fg/35">
        Aucune opportunité ouverte ni événement planifié.
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {activity.map((item) =>
        item.type === "opportunity" ? (
          <OpportunityLine key={`opp-${item.id}`} item={item} />
        ) : (
          <EventLine key={`evt-${item.id}`} item={item} />
        ),
      )}
    </ul>
  )
}
