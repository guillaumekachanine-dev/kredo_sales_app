"use client"

import React from "react"
import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import {
  formatAgendaDateLabel,
  formatAgendaTimeLabel,
  getAgendaItemTypeLabel,
  getAgendaPriorityLabel,
  getAgendaTemporalStateLabel,
  type AgendaDesktopRailSection,
} from "./agenda-desktop-model"
import type { AgendaGroupedItem, AgendaDomain } from "@/lib/agenda/agenda-types"

const DOMAIN_BG_CLASSES: Record<AgendaDomain, string> = {
  agenda: "bg-primary",
  missions: "bg-domain-mission-at",
  commerce: "bg-domain-account",
  recruitment: "bg-domain-recruitment",
  staffing: "bg-domain-need",
  consultants: "bg-domain-collaborator",
}

interface AgendaActionRailProps {
  sections: AgendaDesktopRailSection[]
  timezone: string
  onSelectGroup: (group: AgendaGroupedItem) => void
}

function GroupPreview({
  group,
  timezone,
  onSelect,
}: {
  group: AgendaGroupedItem
  timezone: string
  onSelect: () => void
}) {
  const primary = group.primaryItem
  const secondary = group.items.filter((item) => item.id !== primary.id)
  const isSpecial = primary.type === "alert" || primary.temporalState === "overdue"

  return (
    <button type="button" onClick={onSelect} className="w-full cursor-pointer text-left focus:outline-none">
      <SurfaceCard
        interactive
        radius="lg"
        className={cn(
          "p-3 relative shadow-none border-border bg-surface transition-all duration-150 ease-in-out hover:bg-surface-hover hover:border-border",
          "motion-safe:hover:-translate-y-0.5 hover:shadow-[var(--shadow-overlay-sm)]",
          !isSpecial && "pl-4",
          primary.type === "alert"
            ? "border-warning/30 bg-warning/[0.04]"
            : primary.temporalState === "overdue"
              ? "border-danger/25 bg-danger/[0.03]"
              : "",
        )}
      >
        {/* Left domain rail */}
        {!isSpecial && (
          <span
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
              DOMAIN_BG_CLASSES[primary.domain]
            )}
          />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-heading">
              {primary.title}
            </p>
            <p className="mt-1 text-[12px] text-muted">
              {formatAgendaDateLabel(primary, timezone)}
              {primary.timebox.kind === "slot" ? ` · ${formatAgendaTimeLabel(primary, timezone)}` : ""}
            </p>
          </div>
          <Badge
            variant={primary.temporalState === "overdue" ? "danger" : primary.priority === "urgent" ? "warning" : "neutral"}
            size="sm"
          >
            {getAgendaTemporalStateLabel(primary)}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="neutral" size="sm">
            {getAgendaItemTypeLabel(primary.type)}
          </Badge>
          <Badge variant="neutral" size="sm">
            {getAgendaPriorityLabel(primary.priority)}
          </Badge>
          {primary.companyLabel ? (
            <Badge variant="neutral" size="sm">
              {primary.companyLabel}
            </Badge>
          ) : null}
        </div>

        {secondary.length > 0 ? (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Lié
            </p>
            <div className="space-y-2">
              {secondary.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="truncate text-body">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-muted">
                    {getAgendaItemTypeLabel(item.type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </SurfaceCard>
    </button>
  )
}

export function AgendaActionRail({
  sections,
  timezone,
  onSelectGroup,
}: AgendaActionRailProps) {
  const [openKeys, setOpenKeys] = React.useState<Set<string>>(
    () => new Set(sections.filter((section) => section.count > 0).map((section) => section.key)),
  )
  const [showAllKeys, setShowAllKeys] = React.useState<Set<string>>(() => new Set())

  const toggleSection = (key: string) => {
    setOpenKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <aside className="space-y-4">
      {sections.map((section) => {
        const isOpen = openKeys.has(section.key)
        const showAll = showAllKeys.has(section.key)
        const visibleItems = showAll
          ? section.items
          : section.items.slice(0, section.initialCount)

        return (
          <section
            key={section.key}
            className="rounded-lg border border-border bg-surface"
          >
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-heading">
                  {section.label}
                </h2>
                <Badge variant={section.count > 0 ? "brand" : "neutral"} size="sm">
                  {section.count}
                </Badge>
              </div>
              <span className="text-muted" aria-hidden="true">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen ? (
              <div className="space-y-3 border-t border-border px-3 py-3">
                {visibleItems.length > 0 ? (
                  visibleItems.map((group) => (
                    <GroupPreview
                      key={group.id}
                      group={group}
                      timezone={timezone}
                      onSelect={() => onSelectGroup(group)}
                    />
                  ))
                ) : (
                  <div className="rounded-[var(--radius-medium)] border border-dashed border-border px-3 py-4 text-[12px] text-muted">
                    Rien à signaler dans cette section.
                  </div>
                )}

                {!showAll && section.count > visibleItems.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllKeys((current) => {
                        const next = new Set(current)
                        next.add(section.key)
                        return next
                      })
                    }}
                    className="text-[12px] font-medium text-primary"
                  >
                    Voir tout
                  </button>
                ) : null}

                {showAll && section.count > section.initialCount ? (
                  <p className="text-[11px] text-muted">
                    {section.count} élément{section.count > 1 ? "s" : ""} dans cette section.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        )
      })}
    </aside>
  )
}
