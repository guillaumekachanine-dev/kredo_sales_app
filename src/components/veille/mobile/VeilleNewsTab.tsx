"use client"

import { useMemo, useRef, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDocument,
  IconFilter,
  IconSearch,
} from "./icons"
import {
  collectCategoryOptions,
  filterNewsRows,
  type DigestPeriodVM,
  type NewsRowVM,
} from "./veille-mobile-view-models"

type VeilleNewsTabProps = {
  /** Périodes navigables, de la plus récente à la plus ancienne. */
  periods: DigestPeriodVM[]
  activePeriodIndex: number
  onChangePeriod: (index: number) => void
  /** Articles du SEUL digest actif — la page reflète la semaine, pas l'historique. */
  rows: NewsRowVM[]
  onOpenArticle: (articleId: string) => void
}

export function VeilleNewsTab({
  periods,
  activePeriodIndex,
  onChangePeriod,
  rows,
  onOpenArticle,
}: VeilleNewsTabProps) {
  const [search, setSearch] = useState("")
  const [categoryKeys, setCategoryKeys] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [periodsOpen, setPeriodsOpen] = useState(false)

  const filtersTriggerRef = useRef<HTMLButtonElement | null>(null)
  const periodTriggerRef = useRef<HTMLButtonElement | null>(null)

  const categoryOptions = useMemo(() => collectCategoryOptions(rows), [rows])
  const visibleRows = useMemo(
    () => filterNewsRows(rows, { search, categoryKeys }),
    [rows, search, categoryKeys],
  )

  const activePeriod = periods[activePeriodIndex] ?? null
  // `periods` est trié du plus récent au plus ancien : l'index augmente vers le passé.
  const hasNewer = activePeriodIndex > 0
  const hasOlder = activePeriodIndex < periods.length - 1
  const activeFilterCount = (search.trim() ? 1 : 0) + categoryKeys.length

  const closeFilters = () => {
    setFiltersOpen(false)
    window.requestAnimationFrame(() => filtersTriggerRef.current?.focus())
  }

  const closePeriods = () => {
    setPeriodsOpen(false)
    window.requestAnimationFrame(() => periodTriggerRef.current?.focus())
  }

  const toggleCategory = (key: string) => {
    setCategoryKeys((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key],
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={() => onChangePeriod(activePeriodIndex + 1)}
          disabled={!hasOlder}
          aria-label="Digest de la semaine précédente"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-small)] text-heading outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading disabled:pointer-events-none disabled:opacity-30"
        >
          <IconChevronLeft className="size-5" />
        </button>

        <button
          ref={periodTriggerRef}
          type="button"
          onClick={() => setPeriodsOpen(true)}
          disabled={periods.length === 0}
          aria-haspopup="dialog"
          className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-[var(--radius-small)] px-1 outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading disabled:pointer-events-none"
        >
          <span className="max-w-full truncate text-[13px] font-bold leading-5 text-heading">
            {activePeriod ? activePeriod.weekLabel : "Aucun briefing"}
          </span>
          {activePeriod ? (
            <span className="max-w-full truncate text-xs leading-4 text-muted">
              {activePeriod.rangeLabel}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onChangePeriod(activePeriodIndex - 1)}
          disabled={!hasNewer}
          aria-label="Digest de la semaine suivante"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-small)] text-heading outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading disabled:pointer-events-none disabled:opacity-30"
        >
          <IconChevronRight className="size-5" />
        </button>

        <button
          ref={filtersTriggerRef}
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-label={
            activeFilterCount > 0 ? `Filtres (${activeFilterCount} actifs)` : "Filtres"
          }
          className={cn(
            "relative inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-small)] border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
            activeFilterCount > 0
              ? "border-primary bg-primary/[0.08] text-primary"
              : "border-border text-heading hover:bg-surface-hover/60",
          )}
        >
          <IconFilter className="size-5" />
          {activeFilterCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-fg"
            >
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className="veille-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {visibleRows.length === 0 ? (
          <p className="px-8 py-16 text-center text-sm leading-6 text-muted">
            {rows.length === 0
              ? "Ce briefing ne contient aucun article."
              : "Aucun article de ce briefing ne correspond aux filtres."}
          </p>
        ) : (
          <ul aria-label={`${visibleRows.length} articles du briefing`}>
            {visibleRows.map((row) => (
              <li key={row.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => onOpenArticle(row.id)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                >
                  <span className="mt-0.5 shrink-0 self-start text-muted">
                    <IconDocument className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-6 text-heading">{row.title}</span>
                    <span className="mt-1.5 block text-xs leading-5 text-muted">
                      {[row.sourceName, row.categoryLabel, row.dateLabel].filter(Boolean).join(" • ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-heading">
                    <IconChevronRight className="size-5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AppDrawer
        open={periodsOpen}
        onOpenChange={(next) => (next ? setPeriodsOpen(true) : closePeriods())}
        side="bottom"
        title="Briefings disponibles"
      >
        <ul className="divide-y divide-border border-y border-border">
          {periods.map((period, index) => {
            const selected = index === activePeriodIndex
            return (
              <li key={period.digestId}>
                <button
                  type="button"
                  onClick={() => {
                    onChangePeriod(index)
                    closePeriods()
                  }}
                  aria-pressed={selected}
                  className="flex min-h-16 w-full items-start gap-3 px-1 py-3 text-left outline-none hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[15px] font-bold leading-5",
                        selected ? "text-primary" : "text-heading",
                      )}
                    >
                      {period.weekLabel} · {period.rangeLabel}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {period.title}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-xs text-muted">
                    {period.articleCount} art.
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </AppDrawer>

      <AppDrawer
        open={filtersOpen}
        onOpenChange={(next) => (next ? setFiltersOpen(true) : closeFilters())}
        side="bottom"
        title="Filtres"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("")
                setCategoryKeys([])
              }}
              disabled={activeFilterCount === 0}
            >
              Réinitialiser
            </Button>
            <Button variant="primary" onClick={closeFilters}>
              Appliquer
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="veille-news-search"
              className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted"
            >
              Rechercher
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <IconSearch className="size-5" />
              </span>
              <input
                id="veille-news-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Titre, source, catégorie…"
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
          </div>

          <fieldset>
            <legend className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              Catégories
            </legend>
            <p className="mt-1 text-xs leading-5 text-muted">
              Plusieurs catégories peuvent être sélectionnées.
            </p>

            {categoryOptions.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucune catégorie dans ce briefing.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {categoryOptions.map((option) => {
                  const selected = categoryKeys.includes(option.key)
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleCategory(option.key)}
                      aria-pressed={selected}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
                        selected
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border bg-surface text-heading hover:bg-surface-hover/60",
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>
        </div>
      </AppDrawer>
    </div>
  )
}
