"use client"

import type { ReactNode } from "react"
import type { PanelActivityItem } from "@/lib/intelligence/account-panel-types"
import { openEventFromIntelligencePanel } from "@/lib/intelligence/panel-drawer-switch"

interface PanelActivityProps {
  activity: PanelActivityItem[]
  tone?: "dark" | "light"
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

// Même carte "relief + bordure ambre + shine" que les boutons d'action
// (Section 1) en tone dark — rejouée ici sur les lignes Activité/Contacts.
function rowClass(isDark: boolean, interactive: boolean) {
  if (isDark) {
    return `kredo-action-card-dark flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left ${interactive ? "cursor-pointer" : "cursor-default"}`
  }
  return `flex w-full items-start gap-2.5 rounded-md border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:bg-surface-hover ${interactive ? "cursor-pointer" : "cursor-default"}`
}

function Row({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  return isDark ? (
    <span className="relative z-10 flex w-full items-start gap-2.5">{children}</span>
  ) : (
    <>{children}</>
  )
}

function OpportunityLine({ item, isDark }: { item: Extract<PanelActivityItem, { type: "opportunity" }>; isDark: boolean }) {
  const opp = item.opportunity
  return (
    <li>
      <div className={rowClass(isDark, false)}>
        <Row isDark={isDark}>
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-brand-brass/20 text-[10px] font-bold text-brand-brass">
            O
          </span>
          <div className="min-w-0 flex-1">
            <p className={isDark ? "truncate text-xs font-semibold text-primary-fg/90" : "truncate text-xs font-semibold text-heading"}>{opp.title}</p>
            <div className={isDark ? "mt-0.5 flex items-center gap-2 text-[10px] text-primary-fg/45" : "mt-0.5 flex items-center gap-2 text-[10px] text-muted"}>
              <span>{opp.stageLabel}</span>
              {opp.nextActionAt && (
                <>
                  <span>·</span>
                  <span>{formatDate(opp.nextActionAt)}</span>
                </>
              )}
            </div>
          </div>
        </Row>
      </div>
    </li>
  )
}

function EventLine({ item, isDark }: { item: Extract<PanelActivityItem, { type: "event" }>; isDark: boolean }) {
  const ev = item.event
  return (
    <li>
      <button
        type="button"
        onClick={() => openEventFromIntelligencePanel(ev.id)}
        className={rowClass(isDark, true)}
      >
        <Row isDark={isDark}>
          <span className={isDark ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary-fg/70" : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary"}>
            E
          </span>
          <div className="min-w-0 flex-1">
            <p className={isDark ? "truncate text-xs font-semibold text-primary-fg/90" : "truncate text-xs font-semibold text-heading"}>{ev.title}</p>
            <div className={isDark ? "mt-0.5 flex items-center gap-2 text-[10px] text-primary-fg/45" : "mt-0.5 flex items-center gap-2 text-[10px] text-muted"}>
              <span>{formatDate(ev.startsAt)}</span>
            </div>
          </div>
        </Row>
      </button>
    </li>
  )
}

export function PanelActivity({ activity, tone = "dark" }: PanelActivityProps) {
  const isDark = tone === "dark"

  if (activity.length === 0) {
    return (
      <p className={isDark ? "text-[11px] italic text-primary-fg/35" : "text-[11px] italic text-muted"}>
        Aucune opportunité ouverte ni événement planifié.
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {activity.map((item) =>
        item.type === "opportunity" ? (
          <OpportunityLine key={`opp-${item.id}`} item={item} isDark={isDark} />
        ) : (
          <EventLine key={`evt-${item.id}`} item={item} isDark={isDark} />
        ),
      )}
    </ul>
  )
}
