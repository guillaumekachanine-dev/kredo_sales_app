"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { IconChevronRight, IconClose, IconSearch } from "./icons"
import {
  ARCHIVE_PERIOD_OPTIONS,
  ARCHIVE_TYPE_OPTIONS,
  filterArchiveEntries,
  groupArchiveEntriesByMonth,
  type ArchiveEntryKind,
  type ArchiveEntryVM,
  type ArchivePeriodFilter,
} from "./veille-mobile-view-models"

type VeilleArchivesTabProps = {
  entries: ArchiveEntryVM[]
  onOpenEntry: (entry: ArchiveEntryVM) => void
}

export function VeilleArchivesTab({ entries, onOpenEntry }: VeilleArchivesTabProps) {
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState<ArchiveEntryKind | "all">("all")
  const [period, setPeriod] = useState<ArchivePeriodFilter>("all")

  const groups = useMemo(
    () => groupArchiveEntriesByMonth(filterArchiveEntries(entries, { search, kind, period })),
    [entries, search, kind, period],
  )

  const hasActiveFilters = search.trim().length > 0 || kind !== "all" || period !== "all"

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="shrink-0 space-y-3 border-b border-border px-4 py-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <IconSearch className="size-5" />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher dans les archives…"
            aria-label="Rechercher dans les archives"
            className="h-12 w-full rounded-[var(--radius-small)] border border-border bg-surface pl-11 pr-11 text-[15px] text-heading outline-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
              className="absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center text-muted outline-none hover:text-heading focus-visible:ring-2 focus-visible:ring-heading"
            >
              <IconClose className="size-5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as ArchiveEntryKind | "all")}
            aria-label="Filtrer par type"
            className={cn(
              "h-12 min-w-0 flex-1 rounded-[var(--radius-small)] border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              kind === "all" ? "border-border text-heading" : "border-primary text-primary font-semibold",
            )}
          >
            {ARCHIVE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "all" ? "Type" : option.label}
              </option>
            ))}
          </select>

          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as ArchivePeriodFilter)}
            aria-label="Filtrer par période"
            className={cn(
              "h-12 min-w-0 flex-1 rounded-[var(--radius-small)] border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              period === "all" ? "border-border text-heading" : "border-primary text-primary font-semibold",
            )}
          >
            {ARCHIVE_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "all" ? "Période" : option.label}
              </option>
            ))}
          </select>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setKind("all")
                setPeriod("all")
              }}
              className="min-h-12 shrink-0 px-2 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-heading"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
      </div>

      <div className="veille-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
        {groups.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted">
            {entries.length === 0
              ? "Aucune archive de veille pour le moment."
              : "Aucune entrée ne correspond à ces filtres."}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.monthKey} className="pt-6">
              <h2 className="text-sm font-bold tracking-[0.04em] text-heading">{group.monthLabel}</h2>

              <ol className="mt-3 border-l border-heading/70 pl-4">
                {group.entries.map((entry) => (
                  <li key={`${entry.kind}-${entry.id}`} className="relative border-b border-border last:border-b-0">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -left-[22px] top-5 size-3 rounded-full border-2 border-surface",
                        entry.kind === "analysis" && entry.isManualCustom ? "bg-[#2554B8]" : "bg-brand-brass",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => onOpenEntry(entry)}
                      className="flex w-full items-start gap-3 py-4 pr-1 text-left outline-none hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-body">{entry.dateLabel}</span>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              entry.kind === "analysis" && entry.isManualCustom
                                ? "text-[#2554B8]"
                                : entry.kind === "analysis"
                                  ? "text-brand-brass"
                                  : "text-primary",
                            )}
                          >
                            {entry.kindLabel}
                          </span>
                          {entry.topicBadgeLabel ? (
                            <span className="inline-flex items-center rounded border border-border bg-surface-hover px-1.5 py-0.5 text-[10px] font-bold text-heading">
                              {entry.topicBadgeLabel}
                            </span>
                          ) : null}
                        </div>
                        <span className="mt-2 block text-[15px] font-bold leading-6 text-heading">
                          {entry.title}
                        </span>
                        {entry.metaLabel ? (
                          <span className="mt-1 block text-xs text-muted">{entry.metaLabel}</span>
                        ) : null}
                        <span className="mt-0.5 block text-xs text-muted">{entry.statusLabel}</span>
                      </span>
                      <span className="mt-1 shrink-0 text-heading">
                        <IconChevronRight className="size-5" />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
