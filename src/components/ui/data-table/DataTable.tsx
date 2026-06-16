"use client"

import React, { KeyboardEvent, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type DataTableSortDirection = "asc" | "desc"

export type DataTableSort = {
  columnId: string
  direction: DataTableSortDirection
}

export type DataTableColumnAlign = "left" | "center" | "right"
export type DataTableRowTone = "default" | "attention"

export type DataTableColumn<T> = {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  accessor?: (row: T) => string | number | Date | null | undefined
  sortable?: boolean
  align?: DataTableColumnAlign
  width?: string
  minWidth?: string
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  rows: T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  loading?: boolean
  loadingRowCount?: number
  emptyState?: ReactNode
  errorState?: ReactNode
  sort?: DataTableSort | null
  onSortChange?: (sort: DataTableSort | null) => void
  selectedRowId?: string | null
  onRowSelect?: (row: T) => void
  onRowClick?: (row: T) => void
  rowClassName?: string | ((row: T) => string | undefined)
  getRowTone?: (row: T) => DataTableRowTone
  ariaLabel: string
  caption?: string
  footer?: ReactNode
  stickyHeader?: boolean
  className?: string
  tableClassName?: string
  containerClassName?: string
}

function getAlignClass(align: DataTableColumnAlign = "left") {
  if (align === "right") {
    return "text-right"
  }

  if (align === "center") {
    return "text-center"
  }

  return "text-left"
}

function getAriaSort(
  columnId: string,
  sortable: boolean | undefined,
  currentSort?: DataTableSort | null,
): React.AriaAttributes["aria-sort"] {
  if (!sortable || currentSort?.columnId !== columnId) {
    return "none"
  }

  return currentSort.direction === "asc" ? "ascending" : "descending"
}

export function getNextDataTableSort(
  currentSort: DataTableSort | null | undefined,
  columnId: string,
): DataTableSort | null {
  if (!currentSort || currentSort.columnId !== columnId) {
    return { columnId, direction: "asc" }
  }

  if (currentSort.direction === "asc") {
    return { columnId, direction: "desc" }
  }

  return null
}

export function sortDataTableRows<T>(
  rows: T[],
  columns: DataTableColumn<T>[],
  sort?: DataTableSort | null,
) {
  if (!sort) {
    return rows
  }

  const column = columns.find((candidate) => candidate.id === sort.columnId)

  if (!column?.accessor) {
    return rows
  }

  const sortedRows = [...rows].sort((leftRow, rightRow) => {
    const leftValue = column.accessor?.(leftRow)
    const rightValue = column.accessor?.(rightRow)

    if (leftValue == null && rightValue == null) return 0
    if (leftValue == null) return 1
    if (rightValue == null) return -1

    if (leftValue instanceof Date && rightValue instanceof Date) {
      return leftValue.getTime() - rightValue.getTime()
    }

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return leftValue - rightValue
    }

    return String(leftValue).localeCompare(String(rightValue), "fr", {
      numeric: true,
      sensitivity: "base",
    })
  })

  return sort.direction === "desc" ? sortedRows.reverse() : sortedRows
}

function DataTableEmptyState({ emptyState, colSpan }: { emptyState?: ReactNode; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10">
        {emptyState ?? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-[var(--radius-large)] border border-dashed border-border bg-canvas px-6 text-center">
            <h3 className="text-sm font-semibold text-heading">Aucune donnée</h3>
            <p className="mt-1 text-sm text-body">
              Aucun enregistrement ne correspond aux critères de cette vue.
            </p>
          </div>
        )}
      </td>
    </tr>
  )
}

function SortIndicator({ direction }: { direction?: DataTableSortDirection }) {
  if (direction === "asc") {
    return (
      <svg className="size-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 5L14 9H11.5V15H8.5V9H6L10 5Z" fill="currentColor" />
      </svg>
    )
  }

  if (direction === "desc") {
    return (
      <svg className="size-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 15L6 11H8.5V5H11.5V11H14L10 15Z" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg className="size-3.5 opacity-40" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 5L13 8H11V11H9V8H7L10 5Z" fill="currentColor" />
      <path d="M10 15L7 12H9V9H11V12H13L10 15Z" fill="currentColor" />
    </svg>
  )
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  loading = false,
  loadingRowCount = 6,
  emptyState,
  errorState,
  sort,
  onSortChange,
  selectedRowId,
  onRowSelect,
  onRowClick,
  rowClassName,
  getRowTone,
  ariaLabel,
  caption,
  footer,
  stickyHeader = false,
  className,
  tableClassName,
  containerClassName,
}: DataTableProps<T>) {
  const hasRows = rows.length > 0

  const handleRowInteraction = (row: T) => {
    if (onRowSelect) {
      onRowSelect(row)
    }

    if (onRowClick) {
      onRowClick(row)
    }
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick && !onRowSelect) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleRowInteraction(row)
    }
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div
        className={cn("min-w-0 overflow-x-auto", containerClassName)}
        aria-busy={loading || undefined}
      >
        <table className={cn("min-w-full border-collapse text-left text-xs", tableClassName)} aria-label={ariaLabel}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className={cn(stickyHeader && "sticky top-0 z-10 bg-surface")}>
            <tr className="border-b border-border bg-canvas/50 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              {columns.map((column) => {
                const isSorted = sort?.columnId === column.id ? sort.direction : undefined

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={getAriaSort(column.id, column.sortable, sort)}
                    className={cn(
                      "px-4 py-3 align-middle first:pl-5 last:pr-5",
                      getAlignClass(column.align),
                      column.headerClassName,
                    )}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                    }}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange?.(getNextDataTableSort(sort, column.id))}
                        className={cn(
                          "inline-flex items-center gap-1.5 font-inherit text-inherit",
                          "transition-[color,opacity] duration-[var(--motion-duration-fast)]",
                          "hover:text-heading focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-surface)]",
                          column.align === "right" && "ml-auto",
                          column.align === "center" && "mx-auto",
                        )}
                      >
                        <span>{column.header}</span>
                        <SortIndicator direction={isSorted} />
                      </button>
                    ) : (
                      <span className={cn(column.align === "right" && "block text-right", column.align === "center" && "block text-center")}>
                        {column.header}
                      </span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {errorState ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8">
                  {errorState}
                </td>
              </tr>
            ) : null}

            {!errorState && loading
              ? Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
                  <tr key={`loading-row-${rowIndex}`} className="h-[52px]">
                    {columns.map((column) => (
                      <td
                        key={`${column.id}-loading-${rowIndex}`}
                        className={cn(
                          "px-4 py-3 align-middle first:pl-5 last:pr-5",
                          getAlignClass(column.align),
                          column.className,
                        )}
                        style={{
                          width: column.width,
                          minWidth: column.minWidth,
                        }}
                      >
                        <div className="h-4 w-full max-w-[12rem] animate-pulse rounded-[var(--radius-small)] bg-[var(--color-skeleton-base)]/70" />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {!errorState && !loading && !hasRows ? (
              <DataTableEmptyState emptyState={emptyState} colSpan={columns.length} />
            ) : null}

            {!errorState && !loading
              ? rows.map((row) => {
                  const rowId = getRowId(row)
                  const isSelected = selectedRowId === rowId
                  const tone = getRowTone?.(row) ?? "default"
                  const computedRowClassName =
                    typeof rowClassName === "function" ? rowClassName(row) : rowClassName
                  const isInteractive = Boolean(onRowClick || onRowSelect)

                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        "h-[52px] border-transparent transition-[background-color,border-color] duration-[var(--motion-duration-fast)]",
                        isInteractive && "cursor-pointer hover:bg-surface-hover focus-within:bg-surface-hover",
                        tone === "attention" && "bg-warning/[0.06]",
                        isSelected && "bg-primary/[0.05] ring-1 ring-inset ring-primary/25",
                        computedRowClassName,
                      )}
                      aria-selected={isSelected || undefined}
                      tabIndex={isInteractive ? 0 : undefined}
                      onClick={isInteractive ? () => handleRowInteraction(row) : undefined}
                      onKeyDown={isInteractive ? (event) => handleRowKeyDown(event, row) : undefined}
                    >
                      {columns.map((column) => (
                        <td
                          key={`${rowId}-${column.id}`}
                          className={cn(
                            "px-4 py-3 align-middle text-body first:pl-5 last:pr-5",
                            getAlignClass(column.align),
                            column.align === "right" && "tabular-nums",
                            column.className,
                          )}
                          style={{
                            width: column.width,
                            minWidth: column.minWidth,
                          }}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  )
                })
              : null}
          </tbody>
        </table>
      </div>

      {footer ? <div className="border-t border-border bg-canvas/30 px-5 py-3">{footer}</div> : null}
    </div>
  )
}
