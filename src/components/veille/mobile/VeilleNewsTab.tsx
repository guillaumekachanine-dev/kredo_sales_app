"use client"

import { useMemo, useRef, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { IconChevronRight, IconClose, IconDocument, IconFilter, IconSearch, IconTag } from "./icons"
import {
  NEWS_FORMAT_OPTIONS,
  collectCategoryOptions,
  filterNewsRows,
  type NewsFormatFilter,
  type NewsRowVM,
} from "./veille-mobile-view-models"

type VeilleNewsTabProps = {
  rows: NewsRowVM[]
  onOpenArticle: (articleId: string) => void
}

export function VeilleNewsTab({ rows, onOpenArticle }: VeilleNewsTabProps) {
  const [search, setSearch] = useState("")
  const [categoryKey, setCategoryKey] = useState<string | null>(null)
  const [format, setFormat] = useState<NewsFormatFilter>("all")
  const [formatSheetOpen, setFormatSheetOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [formatDraft, setFormatDraft] = useState<NewsFormatFilter>("all")

  const formatTriggerRef = useRef<HTMLButtonElement | null>(null)
  const categoryTriggerRef = useRef<HTMLButtonElement | null>(null)

  const categoryOptions = useMemo(() => collectCategoryOptions(rows), [rows])
  const visibleRows = useMemo(
    () => filterNewsRows(rows, { search, categoryKey, format }),
    [rows, search, categoryKey, format],
  )

  const activeCategoryLabel = categoryOptions.find((option) => option.key === categoryKey)?.label ?? null
  const activeFormatLabel = NEWS_FORMAT_OPTIONS.find((option) => option.value === format)?.label ?? null

  const openFormatSheet = () => {
    setFormatDraft(format)
    setFormatSheetOpen(true)
  }

  const closeFormatSheet = () => {
    setFormatSheetOpen(false)
    window.requestAnimationFrame(() => formatTriggerRef.current?.focus())
  }

  const closeCategorySheet = () => {
    setCategorySheetOpen(false)
    window.requestAnimationFrame(() => categoryTriggerRef.current?.focus())
  }

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
            placeholder="Rechercher une actualité…"
            aria-label="Rechercher une actualité"
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

        <div className="grid grid-cols-2 gap-2">
          <FilterTrigger
            ref={formatTriggerRef}
            label="Format"
            value={format === "all" ? null : activeFormatLabel}
            icon={<IconFilter className="size-5" />}
            onClick={openFormatSheet}
          />
          <FilterTrigger
            ref={categoryTriggerRef}
            label="Catégorie"
            value={activeCategoryLabel}
            icon={<IconTag className="size-5" />}
            onClick={() => setCategorySheetOpen(true)}
            disabled={categoryOptions.length === 0}
          />
        </div>
      </div>

      <div className="veille-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {visibleRows.length === 0 ? (
          <p className="px-8 py-16 text-center text-sm text-muted">
            {rows.length === 0
              ? "Aucune actualité disponible pour le moment."
              : "Aucune actualité ne correspond à cette recherche."}
          </p>
        ) : (
          <ul aria-label={`${visibleRows.length} actualités`}>
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
        open={formatSheetOpen}
        onOpenChange={(next) => (next ? setFormatSheetOpen(true) : closeFormatSheet())}
        side="bottom"
        title="Format"
        description="Le schéma actuel ne distingue qu'un seul format exploitable."
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setFormat("all")
                closeFormatSheet()
              }}
            >
              Réinitialiser
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setFormat(formatDraft)
                closeFormatSheet()
              }}
            >
              Appliquer
            </Button>
          </div>
        }
      >
        {/* `AppDrawer` masque sa prop `description` en mobile (`sm:block hidden`) :
            on rend l'explication dans le corps pour qu'elle reste visible. */}
        <p className="mb-4 text-sm leading-6 text-muted">
          Le schéma actuel ne distingue qu&apos;un seul format exploitable.
        </p>

        <fieldset className="divide-y divide-border border-y border-border">
          <legend className="sr-only">Format de contenu</legend>
          {NEWS_FORMAT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-14 cursor-pointer items-center gap-3 py-3 text-[15px] text-heading"
            >
              <input
                type="radio"
                name="veille-news-format"
                value={option.value}
                checked={formatDraft === option.value}
                onChange={() => setFormatDraft(option.value)}
                className="size-5 shrink-0 accent-[var(--color-brand-brass)]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
        <p className="mt-4 text-xs leading-5 text-muted">
          Communiqués, études et appels d&apos;offres nécessitent un champ format dédié, absent de{" "}
          <code className="font-mono text-[11px]">veille_articles</code>.
        </p>
      </AppDrawer>

      <AppDrawer
        open={categorySheetOpen}
        onOpenChange={(next) => (next ? setCategorySheetOpen(true) : closeCategorySheet())}
        side="bottom"
        title="Catégorie"
        description="Libellés regroupés pour l'affichage ; les données restent inchangées."
      >
        <p className="mb-4 text-sm leading-6 text-muted">
          Libellés regroupés pour l&apos;affichage ; les données restent inchangées.
        </p>

        <ul className="divide-y divide-border border-y border-border">
          <li>
            <CategoryOption
              label="Toutes les catégories"
              selected={categoryKey === null}
              onSelect={() => {
                setCategoryKey(null)
                closeCategorySheet()
              }}
            />
          </li>
          {categoryOptions.map((option) => (
            <li key={option.key}>
              <CategoryOption
                label={option.label}
                selected={categoryKey === option.key}
                onSelect={() => {
                  setCategoryKey(option.key)
                  closeCategorySheet()
                }}
              />
            </li>
          ))}
        </ul>
      </AppDrawer>
    </div>
  )
}

function FilterTrigger({
  ref,
  label,
  value,
  icon,
  onClick,
  disabled,
}: {
  ref: React.Ref<HTMLButtonElement>
  label: string
  value: string | null
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-[var(--radius-small)] border px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
        value ? "border-primary bg-primary/[0.06]" : "border-border bg-surface hover:bg-surface-hover/60",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className={cn("shrink-0", value ? "text-primary" : "text-heading")}>{icon}</span>
      <span
        className={cn(
          "max-w-full truncate text-xs font-semibold",
          value ? "text-primary" : "text-heading",
        )}
      >
        {value ?? label}
      </span>
    </button>
  )
}

function CategoryOption({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex min-h-14 w-full items-center justify-between gap-3 px-1 py-3 text-left text-[15px] outline-none hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
    >
      <span className={cn(selected ? "font-bold text-primary" : "text-heading")}>{label}</span>
      {selected ? <span className="text-primary">✓</span> : null}
    </button>
  )
}
