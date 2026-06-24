"use client"

import { useState, useCallback } from "react"
import { ActiveMissionsOverviewSection } from "./ActiveMissionsOverviewSection"
import { MissionsListView, type MissionsListRow } from "./MissionsListView"
import { MissionPlanningDesktop } from "./planning/MissionPlanningDesktop"
import type { MissionPlanningRow } from "./planning/mission-planning-types"

interface MissionsActivesContentProps {
  missions: MissionsListRow[]
  planningRows: MissionPlanningRow[]
}

export function MissionsActivesContent({
  missions,
  planningRows,
}: MissionsActivesContentProps) {
  const [view, setView] = useState<"list" | "planning">("list")

  const handleToggle = useCallback(() => {
    setView((v) => (v === "list" ? "planning" : "list"))
  }, [])

  return (
    <>
      <ActiveMissionsOverviewSection
        rows={missions}
        maxRows={8}
        viewMode={view}
        onToggleView={handleToggle}
      />

      {view === "list" ? (
        <MissionsListView rows={missions} emptyMessage="Aucune mission active." />
      ) : (
        <MissionPlanningDesktop rows={planningRows} />
      )}
    </>
  )
}
