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
  placeholder = "Rechercher…",
  onQueryChange,
  onReset,
  children,
}: {
  device: DashboardDevice
  query: string
  totalFiltered: number
  totalAll: number
  placeholder?: string
  onQueryChange: (value: string) => void
  onReset: () => void
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

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("flex gap-2", device === "mobile" ? "flex-col items-stretch" : "items-center")}>
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
        <div className="flex items-center justify-between gap-3">
          <span className="whitespace-nowrap text-xs text-muted">
            {isFiltered ? `${totalFiltered} / ${totalAll}` : `${totalAll}`}
          </span>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-heading"
          >
            Réinitialiser
          </button>
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
