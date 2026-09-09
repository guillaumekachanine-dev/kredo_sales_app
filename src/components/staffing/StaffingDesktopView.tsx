"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import { Select } from "@/components/ui/Select"
import { StaffingListView } from "./StaffingListView"
import { StaffingPlanningView } from "./StaffingPlanningView"
import { mapDbStatusToStaffingStage } from "@/lib/staffing/stages"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"
import type { StaffingPlanningData } from "@/app/(app)/staffing/_data/get-staffings-planning"

interface StaffingDesktopViewProps {
  staffings: StaffingListRow[]
  planningData: StaffingPlanningData[]
}

const STAGE_OPTIONS = [
  { value: "all", label: "Étapes" },
  { value: "identifie", label: "Identifié" },
  { value: "prequal", label: "Préqualification" },
  { value: "cv_envoye", label: "CV envoyé" },
  { value: "entretien_client", label: "Entretien client" },
  { value: "issue", label: "Issue" },
]

const PRIORITY_OPTIONS = [
  { value: "all", label: "Priorité" },
  { value: "haute", label: "Haute" },
  { value: "normale", label: "Normale" },
  { value: "basse", label: "Basse" },
]

export function StaffingDesktopView({ staffings, planningData }: StaffingDesktopViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [planningScale, setPlanningScale] = useState<"year" | "quarter" | "month" | "week">("week")

  // 1. Sync states with URL search parameters
  const rawView = searchParams.get("view")
  const viewMode: "list" | "planning" = rawView === "planning" ? "planning" : "list"
  const stageFilter = searchParams.get("stage") || "all"
  const priorityFilter = searchParams.get("priority") || "all"
  const practiceFilter = searchParams.get("practice") || "all"

  const updateParam = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "all" || !value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleReset = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("stage")
      params.delete("priority")
      params.delete("practice")
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // Extract unique list of practices from data dynamically
  const practiceOptions = useMemo(() => {
    const set = new Set<string>()
    staffings.forEach((s) => {
      if (s.practice) set.add(s.practice)
    })
    return [
      { value: "all", label: "Practice" },
      ...Array.from(set).map((p) => ({ value: p, label: p })),
    ]
  }, [staffings])

  // 2. Filter list data
  const filteredStaffings = useMemo(() => {
    return staffings.filter((s) => {
      const stage = mapDbStatusToStaffingStage(s.status)
      if (stageFilter !== "all" && stage !== stageFilter) return false
      if (priorityFilter !== "all" && s.opportunityPriority !== priorityFilter) return false
      if (practiceFilter !== "all" && s.practice !== practiceFilter) return false
      return true
    })
  }, [staffings, stageFilter, priorityFilter, practiceFilter])

  // 3. Filter planning data
  const filteredPlanning = useMemo(() => {
    return planningData.filter((p) => {
      // Find candidate in list data to check priority & practice
      const listMatch = staffings.find((s) => s.id === p.id)
      const stage = mapDbStatusToStaffingStage(p.currentStage)
      if (stageFilter !== "all" && stage !== stageFilter) return false
      if (listMatch) {
        if (priorityFilter !== "all" && listMatch.opportunityPriority !== priorityFilter) return false
        if (practiceFilter !== "all" && listMatch.practice !== practiceFilter) return false
      }
      return true
    })
  }, [planningData, staffings, stageFilter, priorityFilter, practiceFilter])

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (practiceFilter !== "all" ? 1 : 0)

  const VIEW_ITEMS = [
    { value: "list", label: "Liste" },
    { value: "planning", label: "Planning" },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Filters Bar */}
      <PageFilterBar
        activeCount={activeFilterCount}
        onReset={handleReset}
        viewSelector={
          <PageViewSelector
            ariaLabel="Sélecteur de vue staffing"
            items={VIEW_ITEMS}
            value={viewMode}
            onChange={(val) => updateParam("view", val)}
          />
        }
      >
        {viewMode === "list" && (
          <>
            <PageFilterSelect
              id="staffing-stage-filter"
              label="Étape"
              options={STAGE_OPTIONS}
              value={stageFilter}
              onChange={(val) => updateParam("stage", val)}
            />
            <PageFilterSelect
              id="staffing-priority-filter"
              label="Priorité"
              options={PRIORITY_OPTIONS}
              value={priorityFilter}
              onChange={(val) => updateParam("priority", val)}
            />
            <PageFilterSelect
              id="staffing-practice-filter"
              label="Practice"
              options={practiceOptions}
              value={practiceFilter}
              onChange={(val) => updateParam("practice", val)}
            />
          </>
        )}

        {viewMode === "planning" && (
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-medium)] border border-primary bg-primary/[0.08] text-primary text-xs font-semibold transition-colors hover:bg-primary/[0.15] active:scale-95 cursor-pointer select-none"
              onClick={() => {}}
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Créer un événement
            </button>

            <div className="flex items-center gap-1.5 select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass opacity-85">Échelle</span>
              <Select
                id="staffing-planning-scale-select"
                size="sm"
                value={planningScale}
                onChange={(e) => setPlanningScale(e.target.value as any)}
                className="text-brand-brass border-brand-brass bg-brand-brass/[0.08] hover:bg-brand-brass/[0.12] w-auto font-sans"
              >
                <option value="week">Semaine</option>
                <option value="month">Mois</option>
                <option value="quarter">Trimestre</option>
                <option value="year">Année</option>
              </Select>
            </div>
          </>
        )}
      </PageFilterBar>

      {/* Main view distribution */}
      <div className="mt-2">
        {viewMode === "list" && <StaffingListView rows={filteredStaffings} />}
        {viewMode === "planning" && <StaffingPlanningView planningData={filteredPlanning} scale={planningScale} />}
      </div>
    </div>
  )
}
