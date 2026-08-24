"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDateTime } from "@/lib/formatters"
import type { DataTrustMeta } from "@/lib/prospection/dashboard-lab-data"
import type { FutureDemoWindowFixture } from "@/lib/prospection/dashboard-lab-fixtures"
import { cn } from "@/lib/utils"
import type { DashboardLabInspection, DashboardLabViewModel, DashboardLabWindowView } from "./dashboard-lab-types"
import {
  BlockFrame,
  LabEmptyState,
  MetricStrip,
  ProvenanceBadge,
} from "./DashboardLabShared"

function isDemoWindow(window: DashboardLabWindowView): window is FutureDemoWindowFixture {
  return !("meta" in window)
}

function getWindowMeta(window: DashboardLabWindowView): DataTrustMeta {
  if (!isDemoWindow(window)) {
    return window.meta
  }

  return {
    id: `meta-${window.id}`,
    label: "Fenêtre commerciale future",
    primaryOrigin: "FUTURE_DEMO",
    origins: ["FUTURE_DEMO"],
    formula: "Fixture explicite illustrant un futur couplage entre account signals, couverture commerciale et playbook recommandé.",
    freshness: {
      latestAt: window.detectedAt,
      label: formatDateTime(window.detectedAt),
    },
    completeness: {
      value: 100,
      label: `${window.exposedCompanyIds.length} comptes de démonstration ciblés`,
    },
    limitations: [
      "Aucune donnée de cette fenêtre n'est écrite en base.",
      "Le scénario sert uniquement à illustrer les capacités futures account_signals et playbooks compte-natifs.",
    ],
  }
}

function getWindowTitle(window: DashboardLabWindowView) {
  return window.title
}

function getWindowSubtitle(window: DashboardLabWindowView) {
  return isDemoWindow(window) ? window.playbook : window.subtitle
}

function getWindowSuggestedAction(window: DashboardLabWindowView) {
  return isDemoWindow(window) ? window.playbook : window.suggestedAction
}

function getWindowPractice(window: DashboardLabWindowView) {
  return window.recommendedPractice
}

function getWindowDate(window: DashboardLabWindowView) {
  return isDemoWindow(window) ? window.detectedAt : window.eventAt
}

function getWindowUrgencyScore(window: DashboardLabWindowView) {
  if (isDemoWindow(window)) {
    return window.urgency === "high" ? 88 : 66
  }
  return window.urgencyScore
}

function getWindowUrgencyLabel(window: DashboardLabWindowView) {
  if (isDemoWindow(window)) {
    return window.urgency === "high" ? "Fenêtre courte" : "Fenêtre à cadrer"
  }
  return window.urgencyLabel
}

function getWindowStateLabel(window: DashboardLabWindowView) {
  if (isDemoWindow(window)) {
    return window.urgency === "high" ? "Future" : "Projection"
  }
  return window.stateLabel
}

function getWindowSectorName(window: DashboardLabWindowView) {
  return window.sectorName
}

function getWindowExposedCompanyIds(window: DashboardLabWindowView) {
  return window.exposedCompanyIds
}

function getWindowExposedCompanyNames(window: DashboardLabWindowView) {
  return window.exposedCompanyNames
}

function getCoverageSummary(window: DashboardLabWindowView, viewModel: DashboardLabViewModel) {
  const exposedAccounts = viewModel.accounts.filter((account) => getWindowExposedCompanyIds(window).includes(account.id))
  if (exposedAccounts.length === 0) {
    return {
      avgReach: null,
      avgMomentum: null,
      linkedAccounts: 0,
    }
  }

  const avgReach = Math.round(exposedAccounts.reduce((sum, account) => sum + account.reachScore, 0) / exposedAccounts.length)
  const avgMomentum = Math.round(exposedAccounts.reduce((sum, account) => sum + account.momentumScore30d, 0) / exposedAccounts.length)

  return {
    avgReach,
    avgMomentum,
    linkedAccounts: exposedAccounts.length,
  }
}

export function SectorSignalLab({
  viewModel,
  onSelectAccount,
  onInspect,
}: {
  viewModel: DashboardLabViewModel
  onSelectAccount: (accountId: string) => void
  onInspect: (inspection: DashboardLabInspection) => void
}) {
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)

  if (viewModel.windows.length === 0) {
    return (
      <LabEmptyState
        title="Aucune fenêtre commerciale visible"
        body="Les filtres actuels ne laissent aucune fenêtre sectorielle ou de démonstration exploitable. Réactive un secteur ou enlève un filtre portefeuille."
        actionHref="/intelligence"
        actionLabel="Voir l'approche sectorielle"
      />
    )
  }

  const selectedWindow = viewModel.windows.find((window) => window.id === selectedWindowId) ?? viewModel.windows[0] ?? null
  const selectedWindowMeta = selectedWindow ? getWindowMeta(selectedWindow) : viewModel.trust.sectorWindowLedger
  const selectedCoverage = selectedWindow ? getCoverageSummary(selectedWindow, viewModel) : null
  const visibleSectors = viewModel.sectors.slice(0, 5)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.9fr)]">
      <div className="space-y-6">
        <BlockFrame
          title="Commercial Window Ledger"
          subtitle="Ledger priorisé des événements, news et déclencheurs réglementaires à convertir en action commerciale avant refroidissement du signal."
          meta={viewModel.trust.sectorWindowLedger}
          onInspect={() => onInspect({
            title: "Commercial Window Ledger",
            summary: "Relie une fenêtre sectorielle à une practice, des comptes exposés et un playbook court.",
            meta: viewModel.trust.sectorWindowLedger,
          })}
        >
          <div>
            <div className="grid grid-cols-[7rem_minmax(0,1.3fr)_8rem_8rem_7rem_minmax(0,1fr)] gap-3 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              <span>Urgence</span>
              <span>Signal</span>
              <span>Secteur</span>
              <span>Practice</span>
              <span>Comptes</span>
              <span>Action</span>
            </div>
            <div className="divide-y divide-border">
              {viewModel.windows.map((window) => {
                const isSelected = window.id === selectedWindow?.id
                const meta = getWindowMeta(window)
                const coverage = getCoverageSummary(window, viewModel)
                return (
                  <button
                    key={window.id}
                    type="button"
                    onClick={() => setSelectedWindowId(window.id)}
                    className={cn(
                      "grid w-full grid-cols-[7rem_minmax(0,1.3fr)_8rem_8rem_7rem_minmax(0,1fr)] gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      isSelected && "bg-primary/[0.04]",
                    )}
                    aria-pressed={isSelected}
                  >
                    <div className="space-y-2">
                      <div className="h-2 overflow-hidden rounded-full bg-canvas">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            getWindowUrgencyScore(window) >= 80 ? "bg-danger" : getWindowUrgencyScore(window) >= 60 ? "bg-warning" : "bg-info",
                          )}
                          style={{ width: `${getWindowUrgencyScore(window)}%` }}
                        />
                      </div>
                      <p className="text-xs font-semibold text-heading">{getWindowUrgencyLabel(window)}</p>
                      <p className="text-[11px] text-muted">{getWindowStateLabel(window)} · {formatDateTime(getWindowDate(window))}</p>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-heading">{getWindowTitle(window)}</p>
                        <ProvenanceBadge origin={meta.primaryOrigin} />
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-body">{getWindowSubtitle(window)}</p>
                    </div>

                    <div className="text-sm text-body">
                      <p className="font-semibold text-heading">{getWindowSectorName(window)}</p>
                    </div>

                    <div className="text-sm text-body">
                      <p className="font-semibold text-heading">{getWindowPractice(window)}</p>
                    </div>

                    <div className="text-sm text-body">
                      <p className="font-semibold text-heading">{getWindowExposedCompanyIds(window).length}</p>
                      <p className="text-[11px] text-muted">
                        {coverage.avgReach !== null ? `reach ${coverage.avgReach}/100` : "reach indisponible"}
                      </p>
                    </div>

                    <div className="min-w-0 text-sm leading-6 text-body">
                      {getWindowSuggestedAction(window)}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </BlockFrame>

        <BlockFrame
          title="Sector Activation Map"
          subtitle="Vue d'appui pour voir où la couverture commerciale réelle soutient, ou non, les playbooks sectoriels."
          meta={viewModel.trust.sectorWindowLedger}
          onInspect={() => onInspect({
            title: "Sector Activation Map",
            summary: "Met en regard les secteurs visibles, leur practice dominante et la couverture portefeuille réellement reliée.",
            meta: viewModel.trust.sectorWindowLedger,
          })}
        >
          <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
            {visibleSectors.map((sector) => (
              <div key={sector.id} className="rounded-[var(--radius-medium)] border border-border bg-canvas p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-heading">{sector.name}</p>
                    <p className="text-xs text-muted">{sector.topPractice} · {sector.windowsCount} fenêtres visibles</p>
                  </div>
                  <Link
                    href="/intelligence"
                    className="text-xs font-semibold text-primary transition-colors hover:text-primary-deep"
                  >
                    Ouvrir
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <MetricStrip label="Comptes liés" value={String(sector.linkedAccounts)} />
                  <MetricStrip label="Reach moyen" value={sector.avgReachScore !== null ? `${sector.avgReachScore}/100` : "—"} />
                  <MetricStrip label="Momentum" value={sector.avgMomentumScore !== null ? `${sector.avgMomentumScore}/100` : "—"} />
                </div>
              </div>
            ))}
          </div>
        </BlockFrame>
      </div>

      <div className="space-y-6">
        <BlockFrame
          title="Fenêtre sélectionnée"
          subtitle="Contexte d'activation, couverture exposée et drill-down immédiat."
          meta={selectedWindowMeta}
          onInspect={() => {
            if (!selectedWindow) return
            onInspect({
              title: getWindowTitle(selectedWindow),
              summary: getWindowSubtitle(selectedWindow),
              meta: selectedWindowMeta,
            })
          }}
        >
          {selectedWindow ? (
            <div className="space-y-5 px-5 py-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-xl font-bold text-heading">{getWindowTitle(selectedWindow)}</h3>
                  <ProvenanceBadge origin={selectedWindowMeta.primaryOrigin} />
                </div>
                <p className="text-sm leading-6 text-body">{getWindowSubtitle(selectedWindow)}</p>
              </div>

              {isDemoWindow(selectedWindow) ? (
                <div className="rounded-[var(--radius-medium)] border border-danger/20 bg-danger/[0.05] p-4">
                  <p className="font-semibold text-heading">Données de démonstration</p>
                  <p className="mt-1 text-sm leading-6 text-body">
                    Donnée non persistée, projetée temporairement sur des comptes réels pour illustrer une capacité future.
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <MetricStrip label="Urgence" value={getWindowUrgencyLabel(selectedWindow)} />
                <MetricStrip label="Statut" value={getWindowStateLabel(selectedWindow)} />
                <MetricStrip label="Practice" value={getWindowPractice(selectedWindow)} />
                <MetricStrip label="Comptes exposés" value={String(getWindowExposedCompanyIds(selectedWindow).length)} />
                <MetricStrip label="Date" value={formatDateTime(getWindowDate(selectedWindow))} />
              </div>

              <div className="rounded-[var(--radius-medium)] border border-border bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Playbook suggéré</p>
                <p className="mt-2 text-sm leading-6 text-body">{getWindowSuggestedAction(selectedWindow)}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <MetricStrip label="Reach moyen" value={selectedCoverage?.avgReach !== null ? `${selectedCoverage?.avgReach}/100` : "—"} />
                <MetricStrip label="Momentum moyen" value={selectedCoverage?.avgMomentum !== null ? `${selectedCoverage?.avgMomentum}/100` : "—"} />
                <MetricStrip label="Couverture liée" value={selectedCoverage ? `${selectedCoverage.linkedAccounts} comptes` : "—"} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Comptes exposés</p>
                {getWindowExposedCompanyNames(selectedWindow).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {getWindowExposedCompanyNames(selectedWindow).map((name, index) => {
                      const accountId = getWindowExposedCompanyIds(selectedWindow)[index]
                      return accountId ? (
                        <button
                          key={`${selectedWindow.id}-${accountId}`}
                          type="button"
                          onClick={() => onSelectAccount(accountId)}
                          className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-surface-hover hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          {name}
                        </button>
                      ) : (
                        <span key={`${selectedWindow.id}-${name}`} className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-body">
                          {name}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-body">
                    Aucun compte n&apos;est encore relié à cette fenêtre. Le signal existe, la couverture commerciale reste à construire.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/intelligence" className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
                  Ouvrir le secteur
                </Link>
                {getWindowExposedCompanyIds(selectedWindow)[0] ? (
                  <Link href={`/prospection/accounts/${getWindowExposedCompanyIds(selectedWindow)[0]}`} className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
                    Ouvrir un compte exposé
                  </Link>
                ) : null}

              </div>
            </div>
          ) : null}
        </BlockFrame>
      </div>
    </div>
  )
}
