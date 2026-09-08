"use client"

import type { CollaboratorMonthlyProduction } from "../data/production-leave.types"
import { cn } from "@/lib/utils"

interface ProductionLeaveMonthlySummaryProps {
  monthData: CollaboratorMonthlyProduction | null | undefined
  monthLabel: string
}

export function ProductionLeaveMonthlySummary({
  monthData,
  monthLabel,
}: ProductionLeaveMonthlySummaryProps) {
  // Empty state : aucune donnée pour ce mois
  if (!monthData || !monthData.hasActivityData) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Synthèse d&apos;activité · {monthLabel}
          </h3>
          <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-white/50">
            Aucun CRA
          </span>
        </div>
        <div className="py-6 text-center text-xs text-white/40">
          Aucune donnée d&apos;activité disponible pour ce mois.
        </div>
      </div>
    )
  }

  const {
    businessDays,
    productionDays,
    nonBillableDays,
    ptoDays,
    sickDays,
    otherAbsenceDays,
    productivityRate,
    targetRate,
    gapVsTarget,
  } = monthData

  const isTargetMet = gapVsTarget !== null && gapVsTarget >= 0

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
          Synthèse d&apos;activité · {monthLabel}
        </h3>
        {gapVsTarget !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
              isTargetMet
                ? "bg-brand-brass/15 text-brand-brass border border-brand-brass/30"
                : "bg-amber-500/15 text-amber-300 border border-amber-500/30",
            )}
          >
            {isTargetMet ? "✓ Cible atteinte" : "Sous objectif"}
            <span className="font-mono tabular-nums text-[11px]">
              ({gapVsTarget > 0 ? `+${gapVsTarget.toFixed(1)}` : gapVsTarget.toFixed(1)} pts)
            </span>
          </span>
        ) : (
          <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-white/50">
            Aucun objectif défini
          </span>
        )}
      </div>

      {/* KPI clés en grille dense */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Productivité */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Taux de productivité</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {productivityRate !== null
                ? `${productivityRate.toLocaleString("fr-FR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })} %`
                : "—"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-white/45">
            {targetRate !== null ? (
              <span>Objectif : {targetRate.toFixed(1)} %</span>
            ) : (
              <span>Sans cible mensuelle</span>
            )}
          </div>
        </div>

        {/* Jours produits */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Production réalisée</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {productionDays}
            </span>
            <span className="text-xs text-white/50">/ {businessDays} j ouvrés</span>
          </div>
          <div className="mt-1 text-[11px] text-white/45">
            {businessDays > 0
              ? `${((productionDays / businessDays) * 100).toFixed(0)} % du potentiel`
              : "0 j ouvré"}
          </div>
        </div>

        {/* Absences (CP + Maladie + Autres) */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Congés & Absences</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {(ptoDays + sickDays + otherAbsenceDays).toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="text-xs text-white/50">jours</span>
          </div>
          <div className="mt-1 text-[11px] text-white/45 truncate" title={`CP: ${ptoDays}j · Maladie: ${sickDays}j · Autre: ${otherAbsenceDays}j`}>
            CP {ptoDays}j · Maladie {sickDays}j
          </div>
        </div>

        {/* Non facturables */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Non facturable</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {nonBillableDays}
            </span>
            <span className="text-xs text-white/50">jours</span>
          </div>
          <div className="mt-1 text-[11px] text-white/45">
            Intercontrat / structure
          </div>
        </div>
      </div>

      {/* Composition visuelle du mois (C-30) */}
      <div className="space-y-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
        <div className="flex items-center justify-between text-xs font-semibold text-white">
          <span>Composition du temps ({businessDays} jours ouvrés)</span>
          <span className="text-[11px] font-normal text-white/45">
            {productionDays} j produits + {nonBillableDays} j non fact. + {ptoDays + sickDays + otherAbsenceDays} j abs.
          </span>
        </div>

        {/* Barre de répartition segmentée */}
        {businessDays > 0 ? (
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            {productionDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (productionDays / businessDays) * 100)}%` }}
                className="bg-brand-brass transition-all"
                title={`Production facturée : ${productionDays} j`}
              />
            ) : null}
            {nonBillableDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (nonBillableDays / businessDays) * 100)}%` }}
                className="bg-slate-400 transition-all"
                title={`Non facturable : ${nonBillableDays} j`}
              />
            ) : null}
            {ptoDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (ptoDays / businessDays) * 100)}%` }}
                className="bg-sky-400 transition-all"
                title={`Congés payés & RTT : ${ptoDays} j`}
              />
            ) : null}
            {sickDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (sickDays / businessDays) * 100)}%` }}
                className="bg-amber-400 transition-all"
                title={`Arrêt maladie : ${sickDays} j`}
              />
            ) : null}
            {otherAbsenceDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (otherAbsenceDays / businessDays) * 100)}%` }}
                className="bg-purple-400 transition-all"
                title={`Autres absences : ${otherAbsenceDays} j`}
              />
            ) : null}
          </div>
        ) : null}

        {/* Légende de composition */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-white/70">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-brand-brass" />
            <span>Produits : <strong className="text-white font-medium">{productionDays} j</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-slate-400" />
            <span>Non facturables : <strong className="text-white font-medium">{nonBillableDays} j</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-400" />
            <span>CP / RTT : <strong className="text-white font-medium">{ptoDays} j</strong></span>
          </div>
          {sickDays > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" />
              <span>Maladie : <strong className="text-white font-medium">{sickDays} j</strong></span>
            </div>
          ) : null}
          {otherAbsenceDays > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-purple-400" />
              <span>Autres : <strong className="text-white font-medium">{otherAbsenceDays} j</strong></span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
