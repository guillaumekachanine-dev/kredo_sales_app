"use client"

import { DBProjectResult } from "@/app/(app)/missions/_data/get-projects-list"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table/DataTable"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { formatEuro, formatPct, formatDateShort } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface ProjectsDesktopViewProps {
  projects: DBProjectResult[]
}

const PROJECT_STATUS: Record<string, StatusPillVariant> = {
  draft: "draft",
  active: "inProgress",
  delivered: "success",
  closed: "neutral",
  cancelled: "danger",
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  active: "Actif",
  delivered: "Livré",
  closed: "Clôturé",
  cancelled: "Annulé",
}

const REF_STATUS: Record<string, StatusPillVariant> = {
  not_reference: "neutral",
  draft: "draft",
  approved: "success",
  archived: "neutral",
}

const REF_STATUS_LABELS: Record<string, string> = {
  not_reference: "Non Réf.",
  draft: "Brouillon Réf.",
  approved: "Référencé",
  archived: "Archivé",
}

export function ProjectsDesktopView({ projects }: ProjectsDesktopViewProps) {
  const { openTab } = useMissionsTabStore()

  const columns: DataTableColumn<DBProjectResult>[] = [
    {
      id: "client",
      header: "Client",
      cell: (row) => {
        const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
        const isAnonymized = row.ref_visibility === "anonymized"
        const name = isAnonymized ? (row.ref_anonymized_label ?? "Client Anonymisé") : (company?.name ?? "—")
        const logoPath = isAnonymized ? null : (company?.metadata as any)?.logo_path
        const website = isAnonymized ? null : company?.website

        return (
          <div className="flex items-center gap-2.5">
            <CompanyLogo
              name={name}
              logoPath={logoPath}
              website={website}
              size="sm"
            />
            <span className="font-bold text-heading text-xs">{name}</span>
          </div>
        )
      },
      sortable: true,
      accessor: (row) => {
        const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
        return row.ref_visibility === "anonymized"
          ? (row.ref_anonymized_label ?? "Client Anonymisé")
          : (company?.name ?? "")
      },
    },
    {
      id: "project",
      header: "Projet",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-body group-hover:text-primary transition-colors duration-150 text-xs">
            {row.title}
          </span>
          {row.code && (
            <span className="text-[10px] text-muted font-medium">{row.code}</span>
          )}
        </div>
      ),
      sortable: true,
      accessor: (row) => row.title,
    },
    {
      id: "status",
      header: "Statut",
      align: "center",
      cell: (row) => {
        const variant = PROJECT_STATUS[row.status] ?? "neutral"
        const label = PROJECT_STATUS_LABELS[row.status] ?? row.status
        return <StatusPill label={label} variant={variant} dot={true} />
      },
      sortable: true,
      accessor: (row) => row.status,
    },
    {
      id: "ref_status",
      header: "Fiche",
      align: "center",
      cell: (row) => {
        const variant = REF_STATUS[row.ref_status] ?? "neutral"
        const label = REF_STATUS_LABELS[row.ref_status] ?? row.ref_status
        return <StatusPill label={label} variant={variant} dot={true} />
      },
      sortable: true,
      accessor: (row) => row.ref_status,
    },
    {
      id: "contract_amount",
      header: "CA",
      align: "right",
      cell: (row) => (
        <span className="font-bold text-heading text-xs">
          {formatEuro(row.contract_amount)}
        </span>
      ),
      sortable: true,
      accessor: (row) => row.contract_amount ?? 0,
    },
    {
      id: "target_margin",
      header: "Marge cible",
      align: "right",
      cell: (row) => (
        <span className="font-medium text-body text-xs">
          {formatPct(row.target_margin_pct)}
        </span>
      ),
      sortable: true,
      accessor: (row) => row.target_margin_pct ?? 0,
    },
    {
      id: "actual_margin",
      header: "Marge réelle",
      align: "right",
      cell: (row) => {
        const actual = row.actual_margin_pct
        const target = row.target_margin_pct
        let colorClass = "text-muted"
        if (actual !== null && target !== null) {
          colorClass = actual >= target ? "text-success font-semibold" : "text-danger font-semibold"
        } else if (actual !== null) {
          colorClass = "text-heading"
        }
        return (
          <span className={cn("text-xs", colorClass)}>
            {formatPct(actual)}
          </span>
        )
      },
      sortable: true,
      accessor: (row) => row.actual_margin_pct ?? 0,
    },
    {
      id: "progress",
      header: "Avancement",
      cell: (row) => (
        <div className="flex items-center gap-2 min-w-[5rem]">
          <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-300"
              style={{ width: `${row.progress_pct}%` }}
            />
          </div>
          <span className="text-[10px] text-muted font-medium w-8 text-right">
            {row.progress_pct}%
          </span>
        </div>
      ),
      sortable: true,
      accessor: (row) => row.progress_pct,
    },
    {
      id: "delivery",
      header: "Livraison",
      align: "center",
      cell: (row) => (
        <span className="text-body text-xs">
          {formatDateShort(row.end_date_planned)}
        </span>
      ),
      sortable: true,
      accessor: (row) => (row.end_date_planned ? new Date(row.end_date_planned).getTime() : 0),
    },
  ]

  return (
    <SurfaceCard className="overflow-hidden border-0 rounded-[var(--radius-medium)]">
      <DataTable
        rows={projects}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={(row) =>
          openTab({
            entityType: "project",
            entityId: row.id,
            title: row.title,
            subtitle: row.code ?? "",
          })
        }
        ariaLabel="Liste des projets forfait"
      />
    </SurfaceCard>
  )
}
