"use client"

import React, { useMemo, useState } from "react"
import { useStaffingTabStore } from "@/lib/tabs/staffing-tab-store"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { StaffingPlanningData, StaffingPlanningMilestone } from "@/app/(app)/staffing/_data/get-staffings-planning"

interface StaffingPlanningViewProps {
  planningData: StaffingPlanningData[]
}

const PLANNING_YEAR = 2026

const MONTHS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", 
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"
]

const MILESTONE_COLORS: Record<string, string> = {
  identification: "bg-indigo-500 border-indigo-600 text-white",
  cv_sent: "bg-orange-500 border-orange-600 text-white",
  prequal: "bg-violet-500 border-violet-600 text-white",
  manager_interview: "bg-blue-500 border-blue-600 text-white",
  tech_test: "bg-yellow-500 border-yellow-600 text-white",
  client_presentation: "bg-pink-500 border-pink-600 text-white",
  exit_mission: "bg-rose-500 border-rose-600 text-white",
  demarrage: "bg-teal-500 border-teal-600 text-white",
}

export function StaffingPlanningView({ planningData }: StaffingPlanningViewProps) {
  const { openTab } = useStaffingTabStore()
  const [hoveredMilestone, setHoveredMilestone] = useState<{
    m: StaffingPlanningMilestone
    fullName: string
    x: number
    y: number
  } | null>(null)

  const range = useMemo(() => {
    const start = new Date(PLANNING_YEAR, 0, 1) // Jan 1st 2026
    const end = new Date(PLANNING_YEAR, 11, 31)  // Dec 31st 2026
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    return { start, end, totalDays }
  }, [])

  const getPercentOffset = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = date.getTime() - range.start.getTime()
    const days = diff / (1000 * 60 * 60 * 24)
    const pct = (days / range.totalDays) * 100
    return Math.max(0, Math.min(100, pct))
  }

  const handleMilestoneMouseEnter = (
    m: StaffingPlanningMilestone, 
    fullName: string, 
    e: React.MouseEvent<HTMLSpanElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredMilestone({
      m,
      fullName,
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY,
    })
  }

  const handleMilestoneMouseLeave = () => {
    setHoveredMilestone(null)
  }

  return (
    <div className="w-full select-none" style={{ minWidth: "800px" }}>
      <SurfaceCard className="p-4 overflow-x-auto border-0 rounded-[var(--radius-medium)]">
        {/* Planning Header Columns */}
        <div className="grid grid-cols-[200px_1fr] border-b border-border/50 pb-2 mb-3">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider pl-4">Identité</span>
          <div className="grid grid-cols-12 text-center text-[10px] font-bold text-muted uppercase tracking-wider">
            {MONTHS.map((m) => (
              <span key={m} className="border-r border-border/20 last:border-r-0">{m}</span>
            ))}
          </div>
        </div>

        {/* Planning Rows */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {planningData.map((row) => (
            <div key={row.id} className="grid grid-cols-[200px_1fr] items-center py-2 border-b border-border/20 last:border-b-0 group">
              {/* Left Identity column */}
              <div className="min-w-0 pr-4">
                <button
                  type="button"
                  onClick={() =>
                    openTab({
                      entityType: "staffing",
                      entityId: row.id,
                      title: row.fullName,
                      subtitle: row.opportunityTitle,
                    })
                  }
                  className="text-left font-bold text-xs text-heading hover:text-primary hover:underline truncate block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                >
                  {row.fullName}
                </button>
                <span className="text-[9px] text-muted truncate block mt-0.5 leading-tight">
                  {row.opportunityTitle}
                </span>
              </div>

              {/* Right timeline column */}
              <div className="relative h-10 flex items-center">
                {/* Background 12 column grid */}
                <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="border-r border-border/10 h-full last:border-0" />
                  ))}
                </div>

                {/* Horizontal line segment */}
                <div className="absolute h-0.5 left-2 right-2 bg-border/40 pointer-events-none" />

                {/* Milestone nodes */}
                {row.milestones.map((m) => {
                  const leftOffset = getPercentOffset(m.date)
                  const colorClass = MILESTONE_COLORS[m.type] || "bg-muted border-border"
                  
                  return (
                    <span
                      key={m.key}
                      style={{ left: `calc(${leftOffset}% - 6px)` }}
                      onMouseEnter={(e) => handleMilestoneMouseEnter(m, row.fullName, e)}
                      onMouseLeave={handleMilestoneMouseLeave}
                      className={cn(
                        "absolute size-3.5 rounded-full border border-surface flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-125 z-10",
                        colorClass,
                        m.isFuture && "border-dashed"
                      )}
                    >
                      <span className="size-1 rounded-full bg-white" />
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      {/* Floating Tooltip */}
      {hoveredMilestone && (
        <div
          className="absolute z-50 pointer-events-none flex flex-col gap-1 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-[10px] shadow-xl w-60 select-none animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${hoveredMilestone.x - 120}px`,
            top: `${hoveredMilestone.y - 88}px`,
          }}
        >
          <div className="flex justify-between items-center gap-2 border-b border-white/10 pb-1">
            <span className="font-bold text-[11px] truncate">{hoveredMilestone.m.label}</span>
            <span className={cn(
              "px-1 py-0.2 rounded text-[7px] font-extrabold uppercase shrink-0 border border-white/10",
              hoveredMilestone.m.isFuture ? "text-yellow-400 bg-yellow-400/10" : "text-emerald-400 bg-emerald-400/10"
            )}>
              {hoveredMilestone.m.isFuture ? "À venir" : "Fait"}
            </span>
          </div>
          <span className="text-white/60 block mt-0.5">Profil : {hoveredMilestone.fullName}</span>
          <span className="text-white/60 block">
            Date : {new Date(hoveredMilestone.m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
          {hoveredMilestone.m.description && (
            <p className="text-white/50 border-t border-white/5 pt-1 mt-1 leading-snug truncate">
              {hoveredMilestone.m.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
