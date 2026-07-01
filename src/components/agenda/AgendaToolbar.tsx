"use client"

import React, { useTransition } from "react"
import { useRouter } from "next/navigation"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  buildAgendaToolbarHref,
  type AgendaDesktopPresentation,
  type AgendaDesktopRouteState,
} from "./agenda-desktop-model"

interface AgendaToolbarProps {
  route: AgendaDesktopRouteState
  filterOptions: AgendaDesktopPresentation["filterOptions"]
  activeFilterChips: AgendaDesktopPresentation["activeFilterChips"]
  summary: AgendaDesktopPresentation["summary"]
}

const MULTIPLE_VALUE = "__multiple__"

function normalizeSingleValue(values: string[]) {
  if (values.length === 0) return "all"
  if (values.length > 1) return MULTIPLE_VALUE
  return values[0]
}

export function AgendaToolbar({
  route,
  filterOptions,
  activeFilterChips,
  summary,
}: AgendaToolbarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href)
    })
  }

  const activeCount = activeFilterChips.length

  return (
    <div className="rounded-[var(--radius-large)] border border-border bg-surface px-4 py-3">
      <PageFilterBar
        activeCount={activeCount}
        onReset={
          activeCount > 0
            ? () => navigate(buildAgendaToolbarHref(route, {
              domains: [],
              types: [],
              priorities: [],
              ownerId: null,
              companyId: null,
              actionable: false,
            }))
            : undefined
        }
        summary={`${summary.totalItems} éléments · ${summary.totalActionable} actionnables`}
        viewSelector={(
          <div className="inline-flex rounded-[var(--radius-medium)] border border-border bg-canvas p-0.5">
            {(["day", "week"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => navigate(buildAgendaToolbarHref(route, { view }))}
                className={cn(
                  "rounded-[calc(var(--radius-medium)-4px)] px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  route.view === view
                    ? "bg-surface text-heading"
                    : "text-muted hover:text-heading",
                )}
                aria-pressed={route.view === view}
              >
                {view === "day" ? "Jour" : "Semaine"}
              </button>
            ))}
          </div>
        )}
      >
        <PageFilterSelect
          id="agenda-filter-domain"
          label="Domaine"
          value={normalizeSingleValue(route.filters.domains)}
          onChange={(value) => navigate(buildAgendaToolbarHref(route, {
            domains: value === "all" ? [] : value === MULTIPLE_VALUE ? route.filters.domains : [value as AgendaDesktopRouteState["filters"]["domains"][number]],
          }))}
          options={[
            { value: "all", label: "Tous les domaines" },
            ...(route.filters.domains.length > 1
              ? [{ value: MULTIPLE_VALUE, label: "Plusieurs domaines" }]
              : []),
            ...filterOptions.domains,
          ]}
        />

        <PageFilterSelect
          id="agenda-filter-type"
          label="Nature"
          value={normalizeSingleValue(route.filters.types)}
          onChange={(value) => navigate(buildAgendaToolbarHref(route, {
            types: value === "all" ? [] : value === MULTIPLE_VALUE ? route.filters.types : [value as AgendaDesktopRouteState["filters"]["types"][number]],
          }))}
          options={[
            { value: "all", label: "Toutes les natures" },
            ...(route.filters.types.length > 1
              ? [{ value: MULTIPLE_VALUE, label: "Plusieurs natures" }]
              : []),
            ...filterOptions.types,
          ]}
        />

        <PageFilterSelect
          id="agenda-filter-priority"
          label="Priorité"
          value={normalizeSingleValue(route.filters.priorities)}
          onChange={(value) => navigate(buildAgendaToolbarHref(route, {
            priorities: value === "all" ? [] : value === MULTIPLE_VALUE ? route.filters.priorities : [value as AgendaDesktopRouteState["filters"]["priorities"][number]],
          }))}
          options={[
            { value: "all", label: "Toutes les priorités" },
            ...(route.filters.priorities.length > 1
              ? [{ value: MULTIPLE_VALUE, label: "Plusieurs priorités" }]
              : []),
            ...filterOptions.priorities,
          ]}
        />

        <PageFilterSelect
          id="agenda-filter-owner"
          label="Propriétaire"
          value={route.filters.ownerId ?? "all"}
          onChange={(value) => navigate(buildAgendaToolbarHref(route, {
            ownerId: value === "all" ? null : value,
          }))}
          options={[
            { value: "all", label: "Tous les propriétaires" },
            ...filterOptions.owners,
          ]}
        />

        <PageFilterSelect
          id="agenda-filter-company"
          label="Compte"
          value={route.filters.companyId ?? "all"}
          onChange={(value) => navigate(buildAgendaToolbarHref(route, {
            companyId: value === "all" ? null : value,
          }))}
          options={[
            { value: "all", label: "Tous les comptes" },
            ...filterOptions.companies,
          ]}
        />

        <Button
          variant={route.filters.actionable ? "secondary" : "ghost"}
          size="sm"
          onClick={() => navigate(buildAgendaToolbarHref(route, {
            actionable: !route.filters.actionable,
          }))}
          className={cn(
            "h-9 min-w-0 px-3",
            route.filters.actionable && "border-primary/20 bg-primary/[0.06] text-primary-deep",
          )}
        >
          Actionnable
        </Button>
      </PageFilterBar>

      {activeFilterChips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => navigate(chip.clearHref)}
              className="cursor-pointer"
              disabled={isPending}
            >
              <Badge
                variant="neutral"
                className="pr-1.5 hover:border-primary/20 hover:bg-surface-hover"
              >
                {chip.label}
                <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-canvas text-muted">
                  ×
                </span>
              </Badge>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
