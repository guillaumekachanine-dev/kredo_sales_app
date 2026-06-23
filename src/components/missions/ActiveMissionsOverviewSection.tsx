"use client"

import Link from "next/link"
import { useState } from "react"
import { Select } from "@/components/ui/Select"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import type { MissionsListRow } from "./MissionsListView"

interface ActiveMissionsOverviewSectionProps {
  rows: MissionsListRow[]
  linkHref?: string
  linkLabel?: string
  maxRows?: number
}

function getDaysRemaining(endDateStr?: string) {
  if (!endDateStr) return { label: "Indetermine", pct: 100, color: "bg-emerald-500" }

  const end = new Date(endDateStr)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return { label: "Terminee", pct: 100, color: "bg-slate-300" }
  if (diffDays <= 15) return { label: "15 jours", pct: 20, color: "bg-amber-500" }
  if (diffDays <= 30) return { label: "30 jours", pct: 40, color: "bg-amber-500" }
  if (diffDays <= 60) return { label: "2 mois", pct: 60, color: "bg-blue-600" }
  return { label: "3 mois +", pct: 85, color: "bg-emerald-500" }
}

export function ActiveMissionsOverviewSection({
  rows,
  linkHref,
  linkLabel,
  maxRows = 6,
}: ActiveMissionsOverviewSectionProps) {
  const { openTab } = useMissionsTabStore()
  const [riskFilter, setRiskFilter] = useState("all")
  const [practiceFilter, setPracticeFilter] = useState("all")
  const [tjmFilter, setTjmFilter] = useState("all")

  const filteredRows = rows.filter((mission) => {
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

  const displayRows = filteredRows.slice(0, maxRows).map((mission, index) => {
    const remainingInfo = getDaysRemaining(mission.endDate)
    const clientName = mission.client || "Compte non renseigne"
    const hasRisk = mission.riskLevel === "critique" || mission.riskLevel === "modere"

    return {
      id: mission.entityId,
      consultant: mission.consultant || `Consultant ${String.fromCharCode(65 + index)}`,
      client: clientName,
      logoLetter: clientName.charAt(0).toUpperCase(),
      logoColor: index % 2 === 0 ? "bg-blue-600 text-white" : "bg-amber-500 text-white",
      remaining: remainingInfo.label,
      progress: remainingInfo.pct,
      color: remainingInfo.color,
      tjm: mission.tjm ? `EUR ${mission.tjm}` : "EUR --",
      status: hasRisk ? "Risque eleve" : "Stable",
      statusColor: hasRisk ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
    }
  })

  const practiceOptions = Array.from(new Set(rows.map((row) => row.practice).filter(Boolean))).sort()

  return (
    <section className="bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-border/40 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-heading font-heading">
            Suivi des Missions Actives
          </h2>
          <p className="text-xs text-muted">
            Vue operationnelle des echeances, du TJM et des signaux de vigilance avant la liste detaillee.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 sm:flex-none">
            <Select
              value={practiceFilter}
              onChange={(event) => setPracticeFilter(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-1.5 pr-8 text-xs font-medium text-body focus:outline-none focus:border-blue-600 sm:min-w-[8.5rem] sm:w-auto"
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
              className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-1.5 pr-8 text-xs font-medium text-body focus:outline-none focus:border-blue-600 sm:min-w-[7.5rem] sm:w-auto"
            >
              <option value="all">Toutes criticites</option>
              <option value="high">Priorite haute</option>
              <option value="normal">Priorite normale</option>
            </Select>
          </div>

          <div className="min-w-0 flex-1 sm:flex-none">
            <Select
              value={tjmFilter}
              onChange={(event) => setTjmFilter(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-1.5 pr-8 text-xs font-medium text-body focus:outline-none focus:border-blue-600 sm:min-w-[7.5rem] sm:w-auto"
            >
              <option value="all">Tous les TJM</option>
              <option value="500">Sup. a 500 EUR</option>
              <option value="700">Sup. a 700 EUR</option>
            </Select>
          </div>

          {linkHref && linkLabel ? (
            <Link
              href={linkHref}
              className="rounded-lg border border-border/80 bg-canvas px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-surface-hover hover:underline"
            >
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </div>

      {displayRows.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/60 bg-canvas/30 px-6 text-center text-xs text-muted">
          Aucune mission active ne correspond aux filtres selectionnes.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted">
                <th className="py-2.5 pb-3 font-bold">Consultant</th>
                <th className="py-2.5 pb-3 font-bold">Client</th>
                <th className="py-2.5 pb-3 font-bold">Fin de mission</th>
                <th className="py-2.5 pb-3 font-bold">TJM</th>
                <th className="py-2.5 pb-3 font-bold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {displayRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() =>
                    openTab({
                      entityType: "mission",
                      entityId: row.id,
                      title: row.consultant,
                      subtitle: `Mission · ${row.client}`,
                    })
                  }
                  className="cursor-pointer transition-all duration-150 hover:bg-canvas/30 hover:translate-x-0.5"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-slate-100 text-[10px] font-bold text-heading">
                        {row.consultant.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-semibold text-heading">{row.consultant}</span>
                    </div>
                  </td>

                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${row.logoColor}`}>
                        {row.logoLetter}
                      </div>
                      <span className="font-medium text-body">{row.client}</span>
                    </div>
                  </td>

                  <td className="py-3">
                    <div className="flex w-36 flex-col gap-1">
                      <span className="text-[10px] text-body">{row.remaining}</span>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${row.color}`} style={{ width: `${row.progress}%` }} />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 font-semibold text-heading">
                    {row.tjm}
                  </td>

                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.statusColor}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
