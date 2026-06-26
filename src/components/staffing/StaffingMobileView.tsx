"use client"

import React, { useMemo } from "react"
import { useStaffingTabStore } from "@/lib/tabs/staffing-tab-store"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { formatEuro } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"

interface StaffingMobileViewProps {
  rows: StaffingListRow[]
}

const STAGE_LABELS: Record<string, string> = {
  identifie: "Identifié",
  propose_interne: "Proposé interne",
  preselectionne: "Présélectionné",
  envoye_client: "CV envoyé",
  entretien_planifie: "Entretien client",
  entretien_realise: "Entretien client",
  retenu: "Retenu",
  gagne: "Gagné",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

const STAGE_COLORS: Record<string, string> = {
  identifie: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  propose_interne: "bg-indigo-400/10 text-indigo-400 border-indigo-400/20",
  preselectionne: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  envoye_client: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  entretien_planifie: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  entretien_realise: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  retenu: "bg-success/10 text-success border-success/20",
  gagne: "bg-success/10 text-success border-success/20",
  refuse_client: "bg-danger/10 text-danger border-danger/20",
  refuse_candidat: "bg-danger/10 text-danger border-danger/20",
  abandonne: "bg-muted/10 text-muted border-muted/20",
}

export function StaffingMobileView({ rows }: StaffingMobileViewProps) {
  const { openTab } = useStaffingTabStore()

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted">
        Aucun positionnement trouvé.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {rows.map((row) => {
        const colorClass = STAGE_COLORS[row.status] || "bg-muted/10 text-muted border-muted/20"
        const label = STAGE_LABELS[row.status] || row.status.replaceAll("_", " ")

        return (
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
            className="bg-surface border border-border/50 rounded-[var(--radius-medium)] p-4 flex flex-col gap-3 relative cursor-pointer active:scale-[0.99] transition-all select-none"
          >
            {/* Header: Client Name, Logo and Statut Pill */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CompanyLogo
                  name={row.clientName || "Client"}
                  logoPath={row.clientLogoPath}
                  website={row.clientWebsite}
                  size="sm"
                />
                <span className="font-bold text-heading text-xs truncate">{row.clientName}</span>
              </div>

              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider select-none shrink-0",
                row.isCollaborator 
                  ? "bg-primary/5 border-primary/10 text-primary"
                  : "bg-brand-brass/5 border-brand-brass/10 text-brand-brass"
              )}>
                {row.isCollaborator ? "Interne" : "Externe"}
              </span>
            </div>

            {/* Candidate Identity & Opportunity Need */}
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-body text-xs leading-snug">
                {row.fullName}
              </h4>
              <p className="text-[10px] text-muted mt-0.5">
                Profil : <span className="font-medium text-body">{row.profileTitle || "—"}</span>
              </p>
              <p className="text-[10px] text-muted leading-tight mt-1">
                Besoin : <span className="font-medium text-body">{row.opportunityTitle}</span>
              </p>
            </div>

            {/* Financial Details (TJM, Salary, Margin) */}
            <div className="flex flex-col gap-2 bg-canvas/30 p-2.5 rounded-[var(--radius-medium)] border border-border/40 text-[10px] text-body">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-muted uppercase tracking-wider mb-0.5">TJM</span>
                  <span className="font-extrabold text-heading">{row.targetTjm ? `${formatEuro(row.targetTjm)}/j` : "—"}</span>
                </div>
                <div className="flex flex-col border-l border-border/30 pl-2">
                  <span className="text-[8px] font-bold text-muted uppercase tracking-wider mb-0.5">Salaire</span>
                  <span className="font-extrabold text-heading truncate">{row.salary ? `${formatEuro(row.salary)}` : "—"}</span>
                </div>
                <div className="flex flex-col border-l border-border/30 pl-2">
                  <span className="text-[8px] font-bold text-muted uppercase tracking-wider mb-0.5">Marge</span>
                  <span className="font-extrabold text-heading">{row.marginPct !== null ? `${row.marginPct} %` : "—"}</span>
                </div>
              </div>

              {/* Staffing Status badge */}
              <div className="border-t border-border/20 pt-2 flex items-center justify-between text-[9px] mt-1">
                <span className="text-muted">Étape active :</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider",
                  colorClass
                )}>
                  {label}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
