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
      <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Synthèse d&apos;activité · {monthLabel}
          </h3>
          <span className="rounded-[var(--radius-small)] bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted">
            Aucun CRA
          </span>
        </div>
        <div className="py-6 text-center text-xs text-muted">
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
    <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
          Synthèse d&apos;activité · {monthLabel}
        </h3>
        {gapVsTarget !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[var(--radius-small)] px-2.5 py-1 text-xs font-semibold",
              isTargetMet
                ? "bg-success/15 text-success border border-success/30"
                : "bg-amber-500/15 text-amber-700 border border-amber-500/30",
            )}
          >
            {isTargetMet ? "✓ Cible atteinte" : "Sous objectif"}
            <span className="font-mono text-[11px]">
              ({gapVsTarget > 0 ? `+${gapVsTarget.toFixed(1)}` : gapVsTarget.toFixed(1)} pts)
            </span>
          </span>
        ) : (
          <span className="rounded-[var(--radius-small)] bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted">
            Aucun objectif défini
          </span>
        )}
      </div>

      {/* KPI clés en grille dense */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Productivité */}
        <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/40 p-3">
          <div className="text-[11px] font-medium text-muted">Taux de productivité</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-heading">
              {productivityRate !== null
                ? `${productivityRate.toLocaleString("fr-FR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })} %`
                : "—"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {targetRate !== null ? (
              <span>Objectif : {targetRate.toFixed(1)} %</span>
            ) : (
              <span>Sans cible mensuelle</span>
            )}
          </div>
        </div>

        {/* Jours produits */}
        <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/40 p-3">
          <div className="text-[11px] font-medium text-muted">Production réalisée</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-heading">
              {productionDays}
            </span>
            <span className="text-xs text-muted">/ {businessDays} j ouvrés</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {businessDays > 0
              ? `${((productionDays / businessDays) * 100).toFixed(0)} % du potentiel théorique`
              : "0 j ouvré"}
          </div>
        </div>

        {/* Absences (CP + Maladie + Autres) */}
        <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/40 p-3">
          <div className="text-[11px] font-medium text-muted">Congés & Absences</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-heading">
              {(ptoDays + sickDays + otherAbsenceDays).toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="text-xs text-muted">jours</span>
          </div>
          <div className="mt-1 text-[11px] text-muted truncate" title={`CP: ${ptoDays}j · Maladie: ${sickDays}j · Autre: ${otherAbsenceDays}j`}>
            CP {ptoDays}j · Maladie {sickDays}j
          </div>
        </div>

        {/* Non facturables */}
        <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/40 p-3">
          <div className="text-[11px] font-medium text-muted">Temps non facturable</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-heading">
              {nonBillableDays}
            </span>
            <span className="text-xs text-muted">jours</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Intercontrat / structure
          </div>
        </div>
      </div>

      {/* Composition visuelle du mois (C-30) */}
      <div className="space-y-2 rounded-[var(--radius-small)] border border-border/60 bg-canvas/20 p-3.5">
        <div className="flex items-center justify-between text-xs font-semibold text-heading">
          <span>Composition du temps ({businessDays} jours ouvrés)</span>
          <span className="text-[11px] font-normal text-muted">
            {productionDays} j produits + {nonBillableDays} j non fact. + {ptoDays + sickDays + otherAbsenceDays} j abs.
          </span>
        </div>

        {/* Barre de répartition segmentée */}
        {businessDays > 0 ? (
          <div className="flex h-3 w-full overflow-hidden rounded-[var(--radius-small)] bg-border/40">
            {productionDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (productionDays / businessDays) * 100)}%` }}
                className="bg-primary transition-all"
                title={`Production facturée : ${productionDays} j`}
              />
            ) : null}
            {nonBillableDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (nonBillableDays / businessDays) * 100)}%` }}
                className="bg-brand-brass transition-all"
                title={`Non facturable : ${nonBillableDays} j`}
              />
            ) : null}
            {ptoDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (ptoDays / businessDays) * 100)}%` }}
                className="bg-sky-500 transition-all"
                title={`Congés payés & RTT : ${ptoDays} j`}
              />
            ) : null}
            {sickDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (sickDays / businessDays) * 100)}%` }}
                className="bg-amber-500 transition-all"
                title={`Arrêt maladie : ${sickDays} j`}
              />
            ) : null}
            {otherAbsenceDays > 0 ? (
              <div
                style={{ width: `${Math.min(100, (otherAbsenceDays / businessDays) * 100)}%` }}
                className="bg-purple-500 transition-all"
                title={`Autres absences : ${otherAbsenceDays} j`}
              />
            ) : null}
          </div>
        ) : null}

        {/* Légende de composition */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-body">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            <span>Produits : <strong>{productionDays} j</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-brand-brass" />
            <span>Non facturables : <strong>{nonBillableDays} j</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-500" />
            <span>CP / RTT : <strong>{ptoDays} j</strong></span>
          </div>
          {sickDays > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>Maladie : <strong>{sickDays} j</strong></span>
            </div>
          ) : null}
          {otherAbsenceDays > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-purple-500" />
              <span>Autres : <strong>{otherAbsenceDays} j</strong></span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
