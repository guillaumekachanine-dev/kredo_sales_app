"use client"

import { startTransition, useDeferredValue, useState } from "react"
import { formatDateTime } from "@/lib/formatters"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { KpiCard } from "@/components/ui/KpiCard"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import type { DashboardLabAccount, DashboardLabData } from "@/lib/prospection/dashboard-lab-data"
import {
  FUTURE_DEMO_SIGNAL_FIXTURES,
  FUTURE_DEMO_WINDOW_FIXTURES,
  type FutureDemoWindowFixture,
} from "@/lib/prospection/dashboard-lab-fixtures"
import { AccountIntelligenceLab } from "./AccountIntelligenceLab"
import { CommandCenterLab } from "./CommandCenterLab"
import { ComparisonPanel, ConfidencePanel, getConceptCopy } from "./DashboardLabShared"
import { SectorSignalLab } from "./SectorSignalLab"
import type { DashboardLabConcept, DashboardLabFilters, DashboardLabInspection, DashboardLabViewModel, DashboardLabWindowView } from "./dashboard-lab-types"

const CONCEPT_ITEMS = [
  { value: "command-center", label: "Command Center" },
  { value: "account-intelligence", label: "Account Intelligence" },
  { value: "sector-signal", label: "Sector & Signal" },
] as const

const DEFAULT_FILTERS: DashboardLabFilters = {
  period: "90d",
  sector: "all",
  lifecycle: "all",
  priority: "all",
}

export function DashboardLabShell({ data }: { data: DashboardLabData }) {
  const [concept, setConcept] = useState<DashboardLabConcept>("command-center")
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [inspection, setInspection] = useState<DashboardLabInspection | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(data.accounts[0]?.id ?? null)
  const [filters, setFilters] = useState<DashboardLabFilters>(DEFAULT_FILTERS)

  const deferredConcept = useDeferredValue(concept)
  const deferredDemoEnabled = useDeferredValue(demoEnabled)
  const deferredFilters = useDeferredValue(filters)
  const deferredSelectedAccountId = useDeferredValue(selectedAccountId)

  const viewModel = buildDashboardLabViewModel({
    data,
    filters: deferredFilters,
    selectedAccountId: deferredSelectedAccountId,
    demoEnabled: deferredDemoEnabled,
  })

  const conceptCopy = getConceptCopy(deferredConcept)
  const activeFilterCount = [
    filters.sector !== DEFAULT_FILTERS.sector,
    filters.lifecycle !== DEFAULT_FILTERS.lifecycle,
    filters.priority !== DEFAULT_FILTERS.priority,
    filters.period !== DEFAULT_FILTERS.period,
  ].filter(Boolean).length

  return (
    <div className="space-y-6 pb-8" data-theme="cockpit">
      <header className="relative overflow-hidden rounded-[var(--radius-xlarge)] border border-border bg-surface px-6 py-6">
        <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                CRM & Prospection · Dashboard Lab
              </p>
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] text-heading">
                  Comparer trois cockpits décisionnels avant refonte de Synthèse
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-body">
                  Exploration desktop isolée. Les variantes partagent les mêmes agrégats serveur, mais optimisent des décisions distinctes pour arbitrer la future refonte de <span className="font-semibold text-heading">/prospection</span>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">Base réelle · {data.metrics.totalAccounts} comptes</Badge>
                <Badge variant="info">{data.metrics.realNativeWindowCount} fenêtres sectorielles réelles</Badge>
                <Badge variant={demoEnabled ? "danger" : "neutral"}>
                  {demoEnabled ? "Données de démonstration actives" : "Mode réel uniquement"}
                </Badge>
                <Badge variant="neutral">Généré le {formatDateTime(data.generatedAt)}</Badge>
              </div>
            </div>

            <div className="grid min-w-[19rem] gap-3 md:grid-cols-3">
              <KpiCard
                label="Portefeuille filtré"
                value={String(viewModel.summary.filteredAccounts)}
                context={`${viewModel.summary.totalAccounts} comptes en base`}
                size="compact"
              />
              <KpiCard
                label="Fenêtres actives"
                value={String(viewModel.summary.activeWindows)}
                context={demoEnabled ? "hors expirées · réel + démonstration" : "hors expirées · réel uniquement"}
                size="compact"
              />
              <KpiCard
                label="Comptes reliés secteur"
                value={String(viewModel.summary.linkedSectorAccounts)}
                context={`${data.metrics.accountsLinkedToSectorIntelligence} comptes liés au total`}
                size="compact"
              />
            </div>
          </div>

          <PageFilterBar
            activeCount={activeFilterCount}
            onReset={() => {
              startTransition(() => {
                setFilters(DEFAULT_FILTERS)
              })
            }}
            summary={`${viewModel.summary.filteredAccounts}/${data.metrics.totalAccounts} comptes · ${viewModel.summary.activeWindows} fenêtres non expirées · ${demoEnabled ? `${viewModel.demoSignals.length} signaux démo visibles` : "aucune démo active"}`}
            viewSelector={(
              <PageViewSelector
                items={CONCEPT_ITEMS.map((item) => ({ ...item }))}
                value={concept}
                onChange={(value) => {
                  startTransition(() => {
                    setConcept(value as DashboardLabConcept)
                  })
                }}
                ariaLabel="Sélection de concept"
              />
            )}
            secondaryActions={(
              <Button
                variant={demoEnabled ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  startTransition(() => {
                    setDemoEnabled((current) => !current)
                  })
                }}
              >
                {demoEnabled ? "Masquer la démonstration" : "Activer la démonstration"}
              </Button>
            )}
          >
            <PageFilterSelect
              id="lab-period"
              label="Période"
              value={filters.period}
              onChange={(value) => {
                startTransition(() => {
                  setFilters((current) => ({ ...current, period: value as DashboardLabFilters["period"] }))
                })
              }}
              options={[
                { value: "30d", label: "30 jours" },
                { value: "90d", label: "90 jours" },
                { value: "180d", label: "180 jours" },
              ]}
              defaultValue={DEFAULT_FILTERS.period}
            />
            <PageFilterSelect
              id="lab-sector"
              label="Secteur"
              value={filters.sector}
              onChange={(value) => {
                startTransition(() => {
                  setFilters((current) => ({ ...current, sector: value }))
                })
              }}
              options={[
                { value: "all", label: "Tous secteurs" },
                ...data.filterOptions.sectors.map((sector) => ({ value: sector, label: sector })),
              ]}
            />
            <PageFilterSelect
              id="lab-lifecycle"
              label="Lifecycle"
              value={filters.lifecycle}
              onChange={(value) => {
                startTransition(() => {
                  setFilters((current) => ({ ...current, lifecycle: value }))
                })
              }}
              options={[
                { value: "all", label: "Tous cycles" },
                ...data.filterOptions.lifecycles.map((lifecycle) => ({
                  value: lifecycle,
                  label: lifecycle.replaceAll("_", " "),
                })),
              ]}
            />
            <PageFilterSelect
              id="lab-priority"
              label="Priorité"
              value={filters.priority}
              onChange={(value) => {
                startTransition(() => {
                  setFilters((current) => ({ ...current, priority: value }))
                })
              }}
              options={[
                { value: "all", label: "Toutes priorités" },
                ...data.filterOptions.priorities.map((priority) => ({
                  value: priority,
                  label: priority,
                })),
              ]}
            />
          </PageFilterBar>
        </div>
      </header>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-[var(--radius-large)] border border-border bg-surface px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Variante active
                </p>
                <h2 className="font-heading text-2xl font-bold text-heading">{conceptCopy.title}</h2>
              </div>
              <div className="max-w-2xl space-y-1 text-sm leading-6 text-body">
                <p className="font-semibold text-heading">{conceptCopy.decision}</p>
                <p>{conceptCopy.rationale}</p>
              </div>
            </div>
          </section>

          {deferredConcept === "command-center" ? (
            <CommandCenterLab
              viewModel={viewModel}
              onSelectAccount={(accountId) => {
                startTransition(() => {
                  setSelectedAccountId(accountId)
                })
              }}
              onInspect={setInspection}
            />
          ) : null}

          {deferredConcept === "account-intelligence" ? (
            <AccountIntelligenceLab
              viewModel={viewModel}
              onSelectAccount={(accountId) => {
                startTransition(() => {
                  setSelectedAccountId(accountId)
                })
              }}
              onInspect={setInspection}
            />
          ) : null}

          {deferredConcept === "sector-signal" ? (
            <SectorSignalLab
              viewModel={viewModel}
              onSelectAccount={(accountId) => {
                startTransition(() => {
                  setSelectedAccountId(accountId)
                  setConcept("account-intelligence")
                })
              }}
              onInspect={setInspection}
            />
          ) : null}
        </div>

        <aside className="space-y-6 2xl:sticky 2xl:top-6 2xl:self-start">
          <section className="rounded-[var(--radius-large)] border border-border bg-surface px-5 py-4">
            <ComparisonPanel activeConcept={deferredConcept} />
          </section>
          <section className="rounded-[var(--radius-large)] border border-border bg-surface px-5 py-4">
            <ConfidencePanel inspection={inspection} />
          </section>
        </aside>
      </div>
    </div>
  )
}

function buildDashboardLabViewModel({
  data,
  filters,
  selectedAccountId,
  demoEnabled,
}: {
  data: DashboardLabData
  filters: DashboardLabFilters
  selectedAccountId: string | null
  demoEnabled: boolean
}): DashboardLabViewModel {
  const accounts = data.accounts.filter((account) => matchesAccountFilters(account, filters))
  const filteredAccountIds = new Set(accounts.map((account) => account.id))
  const hasScopedFilters =
    filters.sector !== "all"
    || filters.lifecycle !== "all"
    || filters.priority !== "all"

  const realWindows = data.sectorWindows.filter((window) => {
    if (!hasScopedFilters) {
      return true
    }
    return window.exposedCompanyIds.some((companyId) => filteredAccountIds.has(companyId))
  })

  const demoWindows = demoEnabled
    ? FUTURE_DEMO_WINDOW_FIXTURES.filter((window) => {
        if (!hasScopedFilters) {
          return true
        }
        return window.exposedCompanyIds.some((companyId) => filteredAccountIds.has(companyId))
      })
    : []

  const windows = [...realWindows, ...demoWindows].sort(compareWindows)
  const sectors = data.sectors.filter((sector) => {
    if (!hasScopedFilters) {
      return true
    }

    const hasLinkedAccount = accounts.some((account) => account.sectorId === sector.id)
    const hasVisibleWindow = windows.some((window) => {
      if (isDemoWindow(window)) {
        return window.sectorSlug === sector.slug
      }
      return window.sectorId === sector.id
    })

    return hasLinkedAccount || hasVisibleWindow
  })

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null
  const demoSignals = demoEnabled
    ? FUTURE_DEMO_SIGNAL_FIXTURES.filter((signal) => filteredAccountIds.has(signal.companyId))
    : []

  return {
    generatedAt: data.generatedAt,
    filters,
    accounts,
    selectedAccount,
    selectedAccountId: selectedAccount?.id ?? null,
    trust: data.trust,
    sectors,
    windows,
    demoSignals,
    demoEnabled,
    summary: {
      totalAccounts: data.metrics.totalAccounts,
      filteredAccounts: accounts.length,
      scoredAccounts: accounts.filter((account) => account.legacyFolioScore !== null).length,
      linkedSectorAccounts: accounts.filter((account) => account.sectorId !== null).length,
      activeWindows: windows.filter((window) => isDemoWindow(window) || window.isCountedAsActive).length,
    },
  }
}

function matchesAccountFilters(account: DashboardLabAccount, filters: DashboardLabFilters) {
  if (filters.sector !== "all" && account.sector !== filters.sector) {
    return false
  }
  if (filters.lifecycle !== "all" && account.lifecycle !== filters.lifecycle) {
    return false
  }
  if (filters.priority !== "all" && account.priority !== filters.priority) {
    return false
  }
  return true
}

function isDemoWindow(window: DashboardLabWindowView): window is FutureDemoWindowFixture {
  return !("meta" in window)
}

function compareWindows(left: DashboardLabWindowView, right: DashboardLabWindowView) {
  const urgencyDelta = getWindowUrgencyScore(right) - getWindowUrgencyScore(left)
  if (urgencyDelta !== 0) {
    return urgencyDelta
  }
  return new Date(getWindowDate(right) ?? 0).getTime() - new Date(getWindowDate(left) ?? 0).getTime()
}

function getWindowUrgencyScore(window: DashboardLabWindowView) {
  if (isDemoWindow(window)) {
    return window.urgency === "high" ? 88 : 66
  }
  return window.urgencyScore
}

function getWindowDate(window: DashboardLabWindowView) {
  return isDemoWindow(window) ? window.detectedAt : window.eventAt
}
