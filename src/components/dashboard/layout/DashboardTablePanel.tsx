import { SurfaceCard } from "@/components/ui/SurfaceCard"
import Link from "next/link"
import { DashboardTable } from "@/lib/dashboard/dashboard-types"
import { EmptyState } from "../widgets/EmptyState"
import { cn } from "@/lib/utils"

interface DashboardTablePanelProps {
  table: DashboardTable
  className?: string
}

export function DashboardTablePanel({ table, className }: DashboardTablePanelProps) {
  const { title, description, columns, rows } = table

  const getAlignClass = (align?: "left" | "right" | "center") => {
    return {
      left: "text-left",
      right: "text-right",
      center: "text-center"
    }[align || "left"]
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex flex-col mb-3 select-none">
        <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
          {title}
        </h3>
        <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
      </div>

      <div className="bg-surface border-0 rounded-xl p-5 shadow-sm flex-1 flex flex-col min-w-0">
        {description && (
          <p className="text-xs text-muted mb-4">
            {description}
          </p>
        )}

        <div className="flex-1 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState
              title="Aucune donnée"
              description="Aucun enregistrement ne correspond aux critères de cette vue."
              className="py-12 bg-canvas/30"
            />
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted font-bold uppercase tracking-wider text-[10px]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={cn("pb-3 px-3 first:pl-0 last:pr-0 font-semibold", getAlignClass(col.align))}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((row) => {
                  const rowContent = (
                    <>
                      {columns.map((col) => {
                        const cellValue = row.cells[col.key] || "-"
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "py-3 px-3 first:pl-0 last:pr-0 text-heading font-medium truncate max-w-[200px]",
                              getAlignClass(col.align),
                              col.align === "right" ? "tabular-nums" : "",
                              col.key === "client" || col.key === "invoice" ? "font-semibold" : "",
                              col.key === "value" || col.key === "amount" ? "" : ""
                            )}
                          >
                            {cellValue}
                          </td>
                        )
                      })}
                    </>
                  )

                  if (row.href) {
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-canvas/40 transition-colors duration-150 cursor-pointer group"
                      >
                        {columns.map((col) => {
                          const cellValue = row.cells[col.key] || "-"
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "py-3 px-3 first:pl-0 last:pr-0 text-heading font-medium truncate max-w-[200px]",
                                getAlignClass(col.align),
                                col.align === "right" ? "tabular-nums" : "",
                                col.key === "client" || col.key === "invoice" ? "font-semibold group-hover:text-primary" : "",
                                col.key === "value" || col.key === "amount" ? "" : ""
                              )}
                            >
                              <Link href={row.href!} className="block w-full h-full">
                                {cellValue}
                              </Link>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  }

                  return (
                    <tr key={row.id} className="hover:bg-canvas/10">
                      {rowContent}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

