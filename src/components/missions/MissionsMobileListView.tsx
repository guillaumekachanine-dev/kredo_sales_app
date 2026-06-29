"use client"

import { useRouter } from "next/navigation"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import type { MissionsListRow } from "@/components/missions/MissionsListView"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { formatEuro, formatDateNumeric } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface MissionsMobileListViewProps {
  rows: MissionsListRow[]
  emptyMessage?: string
  onEditClick?: (row: MissionsListRow) => void
  onItemClick?: (row: MissionsListRow) => void
}

function getPastilleStyles(riskLevel?: "faible" | "modere" | "critique") {
  if (riskLevel === "critique") {
    return {
      bg: "bg-danger/10 text-danger border-danger/20",
      dot: "bg-danger",
      label: "danger",
    }
  }
  if (riskLevel === "modere") {
    return {
      bg: "bg-warning/10 text-warning border-warning/20",
      dot: "bg-warning",
      label: "vigilance",
    }
  }
  return {
    bg: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
    label: "OK",
  }
}

export function MissionsMobileListView({
  rows,
  emptyMessage = "Aucun élément.",
  onEditClick,
  onItemClick,
}: MissionsMobileListViewProps) {
  const router = useRouter()
  const { openTab } = useMissionsTabStore()

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {rows.map((row) => {
        const style = getPastilleStyles(row.riskLevel)

        return (
          <div
            key={row.entityId}
            onClick={() => {
              if (onItemClick) {
                onItemClick(row)
                return
              }
              openTab({
                entityType: row.entityType,
                entityId: row.entityId,
                title:
                  row.entityType === "opportunite"
                    ? (row.client ?? row.title)
                    : row.title,
                subtitle:
                  row.entityType === "opportunite" ? row.title : row.subtitle,
              })
            }}
            className="relative flex cursor-pointer flex-col gap-3 rounded-[var(--radius-medium)] border border-border/50 bg-surface p-4 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <CompanyLogo
                  name={row.client || "Client"}
                  logoPath={row.clientLogoPath}
                  website={row.clientWebsite}
                  size="sm"
                />
                <span className="text-xs font-bold text-heading">{row.client ?? "—"}</span>
              </div>

              <span
                className={cn(
                  "inline-flex shrink-0 select-none items-center gap-1.5 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border",
                  style.bg,
                )}
              >
                <span className={cn("h-1.5 w-1.5 animate-pulse rounded-full", style.dot)} />
                {style.label}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <h4 className="text-xs font-semibold leading-snug text-body transition-colors duration-150 group-hover:text-primary">
                  {row.title}
                </h4>
                <p className="mt-0.5 text-[10px] text-muted">
                  Consultant : <span className="font-medium text-body">{row.consultant ?? "—"}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  if (onEditClick) {
                    onEditClick(row)
                    return
                  }
                  if (row.entityType === "opportunite") {
                    router.push(`/missions/opps/${row.entityId}/edit`)
                  }
                }}
                className="shrink-0 self-start rounded border border-transparent p-1.5 text-muted transition-all duration-150 hover:border-border/60 hover:bg-primary/5 hover:text-primary"
                title="Modifier la mission"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2 rounded-[var(--radius-medium)] border border-border/40 bg-canvas/30 p-2.5 text-[10px] text-body">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-muted">TJM</span>
                  <span className="font-extrabold text-heading">{row.tjm ? `${formatEuro(row.tjm)}/j` : "—"}</span>
                </div>
                <div className="flex flex-col border-l border-border/30 pl-2">
                  <span className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-muted">Marge</span>
                  <span className="font-extrabold text-heading">
                    {row.grossMarginPct !== null && row.grossMarginPct !== undefined
                      ? `${row.grossMarginPct} %`
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-t border-border/20 pt-2 text-[9px] text-muted-foreground">
                <svg className="h-3.5 w-3.5 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5v12a2 2 0 002 2z" />
                </svg>
                <span>
                  Période : <span className="font-semibold text-body">{formatDateNumeric(row.startDate)} au {formatDateNumeric(row.endDate)}</span>
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
