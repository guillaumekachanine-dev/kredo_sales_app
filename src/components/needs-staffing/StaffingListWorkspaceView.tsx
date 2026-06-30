"use client"

import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { Badge } from "@/components/ui/Badge"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"
import { cn } from "@/lib/utils"

interface StaffingListWorkspaceViewProps {
  rows: StaffingListRow[]
}

const STATUS_LABELS: Record<string, string> = {
  identifie: "Identifié",
  propose_interne: "Proposé en interne",
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

function getPriorityVariant(priority: string) {
  if (priority === "haute") return "warning"
  return "neutral"
}

function getMatchTone(score: number | null) {
  if (score === null) return "text-muted"
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-primary"
  return "text-heading"
}

export function StaffingListWorkspaceView({ rows }: StaffingListWorkspaceViewProps) {
  const { openStaffingDrawer } = useStaffingDrawerStore()

  const columns: StructuredListColumn<StaffingListRow>[] = [
    {
      id: "candidate",
      header: "Candidat",
      width: "11rem",
      render: (row) => (
        <span className="font-bold text-heading transition-colors duration-150 group-hover:text-primary">
          {row.fullName}
        </span>
      ),
    },
    {
      id: "profile",
      header: "Profil",
      width: "10rem",
      render: (row) => <span className="text-body">{row.profileTitle ?? "—"}</span>,
    },
    {
      id: "need",
      header: "Besoin",
      width: "13rem",
      render: (row) => (
        <span className="font-semibold text-body">{row.opportunityTitle}</span>
      ),
    },
    {
      id: "account",
      header: "Compte",
      width: "12rem",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo
            name={row.clientName || "Client"}
            logoPath={row.clientLogoPath}
            website={row.clientWebsite}
            size="sm"
          />
          <span className="truncate font-bold text-heading">{row.clientName}</span>
        </div>
      ),
    },
    {
      id: "practice",
      header: "Practice",
      width: "8rem",
      render: (row) => <span className="text-body">{row.practice ?? "—"}</span>,
    },
    {
      id: "priority",
      header: "Priorité",
      align: "center",
      width: "7rem",
      render: (row) => (
        <Badge variant={getPriorityVariant(row.opportunityPriority)} size="sm">
          {row.opportunityPriority === "haute"
            ? "Haute"
            : row.opportunityPriority === "basse"
              ? "Basse"
              : "Normale"}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Étape du positionnement",
      width: "11rem",
      render: (row) => (
        <span className="text-[11px] font-semibold text-body">
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      ),
    },
    {
      id: "availability",
      header: "Disponibilité",
      width: "10rem",
      render: (row) => <span className="text-body">{row.availability ?? "—"}</span>,
    },
    {
      id: "match",
      header: "Adéquation",
      align: "center",
      width: "7rem",
      render: (row) => (
        <span className={cn("font-semibold tabular-nums", getMatchTone(row.matchScore))}>
          {row.matchScore !== null ? `${Math.round(row.matchScore)}%` : "—"}
        </span>
      ),
    },
    {
      id: "nextAction",
      header: "Prochaine action",
      width: "12rem",
      render: (row) => <span className="line-clamp-2 text-body">{row.nextAction ?? "—"}</span>,
    },
  ]

  return (
    <div className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface shadow-sm">
      <StructuredList
        density="compact"
        items={rows}
        columns={columns}
        getItemId={(row) => row.id}
        onItemClick={(row) => openStaffingDrawer(row.id)}
        ariaLabel="Liste des positionnements de staffing"
        emptyState="Aucun positionnement ne correspond aux filtres."
      />
    </div>
  )
}
