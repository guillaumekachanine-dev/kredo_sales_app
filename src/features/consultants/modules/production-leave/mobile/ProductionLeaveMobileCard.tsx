"use client"

import type { ProductionLeaveCollaborator } from "../data/production-leave.types"
import { cn } from "@/lib/utils"

interface ProductionLeaveMobileCardProps {
  collaborator: ProductionLeaveCollaborator
  selectedMonth: string
  onSelect: (collaborator: ProductionLeaveCollaborator) => void
}

export function ProductionLeaveMobileCard({
  collaborator,
  selectedMonth,
  onSelect,
}: ProductionLeaveMobileCardProps) {
  const monthData = collaborator.history.find((h) => h.month === selectedMonth)
  const hasData = monthData?.hasActivityData === true
  const rate = monthData?.productivityRate ?? null
  const gap = monthData?.gapVsTarget ?? null
  const productionDays = monthData?.productionDays ?? 0
  const businessDays = monthData?.businessDays ?? 0
  const totalAbsences =
    monthData != null
      ? monthData.ptoDays + monthData.sickDays + monthData.otherAbsenceDays
      : 0

  const isTargetMet = gap !== null && gap >= 0

  return (
    <button
      type="button"
      onClick={() => onSelect(collaborator)}
      className="flex min-h-[48px] w-full flex-col gap-2.5 rounded-[var(--radius-medium)] border border-border bg-surface p-4 text-left shadow-xs transition-colors hover:bg-surface-hover/70 active:bg-surface-hover"
    >
      {/* Ligne 1 : Nom et Badge Cible */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-heading text-sm font-bold text-heading truncate">
            {collaborator.fullName}
          </div>
          <div className="text-xs text-muted truncate mt-0.5">
            {collaborator.currentTitle || collaborator.practiceLabel || "Consultant"}
          </div>
        </div>

        {hasData && gap !== null ? (
          <span
            className={cn(
              "shrink-0 rounded-[var(--radius-small)] px-2 py-0.5 text-[11px] font-semibold",
              isTargetMet
                ? "bg-success/15 text-success"
                : "bg-amber-500/15 text-amber-700",
            )}
          >
            {isTargetMet ? "Cible atteinte" : "Sous cible"}
          </span>
        ) : null}
      </div>

      {/* Ligne 2 : Métriques clés du mois */}
      {hasData ? (
        <div className="flex items-end justify-between border-t border-border/50 pt-2 text-xs">
          <div>
            <div className="text-muted text-[11px]">Production</div>
            <div className="font-semibold text-heading mt-0.5">
              {productionDays} / {businessDays} j
              {totalAbsences > 0 ? (
                <span className="text-muted font-normal ml-1.5">
                  · {totalAbsences.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j abs.
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-right">
            <div className="text-muted text-[11px]">Productivité</div>
            <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-heading">
                {rate !== null
                  ? `${rate.toLocaleString("fr-FR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    })} %`
                  : "—"}
              </span>
              {gap !== null ? (
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    gap >= 0 ? "text-success" : "text-amber-700",
                  )}
                >
                  {gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)} pts
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-border/50 pt-2 text-xs text-muted">
          Aucune donnée d&apos;activité sur ce mois
        </div>
      )}
    </button>
  )
}
