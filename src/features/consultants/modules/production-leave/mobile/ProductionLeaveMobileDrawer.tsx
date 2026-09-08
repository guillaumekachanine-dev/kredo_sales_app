"use client"

import { AppDrawer } from "@/components/ui/AppDrawer"
import type {
  CollaboratorMonthlyProduction,
  ProductionLeaveCollaborator,
} from "../data/production-leave.types"
import { cn } from "@/lib/utils"

interface ProductionLeaveMobileDrawerProps {
  collaborator: ProductionLeaveCollaborator | null
  selectedMonth: string
  monthLabel: string
  open: boolean
  onClose: () => void
}

const MONTH_SHORT_FR: Record<string, string> = {
  "01": "Jan",
  "02": "Fév",
  "03": "Mar",
  "04": "Avr",
  "05": "Mai",
  "06": "Juin",
  "07": "Juil",
  "08": "Août",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Déc",
}

function formatMonthShort(monthIso: string): string {
  const [, m] = monthIso.split("-")
  return MONTH_SHORT_FR[m] ?? monthIso
}

function formatCurrency(val: number | null): string {
  if (val === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(val)
}

export function ProductionLeaveMobileDrawer({
  collaborator,
  selectedMonth,
  monthLabel,
  open,
  onClose,
}: ProductionLeaveMobileDrawerProps) {
  if (!collaborator) return null

  const monthData: CollaboratorMonthlyProduction | undefined =
    collaborator.history.find((h) => h.month === selectedMonth)

  const hasData = monthData?.hasActivityData === true
  const productivityRate = monthData?.productivityRate ?? null
  const targetRate = monthData?.targetRate ?? null
  const gapVsTarget = monthData?.gapVsTarget ?? null
  const isTargetMet = gapVsTarget !== null && gapVsTarget >= 0

  const hasRevenue = monthData?.revenue !== null
  const hasMargin = monthData?.margin !== null

  return (
    <AppDrawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      title={collaborator.fullName}
      subtitle={collaborator.currentTitle || collaborator.practiceLabel || "Consultant"}
      side="bottom"
    >
      <div className="space-y-5 pb-6 text-body">
        {/* 1. Synthèse du mois sélectionné */}
        <div className="rounded-[var(--radius-small)] border border-border bg-canvas/50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Mois de {monthLabel}
            </span>
            {gapVsTarget !== null ? (
              <span
                className={cn(
                  "rounded-[var(--radius-small)] px-2 py-0.5 text-xs font-semibold",
                  isTargetMet
                    ? "bg-success/15 text-success"
                    : "bg-amber-500/15 text-amber-700",
                )}
              >
                {isTargetMet ? "✓ Cible atteinte" : "Sous objectif"}
                <span className="ml-1 text-[11px]">
                  ({gapVsTarget > 0 ? `+${gapVsTarget.toFixed(1)}` : gapVsTarget.toFixed(1)} pts)
                </span>
              </span>
            ) : (
              <span className="text-xs text-muted">Sans cible</span>
            )}
          </div>

          {hasData ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[11px] text-muted">Productivité</div>
                <div className="text-xl font-extrabold text-heading">
                  {productivityRate !== null
                    ? `${productivityRate.toLocaleString("fr-FR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })} %`
                    : "—"}
                </div>
                {targetRate !== null ? (
                  <div className="text-[11px] text-muted mt-0.5">
                    Cible : {targetRate.toFixed(1)} %
                  </div>
                ) : null}
              </div>

              <div>
                <div className="text-[11px] text-muted">Jours produits</div>
                <div className="text-xl font-extrabold text-heading">
                  {monthData?.productionDays ?? 0}
                  <span className="text-xs font-normal text-muted ml-1">
                    / {monthData?.businessDays ?? 0} j
                  </span>
                </div>
                {(monthData?.nonBillableDays ?? 0) > 0 ? (
                  <div className="text-[11px] text-muted mt-0.5">
                    Non facturable : {monthData?.nonBillableDays} j
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="py-2 text-center text-xs text-muted">
              Aucune donnée d&apos;activité disponible pour ce mois.
            </div>
          )}
        </div>

        {/* 2. Historique récent en barres HTML + Tailwind (Section 19) */}
        <div className="rounded-[var(--radius-small)] border border-border bg-surface p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">
            Tendance récente (12 mois)
          </div>

          <div className="space-y-2">
            {collaborator.history.map((h) => {
              const rate = h.productivityRate
              const isSelected = h.month === selectedMonth
              const pct = rate !== null ? Math.min(100, Math.max(0, rate)) : 0

              return (
                <div
                  key={h.month}
                  className={cn(
                    "flex items-center gap-3 rounded px-2 py-1 text-xs transition-colors",
                    isSelected ? "bg-primary/10 font-semibold text-heading" : "text-body",
                  )}
                >
                  <span className="w-10 shrink-0 text-[11px] text-muted">
                    {formatMonthShort(h.month)}
                  </span>

                  {/* Barre de progression HTML */}
                  <div className="relative h-3 flex-1 overflow-hidden rounded bg-border/40">
                    {rate !== null ? (
                      <div
                        style={{ width: `${pct}%` }}
                        className={cn(
                          "h-full rounded transition-all",
                          isSelected ? "bg-primary" : "bg-primary/75",
                        )}
                      />
                    ) : null}
                  </div>

                  <span className="w-12 shrink-0 text-right font-mono text-[11px]">
                    {rate !== null ? `${rate.toFixed(0)} %` : "—"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Ventilation des absences (Section 18) */}
        {monthData && monthData.absenceBreakdown.length > 0 ? (
          <div className="rounded-[var(--radius-small)] border border-border bg-surface p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Congés & absences
            </div>

            <div className="divide-y divide-border/60">
              {monthData.absenceBreakdown.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between py-2 text-xs"
                >
                  <div>
                    <div className="font-medium text-heading">{item.label}</div>
                    {item.estimatedRevenueImpact !== null ? (
                      <div className="text-[11px] text-muted">
                        Manque à produire théo. : {formatCurrency(item.estimatedRevenueImpact)}
                      </div>
                    ) : null}
                  </div>
                  <div className="font-semibold text-heading">
                    {item.days.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* 4. Finances secondaires (Section 20) */}
        {hasRevenue || hasMargin ? (
          <div className="rounded-[var(--radius-small)] border border-border bg-surface p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Données économiques
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {hasRevenue ? (
                <div>
                  <div className="text-[11px] text-muted">CA produit</div>
                  <div className="text-sm font-bold text-heading font-mono mt-0.5">
                    {formatCurrency(monthData?.revenue ?? null)}
                  </div>
                  {monthData?.revenueGap !== null ? (
                    <div
                      className={cn(
                        "text-[10px] font-semibold mt-0.5",
                        (monthData?.revenueGap ?? 0) >= 0 ? "text-success" : "text-amber-700",
                      )}
                    >
                      Écart : {formatCurrency(monthData?.revenueGap ?? null)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasMargin ? (
                <div>
                  <div className="text-[11px] text-muted">Marge brute</div>
                  <div className="text-sm font-bold text-heading font-mono mt-0.5">
                    {formatCurrency(monthData?.margin ?? null)}
                  </div>
                  {monthData?.marginGap !== null ? (
                    <div
                      className={cn(
                        "text-[10px] font-semibold mt-0.5",
                        (monthData?.marginGap ?? 0) >= 0 ? "text-success" : "text-amber-700",
                      )}
                    >
                      Écart : {formatCurrency(monthData?.marginGap ?? null)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </AppDrawer>
  )
}
