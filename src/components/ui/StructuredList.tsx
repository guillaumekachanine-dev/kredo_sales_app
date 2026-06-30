"use client"

import React from "react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type StructuredListColumn<T> = {
  id: string
  header?: React.ReactNode
  render: (item: T) => React.ReactNode
  /** CSS width value, e.g. "6rem" or "25%" */
  width?: string
  align?: "left" | "center" | "right"
  className?: string
  ariaSort?: React.AriaAttributes["aria-sort"]
  onHeaderClick?: () => void
  headerAriaLabel?: string
}

export type StructuredListDensity = "compact" | "default"

export type StructuredListProps<T> = {
  items: T[]
  columns: StructuredListColumn<T>[]
  getItemId: (item: T) => string
  density?: StructuredListDensity
  onItemClick?: (item: T) => void
  selectedItemId?: string
  loading?: boolean
  emptyState?: React.ReactNode
  errorState?: React.ReactNode
  /**
   * Rendered above the table (inside the scroll container).
   * Useful for a filter/summary bar scoped to the list.
   */
  header?: React.ReactNode
  footer?: React.ReactNode
  ariaLabel: string
  className?: string
  getRowStyle?: (item: T) => React.CSSProperties | undefined
  /** Force table-layout: fixed so column widths are strictly respected (needed when aligning two separate tables) */
  tableFixed?: boolean
}

// ─── Density tokens ───────────────────────────────────────────────────────────

const ROW_PY: Record<StructuredListDensity, string> = {
  compact: "py-[0.625rem]",   // ~48-56px with xs text
  default: "py-[0.875rem]",   // ~68-84px with 2-line content
}

const HEADER_PY: Record<StructuredListDensity, string> = {
  compact: "py-2",
  default: "py-2.5",
}

const ALIGN: Record<NonNullable<StructuredListColumn<unknown>["align"]>, string> = {
  left:   "text-left",
  center: "text-center",
  right:  "text-right",
}

const SKELETON_ROWS = 5

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * StructuredList — entity-oriented list with aligned columns.
 *
 * Use when rows have visual identity and reading is primarily vertical.
 * Use DataTable instead when column comparison and sort/analytics dominate.
 *
 * Density:
 *   "compact"  — ~48-56px rows, operational/dense lists (e.g. Missions)
 *   "default"  — ~68-84px rows, entity summaries with sub-lines (e.g. Consultants)
 */
export function StructuredList<T>({
  items,
  columns,
  getItemId,
  density = "default",
  onItemClick,
  selectedItemId,
  loading = false,
  emptyState,
  errorState,
  header,
  footer,
  ariaLabel,
  className,
  getRowStyle,
  tableFixed = false,
}: StructuredListProps<T>) {
  const isClickable = Boolean(onItemClick)
  const rowPy   = ROW_PY[density]
  const headPy  = HEADER_PY[density]

  // ── Shared header row ──────────────────────────────────────────────────────
  const headerRow = (
    <thead>
      <tr className="border-b border-border bg-canvas/30">
        {columns.map((col) => (
          <th
            key={col.id}
            scope="col"
            aria-sort={col.ariaSort}
            className={cn(
              `px-4 ${headPy} text-[10px] font-semibold uppercase tracking-wider text-muted`,
              col.align ? ALIGN[col.align] : "text-left",
              col.className,
            )}
            style={col.width ? { width: col.width } : undefined}
          >
            {col.onHeaderClick ? (
              <button
                type="button"
                onClick={col.onHeaderClick}
                aria-label={col.headerAriaLabel}
                className={cn(
                  "inline-flex items-center gap-1 outline-none transition-colors",
                  "focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]",
                  "focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-canvas)]",
                  col.align === "center" && "mx-auto",
                  col.align === "right" && "ml-auto",
                )}
              >
                {col.header}
              </button>
            ) : col.header}
          </th>
        ))}
      </tr>
    </thead>
  )

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className={cn("overflow-x-auto", className)}
        role="status"
        aria-label={`${ariaLabel} — chargement`}
        aria-busy="true"
      >
        <table className="w-full border-collapse text-left text-xs">
          {headerRow}
          <tbody>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0">
                {columns.map((col) => (
                  <td key={col.id} className={`px-4 ${rowPy}`}>
                    <div className="h-3 w-3/4 animate-pulse rounded-[var(--radius-small)] bg-border/60" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (errorState) {
    return (
      <div className={cn("flex min-h-40 items-center justify-center py-16 text-sm text-danger", className)}>
        {errorState}
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className={cn("flex min-h-40 items-center justify-center py-16 text-sm text-muted", className)}>
        {emptyState ?? "Aucun élément."}
      </div>
    )
  }

  // ── Data rows ──────────────────────────────────────────────────────────────
  return (
    <div className={cn("overflow-x-auto", className)} aria-label={ariaLabel}>
      {header}
      <table
        className="w-full border-collapse text-left text-xs"
        style={tableFixed ? { tableLayout: "fixed" } : undefined}
      >
        {headerRow}
        <tbody>
          {items.map((item) => {
            const id = getItemId(item)
            const isSelected = id === selectedItemId

            return (
              <tr
                key={id}
                onClick={isClickable ? () => onItemClick!(item) : undefined}
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onItemClick!(item)
                        }
                      }
                    : undefined
                }
                tabIndex={isClickable ? 0 : undefined}
                aria-selected={isSelected ? true : undefined}
                style={getRowStyle?.(item)}
                className={cn(
                  "border-b border-border/40 last:border-0",
                  isClickable && "kredo-hover-reference group",
                  isSelected && "bg-primary/[0.04]",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      `px-4 ${rowPy}`,
                      col.align ? ALIGN[col.align] : "text-left",
                      col.className,
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {footer}
    </div>
  )
}
