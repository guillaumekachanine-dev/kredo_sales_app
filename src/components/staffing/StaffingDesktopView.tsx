"use client"

import React, { useMemo, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import { StaffingListView } from "./StaffingListView"
import { StaffingKanbanView } from "./StaffingKanbanView"
import { StaffingPlanningView } from "./StaffingPlanningView"
import { mapDbStatusToStaffingStage } from "@/lib/staffing/stages"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"
import type { StaffingPlanningData } from "@/app/(app)/staffing/_data/get-staffings-planning"

interface StaffingDesktopViewProps {
  staffings: StaffingListRow[]
  planningData: StaffingPlanningData[]
}

const STAGE_OPTIONS = [
  { value: "all", label: "Toutes les étapes" },
  { value: "identifie", label: "Identifié" },
  { value: "prequal", label: "Préqualification" },
  { value: "cv_envoye", label: "CV envoyé" },
  { value: "entretien_client", label: "Entretien client" },
  { value: "issue", label: "Issue" },
]

const PRIORITY_OPTIONS = [
  { value: "all", label: "Toutes les priorités" },
  { value: "haute", label: "Haute" },
  { value: "normale", label: "Normale" },
  { value: "basse", label: "Basse" },
]

export function StaffingDesktopView({ staffings, planningData }: StaffingDesktopViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // 1. Sync states with URL search parameters
  const viewMode = (searchParams.get("view") || "list") as "list" | "kanban" | "planning"
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
      { value: "all", label: "Toutes les practices" },
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
    { value: "kanban", label: "Kanban" },
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
      </PageFilterBar>

      {/* Main view distribution */}
      <div className="mt-2">
        {viewMode === "list" && <StaffingListView rows={filteredStaffings} />}
        {viewMode === "kanban" && <StaffingKanbanView rows={filteredStaffings} />}
        {viewMode === "planning" && <StaffingPlanningView planningData={filteredPlanning} />}
      </div>
    </div>
  )
}
