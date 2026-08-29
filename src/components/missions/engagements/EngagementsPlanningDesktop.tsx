"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconButton } from "@/components/ui/IconButton"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { MissionAnnualPlanningLegend } from "@/components/missions/planning/MissionAnnualPlanningLegend"
import { MissionsAnnualPlanningDesktop } from "@/components/missions/planning/MissionsAnnualPlanningDesktop"
import type { MissionPlanningRow } from "@/components/missions/planning/mission-planning-types"

// ─────────────────────────────────────────────────────────────────────────────
//  Vue « Planning des AT » — Desktop, Phase 2.
//
//  Surface analytique transverse : vision annuelle unique de la vie temporelle
//  des missions d'assistance technique. Aucun Gantt réécrit — réemploi direct
//  du moteur de planning annuel existant (EntityPlanningView via
//  MissionsAnnualPlanningDesktop + MissionAnnualPlanningLegend), alimenté par le
//  loader getActiveMissionsPlanning (missions actives + absences + fermetures
//  clients + suivis calendaires).
//
//  Interactions réutilisées :
//   • clic mission  → vue « Missions AT › En cours » de la Phase 1 (?mission=)
//   • clic événement → EventDrawer global (AppOverlayHosts)
//  Aucun nouveau drawer, aucun nouveau calendrier.
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

export function EngagementsPlanningDesktop({ rows }: { rows: MissionPlanningRow[] }) {
  const router = useRouter()
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  const [year, setYear] = useState(CURRENT_YEAR)

  const openMission = (row: MissionPlanningRow) => {
    router.push(`/missions?vue=missions-at&mission=${encodeURIComponent(row.id)}`, {
      scroll: false,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-black tracking-tight text-heading">
            Planning des AT
          </h1>
          <p className="mt-0.5 text-[11px] text-muted">
            {rows.length} mission{rows.length > 1 ? "s" : ""} d’assistance technique active
            {rows.length > 1 ? "s" : ""} · fenêtres, congés, fermetures clients et suivis
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      <MissionAnnualPlanningLegend rows={rows} year={year} />

      <div className="overflow-x-auto pb-1">
        <MissionsAnnualPlanningDesktop
          rows={rows}
          year={year}
          onOpenMission={openMission}
          onOpenEvent={openEventDrawer}
        />
      </div>
    </div>
  )
}
