"use client"

import { useState } from "react"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { NewStaffingButton } from "@/components/needs-staffing/NewStaffingButton"
import {
  FinancialModelingDesktopDialog,
  getFinancialModelForStaffingAction,
  type FinancialModelingLaunchPreset,
} from "@/features/financial-modeling"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"
import type { OpenNeedOption } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  identifie: "Identifié",
  propose_interne: "Proposé en interne",
  preselectionne: "Présélectionné",
  envoye_client: "CV envoyé",
  entretien_planifie: "Entretien client",
  entretien_realise: "Entretien client",
  retenu: "Retenu",
  gagne: "Gagné",
}

function matchTone(score: number | null) {
  if (score == null) return "text-muted"
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-primary"
  return "text-heading"
}

// Rail droit du chapitre Besoins (Lot 6) — « Staffing en cours ».
// Positionnements **actifs** du besoin sélectionné (Lot 5). Drawer unique
// `useStaffingDrawerStore` (jamais de second système). Simulation par ligne =
// même `FinancialModelingDesktopDialog` que le workspace legacy (OPP-13, aucune
// deuxième modale) ; rationalisée dans le module « Simulation devis » au Lot 10.

interface StaffingInProgressRailProps {
  staffing: StaffingListRow[]
  openNeeds: OpenNeedOption[]
  selectedNeedTitle: string | null
}

export function StaffingInProgressRail({ staffing, openNeeds, selectedNeedTitle }: StaffingInProgressRailProps) {
  const openStaffingDrawer = useStaffingDrawerStore((state) => state.openStaffingDrawer)
  const [simulation, setSimulation] = useState<{
    modelId: string | null
    preset: FinancialModelingLaunchPreset
  } | null>(null)

  const handleSimulate = async (row: StaffingListRow) => {
    const result = await getFinancialModelForStaffingAction(row.opportunityId, row.candidateId)
    if (!result.success) {
      window.alert(result.error || "Impossible de charger la simulation financière.")
      return
    }
    setSimulation({
      modelId: result.id ?? null,
      preset: {
        mode: "flash",
        candidateId: row.candidateId,
        candidateName: row.fullName,
        annualGrossSalary: row.salary,
        companyId: row.companyId,
        companyName: row.clientName,
        opportunityId: row.opportunityId,
        opportunityTitle: row.opportunityTitle,
        salesDailyRate: row.opportunityTargetDailyRate,
      },
    })
  }

  return (
    <section className="flex min-h-0 flex-col" aria-labelledby="staffing-rail-title">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-3">
        <h2 id="staffing-rail-title" className="text-xs font-bold text-heading">
          Staffing en cours <span className="font-normal text-muted">({staffing.length})</span>
        </h2>
        <NewStaffingButton openNeeds={openNeeds} iconOnly />
      </div>

      {staffing.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-muted">
          {selectedNeedTitle
            ? "Aucun positionnement actif sur ce besoin."
            : "Sélectionnez un besoin pour voir son staffing."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {staffing.map((row) => (
            <li key={row.id} className="border-b border-border">
              <button
                type="button"
                onClick={() => openStaffingDrawer(row.id)}
                className="block w-full px-3 py-3 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-heading">{row.fullName}</p>
                  <span className={cn("shrink-0 text-xs font-semibold tabular-nums", matchTone(row.matchScore))}>
                    {row.matchScore != null ? `${Math.round(row.matchScore)}%` : "—"}
                  </span>
                </div>
                {row.profileTitle && <p className="mt-0.5 truncate text-xs text-body">{row.profileTitle}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span className="font-semibold text-body">{STATUS_LABELS[row.status] ?? row.status}</span>
                  {row.availableFrom && row.availableFrom !== "—" && <span>Dispo : {row.availableFrom}</span>}
                </div>
              </button>
              <div className="flex justify-end px-3 pb-2">
                <button
                  type="button"
                  onClick={() => handleSimulate(row)}
                  className="inline-flex items-center rounded-[var(--radius-medium)] px-2 py-1 text-[11px] font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Simuler la marge
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {simulation && (
        <FinancialModelingDesktopDialog
          open
          onOpenChange={(open) => !open && setSimulation(null)}
          initialId={simulation.modelId ?? undefined}
          initialPreset={simulation.preset}
        />
      )}
    </section>
  )
}
