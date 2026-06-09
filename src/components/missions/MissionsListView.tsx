"use client"

import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { SectionTab } from "@/lib/tabs/tab-types"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

export type MissionsListRow = {
  entityId: string
  entityType: SectionTab["entityType"]
  title: string
  subtitle?: string
  status: "active" | "pending" | "closed" | "won" | "lost"
  amount?: string
  date?: string
  client?: string
  tag?: string
}

interface MissionsListViewProps {
  rows: MissionsListRow[]
  emptyMessage?: string
}

const statusStyles: Record<MissionsListRow["status"], { dot: string; label: string; badge: string }> = {
  active:  { dot: "bg-success",  label: "Actif",     badge: "bg-success/10 text-success border-success/20" },
  pending: { dot: "bg-warning",  label: "En attente", badge: "bg-warning/10 text-warning border-warning/20" },
  closed:  { dot: "bg-muted",    label: "Clôturé",   badge: "bg-canvas text-muted border-border" },
  won:     { dot: "bg-success",  label: "Gagné",     badge: "bg-success/10 text-success border-success/20" },
  lost:    { dot: "bg-danger",   label: "Perdu",     badge: "bg-danger/10 text-danger border-danger/20" },
}

export function MissionsListView({ rows, emptyMessage = "Aucun élément." }: MissionsListViewProps) {
  const { openTab } = useMissionsTabStore()

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <SurfaceCard className="overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-canvas/50">
            <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
              Intitulé
            </th>
            <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
              Client
            </th>
            <th className="text-right px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
              Montant
            </th>
            <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
              Statut
            </th>
            <th className="text-right px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const style = statusStyles[row.status]
            return (
              <tr
                key={row.entityId}
                onClick={() =>
                  openTab({
                    entityType: row.entityType,
                    entityId: row.entityId,
                    title: row.title,
                    subtitle: row.subtitle,
                  })
                }
                className="border-b border-border/50 last:border-0 hover:bg-canvas/60 transition-colors duration-100 cursor-pointer group"
              >
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-heading group-hover:text-primary transition-colors">
                      {row.title}
                    </span>
                    {row.tag && (
                      <span className="text-[10px] text-muted">{row.tag}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-body">{row.client ?? "—"}</td>
                <td className="px-4 py-3.5 text-right font-medium text-heading tabular-nums">
                  {row.amount ?? "—"}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border",
                      style.badge
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                    {style.label}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-muted tabular-nums">{row.date ?? "—"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </SurfaceCard>
  )
}
