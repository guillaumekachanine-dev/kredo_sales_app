"use client"

import { startTransition, useDeferredValue, useState } from "react"
import { ErrorState } from "@/components/ui/ErrorState"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { AccountsToActivateTable } from "./AccountsToActivateTable"
import { PotentialReachMatrix } from "./PotentialReachMatrix"
import { ProspectionPortfolioKpis } from "./ProspectionPortfolioKpis"
import { SelectedAccountPanel } from "./SelectedAccountPanel"
import { SyntheseDesktopDesignLab } from "./SyntheseDesktopDesignLab"
import { WeeklyCommercialFocus } from "./WeeklyCommercialFocus"
import {
  buildProspectionSummaryViewModel,
  type ProspectionSummaryFilters,
  type ProspectionSummaryFocusPreset,
} from "./synthese-view-model"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { EmptyState } from "@/components/dashboard/widgets/EmptyState"
import { useUrlFilters } from "@/lib/search/use-url-filters"
import type { ProspectionSummaryData } from "./prospection-summary-data"
import type { SyntheseDesignVariant } from "./design-variants"

const DEFAULT_FILTERS: ProspectionSummaryFilters = {
  period: "90d",
  sector: "all",
  lifecycle: "all",
  priority: "all",
  focus: "all",
}

export function SyntheseDesktopView({
  data,
  design = null,
}: {
  data: ProspectionSummaryData
  design?: SyntheseDesignVariant | null
}) {
  if (data.state === "error") {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <ErrorState title={data.title} message={data.message} />
      </div>
    )
  }

  return <ReadySyntheseDesktopView data={data} design={design} />
}

function ReadySyntheseDesktopView({
  data,
  design,
}: {
  data: Extract<ProspectionSummaryData, { state: "ready" }>
  design?: SyntheseDesignVariant | null
}) {
  const { searchParams, setParam, clearAll } = useUrlFilters()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(data.accounts[0]?.id ?? null)

  const filters = {
    period: parsePeriod(searchParams.get("period")),
    sector: parseOption(searchParams.get("sector"), data.filterOptions.sectors),
    lifecycle: parseOption(searchParams.get("lifecycle"), data.filterOptions.lifecycles),
    priority: parseOption(searchParams.get("priority"), data.filterOptions.priorities),
    focus: parseFocus(searchParams.get("focus")),
  } satisfies ProspectionSummaryFilters

  const deferredFilters = useDeferredValue(filters)
  const deferredSelectedAccountId = useDeferredValue(selectedAccountId)
  const resolvedSelectedAccountId = data.accounts.some((account) => account.id === deferredSelectedAccountId)
    ? deferredSelectedAccountId
    : data.accounts[0]?.id ?? null
  const viewModel = buildProspectionSummaryViewModel({
    accounts: data.accounts,
    filters: deferredFilters,
    selectedAccountId: resolvedSelectedAccountId,
    trust: data.trust,
  })

  const activeFilterCount = [
    filters.period !== DEFAULT_FILTERS.period,
    filters.sector !== DEFAULT_FILTERS.sector,
    filters.lifecycle !== DEFAULT_FILTERS.lifecycle,
    filters.priority !== DEFAULT_FILTERS.priority,
    filters.focus !== DEFAULT_FILTERS.focus,
  ].filter(Boolean).length

  const toolbar = (
    <PageFilterBar
      activeCount={activeFilterCount}
      onReset={() => clearAll(["design"])}
      summary={viewModel.focusLabel ? `${viewModel.visibleAccounts.length} comptes · filtre actif : ${viewModel.focusLabel}` : `${viewModel.baseAccounts.length} comptes visibles`}
    >
      <PageFilterSelect
        id="prospection-period"
        label="Période"
        value={filters.period}
        defaultValue={DEFAULT_FILTERS.period}
        options={[
          { value: "30d", label: "30 jours" },
          { value: "90d", label: "90 jours" },
          { value: "180d", label: "180 jours" },
        ]}
        onChange={(value) => setParam("period", value)}
      />
      <PageFilterSelect
        id="prospection-sector"
        label="Secteur"
        value={filters.sector}
        options={[
          { value: "all", label: "Tous secteurs" },
          ...data.filterOptions.sectors.map((sector) => ({ value: sector, label: sector })),
        ]}
        onChange={(value) => setParam("sector", value === "all" ? null : value)}
      />
      <PageFilterSelect
        id="prospection-lifecycle"
        label="Lifecycle"
        value={filters.lifecycle}
        options={[
          { value: "all", label: "Tous cycles" },
          ...data.filterOptions.lifecycles.map((lifecycle) => ({
            value: lifecycle,
            label: lifecycle.replaceAll("_", " "),
          })),
        ]}
        onChange={(value) => setParam("lifecycle", value === "all" ? null : value)}
      />
      <PageFilterSelect
        id="prospection-priority"
        label="Priorité"
        value={filters.priority}
        options={[
          { value: "all", label: "Toutes priorités" },
          ...data.filterOptions.priorities.map((priority) => ({ value: priority, label: priority })),
        ]}
        onChange={(value) => setParam("priority", value === "all" ? null : value)}
      />
    </PageFilterBar>
  )

  if (!design) {
    return (
      <DesktopAnalyticalPage
        eyebrow="CRM & Prospection"
        title="Synthèse"
        actions={(
          <div className="flex items-center gap-2">
            <HeaderCalendar />
          </div>
        )}
        toolbar={(
          <div className="space-y-3">
            <p className="text-sm leading-6 text-body">
              Priorisez les comptes à engager et identifiez les déficits de couverture commerciale.
            </p>
            {toolbar}
          </div>
        )}
        kpis={(
          <ProspectionPortfolioKpis
            kpis={viewModel.kpis}
            onToggleFocus={(focus) => setParam("focus", focus === "all" ? null : focus)}
          />
        )}
        maxWidth="full"
        className="pb-8"
      >
        {viewModel.baseAccounts.length === 0 ? (
          <EmptyState
            title="Aucun compte dans le portefeuille"
            description="La synthèse réapparaîtra dès que des comptes et des activités seront disponibles dans les sources autorisées."
            className="min-h-[18rem]"
          />
        ) : (
          <div className="space-y-3">
            {/* Section header for WeeklyFocus — sits above the 2-col grid so the right rail
                aligns with the top border of the first account card, not the section title */}
            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-heading">Focus commercial de la semaine</h2>
              <p className="text-sm leading-6 text-body">
                Shortlist resserrée des comptes qui demandent un arbitrage commercial immédiat.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="min-w-0 space-y-6">
                <WeeklyCommercialFocus
                  showHeader={false}
                  focusAccounts={viewModel.weeklyFocus.slice(0, 5)}
                  selectedAccountId={viewModel.selectedAccount?.id ?? null}
                  onSelectAccount={(accountId) => {
                    startTransition(() => {
                      setSelectedAccountId(accountId)
                    })
                  }}
                  trust={viewModel.trust}
                />

                <PotentialReachMatrix
                  accounts={viewModel.visibleAccounts}
                  period={deferredFilters.period}
                  selectedAccountId={viewModel.selectedAccount?.id ?? null}
                  onSelectAccount={(accountId) => {
                    startTransition(() => {
                      setSelectedAccountId(accountId)
                    })
                  }}
                  summarySentence={viewModel.summarySentence}
                />
              </div>

              <div className="min-w-0">
                <div className="sticky top-4">
                  <SelectedAccountPanel
                    account={viewModel.selectedAccount}
                    period={deferredFilters.period}
                    trust={viewModel.trust}
                  />
                </div>
              </div>
            </div>

            <AccountsToActivateTable
              accounts={viewModel.visibleAccounts}
              period={deferredFilters.period}
              selectedAccountId={viewModel.selectedAccount?.id ?? null}
              onSelectAccount={(accountId) => {
                startTransition(() => {
                  setSelectedAccountId(accountId)
                })
              }}
            />
          </div>
        )}
      </DesktopAnalyticalPage>
    )
  }

  return (
    <SyntheseDesktopDesignLab
      design={design}
      filterBar={toolbar}
      viewModel={viewModel}
      period={deferredFilters.period}
      onSelectAccount={(accountId) => {
        startTransition(() => {
          setSelectedAccountId(accountId)
        })
      }}
      onToggleFocus={(focus) => setParam("focus", focus === "all" ? null : focus)}
    />
  )
}

function parsePeriod(value: string | null): ProspectionSummaryFilters["period"] {
  if (value === "30d" || value === "90d" || value === "180d") {
    return value
  }
  return DEFAULT_FILTERS.period
}

function parseOption(value: string | null, options: string[]) {
  if (!value || value === "all") {
    return "all"
  }
  return options.includes(value) ? value : "all"
}

function parseFocus(value: string | null): ProspectionSummaryFocusPreset {
  if (
    value === "undercovered-high-potential"
    || value === "priority-inactive"
    || value === "activity-no-conversion"
    || value === "planned-engagements"
  ) {
    return value
  }
  return "all"
}
