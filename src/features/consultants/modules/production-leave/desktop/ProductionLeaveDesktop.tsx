"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import type { ProductionLeaveViewModel } from "../data/production-leave.types"
import { ProductionLeaveCollaboratorList } from "./ProductionLeaveCollaboratorList"
import { ProductionLeaveMonthlySummary } from "./ProductionLeaveMonthlySummary"
import { ProductionLeaveHistoryChart } from "./ProductionLeaveHistoryChart"
import { ProductionLeaveAbsenceDetail } from "./ProductionLeaveAbsenceDetail"
import { ProductionLeaveFinancialSummary } from "./ProductionLeaveFinancialSummary"

const MONTH_NAMES_FR: Record<string, string> = {
  "01": "Janvier",
  "02": "Février",
  "03": "Mars",
  "04": "Avril",
  "05": "Mai",
  "06": "Juin",
  "07": "Juillet",
  "08": "Août",
  "09": "Septembre",
  "10": "Octobre",
  "11": "Novembre",
  "12": "Décembre",
}

function formatMonthLabel(monthIso: string): string {
  const [y, m] = monthIso.split("-")
  const name = MONTH_NAMES_FR[m] ?? m
  return `${name} ${y}`
}

export interface ProductionLeaveDesktopProps {
  vm: ProductionLeaveViewModel
  closeHref: string
  onClose?: () => void
}

export function ProductionLeaveDesktop({
  vm,
  closeHref,
  onClose,
}: ProductionLeaveDesktopProps) {
  let router: ReturnType<typeof useRouter> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter()
  } catch {
    // Non-router context (e.g. static tests)
  }

  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => vm.referenceMonth || vm.availableMonths[0] || new Date().toISOString().slice(0, 7),
  )

  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(() => {
    return vm.collaborators.length > 0 ? vm.collaborators[0].collaboratorId : null
  })

  // Collaborateur sélectionné
  const selectedCollaborator = useMemo(() => {
    return vm.collaborators.find((c) => c.collaboratorId === selectedCollabId) ?? null
  }, [vm.collaborators, selectedCollabId])

  // Données du mois sélectionné pour ce collaborateur
  const selectedMonthData = useMemo(() => {
    if (!selectedCollaborator) return null
    return (
      selectedCollaborator.history.find((h) => h.month === selectedMonth) ?? null
    )
  }, [selectedCollaborator, selectedMonth])

  const monthLabel = formatMonthLabel(selectedMonth)

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else if (router) {
      router.push(closeHref)
    } else if (typeof window !== "undefined") {
      window.location.assign(closeHref)
    }
  }

  const monthSelector = (
    <div className="flex items-center gap-2">
      <label
        htmlFor="production-month-select"
        className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45"
      >
        Période
      </label>
      <select
        id="production-month-select"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="h-8 rounded-lg border border-white/10 bg-[#0f122c] px-3 text-[11px] font-medium text-white outline-none transition-colors focus-visible:border-brand-brass/60 focus-visible:ring-2 focus-visible:ring-brand-brass/30"
      >
        {vm.availableMonths.map((m) => (
          <option key={m} value={m}>
            {formatMonthLabel(m)}
          </option>
        ))}
      </select>
    </div>
  )

  const leftPaneContent = (
    <ProductionLeaveCollaboratorList
      collaborators={vm.collaborators}
      selectedCollaboratorId={selectedCollabId}
      selectedMonth={selectedMonth}
      onSelectCollaborator={setSelectedCollabId}
    />
  )

  const rightPaneContent = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-5 sm:p-6 space-y-5">
      {selectedCollaborator ? (
        <>
          {/* En-tête d'identité collaborateur */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-brand-brass/40 bg-brand-brass/15 text-sm font-bold text-brand-brass">
                {selectedCollaborator.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-white">
                  {selectedCollaborator.fullName}
                </h3>
                <div className="text-xs text-white/50 mt-0.5">
                  {selectedCollaborator.currentTitle || "Consultant"}
                  {selectedCollaborator.practiceLabel ? (
                    <span> · {selectedCollaborator.practiceLabel}</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* YTD Synthèse badge */}
            {selectedCollaborator.ytd.productivityRate !== null ? (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2 text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  Productivité YTD
                </div>
                <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                  <span className="text-base font-bold text-white font-mono tabular-nums">
                    {selectedCollaborator.ytd.productivityRate.toFixed(1)} %
                  </span>
                  {selectedCollaborator.ytd.targetRate !== null ? (
                    <span className="text-[11px] text-white/45 font-mono tabular-nums">
                      (cible : {selectedCollaborator.ytd.targetRate.toFixed(1)} %)
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* Synthèse du mois sélectionné */}
          <ProductionLeaveMonthlySummary
            monthData={selectedMonthData}
            monthLabel={monthLabel}
          />

          {/* Historique 12 mois SVG */}
          <ProductionLeaveHistoryChart
            history={selectedCollaborator.history}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />

          {/* Détail des absences */}
          <ProductionLeaveAbsenceDetail
            absenceBreakdown={selectedMonthData?.absenceBreakdown ?? []}
            absences={selectedMonthData?.absences ?? []}
            monthLabel={monthLabel}
          />

          {/* Données financières (si disponibles) */}
          <ProductionLeaveFinancialSummary
            monthData={selectedMonthData}
            monthLabel={monthLabel}
            dataNotes={vm.dataNotes}
          />
        </>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-white/50">
          Aucun collaborateur actif.
        </div>
      )}
    </div>
  )

  return (
    <IntelligenceSplitModalShell
      open
      title="Production & Congés"
      subtitle="Analyse mensuelle de l’activité réalisée et des absences"
      onClose={handleClose}
      headerRightActions={monthSelector}
      leftPane={leftPaneContent}
      rightPane={rightPaneContent}
    />
  )
}
