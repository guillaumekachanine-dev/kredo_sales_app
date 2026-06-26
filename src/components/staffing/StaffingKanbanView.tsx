"use client"

import React, { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useStaffingTabStore } from "@/lib/tabs/staffing-tab-store"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { formatEuro } from "@/lib/formatters"
import { mapDbStatusToStaffingStage, STAFFING_STAGES, StaffingStageKey } from "@/lib/staffing/stages"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"

interface StaffingKanbanViewProps {
  rows: StaffingListRow[]
}

const COLUMNS = STAFFING_STAGES.map((s) => ({
  key: s.key,
  label: s.label,
  color: s.color,
}))

export function StaffingKanbanView({ rows }: StaffingKanbanViewProps) {
  const { openTab } = useStaffingTabStore()

  // Group staffings by their mapped stage
  const grouped = useMemo(() => {
    const map: Record<StaffingStageKey, StaffingListRow[]> = {
      identifie: [],
      prequal: [],
      cv_envoye: [],
      entretien_client: [],
      issue: [],
    }

    rows.forEach((row) => {
      const stage = mapDbStatusToStaffingStage(row.status)
      if (map[stage]) {
        map[stage].push(row)
      } else {
        map.issue.push(row) // fallback
      }
    })

    return map
  }, [rows])

  return (
    <div className="flex w-full gap-4 overflow-x-auto pb-4 select-none" style={{ height: "calc(100vh - 200px)", minHeight: "450px" }}>
      {COLUMNS.map((col) => {
        const columnRows = grouped[col.key] || []
        
        return (
          <div
            key={col.key}
            className="flex flex-col flex-1 min-w-[160px] max-w-[260px] bg-surface/40 rounded-xl border border-border/50 p-3 h-full"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <h3 className="text-xs font-bold text-heading truncate">{col.label}</h3>
              </div>
              <span className="text-[10px] font-semibold text-muted bg-canvas border px-1.5 py-0.5 rounded shrink-0">
                {columnRows.length}
              </span>
            </div>

            {/* Cards container */}
            <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-0.5 custom-scrollbar">
              {columnRows.length > 0 ? (
                columnRows.map((row) => (
                  <div
                    key={row.id}
                    onClick={() =>
                      openTab({
                        entityType: "staffing",
                        entityId: row.id,
                        title: row.fullName,
                        subtitle: row.opportunityTitle,
                      })
                    }
                    className="flex flex-col gap-2 p-3 bg-surface border border-border/60 hover:border-primary/50 hover:bg-canvas/30 rounded-xl transition-all duration-200 cursor-pointer text-left focus-within:ring-1 focus-within:ring-primary/50"
                  >
                    {/* Candidate Identity */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-heading hover:text-primary hover:underline truncate block">
                          {row.fullName}
                        </span>
                        <span className="text-[10px] text-muted truncate block">
                          {row.profileTitle || "—"}
                        </span>
                      </div>
                      
                      <span className={cn(
                        "text-[7px] font-extrabold px-1 py-0.2 rounded shrink-0 border uppercase tracking-wider",
                        row.isCollaborator 
                          ? "bg-primary/5 border-primary/10 text-primary"
                          : "bg-brand-brass/5 border-brand-brass/10 text-brand-brass"
                      )}>
                        {row.isCollaborator ? "Interne" : "Externe"}
                      </span>
                    </div>

                    {/* Client & Opportunity Need */}
                    <div className="flex items-center gap-2 bg-canvas/30 p-2 rounded-lg border border-border/40">
                      <CompanyLogo
                        name={row.clientName || "Client"}
                        logoPath={row.clientLogoPath}
                        website={row.clientWebsite}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-heading truncate block leading-none">
                          {row.opportunityTitle}
                        </span>
                        <span className="text-[8px] text-muted truncate block mt-0.5">
                          {row.clientName}
                        </span>
                      </div>
                    </div>

                    {/* Salary or TJM */}
                    <div className="flex justify-between items-center text-[9px] text-muted">
                      {row.targetTjm && (
                        <span>
                          TJM : <span className="font-bold text-heading">{formatEuro(row.targetTjm)}</span>
                        </span>
                      )}
                      {row.salary && (
                        <span>
                          {row.isCollaborator ? "Salaire" : "Prétentions"} : <span className="font-bold text-heading">{formatEuro(row.salary)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-xl py-12 text-center">
                  <span className="text-[10px] italic text-muted">Aucun positionnement</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
