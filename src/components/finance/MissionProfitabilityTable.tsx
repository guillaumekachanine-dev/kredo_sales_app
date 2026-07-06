"use client"

import React, { useState } from "react"
import { DataTable } from "@/components/ui/data-table/DataTable"
import { StatusPill } from "@/components/ui/StatusPill"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type { MissionProfitabilityRow } from "@/lib/finance/finance-data"
import type { DataTableColumn, DataTableSort } from "@/components/ui/data-table/DataTable"

function getPracticeIcon(practice: string | null | undefined): string | null {
  if (!practice) return null
  const p = practice.toLowerCase().trim()
  if (p.includes("cloud")) return "/images/practice_icons/practice_cloud_engineering.png"
  if (p.includes("cyber")) return "/images/practice_icons/practice_cybersecurity.png"
  if (p.includes("data") || p.includes("ia")) return "/images/practice_icons/practice_data_ia.png"
  if (p.includes("digital") || p.includes("business")) return "/images/practice_icons/practice_digital_business_solutions.png"
  if (p.includes("legacy") || p.includes("mainframe")) return "/images/practice_icons/practice_legacy_mainframe.png"
  if (p.includes("project") || p.includes("agile")) return "/images/practice_icons/practice_project_agile_delivery.png"
  if (p.includes("qa") || p.includes("test")) return "/images/practice_icons/practice_QA_testing.png"
  return null
}

interface MissionProfitabilityTableProps {
  rows: MissionProfitabilityRow[]
  onAction?: (row: MissionProfitabilityRow) => void
}

export function MissionProfitabilityTable({ rows, onAction }: MissionProfitabilityTableProps) {
  const [sort, setSort] = useState<DataTableSort | null>({ columnId: "revenue", direction: "desc" })

  const columns: DataTableColumn<MissionProfitabilityRow>[] = [
    {
      id: "client",
      header: "Client",
      cell: (row) => <span className="font-semibold text-heading">{row.clientName}</span>,
      accessor: (row) => row.clientName,
      sortable: true,
    },
    {
      id: "mission",
      header: "Mission",
      cell: (row) => <span className="text-body max-w-[150px] truncate block" title={row.missionTitle}>{row.missionTitle}</span>,
      accessor: (row) => row.missionTitle,
      sortable: true,
    },
    {
      id: "consultant",
      header: "Consultant",
      cell: (row) => <span className="text-body font-medium">{row.consultantName}</span>,
      accessor: (row) => row.consultantName,
      sortable: true,
    },
    {
      id: "practice",
      header: "Practice",
      cell: (row) => {
        const iconPath = getPracticeIcon(row.practice)
        return (
          <span className="flex items-center gap-1.5 text-xs text-muted font-medium">
            {iconPath ? (
              <img
                src={iconPath}
                alt=""
                className="size-4 shrink-0 object-contain rounded-sm"
              />
            ) : null}
            <span>{row.practice || "—"}</span>
          </span>
        )
      },
      accessor: (row) => row.practice || "",
      sortable: true,
    },
    {
      id: "status",
      header: "Statut",
      cell: (row) => (
        <StatusPill
          label={row.status === "active" ? "Actif" : row.status === "ended" ? "Terminé" : row.status}
          variant={row.status === "active" ? "success" : "neutral"}
        />
      ),
      accessor: (row) => row.status,
      sortable: true,
      align: "center",
    },
    
    // Groupe "TJM/CJM/% MCO" (Léger contraste gris/surface-raised)
    {
      id: "tjm",
      header: "TJM",
      cell: (row) => <span className="font-mono text-xs font-semibold">{row.tjm} €</span>,
      accessor: (row) => row.tjm,
      sortable: true,
      align: "right",
      className: "bg-surface-raised/50",
      headerClassName: "bg-surface-raised/50 font-bold",
    },
    {
      id: "cjm",
      header: "CJM",
      cell: (row) => <span className="font-mono text-xs text-muted">{row.cjm > 0 ? `${row.cjm} €` : "—"}</span>,
      accessor: (row) => row.cjm,
      sortable: true,
      align: "right",
      className: "bg-surface-raised/50",
      headerClassName: "bg-surface-raised/50 font-bold",
    },
    {
      id: "marginPct",
      header: "% MCO",
      cell: (row) => {
        const isLow = row.marginPct < 25
        return (
          <span className={isLow ? "text-danger font-bold" : "text-success font-semibold"}>
            {formatPct(row.marginPct, 1)}
          </span>
        )
      },
      accessor: (row) => row.marginPct,
      sortable: true,
      align: "right",
      className: "bg-surface-raised/50",
      headerClassName: "bg-surface-raised/50 font-bold",
    },

    // Groupe "jours/CA YTD/MCO YTD" (Léger contraste bleu/primary ultra-clair)
    {
      id: "billableDays",
      header: "Jours",
      cell: (row) => <span className="font-mono text-xs">{row.billableDays} j</span>,
      accessor: (row) => row.billableDays,
      sortable: true,
      align: "right",
      className: "bg-primary/[0.02]",
      headerClassName: "bg-primary/[0.02] font-bold",
    },
    {
      id: "revenue",
      header: "CA YTD",
      cell: (row) => <span className="font-semibold text-heading">{formatEuroCompact(row.revenue)}</span>,
      accessor: (row) => row.revenue,
      sortable: true,
      align: "right",
      className: "bg-primary/[0.02]",
      headerClassName: "bg-primary/[0.02] font-bold",
    },
    {
      id: "marginValue",
      header: "MCO YTD",
      cell: (row) => <span className="text-body font-semibold">{formatEuroCompact(row.marginValue)}</span>,
      accessor: (row) => row.marginValue,
      sortable: true,
      align: "right",
      className: "bg-primary/[0.02]",
      headerClassName: "bg-primary/[0.02] font-bold",
    },

    {
      id: "endDate",
      header: "Fin",
      cell: (row) => (
        <span className="text-xs text-muted">
          {row.endDate ? new Date(row.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "Indéterminée"}
        </span>
      ),
      accessor: (row) => row.endDate || "",
      sortable: true,
      align: "center",
    },
  ]

  const sortedRows = [...rows].sort((a, b) => {
    if (!sort) return 0
    const col = columns.find((c) => c.id === sort.columnId)
    if (!col || !col.accessor) return 0

    const av = col.accessor(a)
    const bv = col.accessor(b)

    if (av === null || av === undefined) return sort.direction === "asc" ? -1 : 1
    if (bv === null || bv === undefined) return sort.direction === "asc" ? 1 : -1

    if (av < bv) return sort.direction === "asc" ? -1 : 1
    if (av > bv) return sort.direction === "asc" ? 1 : -1
    return 0
  })

  return (
    <DataTable
      ariaLabel="Rentabilité des missions"
      rows={sortedRows}
      columns={columns}
      getRowId={(row) => row.id}
      sort={sort}
      onSortChange={setSort}
      emptyState={
        <p className="py-8 text-center text-sm text-muted">
          Aucune mission disponible
        </p>
      }
    />
  )
}
