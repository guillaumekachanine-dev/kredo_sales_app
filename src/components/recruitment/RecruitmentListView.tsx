"use client"

import React, { useOptimistic, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { EntityListView } from "@/components/common/EntityListView"
import type { RecruitmentWorkspaceRow } from "@/app/(app)/recruitment/_data/get-recruitment-workspace"
import { formatDate } from "@/lib/formatters"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { updateCandidateStatus } from "@/app/(app)/recruitment/_actions/update-candidate-status"
import { Select } from "@/components/ui/Select"
import type { StructuredListColumn } from "@/components/ui/StructuredList"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"

interface RecruitmentListViewProps {
  rows: RecruitmentWorkspaceRow[]
}

const HIRING_STEP_LABELS: Record<string, string> = {
  prequalification: "Préqualification",
  entretien_manager: "Entretien manager",
  tests_techniques: "Tests techniques",
  proposition: "Proposition",
  signature: "Signature",
  integration: "Intégration",
}

const CANDIDATE_STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  qualifie: "Qualifié",
  vivier: "Vivier",
  propose: "Proposé",
  en_process: "En process",
  recrute: "Recruté",
  refuse: "Refusé",
  ko_manager: "KO manager",
  indisponible: "Indisponible",
  archive: "Archivé",
}

// Options proposées dans le dropdown (sans "nouveau", "recrute", "propose")
const CANDIDATE_STATUS_OPTIONS = [
  "qualifie",
  "vivier",
  "en_process",
  "ko_manager",
  "refuse",
  "indisponible",
  "archive",
] as const

function HiringStepCell({ step }: { step: string | null }) {
  const label = step ? (HIRING_STEP_LABELS[step] ?? step) : "—"
  return (
    <span className="text-xs font-medium" style={{ color: "var(--color-body)" }}>
      {label}
    </span>
  )
}

function CandidateStatusDropdown({
  candidateId,
  currentStatus,
}: {
  candidateId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const next = e.target.value
    if (next === currentStatus) return
    startTransition(async () => {
      setOptimisticStatus(next)
      await updateCandidateStatus(candidateId, next)
      router.refresh()
    })
  }

  const label = CANDIDATE_STATUS_LABELS[optimisticStatus] ?? optimisticStatus

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-36 select-none">
      <Select
        value={optimisticStatus}
        onChange={handleChange}
        disabled={isPending}
        size="sm"
        aria-label={`Statut de ${label}`}
        className="text-xs font-semibold"
      >
        {CANDIDATE_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {CANDIDATE_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
    </div>
  )
}

const sharedColumns: StructuredListColumn<RecruitmentWorkspaceRow>[] = [
  {
    id: "candidate",
    header: "Candidat",
    width: "14rem",
    render: (row) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold border-brand-brass/15 bg-brand-brass/10 text-brand-brass">
          {row.candidateName
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold text-heading transition-colors duration-150 group-hover:text-primary">
            {row.candidateName}
          </span>
          <span className="truncate text-[10px] text-muted">
            {row.availability || "Disponibilité non renseignée"}
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "profile",
    header: "Profil",
    width: "11rem",
    render: (row) => (
      <div className="flex flex-col">
        <span className="truncate font-medium text-body">{row.currentTitle || "—"}</span>
        <span className="truncate text-[10px] text-muted">
          {[row.practice, row.seniority].filter(Boolean).join(" • ") || "—"}
        </span>
      </div>
    ),
  },
  {
    id: "need",
    header: "Besoin",
    width: "14rem",
    render: (row) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <CompanyLogo
          name={row.clientName || "Client"}
          logoPath={row.clientLogoPath}
          website={row.clientWebsite}
          size="sm"
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-heading">{row.opportunityTitle}</span>
          <span className="truncate text-[10px] text-muted">{row.clientName}</span>
        </div>
      </div>
    ),
  },
]

function formatSalaryK(value: number | null | undefined): string {
  if (!value) return "—"
  const k = value / 1000
  const rounded = Math.round(k * 10) / 10
  const formatted = rounded % 1 === 0
    ? rounded.toFixed(0)
    : rounded.toFixed(1).replace(".", ",")
  return `${formatted}k`
}

const psColumn: StructuredListColumn<RecruitmentWorkspaceRow> = {
  id: "ps",
  header: "PS",
  align: "left",
  width: "7rem",
  render: (row) => (
    <span className="font-medium tabular-nums text-heading">
      {formatSalaryK(row.expectedSalary)}
    </span>
  ),
}

const actionColumn: StructuredListColumn<RecruitmentWorkspaceRow> = {
  id: "action",
  header: "Prochaine action",
  width: "15rem",
  render: (row) => (
    <div className="flex flex-col gap-2">
      <span className="line-clamp-2 text-[11px] font-medium text-body">
        {row.nextAction || "Aucune action"}
      </span>
      <span className="text-[10px] text-muted">MAJ {formatDate(row.updatedAt)}</span>
      <div className="flex flex-wrap gap-1.5">
        <ContextualCommunicationButton
          intent="candidate_interview"
          origin="opportunity"
          label="Inviter"
          className="h-8 min-h-8 px-2.5 text-[11px]"
          candidateId={row.candidateId}
          candidateName={row.candidateName}
          opportunityId={row.opportunityId}
          opportunityTitle={row.opportunityTitle}
          companyId={row.companyId}
          companyName={row.clientName}
          primaryEntity={{ type: "candidate", id: row.candidateId }}
          mustInclude={[
            `Candidat: ${row.candidateName}`,
            row.currentTitle ? `Profil: ${row.currentTitle}` : null,
            `Besoin: ${row.opportunityTitle}`,
            row.clientName ? `Client: ${row.clientName}` : null,
            row.nextAction ? `Prochaine action: ${row.nextAction}` : null,
          ].filter(Boolean).join("\n")}
        />
        <ContextualCommunicationButton
          intent="candidate_to_client"
          origin="opportunity"
          label="Client"
          className="h-8 min-h-8 px-2.5 text-[11px]"
          candidateId={row.candidateId}
          candidateName={row.candidateName}
          opportunityId={row.opportunityId}
          opportunityTitle={row.opportunityTitle}
          companyId={row.companyId}
          companyName={row.clientName}
          primaryEntity={{ type: "opportunity", id: row.opportunityId }}
          mustInclude={[
            `Candidat: ${row.candidateName}`,
            row.currentTitle ? `Profil: ${row.currentTitle}` : null,
            `Besoin: ${row.opportunityTitle}`,
            row.summary ? `Synthèse: ${row.summary}` : null,
          ].filter(Boolean).join("\n")}
        />
      </div>
    </div>
  ),
}

const hiringColumns: StructuredListColumn<RecruitmentWorkspaceRow>[] = [
  ...sharedColumns,
  {
    id: "stage",
    header: "Étape recrutement",
    width: "12rem",
    render: (row) => <HiringStepCell step={row.hiringCurrentStep} />,
  },
  psColumn,
  actionColumn,
]

const qualifiedColumns: StructuredListColumn<RecruitmentWorkspaceRow>[] = [
  ...sharedColumns,
  {
    id: "candidateStatus",
    header: "Statut candidat",
    width: "12rem",
    render: (row) => (
      <CandidateStatusDropdown
        candidateId={row.candidateId}
        currentStatus={row.candidateStatus}
      />
    ),
  },
  psColumn,
  actionColumn,
]

function getHiringRowStyle(row: RecruitmentWorkspaceRow): React.CSSProperties | undefined {
  if (row.hiringProcessStatus === "hired") {
    // Ambre chaleureux et joyeux — signe de célébration du recrutement finalisé
    return { background: "color-mix(in srgb, #F59E0B 12%, transparent)" }
  }
  return undefined
}

export function RecruitmentListView({ rows }: RecruitmentListViewProps) {
  const openStaffingDrawer = useStaffingDrawerStore((state) => state.openStaffingDrawer)

  const { hiringAndHiredRows, otherRows } = useMemo(() => {
    const hiringAndHired: RecruitmentWorkspaceRow[] = []
    const other: RecruitmentWorkspaceRow[] = []

    // hired en premier dans le groupe
    for (const row of rows) {
      if (row.hiringProcessStatus === "hired" || row.hasActiveHiringProcess) {
        hiringAndHired.push(row)
      } else {
        other.push(row)
      }
    }

    hiringAndHired.sort((a, b) => {
      const aHired = a.hiringProcessStatus === "hired" ? 0 : 1
      const bHired = b.hiringProcessStatus === "hired" ? 0 : 1
      return aHired - bHired
    })

    return { hiringAndHiredRows: hiringAndHired, otherRows: other }
  }, [rows])

  if (rows.length === 0) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded-[var(--radius-medium)] border border-dashed"
        style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
      >
        <p className="text-sm">Aucun candidat externe ne correspond aux filtres.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hiringAndHiredRows.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: "var(--color-success)" }} />
            <h3
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--color-heading)" }}
            >
              Processus d&apos;embauche en cours
            </h3>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "var(--color-success)", color: "white" }}
            >
              {hiringAndHiredRows.length}
            </span>
          </div>
          <EntityListView
            items={hiringAndHiredRows}
            columns={hiringColumns}
            getItemId={(row) => row.id}
            onItemClick={(row) => openStaffingDrawer(row.id)}
            ariaLabel="Candidats en processus d'embauche"
            getRowStyle={getHiringRowStyle}
            tableFixed
          />
        </div>
      )}

      {otherRows.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: "var(--color-muted)" }} />
            <h3
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--color-heading)" }}
            >
              Candidats qualifiés
            </h3>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "var(--color-border)", color: "var(--color-heading)" }}
            >
              {otherRows.length}
            </span>
          </div>
          <EntityListView
            items={otherRows}
            columns={qualifiedColumns}
            getItemId={(row) => row.id}
            onItemClick={(row) => openStaffingDrawer(row.id)}
            ariaLabel="Candidats qualifiés"
            tableFixed
          />
        </div>
      )}
    </div>
  )
}
