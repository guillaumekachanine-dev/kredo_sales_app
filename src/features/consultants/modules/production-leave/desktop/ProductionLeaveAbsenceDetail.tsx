"use client"

import { useState } from "react"
import type {
  MonthlyAbsenceBreakdownItem,
  MonthlyAbsenceItem,
} from "../data/production-leave.types"
import { ABSENCE_LABELS } from "../data/build-production-leave"

interface ProductionLeaveAbsenceDetailProps {
  absenceBreakdown: MonthlyAbsenceBreakdownItem[]
  absences: MonthlyAbsenceItem[]
  monthLabel: string
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateFr(isoDate: string): string {
  const [y, m, d] = isoDate.split("-")
  return `${d}/${m}/${y}`
}

export function ProductionLeaveAbsenceDetail({
  absenceBreakdown,
  absences,
  monthLabel,
}: ProductionLeaveAbsenceDetailProps) {
  const [showDetailedList, setShowDetailedList] = useState(false)

  const hasAbsences = absenceBreakdown.length > 0
  const totalDays = absenceBreakdown.reduce((acc, curr) => acc + curr.days, 0)
  const totalTheoreticalImpact = absenceBreakdown.reduce(
    (acc, curr) => acc + (curr.estimatedRevenueImpact ?? 0),
    0,
  )
  const hasAnyRevenueImpact = absenceBreakdown.some(
    (b) => b.estimatedRevenueImpact !== null,
  )

  return (
    <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Détail des congés &amp; absences · {monthLabel}
          </h3>
          <p className="text-[11px] text-body mt-0.5">
            Ventilation par type et impact d&apos;activité
          </p>
        </div>

        {hasAbsences ? (
          <div className="flex items-center gap-2">
            <span className="rounded-[var(--radius-small)] bg-surface-raised px-2.5 py-1 text-xs font-semibold text-heading">
              Total : {totalDays.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} jours
            </span>
            {absences.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowDetailedList((v) => !v)}
                className="rounded-[var(--radius-small)] border border-border bg-surface px-2 py-1 text-xs font-medium text-body hover:bg-surface-hover hover:text-heading transition-colors"
              >
                {showDetailedList ? "Masquer les dates" : `Voir les dates (${absences.length})`}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!hasAbsences ? (
        <div className="py-6 text-center text-xs text-muted">
          Aucune absence enregistrée sur ce mois.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tableau synthétique par type */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted">
                  <th className="pb-2">Type d&apos;absence</th>
                  <th className="pb-2 text-right">Durée</th>
                  <th className="pb-2 text-right">Part du mois</th>
                  <th className="pb-2 text-right">
                    Manque à produire théorique
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {absenceBreakdown.map((item) => {
                  const pct = totalDays > 0 ? (item.days / totalDays) * 100 : 0
                  return (
                    <tr key={item.type} className="hover:bg-surface-hover/50">
                      <td className="py-2.5 font-medium text-heading">
                        {item.label}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-heading">
                        {item.days.toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })}{" "}
                        j
                      </td>
                      <td className="py-2.5 text-right text-muted">
                        {pct.toFixed(0)} %
                      </td>
                      <td className="py-2.5 text-right font-mono text-body">
                        {item.estimatedRevenueImpact !== null
                          ? formatCurrency(item.estimatedRevenueImpact)
                          : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {hasAnyRevenueImpact ? (
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold text-heading">
                    <td className="pt-2.5">Total</td>
                    <td className="pt-2.5 text-right">
                      {totalDays.toLocaleString("fr-FR", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      j
                    </td>
                    <td className="pt-2.5 text-right text-muted">100 %</td>
                    <td className="pt-2.5 text-right font-mono text-heading">
                      {formatCurrency(totalTheoreticalImpact)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <div className="text-[11px] text-muted italic">
            * Le montant indiqué représente un manque à produire théorique calculé sur le TJM contractuel, et non un coût comptable de l&apos;absence.
          </div>

          {/* Liste détaillée des absences avec dates (second niveau) */}
          {showDetailedList && absences.length > 0 ? (
            <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/30 p-3.5 space-y-2">
              <div className="text-xs font-semibold text-heading">
                Périodes d&apos;absences déclarées
              </div>
              <div className="divide-y divide-border/60">
                {absences.map((abs) => (
                  <div
                    key={abs.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div>
                      <span className="font-medium text-heading">
                        {ABSENCE_LABELS[abs.type] ?? abs.type}
                      </span>
                      <span className="ml-2 text-[11px] text-muted">
                        du {formatDateFr(abs.startDate)} au {formatDateFr(abs.endDate)}
                      </span>
                    </div>
                    <div className="font-semibold text-heading">
                      {abs.durationDays !== null
                        ? `${abs.durationDays.toLocaleString("fr-FR", {
                            maximumFractionDigits: 1,
                          })} j sur ce mois`
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
