"use client"

import Link from "next/link"
import { formatDateTime, formatEuroCompact } from "@/lib/formatters"
import type { DashboardLabAccount } from "@/lib/prospection/dashboard-lab-data"
import type { DashboardLabInspection, DashboardLabViewModel } from "./dashboard-lab-types"
import {
  AccountIdentityLine,
  BlockFrame,
  LabEmptyState,
  MetricStrip,
  ProvenanceBadge,
} from "./DashboardLabShared"

function getPriorityScore(account: DashboardLabAccount, period: DashboardLabViewModel["filters"]["period"]) {
  if (period === "180d") return account.actionPriorityScore180d
  if (period === "90d") return account.actionPriorityScore90d
  return account.actionPriorityScore30d
}

function getMomentumScore(account: DashboardLabAccount, period: DashboardLabViewModel["filters"]["period"]) {
  if (period === "180d") return account.momentumScore180d
  if (period === "90d") return account.momentumScore90d
  return account.momentumScore30d
}

function getInactivityRiskScore(account: DashboardLabAccount, period: DashboardLabViewModel["filters"]["period"]) {
  if (period === "180d") return account.inactivityRiskScore180d
  if (period === "90d") return account.inactivityRiskScore90d
  return account.inactivityRiskScore30d
}

function getActivityCount(account: DashboardLabAccount, period: DashboardLabViewModel["filters"]["period"]) {
  if (period === "180d") return account.activity180d
  if (period === "90d") return account.activity90d
  return account.activity30d
}

function getPlannedCount(account: DashboardLabAccount, period: DashboardLabViewModel["filters"]["period"]) {
  if (period === "180d") return account.plannedCommercialEngagement180d
  if (period === "90d") return account.plannedCommercialEngagement90d
  return account.plannedCommercialEngagement30d
}

export function CommandCenterLab({
  viewModel,
  onSelectAccount,
  onInspect,
}: {
  viewModel: DashboardLabViewModel
  onSelectAccount: (accountId: string) => void
  onInspect: (inspection: DashboardLabInspection) => void
}) {
  if (viewModel.accounts.length === 0) {
    return (
      <LabEmptyState
        title="Aucun compte pour ce jeu de filtres"
        body="Le Command Center a besoin d'un portefeuille filtré non vide pour prioriser l'effort commercial."
      />
    )
  }

  const shortlist = [...viewModel.accounts]
    .sort((left, right) => getPriorityScore(right, viewModel.filters.period) - getPriorityScore(left, viewModel.filters.period))
    .slice(0, 7)

  const selectedAccount = viewModel.selectedAccount ?? shortlist[0] ?? null
  const selectedSignals = viewModel.demoSignals.filter((signal) => signal.companyId === selectedAccount?.id)
  const weeklyDecisions = shortlist.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(19rem,0.9fr)]">
        <BlockFrame
          title="Priority Motion Board"
          subtitle="Shortlist limitée des comptes à arbitrer cette semaine, en combinant potentiel, momentum, gap de coverage et risque d'inaction."
          meta={viewModel.trust.commandCenterPriority}
          onInspect={() => onInspect({
            title: "Priority Motion Board",
            summary: "Classe la shortlist sur un score d'action combinant potentiel, momentum, coverage gap et risque d'inaction.",
            meta: viewModel.trust.commandCenterPriority,
          })}
        >
          <div className="divide-y divide-border">
            {shortlist.map((account, index) => {
              const momentumScore = getMomentumScore(account, viewModel.filters.period)
              const priorityScore = getPriorityScore(account, viewModel.filters.period)
              const plannedCount = getPlannedCount(account, viewModel.filters.period)
              const isSelected = account.id === selectedAccount?.id

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => onSelectAccount(account.id)}
                  className="grid w-full grid-cols-[3rem_minmax(0,1.2fr)_minmax(18rem,1fr)] gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-pressed={isSelected}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-heading text-2xl font-bold text-heading">{index + 1}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {priorityScore}/100
                    </span>
                  </div>

                  <div className="min-w-0 space-y-3">
                    <AccountIdentityLine account={account} selected={isSelected} />
                    <p className="max-w-xl text-sm leading-6 text-body">{account.nextDecision}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{account.contactCount} contacts</span>
                      <span>{account.committeeRoleCount} rôles comité</span>
                      <span>{getActivityCount(account, viewModel.filters.period)} activités réalisées</span>
                      <span>{plannedCount} planifiées</span>
                      {account.openOpportunityCount > 0 ? <span>{account.openOpportunityCount} opp. ouvertes</span> : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <MotionBars
                      potential={account.potentialScore}
                      momentum={momentumScore}
                      reachGap={account.reachGapScore}
                      inactionRisk={getInactivityRiskScore(account, viewModel.filters.period)}
                    />
                    <div className="grid grid-cols-2 gap-3 text-xs text-body">
                      <div>
                        <p className="font-semibold text-heading">Pourquoi maintenant</p>
                        <p className="mt-1 leading-5">
                          {momentumScore >= 45
                            ? "Le compte bouge, mais la couverture reste fragile."
                            : account.reachScore < 40
                              ? "Le potentiel est là, la couverture ne suit pas."
                              : plannedCount > 0
                                ? "Un engagement planifié approche sans conversation récente solide."
                                : "Le signal refroidit si aucun échange n&apos;est recréé."}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-heading">Coût d&apos;inaction</p>
                        <p className="mt-1 leading-5">
                          {account.openOpportunityCount > 0
                            ? "Une activité existante peut se dissiper avant qualification."
                            : "Le compte restera un haut potentiel peu converti sans ouverture active."}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </BlockFrame>

        <div className="space-y-6">
          <BlockFrame
            title="Trois décisions"
            subtitle="Le Command Center résume les arbitrages à prendre avant d'ouvrir les écrans spécialisés."
            meta={viewModel.trust.commandCenterPriority}
            onInspect={() => onInspect({
              title: "Trois décisions",
              summary: "Synthèse actionnable extraite de la shortlist prioritaire.",
              meta: viewModel.trust.commandCenterPriority,
            })}
          >
            <div className="space-y-4 px-5 py-4">
              {weeklyDecisions.map((account, index) => (
                <div key={account.id} className="space-y-2 border-b border-border pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/[0.08] text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-heading">{account.name}</span>
                  </div>
                  <p className="text-sm leading-6 text-body">{account.nextDecision}</p>
                </div>
              ))}
            </div>
          </BlockFrame>

          <BlockFrame
            title="Compte sélectionné"
            subtitle="Le contexte utile pour confirmer la décision avant drill-down."
            meta={viewModel.trust.accountPotential}
            onInspect={() => onInspect({
              title: "Compte sélectionné",
              summary: "Contexte portefeuille, coverage et conversion aval du compte actif.",
              meta: viewModel.trust.accountPotential,
            })}
          >
            {selectedAccount ? (
              <div className="space-y-5 px-5 py-4">
                <div className="space-y-3">
                  <AccountIdentityLine account={selectedAccount} selected />
                  <div className="grid grid-cols-2 gap-4">
                    <MetricStrip label="Potentiel" value={`${selectedAccount.potentialScore}/100`} />
                    <MetricStrip label="Reach" value={`${selectedAccount.reachScore}/100`} />
                    <MetricStrip label="Momentum" value={`${getMomentumScore(selectedAccount, viewModel.filters.period)}/100`} />
                    <MetricStrip
                      label="Pipeline aval"
                      value={selectedAccount.weightedPipeline > 0 ? formatEuroCompact(selectedAccount.weightedPipeline) : "—"}
                      context={selectedAccount.openOpportunityCount > 0 ? `${selectedAccount.openOpportunityCount} opp. ouvertes` : "Aucune opp. ouverte"}
                    />
                  </div>
                </div>

                <div className="grid gap-3 rounded-[var(--radius-medium)] border border-border bg-canvas p-4 text-sm text-body">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-heading">Dernière activité commerciale</span>
                    <span>{formatDateTime(selectedAccount.latestCommercialActivityAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-heading">Prochain engagement planifié</span>
                    <span>{formatDateTime(selectedAccount.latestPlannedEngagementAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-heading">Dernière intelligence</span>
                    <span>{formatDateTime(selectedAccount.latestIntelligenceAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-heading">Dernière mise à jour fiche</span>
                    <span>{formatDateTime(selectedAccount.latestDataUpdateAt)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Confiance disponible</p>
                  <div className="flex flex-wrap gap-2">
                    <ProvenanceBadge origin={selectedAccount.potentialOrigin.primaryOrigin} />
                    {selectedAccount.potentialOrigin.origins.includes("REAL_NATIVE") && selectedAccount.potentialOrigin.primaryOrigin !== "REAL_NATIVE" ? <ProvenanceBadge origin="REAL_NATIVE" /> : null}
                    {selectedAccount.potentialOrigin.origins.includes("REAL_LEGACY") && selectedAccount.potentialOrigin.primaryOrigin !== "REAL_LEGACY" ? <ProvenanceBadge origin="REAL_LEGACY" /> : null}
                    {selectedAccount.potentialOrigin.origins.includes("PROXY") ? <ProvenanceBadge origin="PROXY" /> : null}
                    {selectedSignals.length > 0 ? <ProvenanceBadge origin="FUTURE_DEMO" /> : null}
                  </div>
                </div>

                {selectedSignals.length > 0 ? (
                  <div className="rounded-[var(--radius-medium)] border border-danger/20 bg-danger/[0.05] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-heading">Données de démonstration</p>
                        <p className="text-sm leading-6 text-body">{selectedSignals[0].title}</p>
                      </div>
                      <ProvenanceBadge origin="FUTURE_DEMO" />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Link href={`/prospection/accounts/${selectedAccount.id}`} className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
                    Ouvrir le compte
                  </Link>

                  <Link href="/prospection/approche-sectorielle" className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
                    Approche sectorielle
                  </Link>
                </div>
              </div>
            ) : null}
          </BlockFrame>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <BlockFrame
          title="Angles de friction"
          subtitle="Les comptes qui combinent potentiel élevé et inertie commerciale."
          meta={viewModel.trust.accountMomentum30d}
          onInspect={() => onInspect({
            title: "Angles de friction",
            summary: "Met en avant les comptes à potentiel élevé mais sans activité ou sans coverage suffisant.",
            meta: viewModel.trust.accountMomentum30d,
          })}
        >
          <div className="space-y-3 px-5 py-4">
            {shortlist
              .filter((account) => getMomentumScore(account, viewModel.filters.period) < 30 || account.reachScore < 40)
              .slice(0, 4)
              .map((account) => (
                <div key={account.id} className="grid gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className="space-y-1">
                    <p className="font-semibold text-heading">{account.name}</p>
                    <p className="text-sm leading-6 text-body">
                      {account.reachScore < 40
                        ? "Le reach reste trop faible pour convertir le potentiel en conversations fiables."
                        : "L'activité réalisée reste insuffisante pour confirmer la priorité du compte."}
                    </p>
                  </div>
                  <div className="text-sm text-body">
                    <p>Reach {account.reachScore}/100</p>
                    <p>Momentum {getMomentumScore(account, viewModel.filters.period)}/100</p>
                    <p>Planifié {getPlannedCount(account, viewModel.filters.period)}</p>
                  </div>
                </div>
              ))}
          </div>
        </BlockFrame>

        <BlockFrame
          title="Provenance intelligence"
          subtitle="La recommandation actuelle sépare désormais activité réalisée, engagement planifié et intelligence disponible."
          meta={viewModel.trust.commandCenterPriority}
          onInspect={() => onInspect({
            title: "Provenance intelligence",
            summary: "La décision s'appuie sur des fraîcheurs distinctes plutôt que sur un unique latestActivityAt.",
            meta: viewModel.trust.commandCenterPriority,
          })}
        >
          <div className="grid gap-4 px-5 py-4">
            <MetricStrip label="Activité réalisée" value={formatDateTime(selectedAccount?.latestCommercialActivityAt ?? null)} />
            <MetricStrip label="Planifié" value={formatDateTime(selectedAccount?.latestPlannedEngagementAt ?? null)} />
            <MetricStrip label="Intelligence" value={formatDateTime(selectedAccount?.latestIntelligenceAt ?? null)} />
            <MetricStrip label="Fiche CRM" value={formatDateTime(selectedAccount?.latestDataUpdateAt ?? null)} />
          </div>
        </BlockFrame>
      </div>
    </div>
  )
}

function MotionBars({
  potential,
  momentum,
  reachGap,
  inactionRisk,
}: {
  potential: number
  momentum: number
  reachGap: number
  inactionRisk: number
}) {
  const items = [
    { label: "Potentiel", value: potential, tone: "bg-primary" },
    { label: "Momentum", value: momentum, tone: "bg-info" },
    { label: "Gap reach", value: reachGap, tone: "bg-warning" },
    { label: "Risque", value: inactionRisk, tone: "bg-danger" },
  ]

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-2 text-xs">
          <span className="text-muted">{item.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.value}%` }} />
          </div>
          <span className="text-right font-semibold text-heading">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
