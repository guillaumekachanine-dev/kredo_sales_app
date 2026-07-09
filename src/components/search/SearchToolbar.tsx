"use client"

import { useEffect, useId, useState, type ReactNode } from "react"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

/**
 * Reusable, domain-agnostic search toolbar.
 *
 * Holds local input state for instant typing feedback and debounces writes to the
 * URL (via `onQueryChange`). The `query` prop is the URL source of truth and
 * re-syncs the input on external changes (reset, back navigation).
 *
 * `clear` (×) wipes the text only. `onReset` is wired by the parent to wipe all
 * filters — two distinct affordances.
 */
export function SearchToolbar({
  device,
  query,
  totalFiltered,
  totalAll,
  mobileCompact = false,
  resultLabel,
  placeholder = "Rechercher…",
  onQueryChange,
  onReset,
  mobileAction,
  hideReset = false,
  hideChildrenWhenCompact = false,
  hideCompactResult = false,
  inlineDesktop = false,
  hideResultsOnDesktop = false,
  children,
}: {
  device: DashboardDevice
  query: string
  totalFiltered: number
  totalAll: number
  mobileCompact?: boolean
  resultLabel?: string
  placeholder?: string
  onQueryChange: (value: string) => void
  onReset: () => void
  mobileAction?: ReactNode
  hideReset?: boolean
  hideChildrenWhenCompact?: boolean
  hideCompactResult?: boolean
  inlineDesktop?: boolean
  hideResultsOnDesktop?: boolean
  children?: ReactNode
}) {
  const inputId = useId()
  const [text, setText] = useState(query)

  // Re-sync local input when the URL query changes from outside (reset, history).
  // React's sanctioned "adjust state during render" pattern — no effect needed.
  const [lastQuery, setLastQuery] = useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    setText(query)
  }

  // Debounce text → URL (250ms). Chips apply immediately via their own handlers.
  useEffect(() => {
    if (text === query) return
    const id = setTimeout(() => onQueryChange(text), 250)
    return () => clearTimeout(id)
  }, [text, query, onQueryChange])

  const isFiltered = totalFiltered !== totalAll
  const resultText = resultLabel
    ? `${totalFiltered}/${totalAll} ${resultLabel}`
    : isFiltered
      ? `${totalFiltered} / ${totalAll}`
      : `${totalAll}`
  const showCompactMobile = device === "mobile" && mobileCompact

  if (device !== "mobile" && inlineDesktop) {
    return (
      <div className="grid grid-cols-2 gap-4 items-center w-full">
        <div className="relative w-full">
          <label htmlFor={inputId} className="sr-only">
            Rechercher
          </label>
          <input
            id={inputId}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            className="w-full h-[38px] rounded-md border border-border bg-surface px-3 py-2 pr-8 text-sm text-body placeholder:text-muted focus:border-primary/40 focus:outline-none"
          />
          {text.length > 0 && (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-base leading-none text-muted hover:text-heading"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 border border-border bg-surface px-3 py-1 rounded-md w-full h-[38px]">
          <span className="text-xs font-bold text-muted mr-1 shrink-0">Filtres</span>
          <div className="flex items-center gap-1.5 flex-1">
            {children}
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Réinitialiser les filtres"
              className="ml-auto text-muted hover:text-heading transition-colors shrink-0 pl-2.5 border-l border-border/80 flex items-center justify-center"
            >
              <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 0 1 15.36-6.36M21 12A9 9 0 0 1 5.64 18.36M18 5.64V3h2.64M6 18.36V21H3.36" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("flex gap-2", device === "mobile" ? "items-stretch" : "items-center", !showCompactMobile && device === "mobile" && "flex-col")}>
        <div className="relative flex-1">
          <label htmlFor={inputId} className="sr-only">
            Rechercher
          </label>
          <input
            id={inputId}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 pr-8 text-sm text-body placeholder:text-muted focus:border-primary/40 focus:outline-none"
          />
          {text.length > 0 && (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-base leading-none text-muted hover:text-heading"
            >
              ×
            </button>
          )}
        </div>
        <div className={cn("flex items-center gap-3", showCompactMobile ? "shrink-0" : "justify-between")}>
          {!showCompactMobile && !hideResultsOnDesktop && (
            <span className="whitespace-nowrap text-xs text-muted">
              {resultText}
            </span>
          )}
          {showCompactMobile && mobileAction ? (
            mobileAction
          ) : !hideReset ? (
            <button
              type="button"
              onClick={onReset}
              aria-label="Réinitialiser"
              className={cn(
                "rounded-md border border-border text-xs font-semibold text-muted transition-colors hover:text-heading",
                showCompactMobile ? "flex h-9 w-9 items-center justify-center p-0" : "px-3 py-2"
              )}
            >
              {showCompactMobile ? (
                <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 0 1 15.36-6.36M21 12A9 9 0 0 1 5.64 18.36M18 5.64V3h2.64M6 18.36V21H3.36" />
                </svg>
              ) : (
                "Réinitialiser"
              )}
            </button>
          ) : null}
        </div>
      </div>
      {children && !(showCompactMobile && hideChildrenWhenCompact) && (
        <div className={cn("flex", showCompactMobile ? "flex-nowrap gap-1" : "flex-wrap gap-2")}>
          {children}
        </div>
      )}
      {showCompactMobile && !hideCompactResult && (
        <div className="text-xs font-bold text-heading">
          {resultText}
        </div>
      )}
    </div>
  )
}
