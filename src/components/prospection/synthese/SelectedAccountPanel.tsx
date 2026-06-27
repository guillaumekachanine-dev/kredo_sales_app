"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  getPortfolioPeriodMetrics,
  type PortfolioTrustBundle,
  type ProspectionPeriod,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"
import {
  getAccountTrustBadges,
  getCommercialRecommendation,
  getConversionLabel,
  getLifecycleLabel,
  getPriorityLabel,
} from "./synthese-view-model"

export function SelectedAccountPanel({
  account,
  period,
  trust,
}: {
  account: ProspectionPortfolioAccount | null
  period: ProspectionPeriod
  trust: PortfolioTrustBundle
}) {
  if (!account) {
    return (
      <SurfaceCard className="px-5 py-8">
        <h2 className="font-heading text-lg font-bold text-heading">Compte sélectionné</h2>
        <p className="mt-2 text-sm leading-6 text-body">
          Aucun compte disponible pour ce jeu de filtres.
        </p>
      </SurfaceCard>
    )
  }

  const periodMetrics = getPortfolioPeriodMetrics(account, period)
  const recommendation = getCommercialRecommendation(account, period)
  const trustBadges = getAccountTrustBadges(trust.accountPotential, account)

  return (
    <SurfaceCard className="px-5 py-5">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Compte sélectionné</p>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold text-heading">{account.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{account.sector}</Badge>
              <Badge variant="neutral">{getLifecycleLabel(account.lifecycle)}</Badge>
              <Badge variant={account.priority === "haute" ? "warning" : "neutral"}>
                Priorité {getPriorityLabel(account.priority).toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PanelMetric label="Potentiel" value={`${account.potentialScore}/100`} />
          <PanelMetric label="Reach" value={`${account.reachScore}/100`} />
          <PanelMetric label="Momentum" value={`${periodMetrics.momentumScore}/100`} />
          <PanelMetric label="Conversion aval" value={getConversionLabel(account)} />
        </div>

        <div className="grid gap-3 rounded-[var(--radius-medium)] border border-border bg-canvas px-4 py-4 text-sm text-body">
          <PanelRow label="Dernière activité commerciale" value={formatDateLabel(account.latestCommercialActivityAt)} />
          <PanelRow label="Prochain engagement planifié" value={formatDateLabel(account.latestPlannedEngagementAt)} />
          <PanelRow label="Buying committee identifié" value={formatCommitteeLabel(account)} />
          <PanelRow label="Recommandation commerciale" value={recommendation.actionLabel} />
        </div>

        <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Raison dominante</p>
          <p className="mt-2 text-sm leading-6 text-heading">{recommendation.dominantReason}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/prospection/accounts/${account.id}`} className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
            Hub compte
          </Link>
          <Link href="/prospection/suivi" className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
            Activité
          </Link>
          <Link href="/prospection/accounts" className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
            Comptes et contacts
          </Link>
        </div>

        <details className="rounded-[var(--radius-medium)] border border-border bg-canvas px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-body">Inspecter</summary>
          <div className="mt-3 space-y-3 text-sm text-body">
            <div className="flex flex-wrap gap-2">
              {trustBadges.map((origin) => (
                <Badge key={origin} variant={origin === "REAL_NATIVE" ? "brand" : origin === "REAL_LEGACY" ? "warning" : "info"}>
                  {origin === "REAL_NATIVE" ? "Native" : origin === "REAL_LEGACY" ? "Legacy" : "Proxy"}
                </Badge>
              ))}
            </div>
            <div>
              <p className="font-semibold text-heading">Potentiel</p>
              <p className="mt-1 leading-6">{trust.accountPotential.formula}</p>
            </div>
            <div>
              <p className="font-semibold text-heading">Reach</p>
              <p className="mt-1 leading-6">{trust.accountReach.formula}</p>
            </div>
            <div>
              <p className="font-semibold text-heading">Priorité d&apos;action</p>
              <p className="mt-1 leading-6">{trust.commandCenterPriority.formula}</p>
            </div>
          </div>
        </details>
      </div>
    </SurfaceCard>
  )
}

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-heading">{value}</p>
    </div>
  )
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="font-semibold text-heading">{label}</p>
      <p className="text-right">{value}</p>
    </div>
  )
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Aucun"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatCommitteeLabel(account: ProspectionPortfolioAccount) {
  if (account.committeeRoles.length === 0) {
    return "Aucun rôle comité identifié"
  }

  return `${account.committeeRoles.length} rôle${account.committeeRoles.length > 1 ? "s" : ""} · ${account.committeeRoles.join(", ")}`
}
