"use client"

import Link from "next/link"
import { formatDate, formatDateTime } from "@/lib/formatters"
import type {
  SectorActivationWindow,
} from "@/lib/prospection/sector-activation-types"
import type { ProspectionPortfolioAccount } from "@/lib/prospection/portfolio-account-metrics"
import { EmptyState } from "@/components/dashboard/widgets/EmptyState"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  buttonBaseClasses,
  buttonSizeClasses,
  buttonVariantClasses,
} from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  FRESHNESS_LABELS,
  getFreshnessVariant,
  getPriorityBandVariant,
  getTemporalStatusVariant,
  PRACTICE_LABELS,
  PRIORITY_BAND_LABELS,
  summarizeWhyNow,
  TEMPORAL_STATUS_LABELS,
} from "./sector-activation-ui"
import { SECTOR_ACTIVATION_SOURCE_LABELS } from "@/lib/prospection/sector-activation-types"

function PanelRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-heading">{value}</dd>
    </div>
  )
}

export function SelectedCommercialWindowPanel({
  window,
  accounts,
}: {
  window: SectorActivationWindow | null
  accounts: ProspectionPortfolioAccount[]
}) {
  if (!window) {
    return (
      <SurfaceCard className="px-5 py-8">
        <EmptyState
          title="Aucune fenêtre sélectionnée"
          description="Sélectionnez une ligne dans le ledger pour afficher le raisonnement commercial associé."
          className="min-h-[18rem]"
        />
      </SurfaceCard>
    )
  }

  const exposedAccounts = accounts
    .filter((account) => window.exposedAccountIds.includes(account.id))
    .toSorted((left, right) => {
      const leftOpportunityWithoutPlan = left.openOpportunityCount > 0 && left.plannedCommercialEngagement90d === 0
      const rightOpportunityWithoutPlan = right.openOpportunityCount > 0 && right.plannedCommercialEngagement90d === 0
      if (leftOpportunityWithoutPlan !== rightOpportunityWithoutPlan) return rightOpportunityWithoutPlan ? 1 : -1
      if (left.inactivityRiskScore90d !== right.inactivityRiskScore90d) return right.inactivityRiskScore90d - left.inactivityRiskScore90d
      return left.name.localeCompare(right.name, "fr") || left.id.localeCompare(right.id)
    })
    .slice(0, 5)

  return (
    <SurfaceCard className="px-5 py-5">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              label={TEMPORAL_STATUS_LABELS[window.temporalStatus]}
              variant={getTemporalStatusVariant(window.temporalStatus)}
            />
            <StatusPill
              label={PRIORITY_BAND_LABELS[window.priorityBand]}
              variant={getPriorityBandVariant(window.priorityBand)}
            />
            <StatusPill
              label={FRESHNESS_LABELS[window.freshnessBand]}
              variant={getFreshnessVariant(window.freshnessBand)}
            />
          </div>
          <div aria-live="polite" className="space-y-1">
            <h2 className="font-heading text-lg font-semibold text-heading">
              Fenêtre sélectionnée
            </h2>
            <p className="text-base font-semibold text-heading">{window.title}</p>
            <p className="text-sm leading-6 text-body">{window.subtitle}</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Pourquoi agir maintenant
          </p>
          <p className="mt-2 text-sm leading-6 text-heading">
            {summarizeWhyNow(window)}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Playbook recommandé
          </p>
          <p className="text-sm leading-6 text-body">{window.playbookSummary}</p>
          <p className="text-sm font-medium leading-6 text-heading">{window.suggestedAction}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Shortlist des comptes prioritaires
            </p>
            <span className="text-xs text-muted">
              {window.exposedAccountCount} exposé{window.exposedAccountCount > 1 ? "s" : ""}
            </span>
          </div>

          {exposedAccounts.length === 0 ? (
            <p className="text-sm text-muted">
              Aucun compte relié à ce secteur dans le portefeuille actuel.
            </p>
          ) : (
            <ul className="space-y-2">
              {exposedAccounts.map((account) => (
                <li
                  key={account.id}
                  className="rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-heading">{account.name}</p>
                      <p className="text-xs text-muted">
                        {account.lifecycle.replaceAll("_", " ")} · {account.openOpportunityCount} opportunité(s) ouverte(s)
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>Reach {account.reachScore}</p>
                      <p>Momentum {account.momentumScore90d}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <dl className="divide-y divide-border">
          <PanelRow label="Secteur" value={window.sectorName} />
          <PanelRow label="Practice" value={PRACTICE_LABELS[window.practiceKey]} />
          <PanelRow
            label="Comptes exposés"
            value={`${window.exposedAccountCount} compte${window.exposedAccountCount > 1 ? "s" : ""}`}
          />
          <PanelRow
            label="Reach moyen"
            value={window.averageReachScore === null ? "—" : `${window.averageReachScore} / 100`}
          />
          <PanelRow
            label="Gap de couverture"
            value={window.coverageGap === null ? "—" : `${window.coverageGap} pts`}
          />
        </dl>

        <dl className="divide-y divide-border">
          <PanelRow
            label="Source"
            value={`${SECTOR_ACTIVATION_SOURCE_LABELS[window.sourceType]} · ${window.sourceLabel}`}
          />
          <PanelRow
            label="Échéance"
            value={window.deadlineAt ? formatDate(window.deadlineAt) : "Non datée"}
          />
          <PanelRow label="Détecté" value={formatDateTime(window.detectedAt)} />
        </dl>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/legacy/etudes/${window.sectorSlug}`}
            className={cn(buttonBaseClasses, buttonVariantClasses.primary, buttonSizeClasses.sm)}
          >
            Ouvrir l&apos;étude
          </Link>
          <Link
            href="/prospection/accounts"
            className={cn(buttonBaseClasses, buttonVariantClasses.secondary, buttonSizeClasses.sm)}
          >
            Voir les comptes exposés
          </Link>
          <Link
            href="/agenda"
            className={cn(buttonBaseClasses, buttonVariantClasses.ghost, buttonSizeClasses.sm)}
          >
            Voir l&apos;activité
          </Link>
        </div>
      </div>
    </SurfaceCard>
  )
}
