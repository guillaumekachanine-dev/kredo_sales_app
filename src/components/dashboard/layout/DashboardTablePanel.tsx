"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { DashboardTable } from "@/lib/dashboard/dashboard-types"
import { EmptyState } from "../widgets/EmptyState"
import { cn } from "@/lib/utils"

interface DashboardTablePanelProps {
  table: DashboardTable
  className?: string
}

export function DashboardTablePanel({ table, className }: DashboardTablePanelProps) {
  const router = useRouter()
  const { title, description, columns, rows } = table

  const dataTableColumns = useMemo<DataTableColumn<(typeof rows)[number]>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        header: column.label,
        align: column.align,
        minWidth: column.align === "right" ? "8rem" : "10rem",
        cell: (row) => {
          const cellValue = row.cells[column.key] || "-"
          const isEmphasized = column.key === "client" || column.key === "invoice"

          return (
            <span
              className={cn(
                "block truncate",
                isEmphasized ? "font-semibold text-heading" : "font-medium text-body",
                column.align === "right" && "text-heading",
              )}
            >
              {cellValue}
            </span>
          )
        },
      })),
    [columns],
  )

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex flex-col mb-3 select-none">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {title}
        </h3>
        <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
      </div>

      <SurfaceCard className="flex min-h-0 flex-1 flex-col" padding="default">
        {description && (
          <p className="text-xs text-muted mb-4">
            {description}
          </p>
        )}

        <DataTable
          ariaLabel={title}
          caption={description}
          rows={rows}
          columns={dataTableColumns}
          getRowId={(row) => row.id}
          onRowClick={(row) => {
            if (row.href) {
              router.push(row.href)
            }
          }}
          rowClassName={(row) => (row.href ? "" : "cursor-default")}
          emptyState={
            <EmptyState
              title="Aucune donnée"
              description="Aucun enregistrement ne correspond aux critères de cette vue."
              className="bg-canvas/30 py-12"
            />
          }
          containerClassName="flex-1"
        />
      </SurfaceCard>
    </div>
  )
}
