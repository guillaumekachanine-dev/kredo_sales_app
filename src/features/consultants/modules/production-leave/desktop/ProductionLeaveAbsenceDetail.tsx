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
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Détail des congés &amp; absences · {monthLabel}
          </h3>
          <p className="text-[11px] text-white/45 mt-0.5">
            Ventilation par type et impact d&apos;activité
          </p>
        </div>

        {hasAbsences ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white font-mono tabular-nums">
              Total : {totalDays.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} jours
            </span>
            {absences.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowDetailedList((v) => !v)}
                className="rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/80 hover:text-white px-2.5 py-1 text-xs font-medium transition-colors"
              >
                {showDetailedList ? "Masquer les dates" : `Voir les dates (${absences.length})`}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!hasAbsences ? (
        <div className="py-6 text-center text-xs text-white/40">
          Aucune absence enregistrée sur ce mois.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tableau synthétique par type */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
                  <th className="pb-2">Type d&apos;absence</th>
                  <th className="pb-2 text-right">Durée</th>
                  <th className="pb-2 text-right">Part du mois</th>
                  <th className="pb-2 text-right">
                    Manque à produire théorique
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {absenceBreakdown.map((item) => {
                  const pct = totalDays > 0 ? (item.days / totalDays) * 100 : 0
                  return (
                    <tr key={item.type} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-medium text-white">
                        {item.label}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-white font-mono tabular-nums">
                        {item.days.toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })}{" "}
                        j
                      </td>
                      <td className="py-2.5 text-right text-white/45 font-mono tabular-nums">
                        {pct.toFixed(0)} %
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-white/90">
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
                  <tr className="border-t border-white/10 font-semibold text-white">
                    <td className="pt-2.5">Total</td>
                    <td className="pt-2.5 text-right font-mono tabular-nums">
                      {totalDays.toLocaleString("fr-FR", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      j
                    </td>
                    <td className="pt-2.5 text-right text-white/45 font-mono tabular-nums">100 %</td>
                    <td className="pt-2.5 text-right font-mono tabular-nums text-brand-brass">
                      {formatCurrency(totalTheoreticalImpact)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <div className="text-[11px] text-white/40 italic">
            * Le montant indiqué représente un manque à produire théorique calculé sur le TJM contractuel, et non un coût comptable de l&apos;absence.
          </div>

          {/* Liste détaillée des absences avec dates (second niveau) */}
          {showDetailedList && absences.length > 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 space-y-2">
              <div className="text-xs font-semibold text-white">
                Périodes d&apos;absences déclarées
              </div>
              <div className="divide-y divide-white/5">
                {absences.map((abs) => (
                  <div
                    key={abs.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div>
                      <span className="font-medium text-white">
                        {ABSENCE_LABELS[abs.type] ?? abs.type}
                      </span>
                      <span className="ml-2 text-[11px] text-white/45">
                        du {formatDateFr(abs.startDate)} au {formatDateFr(abs.endDate)}
                      </span>
                    </div>
                    <div className="font-semibold text-white font-mono tabular-nums">
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
