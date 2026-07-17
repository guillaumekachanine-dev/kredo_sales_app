"use client"

import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import {
  getCommercialRecommendation,
  getConversionLabel,
} from "./synthese-view-model"
import type {
  PortfolioTrustBundle,
  ProspectionPeriod,
  ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"

function toSectorSlug(sector: string): string {
  return sector
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function SelectedAccountPanel({
  account,
  period,
  trust: _trust,
}: {
  account: ProspectionPortfolioAccount | null
  period: ProspectionPeriod
  trust: PortfolioTrustBundle
}) {
  if (!account) {
    return (
      <SurfaceCard accent="primary" className="px-5 py-8">
        <p className="text-sm leading-6 text-body">
          Aucun compte disponible pour ce jeu de filtres.
        </p>
      </SurfaceCard>
    )
  }

  const recommendation = getCommercialRecommendation(account, period)

  const cLevelRoles = account.committeeRoles.length === 0
    ? "Aucun C-level identifié"
    : `${account.committeeRoles.length} C-level · ${account.committeeRoles.join(", ")}`

  const sectorSlug = toSectorSlug(account.sector)

  return (
    <SurfaceCard accent="primary" className="px-5 py-5">
      <div className="space-y-4">
        {/* Identity — min-h preserves the space that was occupied by the eyebrow + badges row;
            items-center keeps the name visually centered in that reserved height */}
        <div className="flex min-h-[5rem] items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold text-heading">{account.name}</h2>
          <CompanyLogo name={account.name} size="md" className="shrink-0" />
        </div>

        {/* Info rows */}
        <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-4 py-3 text-sm text-body space-y-3">
          <PanelRow label="Dernière activité" value={formatDateLabel(account.latestCommercialActivityAt)} />
          <PanelRow label="Prochain engagement" value={formatDateLabel(account.latestPlannedEngagementAt)} />
          <PanelRow label="C-level" value={cLevelRoles} />
          <PanelRow label="Conversion aval" value={getConversionLabel(account)} />

          {/* Amber vertical segment uniting the 4 strategic rows */}
          <div className="border-t border-border/60 pt-3">
            <div className="relative pl-3">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-brand-brass" />
              <div className="space-y-3">
                <StackedRow label="Recommandation" value={recommendation.actionLabel} />
                <StackedRow label="Raison dominante" value={recommendation.dominantReason} />
                <StackedRow label="Pourquoi maintenant" value={recommendation.whyNow} />
                <StackedRow label="Coût d'inaction" value={recommendation.costOfInaction} />
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts — 4 compact buttons on one line */}
        <div className="flex gap-2">
          <Link
            href={`/prospection/accounts/${account.id}`}
            className="flex-1 inline-flex justify-center items-center h-8 rounded-[var(--radius-medium)] border border-border px-2 text-xs font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading"
          >
            Compte
          </Link>
          <Link
            href="/prospection/suivi"
            className="flex-1 inline-flex justify-center items-center h-8 rounded-[var(--radius-medium)] border border-border px-2 text-xs font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading"
          >
            Activité
          </Link>
          <Link
            href="/prospection/accounts"
            className="flex-1 inline-flex justify-center items-center h-8 rounded-[var(--radius-medium)] border border-border px-2 text-xs font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading"
          >
            Contacts
          </Link>
          <Link
            href={`/ressources/playbook/${sectorSlug}`}
            className="flex-1 inline-flex justify-center items-center h-8 rounded-[var(--radius-medium)] border border-brand-brass/40 bg-brand-brass/5 px-2 text-xs font-semibold text-brand-brass transition-colors hover:bg-brand-brass/10"
          >
            Playbook
          </Link>
        </div>
      </div>
    </SurfaceCard>
  )
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="shrink-0 font-semibold text-heading">{label}</p>
      <p className="text-right">{value}</p>
    </div>
  )
}

function StackedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="text-sm leading-5 text-heading">{value}</p>
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
