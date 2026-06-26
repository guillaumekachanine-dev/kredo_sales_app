import React from "react"
import { cn } from "@/lib/utils"

export interface EntityPlanningColumn {
  key: string
  label: React.ReactNode
  isCurrent?: boolean
}

export interface EntityPlanningViewProps<TRow> {
  rows: TRow[]
  columns: EntityPlanningColumn[]
  getRowId: (row: TRow) => string
  labelColumnHeader: React.ReactNode
  renderRowLabel: (row: TRow) => React.ReactNode
  renderTimelineRow: (row: TRow) => React.ReactNode
  currentMarkerLeft?: string | null
  labelColumnWidth?: number
  timelineColumnMinWidth?: number
  emptyState?: React.ReactNode
}

export function EntityPlanningView<TRow>({
  rows,
  columns,
  getRowId,
  labelColumnHeader,
  renderRowLabel,
  renderTimelineRow,
  currentMarkerLeft = null,
  labelColumnWidth = 270,
  timelineColumnMinWidth = 90,
  emptyState,
}: EntityPlanningViewProps<TRow>) {
  const gridStyle = {
    gridTemplateColumns: `${labelColumnWidth}px minmax(${columns.length * timelineColumnMinWidth}px, 1fr)`,
    minWidth: `${labelColumnWidth + columns.length * timelineColumnMinWidth}px`,
  }

  const timelineGridStyle = {
    gridTemplateColumns: `repeat(${columns.length}, minmax(${timelineColumnMinWidth}px, 1fr))`,
  }

  return (
    <div className="relative flex select-none flex-col gap-5">
      <div className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface shadow-sm">
        <div className="grid border-b border-border/80" style={gridStyle}>
          <div className="sticky left-0 z-30 flex h-11 items-center border-r border-border bg-surface px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              {labelColumnHeader}
            </span>
          </div>

          <div className="relative bg-surface">
            <div className="grid" style={timelineGridStyle}>
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "flex h-11 items-center justify-center border-r border-border/70 px-2 text-center text-[10px] font-bold tracking-[0.18em] last:border-r-0",
                    column.isCurrent ? "font-extrabold text-primary" : "text-muted",
                  )}
                >
                  {column.label}
                </div>
              ))}
            </div>

            {currentMarkerLeft ? (
              <div
                className="absolute inset-y-0 z-20 w-px bg-danger/80"
                style={{ left: currentMarkerLeft }}
                aria-hidden="true"
              />
            ) : null}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center px-4 py-16 text-sm text-muted">
            {emptyState ?? "Aucun élément."}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((row) => (
              <div
                key={getRowId(row)}
                className="group grid min-h-[56px] transition-colors duration-150 hover:bg-canvas/30"
                style={gridStyle}
              >
                <div className="sticky left-0 z-30 min-w-0 border-r border-border bg-surface px-4 py-2">
                  {renderRowLabel(row)}
                </div>
                <div className="relative flex items-center bg-surface">
                  {renderTimelineRow(row)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
