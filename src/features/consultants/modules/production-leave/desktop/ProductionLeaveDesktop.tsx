"use client"

import { useEffect, useMemo, useState } from "react"
import type { ProductionLeaveViewModel } from "../data/production-leave.types"
import { ProductionLeaveCollaboratorList } from "./ProductionLeaveCollaboratorList"
import { ProductionLeaveMonthlySummary } from "./ProductionLeaveMonthlySummary"
import { ProductionLeaveHistoryChart } from "./ProductionLeaveHistoryChart"
import { ProductionLeaveAbsenceDetail } from "./ProductionLeaveAbsenceDetail"
import { ProductionLeaveFinancialSummary } from "./ProductionLeaveFinancialSummary"

import Link from "next/link"

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

interface ProductionLeaveDesktopProps {
  vm: ProductionLeaveViewModel
  closeHref: string
  onClose?: () => void
}

export function ProductionLeaveDesktop({
  vm,
  closeHref,
  onClose,
}: ProductionLeaveDesktopProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => vm.referenceMonth || vm.availableMonths[0] || new Date().toISOString().slice(0, 7),
  )

  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(() => {
    return vm.collaborators.length > 0 ? vm.collaborators[0].collaboratorId : null
  })

  // Fermeture via touche Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onClose) {
          onClose()
        } else if (typeof window !== "undefined") {
          window.location.assign(closeHref)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeHref, onClose])

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="production-leave-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-8"
    >
      {/* Backdrop */}
      <Link
        href={closeHref}
        onClick={onClose}
        className="fixed inset-0 bg-heading/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-label="Fermer"
      />

      {/* Surface principale */}
      <div className="relative z-10 flex h-full max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[var(--radius-medium)] border border-border bg-canvas shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Barre d'en-tête */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-primary/10 text-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </span>
            <div>
              <h2
                id="production-leave-modal-title"
                className="font-heading text-lg font-bold tracking-tight text-heading"
              >
                Production & Congés
              </h2>
              <p className="text-xs text-muted">
                Analyse mensuelle de l&apos;activité réalisée et des absences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sélecteur de mois client-side (vm.availableMonths) */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="production-month-select"
                className="text-xs font-medium text-body"
              >
                Période :
              </label>
              <select
                id="production-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-[var(--radius-small)] border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-heading shadow-xs focus:border-primary focus:outline-none"
              >
                {vm.availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Bouton de fermeture [×] */}
            <Link
              href={closeHref}
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-[var(--radius-small)] text-muted transition-colors hover:bg-surface-hover hover:text-heading"
              aria-label="Fermer le module Production & Congés"
            >
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </header>

        {/* Corps master-detail à deux colonnes */}
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] overflow-hidden">
          {/* Colonne gauche : navigation collaborateurs */}
          <ProductionLeaveCollaboratorList
            collaborators={vm.collaborators}
            selectedCollaboratorId={selectedCollabId}
            selectedMonth={selectedMonth}
            onSelectCollaborator={setSelectedCollabId}
          />

          {/* Colonne droite : détail du collaborateur */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-canvas p-6 space-y-6">
            {selectedCollaborator ? (
              <>
                {/* En-tête d'identité collaborateur */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-medium)] border border-border bg-surface p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {selectedCollaborator.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-bold text-heading">
                        {selectedCollaborator.fullName}
                      </h3>
                      <div className="text-xs text-muted mt-0.5">
                        {selectedCollaborator.currentTitle || "Consultant"}
                        {selectedCollaborator.practiceLabel ? (
                          <span> · {selectedCollaborator.practiceLabel}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* YTD Synthèse badge */}
                  {selectedCollaborator.ytd.productivityRate !== null ? (
                    <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/50 px-3.5 py-2 text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Productivité YTD
                      </div>
                      <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                        <span className="text-base font-bold text-heading font-mono">
                          {selectedCollaborator.ytd.productivityRate.toFixed(1)} %
                        </span>
                        {selectedCollaborator.ytd.targetRate !== null ? (
                          <span className="text-[11px] text-muted">
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
              <div className="flex h-64 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-xs text-muted">
                Aucun collaborateur actif.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
