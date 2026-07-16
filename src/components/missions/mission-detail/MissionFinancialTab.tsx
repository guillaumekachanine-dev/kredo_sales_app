"use client"

import { useState } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { FinancialReferenceMobileCard } from "@/components/finance/FinancialReferenceMobileCard"
import { AppDialog } from "@/components/ui/AppDialog"
import { formatEuro, formatDateNumeric } from "@/lib/formatters"
import { updateMission } from "@/app/(app)/missions/_actions/update-mission"
import { cn } from "@/lib/utils"
import type { MissionDetailViewModel } from "./mission-detail-types"
import {
  MARGIN_THRESHOLDS,
  computeTotalRevenue,
  computeYtdRevenue,
  computeRealMarginPct,
  computeTheoreticalMarginPct,
  computeEstimatedContractValue,
  computeEstimatedMonthlySalary,
  computeTotalBillableDays,
  computeYtdBillableDays,
  getPeriodLabel,
} from "./mission-detail-utils"

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted">—</span>
  const isGood = pct >= MARGIN_THRESHOLDS.GOOD
  const isLow = pct < MARGIN_THRESHOLDS.LOW
  return (
    <span
      className={cn(
        "text-2xl font-bold font-mono",
        isGood ? "text-success" : isLow ? "text-danger" : "text-warning"
      )}
    >
      {pct.toFixed(1)}%
    </span>
  )
}

interface MissionFinancialTabProps {
  vm: MissionDetailViewModel
  onRefresh: () => void
}

export function MissionFinancialTab({ vm, onRefresh }: MissionFinancialTabProps) {
  const { mission, activityReports, compensation } = vm

  const meta = (mission.metadata || {}) as Record<string, unknown>
  const paymentTerms = (meta.payment_terms as string) || null
  const nextInvoiceDate = (meta.next_invoice_date as string) || null

  const totalRevenue = computeTotalRevenue(activityReports)
  const ytdRevenue = computeYtdRevenue(activityReports)
  const realMarginPct = computeRealMarginPct(activityReports)
  const theoreticalMarginPct = computeTheoreticalMarginPct(mission)
  const estimatedContractValue = computeEstimatedContractValue(mission)
  const totalBillable = computeTotalBillableDays(activityReports)
  const ytdBillable = computeYtdBillableDays(activityReports)
  const estimatedMonthlySalary = computeEstimatedMonthlySalary(mission.cjm, compensation)

  const recentReports = [...activityReports]
    .sort((a, b) => b.period_start.localeCompare(a.period_start))
    .slice(0, 6)

  // ─── Edit finance dialog ─────────────────────────────────────────────────────
  const [showEditFinance, setShowEditFinance] = useState(false)
  const [editTjm, setEditTjm] = useState(String(mission.tjm || 0))
  const [editStartDate, setEditStartDate] = useState(mission.start_date || "")
  const [editEndDate, setEditEndDate] = useState(mission.end_date || "")
  const [editPaymentTerms, setEditPaymentTerms] = useState(paymentTerms || "Facturation mensuelle à terme échu")
  const [editNextInvoiceDate, setEditNextInvoiceDate] = useState(nextInvoiceDate || "Fin de mois en cours")
  const [isSavingFinance, setIsSavingFinance] = useState(false)

  const openEditFinance = () => {
    setEditTjm(String(mission.tjm || 0))
    setEditStartDate(mission.start_date || "")
    setEditEndDate(mission.end_date || "")
    setEditPaymentTerms(paymentTerms || "Facturation mensuelle à terme échu")
    setEditNextInvoiceDate(nextInvoiceDate || "Fin de mois en cours")
    setShowEditFinance(true)
  }

  const handleSaveFinance = async () => {
    setIsSavingFinance(true)
    const parsedTjm = parseFloat(editTjm) || 0
    const res = await updateMission({
      id: mission.id,
      tjm: parsedTjm,
      start_date: editStartDate || null,
      end_date: editEndDate || null,
      metadata: {
        payment_terms: editPaymentTerms,
        next_invoice_date: editNextInvoiceDate,
      },
    })
    setIsSavingFinance(false)
    if (res.error) {
      alert(res.error)
    } else {
      setShowEditFinance(false)
      onRefresh()
    }
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {vm.financialReference ? <FinancialReferenceMobileCard reference={vm.financialReference} /> : null}
        {/* Header with edit button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-heading">Données financières de la mission</h3>
          <button
            type="button"
            onClick={openEditFinance}
            className="text-[10px] font-semibold text-primary hover:underline"
          >
            Modifier les paramètres
          </button>
        </div>

        {/* Revenue KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SurfaceCard className="!p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
              CA total généré
            </span>
            <span className="text-2xl font-bold font-mono text-heading">
              {formatEuro(totalRevenue)}
            </span>
            <span className="text-[10px] text-muted">{totalBillable} jours facturés</span>
          </SurfaceCard>
          <SurfaceCard className="!p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
              CA YTD
            </span>
            <span className="text-2xl font-bold font-mono text-heading">
              {formatEuro(ytdRevenue)}
            </span>
            <span className="text-[10px] text-muted">{ytdBillable} jours YTD</span>
          </SurfaceCard>
          <SurfaceCard className="!p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
              Marge réelle
            </span>
            <MarginBadge pct={realMarginPct} />
            <p className="text-[10px] text-muted mt-1">Depuis les CRA</p>
          </SurfaceCard>
          <SurfaceCard className="!p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
              Marge théorique
            </span>
            <MarginBadge pct={theoreticalMarginPct} />
            <p className="text-[10px] text-muted mt-1">TJM − CJM courants</p>
          </SurfaceCard>
        </div>

        {/* TJM / CJM / Salary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SurfaceCard className="p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-heading">Taux & marges contractuels</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  TJM facturation
                </span>
                <span className="text-xl font-bold font-mono text-heading">
                  {formatEuro(mission.tjm)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  CJM (coût consultant)
                </span>
                <span className="text-xl font-bold font-mono text-heading">
                  {formatEuro(mission.cjm)}
                </span>
                {compensation?.taci !== null && compensation?.taci !== undefined && (
                  <p className="text-[10px] text-muted mt-0.5">
                    TACI : {(compensation.taci * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Salaire brut mensuel
                </span>
                {compensation?.gross_annual != null ? (
                  <div>
                    <span className="text-xl font-bold font-mono text-heading">
                      {formatEuro(estimatedMonthlySalary)}
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">Données admin</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-lg font-bold font-mono text-muted">
                      {formatEuro(estimatedMonthlySalary)}
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">Estimation heuristique</p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Valeur contrat estimée
                </span>
                {estimatedContractValue !== null ? (
                  <div>
                    <span className="text-xl font-bold font-mono text-heading">
                      {formatEuro(estimatedContractValue)}
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">Estimation (5/7 jours ouvrés)</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-lg font-bold font-mono text-muted">—</span>
                    <p className="text-[10px] text-muted mt-0.5">Date de fin non renseignée</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Démarrage
                </span>
                <span className="text-xs font-semibold text-heading">
                  {mission.start_date ? formatDateNumeric(mission.start_date) : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Fin prévue
                </span>
                <span className="text-xs font-semibold text-heading">
                  {mission.end_date ? formatDateNumeric(mission.end_date) : "Mission ouverte"}
                </span>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-heading">Facturation</h3>
            <div className="flex flex-col gap-3">
              {paymentTerms ? (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Conditions de paiement
                  </span>
                  <span className="text-xs font-semibold text-heading">{paymentTerms}</span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Conditions de paiement
                  </span>
                  <span className="text-xs text-muted italic">Non renseignées</span>
                </div>
              )}
              {mission.billing_condition && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Condition de facturation contractuelle
                  </span>
                  <span className="text-xs font-semibold text-heading capitalize">
                    {mission.billing_condition}
                  </span>
                </div>
              )}
              {nextInvoiceDate && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Prochaine échéance
                  </span>
                  <span className="text-xs font-semibold text-heading">{nextInvoiceDate}</span>
                </div>
              )}

              {/* DSO not available */}
              <div className="mt-2 p-2.5 rounded bg-canvas border border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  DSO (délai de recouvrement)
                </span>
                <span className="text-xs text-muted">
                  — Données de facturation non disponibles dans Kredo (aucune table de factures)
                </span>
              </div>
            </div>
          </SurfaceCard>
        </div>

        {/* Monthly breakdown from CRA snapshots */}
        {recentReports.length > 0 && (
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-heading">Détail mensuel — sources : CRA</h3>
              <p className="text-xs text-muted">
                Les valeurs réelles sont calculées à partir des snapshots TJM/CJM de chaque CRA, pas des taux courants.
              </p>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full min-w-[540px]">
                <thead>
                  <tr className="border-b border-border/60">
                    {["Période", "Jours fact.", "TJM (snapshot)", "CJM (snapshot)", "CA réel", "Marge réelle"].map((h) => (
                      <th key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted text-right first:text-left pb-2 pr-3 last:pr-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((r) => {
                    const ca = r.billable_days * r.tjm_snapshot
                    const cost = r.billable_days * r.cjm_snapshot
                    const marge = ca > 0 ? ((ca - cost) / ca) * 100 : null
                    return (
                      <tr key={r.id} className="border-b border-border/30 last:border-0">
                        <td className="py-2.5 pr-3 text-xs font-semibold text-heading">
                          {getPeriodLabel(r.period_start)}
                        </td>
                        <td className="py-2.5 pr-3 text-xs font-mono text-right text-heading">
                          {r.billable_days}j
                        </td>
                        <td className="py-2.5 pr-3 text-xs font-mono text-right text-muted">
                          {formatEuro(r.tjm_snapshot)}
                        </td>
                        <td className="py-2.5 pr-3 text-xs font-mono text-right text-muted">
                          {formatEuro(r.cjm_snapshot)}
                        </td>
                        <td className="py-2.5 pr-3 text-xs font-mono text-right text-heading font-semibold">
                          {formatEuro(ca)}
                        </td>
                        <td className="py-2.5 text-xs font-mono text-right font-semibold">
                          <span
                            className={cn(
                              marge === null ? "text-muted" :
                              marge >= MARGIN_THRESHOLDS.GOOD ? "text-success" :
                              marge >= MARGIN_THRESHOLDS.LOW ? "text-warning" :
                              "text-danger"
                            )}
                          >
                            {marge !== null ? `${marge.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        )}
      </div>

      {/* Edit Finance dialog */}
      <AppDialog
        open={showEditFinance}
        onOpenChange={setShowEditFinance}
        title="Modifier les paramètres financiers"
        description="TJM, dates et conditions de facturation de la mission."
      >
        <div className="flex flex-col gap-4 mt-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              TJM (€ / jour)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={editTjm}
              onChange={(e) => setEditTjm(e.target.value)}
              className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              placeholder="600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Date de démarrage
              </label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Date de fin prévue
              </label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              Conditions de paiement
            </label>
            <input
              value={editPaymentTerms}
              onChange={(e) => setEditPaymentTerms(e.target.value)}
              className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              placeholder="Ex : Facturation mensuelle à 30j"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              Prochaine échéance
            </label>
            <input
              value={editNextInvoiceDate}
              onChange={(e) => setEditNextInvoiceDate(e.target.value)}
              className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              placeholder="Ex : Fin de mois en cours"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <button
              type="button"
              disabled={isSavingFinance}
              onClick={() => setShowEditFinance(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSavingFinance}
              onClick={handleSaveFinance}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white border border-primary hover:bg-primary/95 transition-all disabled:opacity-50"
            >
              {isSavingFinance ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          </div>
        </div>
      </AppDialog>
    </>
  )
}
