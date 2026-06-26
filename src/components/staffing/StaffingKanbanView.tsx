"use client"

import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useStaffingTabStore } from "@/lib/tabs/staffing-tab-store"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { formatEuro } from "@/lib/formatters"
import { mapDbStatusToStaffingStage, STAFFING_STAGES, StaffingStageKey } from "@/lib/staffing/stages"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"

interface StaffingKanbanViewProps {
  rows: StaffingListRow[]
  displayMode: "candidat" | "opportunite"
}

const COLUMNS = STAFFING_STAGES.map((s) => ({
  key: s.key,
  label: s.label,
  color: s.color,
}))

export function StaffingKanbanView({ rows, displayMode }: StaffingKanbanViewProps) {
  const { openTab } = useStaffingTabStore()

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
        map.issue.push(row)
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
            className="flex flex-col flex-1 min-w-[180px] max-w-[260px] bg-surface/40 rounded-xl border border-border/50 p-3 h-full"
          >
            {/* Column Header — couleur d'étape comme sur la page Opportunités */}
            <div
              className="flex items-center justify-between gap-2 pb-3 mb-3 border-b shrink-0"
              style={{ borderBottomColor: col.color }}
            >
              <h3
                className="text-[13px] font-bold truncate"
                style={{ color: col.color }}
              >
                {col.label}
              </h3>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ color: col.color }}
              >
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
                    className="w-full h-[152px] perspective-1000 cursor-pointer select-none"
                  >
                    {/* Inner container qui tourne */}
                    <div
                      className={cn(
                        "relative w-full h-full duration-500 transform-style-3d transition-transform ease-out-back",
                        displayMode === "opportunite" ? "rotate-y-180" : ""
                      )}
                    >
                      {/* Face Avant — Candidat */}
                      <div className="absolute inset-0 backface-hidden w-full h-full flex flex-col gap-2 p-3 bg-surface border border-border/60 hover:border-primary/50 hover:bg-canvas/30 rounded-xl transition-all duration-150 overflow-hidden">
                        {/* Identity */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-heading hover:text-primary truncate block">
                              {row.fullName}
                            </span>
                            <span className="text-[10px] text-muted truncate block mt-0.5">
                              {row.profileTitle || "—"}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[7px] font-extrabold px-1.5 py-0.5 rounded shrink-0 border uppercase tracking-wider",
                            row.isCollaborator
                              ? "bg-primary/5 border-primary/10 text-primary"
                              : "bg-brand-brass/5 border-brand-brass/10 text-brand-brass"
                          )}>
                            {row.isCollaborator ? "Interne" : "Externe"}
                          </span>
                        </div>

                        {/* Client & Opportunity */}
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

                        {/* Financials */}
                        <div className="flex justify-between items-center gap-1 text-[9px] text-muted mt-auto">
                          {row.targetTjm ? (
                            <span>TJM : <span className="font-bold text-heading">{formatEuro(row.targetTjm)}</span></span>
                          ) : <span />}
                          {row.marginPct !== null ? (
                            <span className={cn("font-bold", row.marginPct >= 20 ? "text-success" : "text-heading")}>
                              Marge : {row.marginPct} %
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Face Arrière — Opportunité */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full flex flex-col gap-2 p-3 bg-surface border border-border/60 hover:border-primary/50 hover:bg-canvas/30 rounded-xl transition-all duration-150 overflow-hidden">
                        {/* Client header */}
                        <div className="flex items-center gap-2 border-b border-border/50 pb-2 min-w-0">
                          <CompanyLogo
                            name={row.clientName || "Client"}
                            logoPath={row.clientLogoPath}
                            website={row.clientWebsite}
                            size="sm"
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-muted uppercase tracking-wider truncate block">
                              {row.clientName}
                            </span>
                            <span className="text-[10px] font-bold text-heading truncate block mt-0.5">
                              {row.opportunityTitle}
                            </span>
                          </div>
                        </div>

                        {/* Opportunity metadata */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9px] flex-1">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">Séniorité</span>
                            <span className="font-semibold text-heading mt-0.5">{row.seniority || "—"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">TJM cible</span>
                            <span className="font-semibold text-heading mt-0.5">{row.targetTjm ? `${formatEuro(row.targetTjm)}/j` : "—"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">Practice</span>
                            <span className="font-semibold text-heading mt-0.5 truncate">{row.practice || "—"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">Marge cible</span>
                            <span className={cn("font-bold mt-0.5", row.marginPct !== null && row.marginPct >= 20 ? "text-success" : "text-heading")}>
                              {row.marginPct !== null ? `${row.marginPct} %` : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Candidate recap */}
                        <div className="mt-auto pt-1.5 border-t border-border/40 flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold text-heading truncate">{row.fullName}</span>
                          <span className={cn(
                            "text-[7px] font-extrabold px-1.5 py-0.5 rounded shrink-0 border uppercase tracking-wider",
                            row.isCollaborator
                              ? "bg-primary/5 border-primary/10 text-primary"
                              : "bg-brand-brass/5 border-brand-brass/10 text-brand-brass"
                          )}>
                            {row.isCollaborator ? "Interne" : "Externe"}
                          </span>
                        </div>
                      </div>
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
