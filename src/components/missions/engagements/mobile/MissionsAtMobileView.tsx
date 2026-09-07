"use client"

import { useMemo, useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { IconChevron, IconSearch } from "@/components/cockpit/mobile/icons"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { formatEuro, formatPct, formatDateNumeric } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { EngagementMissionListItem } from "@/app/(app)/missions/_data/get-current-engagement-missions"

interface MissionsAtMobileViewProps {
  missions: EngagementMissionListItem[]
}

type DeadlineBucket = "all" | "soon" | "mid" | "later"

const DEADLINE_OPTIONS: ReadonlyArray<readonly [DeadlineBucket, string]> = [
  ["all", "Toutes"],
  ["soon", "Échéance proche"],
  ["mid", "Échéance intermédiaire"],
  ["later", "Plus tard / sans échéance"],
]

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr).getTime()
  if (Number.isNaN(target)) return null
  return Math.round((target - Date.now()) / 86_400_000)
}

function deadlineBucketOf(dateStr: string | null): Exclude<DeadlineBucket, "all"> {
  const d = daysUntil(dateStr)
  if (d === null) return "later"
  if (d <= 60) return "soon"
  if (d <= 180) return "mid"
  return "later"
}

export function MissionsAtMobileView({ missions }: MissionsAtMobileViewProps) {
  const { openTab } = useMissionsTabStore()

  const [search, setSearch] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [clientFilter, setClientFilter] = useState("all")
  const [practiceFilter, setPracticeFilter] = useState("all")
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineBucket>("all")

  const clientOptions = useMemo(
    () => Array.from(new Set(missions.map((m) => m.clientName).filter(Boolean))).sort(),
    [missions],
  )
  const practiceOptions = useMemo(
    () =>
      Array.from(
        new Set(missions.map((m) => m.practice).filter((p): p is string => Boolean(p))),
      ).sort(),
    [missions],
  )

  const kpis = useMemo(() => {
    const withTjm = missions.filter((m) => m.tjm > 0)
    const avgTjm =
      withTjm.length > 0
        ? Math.round(withTjm.reduce((s, m) => s + m.tjm, 0) / withTjm.length)
        : 0
    const withMargin = missions.filter(
      (m) => m.grossMarginPct !== null && m.grossMarginPct !== undefined,
    )
    const avgMargin =
      withMargin.length > 0
        ? withMargin.reduce((s, m) => s + (m.grossMarginPct ?? 0), 0) / withMargin.length
        : 0
    return { count: missions.length, avgTjm, avgMargin }
  }, [missions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return missions.filter((m) => {
      if (q) {
        const haystack = `${m.title} ${m.clientName} ${m.collaboratorName ?? ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (clientFilter !== "all" && m.clientName !== clientFilter) return false
      if (practiceFilter !== "all" && m.practice !== practiceFilter) return false
      if (deadlineFilter !== "all" && deadlineBucketOf(m.endDate) !== deadlineFilter) return false
      return true
    })
  }, [missions, search, clientFilter, practiceFilter, deadlineFilter])

  const activeFilterCount =
    (clientFilter !== "all" ? 1 : 0) +
    (practiceFilter !== "all" ? 1 : 0) +
    (deadlineFilter !== "all" ? 1 : 0)

  const resetFilters = () => {
    setClientFilter("all")
    setPracticeFilter("all")
    setDeadlineFilter("all")
  }

  const openMission = (m: EngagementMissionListItem) => {
    openTab({
      entityType: "mission",
      entityId: m.id,
      title: m.title,
      subtitle: m.collaboratorName ?? m.roleTitle ?? m.clientName,
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
      {/* Header */}
      <div className="shrink-0 px-4 pb-3 pt-4">
        <h1 className="font-heading text-xl font-bold leading-7 text-heading">Missions en cours</h1>
      </div>

      {/* KPI — 3 valeurs sur une ligne, séparateurs verticaux fins */}
      <div className="grid shrink-0 grid-cols-3 divide-x divide-border border-y border-border bg-surface">
        {[
          { label: "Missions en cours", value: String(kpis.count) },
          { label: "TJM moyen", value: formatEuro(kpis.avgTjm) },
          { label: "Taux de marge moyen", value: formatPct(kpis.avgMargin) },
        ].map((kpi) => (
          <div key={kpi.label} className="flex flex-col items-center gap-0.5 px-2 py-2.5 text-center">
            <span className="font-heading text-lg font-black leading-none text-heading">{kpi.value}</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted">{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* Recherche + Filtres */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-border bg-canvas px-2.5">
          <IconSearch className="size-4 shrink-0 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mission, client, collaborateur…"
            aria-label="Rechercher une mission"
            className="min-h-9 w-full bg-transparent text-sm text-heading placeholder:text-muted focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            "flex min-h-9 shrink-0 items-center gap-1.5 rounded border px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
            activeFilterCount > 0
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-heading hover:bg-surface-hover",
          )}
        >
          Filtres
          {activeFilterCount > 0 ? (
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Liste plate */}
      <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <p className="flex min-h-40 items-center justify-center px-8 text-center text-sm text-muted">
            {missions.length === 0
              ? "Aucune mission d’assistance technique en cours."
              : "Aucune mission ne correspond à ces critères."}
          </p>
        ) : (
          <ul aria-label={`${filtered.length} missions`}>
            {filtered.map((m) => {
              const d = daysUntil(m.endDate)
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => openMission(m)}
                    className="grid min-h-[88px] w-full grid-cols-[3rem_minmax(0,1fr)_1.5rem] items-center gap-3 border-b border-border bg-surface px-4 py-3 text-left outline-none transition-colors hover:bg-surface-hover/60 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                    aria-label={`Ouvrir ${m.title}`}
                  >
                    <span className="flex size-12 items-center justify-center rounded border border-border bg-canvas">
                      <CompanyLogo
                        name={m.clientName}
                        logoPath={m.clientLogoPath}
                        website={m.clientWebsite}
                        size="md"
                        className="border-0"
                      />
                    </span>

                    <span className="min-w-0">
                      <span className="line-clamp-2 text-[15px] font-bold leading-5 text-heading">
                        {m.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 text-muted">
                        <span className="truncate">{m.collaboratorName ?? "Collaborateur non renseigné"}</span>
                        {d !== null ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className={cn(d <= 60 && "font-semibold text-[var(--color-status-warning-ink)]")}>
                              Fin {formatDateNumeric(m.endDate)}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </span>

                    <span className="text-heading" aria-hidden>
                      <IconChevron />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Modale filtres */}
      {isFilterOpen ? (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-heading/40 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={() => setIsFilterOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="missions-at-filter-title"
        >
          <div
            className="w-full max-w-sm rounded-t-lg border border-border bg-surface p-5 shadow-xl sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="missions-at-filter-title" className="text-base font-bold text-heading">
                Filtrer les missions
              </h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-heading"
                aria-label="Fermer les filtres"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="missions-at-client" className="mb-1.5 block text-xs font-semibold text-heading">
                  Client
                </label>
                <Select
                  id="missions-at-client"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  fullWidth
                  forceDropdown
                >
                  <option value="all">Tous les clients</option>
                  {clientOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="missions-at-practice" className="mb-1.5 block text-xs font-semibold text-heading">
                  Practice
                </label>
                <Select
                  id="missions-at-practice"
                  value={practiceFilter}
                  onChange={(e) => setPracticeFilter(e.target.value)}
                  fullWidth
                  forceDropdown
                >
                  <option value="all">Toutes les practices</option>
                  {practiceOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-heading">Échéances</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEADLINE_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDeadlineFilter(value)}
                      aria-pressed={deadlineFilter === value}
                      className={cn(
                        "min-h-9 rounded border px-2 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
                        deadlineFilter === value
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface text-heading hover:bg-surface-hover",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
              <Button type="button" variant="secondary" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
              <Button type="button" variant="brass" size="sm" onClick={() => setIsFilterOpen(false)}>
                Voir {filtered.length} mission{filtered.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
