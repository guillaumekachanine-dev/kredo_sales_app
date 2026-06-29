"use client"

import { startTransition, useDeferredValue, useMemo, useState } from "react"
import { EmptyState } from "@/components/dashboard/widgets/EmptyState"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { KpiCard } from "@/components/ui/KpiCard"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { useUrlFilters } from "@/lib/search/use-url-filters"
import type {
  SectorActivationData,
  SectorActivationReadyData,
  SectorActivationSector,
  SectorActivationWindow,
} from "@/lib/prospection/sector-activation-types"
import { formatDateTime } from "@/lib/formatters"
import { CommercialWindowsSection } from "./CommercialWindowsSection"
import { SectorActivationGrid } from "./SectorActivationGrid"
import { SectorStudiesCollapsible } from "./SectorStudiesCollapsible"
import { SelectedCommercialWindowPanel } from "./SelectedCommercialWindowPanel"
import {
  getSectorCoverageContext,
  getWindowSortComparator,
  HORIZON_OPTIONS,
  type CommercialWindowSortKey,
  type SectorActivationHorizonFilter,
} from "./sector-activation-ui"

type ViewFilters = {
  sector: string
  practice: string
  sourceType: string
  urgency: string
  horizon: SectorActivationHorizonFilter
  temporalStatus: string
  sort: CommercialWindowSortKey
}

const DEFAULT_FILTERS: ViewFilters = {
  sector: "all",
  practice: "all",
  sourceType: "all",
  urgency: "all",
  horizon: "open",
  temporalStatus: "all",
  sort: "priority",
}

export function SectorActivationDesktopView({
  data,
}: {
  data: SectorActivationData
}) {
  if (data.state === "error") {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <ErrorState title={data.title} message={data.message} />
      </div>
    )
  }

  return <ReadySectorActivationDesktopView data={data} />
}

function ReadySectorActivationDesktopView({
  data,
}: {
  data: SectorActivationReadyData
}) {
  const { searchParams, setParam, clearAll } = useUrlFilters()
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(data.windows[0]?.id ?? null)

  const filters = {
    sector: parseOption(searchParams.get("sector"), data.filterOptions.sectors.map((option) => option.value)),
    practice: parseOption(searchParams.get("practice"), data.filterOptions.practices.map((option) => option.value)),
    sourceType: parseOption(searchParams.get("source"), data.filterOptions.sourceTypes.map((option) => option.value)),
    urgency: parseOption(searchParams.get("urgency"), data.filterOptions.priorityBands.map((option) => option.value)),
    horizon: parseHorizon(searchParams.get("horizon")),
    temporalStatus: parseOption(searchParams.get("status"), data.filterOptions.temporalStatuses.map((option) => option.value)),
    sort: parseSort(searchParams.get("sort")),
  } satisfies ViewFilters

  const deferredFilters = useDeferredValue(filters)

  const visibleWindows = useMemo(() => {
    const filtered = data.windows.filter((window) => {
      if (deferredFilters.sector !== "all" && window.sectorSlug !== deferredFilters.sector) return false
      if (deferredFilters.practice !== "all" && window.practiceKey !== deferredFilters.practice) return false
      if (deferredFilters.sourceType !== "all" && window.sourceType !== deferredFilters.sourceType) return false
      if (deferredFilters.urgency !== "all" && window.priorityBand !== deferredFilters.urgency) return false
      if (deferredFilters.horizon === "open" && !window.isOpenNow) return false
      if (deferredFilters.horizon === "pipeline" && window.temporalStatus === "expired") return false
      if (deferredFilters.temporalStatus !== "all" && window.temporalStatus !== deferredFilters.temporalStatus) return false
      return true
    })

    return filtered.toSorted(getWindowSortComparator(deferredFilters.sort))
  }, [data.windows, deferredFilters])

  const deferredSelectedWindowId = useDeferredValue(selectedWindowId)
  const resolvedSelectedWindowId = visibleWindows.some((window) => window.id === deferredSelectedWindowId)
    ? deferredSelectedWindowId
    : visibleWindows[0]?.id ?? null
  const selectedWindow = visibleWindows.find((window) => window.id === resolvedSelectedWindowId) ?? null

  const visibleSectors = useMemo(() => {
    return data.sectors
      .filter((sector) => deferredFilters.sector === "all" || sector.slug === deferredFilters.sector)
      .map((sector) => buildVisibleSector(sector, visibleWindows))
  }, [data.sectors, deferredFilters.sector, visibleWindows])

  const openVisibleWindows = visibleWindows.filter((window) => window.isOpenNow)
  const exposedAccountIds = new Set(openVisibleWindows.flatMap((window) => window.exposedAccountIds))
  const filteredSectorIds = new Set(visibleWindows.map((window) => window.sectorId))
  const filteredSectorCount = visibleSectors.filter((sector) => filteredSectorIds.has(sector.id)).length
  const linkedSectorAccounts = data.sectors.reduce((sum, sector) => sum + sector.linkedAccountCount, 0)
  const totalAccounts = data.accounts.length
  const hasQualifiedNews = data.windows.some((window) => window.sourceType === "news")

  const kpis = {
    openWindowCount: openVisibleWindows.length,
    closeWindowCount: visibleWindows.filter((window) => window.temporalStatus === "close").length,
    exposedAccountCount: exposedAccountIds.size,
    linkedSectorAccounts,
    totalAccounts,
  }

  const activeFilterCount = [
    filters.sector !== DEFAULT_FILTERS.sector,
    filters.practice !== DEFAULT_FILTERS.practice,
    filters.sourceType !== DEFAULT_FILTERS.sourceType,
    filters.urgency !== DEFAULT_FILTERS.urgency,
    filters.horizon !== DEFAULT_FILTERS.horizon,
    filters.temporalStatus !== DEFAULT_FILTERS.temporalStatus,
    filters.sort !== DEFAULT_FILTERS.sort,
  ].filter(Boolean).length

  const toolbar = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
        <span>
          Dernière donnée sectorielle reçue: {formatDateTime(data.lastUpdatedAt ?? data.generatedAt)}
          {getRelativeAgeLabel(data.lastUpdatedAt ?? data.generatedAt) ? ` · ${getRelativeAgeLabel(data.lastUpdatedAt ?? data.generatedAt)}` : ""}
        </span>
        <span>
          Périmètre filtré: {visibleWindows.length} fenêtre{visibleWindows.length > 1 ? "s" : ""} · {filteredSectorCount} secteur{filteredSectorCount > 1 ? "s" : ""}
        </span>
        {!hasQualifiedNews ? (
          <span>Aucune actualité ne respecte actuellement les critères de pertinence et d’actionnabilité.</span>
        ) : null}
      </div>

      <PageFilterBar
        activeCount={activeFilterCount}
        onReset={() => clearAll()}
        controlsClassName="w-full"
        summary={`${visibleWindows.length} fenêtres visibles · ${kpis.openWindowCount} ouvertes maintenant`}
      >
        <PageFilterSelect
          id="sector-filter"
          label="Secteur"
          value={filters.sector}
          className="min-[1280px]:min-w-[11rem]"
          options={[
            { value: "all", label: "Tous les secteurs" },
            ...data.filterOptions.sectors,
          ]}
          onChange={(value) => setParam("sector", value === "all" ? null : value)}
        />
        <PageFilterSelect
          id="practice-filter"
          label="Practice"
          value={filters.practice}
          className="min-[1280px]:min-w-[10rem]"
          options={[
            { value: "all", label: "Toutes les practices" },
            ...data.filterOptions.practices,
          ]}
          onChange={(value) => setParam("practice", value === "all" ? null : value)}
        />
        <PageFilterSelect
          id="source-filter"
          label="Type de signal"
          value={filters.sourceType}
          className="min-[1280px]:min-w-[10rem]"
          options={[
            { value: "all", label: "Tous les signaux" },
            ...data.filterOptions.sourceTypes,
          ]}
          onChange={(value) => setParam("source", value === "all" ? null : value)}
        />
        <PageFilterSelect
          id="urgency-filter"
          label="Urgence"
          value={filters.urgency}
          className="min-[1280px]:min-w-[9rem]"
          options={[
            { value: "all", label: "Toutes les urgences" },
            ...data.filterOptions.priorityBands,
          ]}
          onChange={(value) => setParam("urgency", value === "all" ? null : value)}
        />
        <PageFilterSelect
          id="horizon-filter"
          label="Horizon"
          value={filters.horizon}
          className="min-[1280px]:min-w-[10rem]"
          defaultValue={DEFAULT_FILTERS.horizon}
          options={HORIZON_OPTIONS}
          onChange={(value) => setParam("horizon", value === DEFAULT_FILTERS.horizon ? null : value)}
        />
        <PageFilterSelect
          id="status-filter"
          label="Statut"
          value={filters.temporalStatus}
          className="min-[1280px]:min-w-[9rem]"
          options={[
            { value: "all", label: "Tous les statuts" },
            ...data.filterOptions.temporalStatuses,
          ]}
          onChange={(value) => setParam("status", value === "all" ? null : value)}
        />
      </PageFilterBar>
    </div>
  )

  return (
    <DesktopAnalyticalPage
      eyebrow="CRM & Prospection"
      title="Approche sectorielle"
      actions={(
        <div className="flex items-center gap-2">
          <HeaderCalendar />
          <HeaderAlerts />
        </div>
      )}
      toolbar={(
        <div className="space-y-3">
          <p className="max-w-4xl text-sm leading-6 text-body">
            Détectez les fenêtres de marché, reliez-les aux comptes exposés et activez les playbooks commerciaux pertinents.
          </p>
          {toolbar}
        </div>
      )}
      kpis={(
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiButton
            label="Fenêtres ouvertes"
            value={kpis.openWindowCount}
            context="Active + proches"
            isActive={filters.horizon === "open" && filters.temporalStatus === "all"}
            onClick={() => {
              setParam("horizon", null)
              setParam("status", null)
            }}
          />
          <KpiButton
            label="Échéances proches"
            value={kpis.closeWindowCount}
            context="Statut close"
            isActive={filters.temporalStatus === "close"}
            onClick={() => setParam("status", filters.temporalStatus === "close" ? null : "close")}
          />
          <KpiCard
            label="Comptes exposés"
            value={kpis.exposedAccountCount}
            context="Distincts sur fenêtres ouvertes"
            size="compact"
            compactLayout
            className="min-h-[7.5rem]"
          />
          <KpiCard
            label="Couverture sectorielle"
            value={getSectorCoverageContext(kpis)}
            context="Comptes reliés à un secteur d’intelligence"
            size="compact"
            compactLayout
            className="min-h-[7.5rem]"
          />
        </div>
      )}
      maxWidth="full"
      className="pb-8"
    >
      <div className="space-y-6">
        {visibleWindows.length === 0 ? (
          <SurfaceCard className="p-5">
            <EmptyState
              title="Aucune fenêtre commerciale"
              description="Aucun signal ne correspond aux filtres actifs. Réinitialisez les filtres ou élargissez l’horizon pour rouvrir le cockpit."
              className="min-h-[20rem]"
            />
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => clearAll()}>
                Réinitialiser les filtres
              </Button>
            </div>
          </SurfaceCard>
        ) : (
          <section className="grid gap-6 min-[1600px]:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.95fr)]">
            <CommercialWindowsSection
              windows={visibleWindows}
              selectedWindowId={resolvedSelectedWindowId}
              onSelectWindow={(windowId) => {
                startTransition(() => {
                  setSelectedWindowId(windowId)
                })
              }}
              sort={filters.sort}
              onSortChange={(value) => setParam("sort", value === DEFAULT_FILTERS.sort ? null : value)}
            />
            <div className="min-w-0 min-[1600px]:sticky min-[1600px]:top-6 min-[1600px]:self-start">
              <SelectedCommercialWindowPanel
                window={selectedWindow}
                accounts={data.accounts}
              />
            </div>
          </section>
        )}

        <SectorActivationGrid sectors={visibleSectors} />

        <SectorStudiesCollapsible
          available={data.studies.available}
          preparing={data.studies.preparing}
          lastUpdatedAt={data.lastUpdatedAt}
        />
      </div>
    </DesktopAnalyticalPage>
  )
}

function KpiButton({
  label,
  value,
  context,
  isActive,
  onClick,
}: {
  label: string
  value: number
  context: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className="h-full text-left" onClick={onClick}>
      <KpiCard
        label={label}
        value={value}
        context={context}
        size="compact"
        compactLayout
        accent={isActive ? "brass" : "none"}
        className="min-h-[7.5rem]"
      />
    </button>
  )
}

function parseOption(value: string | null, allowedValues: string[]) {
  if (!value || value === "all") return "all"
  return allowedValues.includes(value) ? value : "all"
}

function parseHorizon(value: string | null): SectorActivationHorizonFilter {
  if (value === "pipeline" || value === "all") return value
  return "open"
}

function parseSort(value: string | null): CommercialWindowSortKey {
  if (value === "deadline" || value === "exposure" || value === "sector") return value
  return "priority"
}

function getRelativeAgeLabel(dateValue: string | null) {
  if (!dateValue) return null

  const timestamp = Date.parse(dateValue)
  if (!Number.isFinite(timestamp)) return null

  const diffDays = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "date future"
  if (diffDays === 0) return "aujourd’hui"
  if (diffDays === 1) return "il y a 1 jour"
  if (diffDays < 7) return `il y a ${diffDays} jours`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`
  if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30)} mois`

  const years = Math.floor(diffDays / 365)
  return `il y a ${years} an${years > 1 ? "s" : ""}`
}

function getActivationStateForVisibleSector(params: {
  openWindowCount: number
  linkedAccountCount: number
  averageReachScore: number | null
  futureWindowCount: number
  undatedWindowCount: number
  expiredWindowCount: number
}) {
  if (
    params.openWindowCount > 0
    && (params.linkedAccountCount === 0 || params.averageReachScore === null || params.averageReachScore < 45)
  ) {
    return "to_cover" as const
  }
  if (params.openWindowCount > 0) {
    return "to_activate" as const
  }
  if (params.futureWindowCount > 0 || params.undatedWindowCount > 0 || params.expiredWindowCount > 0) {
    return "to_monitor" as const
  }
  return "data_insufficient" as const
}

function buildVisibleSector(
  sector: SectorActivationSector,
  windows: SectorActivationWindow[],
): SectorActivationSector {
  const sectorWindows = windows.filter((window) => window.sectorId === sector.id)
  const openWindowCount = sectorWindows.filter((window) => window.isOpenNow).length
  const futureWindowCount = sectorWindows.filter((window) => window.temporalStatus === "future").length
  const undatedWindowCount = sectorWindows.filter((window) => window.temporalStatus === "undated").length
  const expiredWindowCount = sectorWindows.filter((window) => window.temporalStatus === "expired").length

  return {
    ...sector,
    openWindowCount,
    futureWindowCount,
    undatedWindowCount,
    expiredWindowCount,
    activationState: getActivationStateForVisibleSector({
      openWindowCount,
      linkedAccountCount: sector.linkedAccountCount,
      averageReachScore: sector.averageReachScore,
      futureWindowCount,
      undatedWindowCount,
      expiredWindowCount,
    }),
  }
}
