"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconButton } from "@/components/ui/IconButton"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { MissionAnnualPlanningLegend } from "@/components/missions/planning/MissionAnnualPlanningLegend"
import { MissionsAnnualPlanningDesktop } from "@/components/missions/planning/MissionsAnnualPlanningDesktop"
import type { MissionPlanningRow } from "@/components/missions/planning/mission-planning-types"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  Vue « Planning des engagements » — Desktop, Phase 2.
//
//  Surface analytique transverse : vision annuelle unifiée des missions
//  d'assistance technique et des projets forfait avec leurs jalons et échéances.
//
//  Interactions réutilisées :
//   • clic mission AT → vue « Assistance technique » (?mission=)
//   • clic projet     → tiroir de projet (useMissionsTabStore)
//   • clic événement  → EventDrawer global (AppOverlayHosts)
// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

function ChevronLeft() {
  return (
    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

type EngagementFilter = "all" | "missions-at" | "projects"

export function EngagementsPlanningDesktop({ rows }: { rows: MissionPlanningRow[] }) {
  const router = useRouter()
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  const { openTab } = useMissionsTabStore()
  const [year, setYear] = useState(CURRENT_YEAR)
  const [filter, setFilter] = useState<EngagementFilter>("all")

  const atRows = rows.filter((r) => r.engagementType !== "project")
  const projectRows = rows.filter((r) => r.engagementType === "project")

  const filteredRows =
    filter === "missions-at"
      ? atRows
      : filter === "projects"
        ? projectRows
        : rows

  const openEngagement = (row: MissionPlanningRow) => {
    if (row.engagementType === "project") {
      openTab({
        entityType: "project",
        entityId: row.id,
        title: row.title,
        subtitle: row.projectCode ?? "",
      })
    } else {
      router.push(`/missions?vue=missions-at&mission=${encodeURIComponent(row.id)}`, {
        scroll: false,
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-black tracking-tight text-heading">
            Planning des engagements
          </h1>
          <p className="mt-0.5 text-[11px] text-muted">
            {atRows.length} mission{atRows.length > 1 ? "s" : ""} d’assistance technique ·{" "}
            {projectRows.length} projet{projectRows.length > 1 ? "s" : ""} · fenêtres, jalons, congés et échéances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                filter === "all"
                  ? "bg-canvas text-heading shadow-xs"
                  : "text-muted hover:text-body",
              )}
            >
              Tous ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("missions-at")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                filter === "missions-at"
                  ? "bg-canvas text-heading shadow-xs"
                  : "text-muted hover:text-body",
              )}
            >
              Assistance technique ({atRows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("projects")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                filter === "projects"
                  ? "bg-canvas text-heading shadow-xs"
                  : "text-muted hover:text-body",
              )}
            >
              Projets ({projectRows.length})
            </button>
          </div>

          {year !== CURRENT_YEAR ? (
            <button
              type="button"
              onClick={() => setYear(CURRENT_YEAR)}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Année courante
            </button>
          ) : null}

          <div className="inline-flex items-center overflow-hidden rounded-[var(--radius-medium)] border border-brand-brass bg-brand-brass/[0.08] text-brand-brass">
            <IconButton
              aria-label="Année précédente"
              variant="ghost"
              size="sm"
              onClick={() => setYear((value) => value - 1)}
              className="size-8 rounded-none border-r border-brand-brass/20 text-brand-brass hover:bg-brand-brass/[0.12]"
            >
              <ChevronLeft />
            </IconButton>
            <span className="px-3 text-xs font-semibold tracking-wide">{year}</span>
            <IconButton
              aria-label="Année suivante"
              variant="ghost"
              size="sm"
              onClick={() => setYear((value) => value + 1)}
              className="size-8 rounded-none border-l border-brand-brass/20 text-brand-brass hover:bg-brand-brass/[0.12]"
            >
              <ChevronRight />
            </IconButton>
          </div>
        </div>
      </header>

      <MissionAnnualPlanningLegend rows={filteredRows} year={year} />

      <div className="overflow-x-auto pb-1">
        <MissionsAnnualPlanningDesktop
          rows={filteredRows}
          year={year}
          onOpenMission={openEngagement}
          onOpenEvent={openEventDrawer}
        />
      </div>
    </div>
  )
}
