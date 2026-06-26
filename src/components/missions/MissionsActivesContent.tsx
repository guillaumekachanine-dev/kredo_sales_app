"use client"

import { useMemo, useState } from "react"
import { MissionsListView, type MissionsListRow } from "./MissionsListView"
import { Select } from "@/components/ui/Select"

interface MissionsActivesContentProps {
  missions: MissionsListRow[]
}

export function MissionsActivesContent({
  missions,
}: MissionsActivesContentProps) {
  const [riskFilter, setRiskFilter] = useState("all")
  const [practiceFilter, setPracticeFilter] = useState("all")
  const [tjmFilter, setTjmFilter] = useState("all")

  const practiceOptions = useMemo(
    () => Array.from(new Set(missions.map((row) => row.practice).filter(Boolean))).sort(),
    [missions],
  )

  const filteredMissions = useMemo(() => {
    return missions.filter((mission) => {
      if (practiceFilter !== "all" && mission.practice !== practiceFilter) return false

      if (riskFilter !== "all") {
        const isHighRisk = mission.riskLevel === "critique" || mission.riskLevel === "modere"
        if (riskFilter === "high" && !isHighRisk) return false
        if (riskFilter === "normal" && isHighRisk) return false
      }

      if (tjmFilter !== "all") {
        const tjmValue = mission.tjm || 0
        if (tjmFilter === "500" && tjmValue <= 500) return false
        if (tjmFilter === "700" && tjmValue <= 700) return false
      }

      return true
    })
  }, [missions, practiceFilter, riskFilter, tjmFilter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 sm:flex-none">
          <Select
            value={practiceFilter}
            onChange={(event) => setPracticeFilter(event.target.value)}
            className="w-full min-w-0 sm:min-w-[10rem] sm:w-auto"
            size="sm"
          >
            <option value="all">Toutes les practices</option>
            {practiceOptions.map((practice) => (
              <option key={practice} value={practice}>
                {practice}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-0 flex-1 sm:flex-none">
          <Select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
            className="w-full min-w-0 sm:min-w-[9rem] sm:w-auto"
            size="sm"
          >
            <option value="all">Toutes criticités</option>
            <option value="high">Priorité haute</option>
            <option value="normal">Priorité normale</option>
          </Select>
        </div>

        <div className="min-w-0 flex-1 sm:flex-none">
          <Select
            value={tjmFilter}
            onChange={(event) => setTjmFilter(event.target.value)}
            className="w-full min-w-0 sm:min-w-[9rem] sm:w-auto"
            size="sm"
          >
            <option value="all">Tous les TJM</option>
            <option value="500">Sup. à 500 €</option>
            <option value="700">Sup. à 700 €</option>
          </Select>
        </div>
      </div>

      <MissionsListView rows={filteredMissions} emptyMessage="Aucune mission active." />
    </div>
  )
}
