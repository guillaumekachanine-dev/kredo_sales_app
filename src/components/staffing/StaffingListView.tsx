"use client"

import React from "react"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { formatEuro } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"

interface StaffingListViewProps {
  rows: StaffingListRow[]
}

const STAGE_LABELS: Record<string, string> = {
  identifie: "Identifié",
  propose_interne: "Proposé interne",
  preselectionne: "Présélectionné",
  envoye_client: "CV envoyé",
  entretien_planifie: "Entretien client",
  entretien_realise: "Entretien client",
  retenu: "Retenu",
  gagne: "Gagné",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

const STAGE_COLORS: Record<string, string> = {
  identifie: "text-indigo-500",
  propose_interne: "text-indigo-400",
  preselectionne: "text-violet-500",
  envoye_client: "text-orange-500",
  entretien_planifie: "text-blue-500",
  entretien_realise: "text-blue-500",
  retenu: "text-success",
  gagne: "text-success",
  refuse_client: "text-danger",
  refuse_candidat: "text-danger",
  abandonne: "text-muted",
}

export function StaffingListView({ rows }: StaffingListViewProps) {
  const { openStaffingDrawer } = useStaffingDrawerStore()

  const columns: StructuredListColumn<StaffingListRow>[] = [
    {
      id: "identity",
      header: "Identité",
      width: "11.5rem",
      render: (row) => (
        <span className="font-bold text-heading group-hover:text-primary transition-colors duration-150">
          {row.fullName}
        </span>
      ),
    },
    {
      id: "profile",
      header: "Profil",
      width: "9.5rem",
      render: (row) => (
        <span className="text-body font-medium truncate block">{row.profileTitle || "—"}</span>
      ),
    },
    {
      id: "seniority",
      header: "Séniorité",
      width: "7rem",
      render: (row) => (
        <span className="text-body font-medium truncate block">{row.seniority || "—"}</span>
      ),
    },
    {
      id: "status",
      header: "Statut",
      align: "center",
      width: "6.5rem",
      render: (row) => (
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider select-none",
          row.isCollaborator 
            ? "bg-primary/5 border-primary/10 text-primary"
            : "bg-brand-brass/5 border-brand-brass/10 text-brand-brass"
        )}>
          {row.isCollaborator ? "Interne" : "Externe"}
        </span>
      ),
    },
    {
      id: "positioning",
      header: "Positionnement",
      width: "13rem",
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <CompanyLogo
            name={row.clientName || "Client"}
            logoPath={row.clientLogoPath}
            website={row.clientWebsite}
            size="sm"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-heading truncate">{row.opportunityTitle}</span>
            <span className="text-[10px] text-muted truncate">{row.clientName}</span>
          </div>
        </div>
      ),
    },
    {
      id: "stage",
      header: "Étape du staffing",
      width: "10rem",
      render: (row) => {
        const colorClass = STAGE_COLORS[row.status] || "text-muted"
        const label = STAGE_LABELS[row.status] || row.status.replaceAll("_", " ")
        return (
          <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider", colorClass)}>
            <span className="size-1.5 shrink-0 rounded-full bg-current" />
            <span>{label}</span>
          </span>
        )
      },
    },
    {
      id: "salary",
      header: "Salaire",
      align: "right",
      width: "7.5rem",
      render: (row) => (
        <span className="font-medium text-heading tabular-nums">
          {row.salary ? `${formatEuro(row.salary)}${row.isCollaborator ? "" : " /an"}` : "—"}
        </span>
      ),
    },
    {
      id: "tjm",
      header: "TJM cible",
      align: "right",
      width: "6.5rem",
      render: (row) => (
        <span className="font-medium text-heading tabular-nums">
          {row.targetTjm ? `${formatEuro(row.targetTjm)}/j` : "—"}
        </span>
      ),
    },
    {
      id: "margin",
      header: "Marge cible",
      align: "right",
      width: "7.5rem",
      render: (row) => (
        <span className={cn(
          "font-bold tabular-nums",
          row.marginPct !== null && row.marginPct >= 20 ? "text-success" : "text-heading"
        )}>
          {row.marginPct !== null ? `${row.marginPct} %` : "—"}
        </span>
      ),
    },
    {
      id: "action",
      header: "Action",
      align: "center",
      width: "3rem",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openStaffingDrawer(row.id)
          }}
          className="p-1 text-muted hover:text-primary hover:bg-primary/5 rounded transition-all duration-150 border border-transparent hover:border-border/60"
          title="Modifier le staffing"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      ),
    },
  ]

  return (
    <SurfaceCard className="overflow-hidden border-0 rounded-[var(--radius-medium)]">
      <StructuredList
        density="compact"
        items={rows}
        columns={columns}
        getItemId={(row) => row.id}
        onItemClick={(row) => openStaffingDrawer(row.id)}
        ariaLabel="Liste des staffings actifs"
      />
    </SurfaceCard>
  )
}
