"use client"

import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { formatEuro } from "@/lib/formatters"
import type {
  ConsultantsSyntheseViewModel,
  InterContractCollaborator,
  UpcomingMissionEnd,
} from "@/features/consultants/data/consultants-synthese.types"
import { PracticeBreakdownChart } from "./PracticeBreakdownChart"
import { RecruitmentPipelineChart } from "./RecruitmentPipelineChart"

interface SyntheseDesktopProps {
  vm: ConsultantsSyntheseViewModel
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col rounded-[var(--radius-medium)] border border-border bg-surface px-5 py-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="mt-1.5 font-heading text-3xl font-bold tracking-tight text-heading">{value}</span>
      {hint ? <span className="mt-1 text-xs text-muted">{hint}</span> : null}
    </div>
  )
}

const UPCOMING_COLUMNS: StructuredListColumn<UpcomingMissionEnd>[] = [
  {
    id: "collaborator",
    header: "Collaborateur",
    render: (m) => (
      <span className="font-semibold text-heading">{m.collaboratorName ?? "—"}</span>
    ),
  },
  { id: "mission", header: "Mission", render: (m) => m.missionTitle },
  {
    id: "client",
    header: "Client",
    render: (m) => <span className="text-muted">{m.clientName ?? "—"}</span>,
  },
  {
    id: "end",
    header: "Fin",
    width: "6.5rem",
    align: "right",
    render: (m) => m.endDate,
  },
  {
    id: "left",
    header: "Restant",
    width: "5.5rem",
    align: "right",
    render: (m) => (
      <span
        className={
          m.daysRemaining <= 30
            ? "font-bold text-[var(--color-status-warning-ink)]"
            : "font-semibold text-body"
        }
      >
        {m.daysRemaining} j
      </span>
    ),
  },
]

function buildInterContractColumns(
  compensationVisible: boolean,
): StructuredListColumn<InterContractCollaborator>[] {
  const columns: StructuredListColumn<InterContractCollaborator>[] = [
    {
      id: "name",
      header: "Nom",
      render: (c) => <span className="font-semibold text-heading">{c.fullName ?? "—"}</span>,
    },
    { id: "title", header: "Profil", render: (c) => c.jobTitle ?? "—" },
    {
      id: "practice",
      header: "Practice",
      render: (c) => <span className="text-muted">{c.practiceLabel ?? "—"}</span>,
    },
    {
      id: "lastMission",
      header: "Dernière mission",
      render: (c) =>
        c.lastMissionTitle ? (
          <span>
            {c.lastMissionTitle}
            {c.lastMissionEndDate ? (
              <span className="text-muted"> · {c.lastMissionEndDate}</span>
            ) : null}
          </span>
        ) : (
          "—"
        ),
    },
  ]

  if (compensationVisible) {
    columns.push(
      {
        id: "gross",
        header: "Salaire annuel",
        align: "right",
        width: "8rem",
        render: (c) => (c.grossAnnual != null ? formatEuro(c.grossAnnual) : "—"),
      },
      {
        id: "cjm",
        header: "CJM",
        align: "right",
        width: "6rem",
        render: (c) => (c.cjm != null ? formatEuro(c.cjm) : "—"),
      },
    )
  }

  columns.push({
    id: "positionings",
    header: "Position. en cours",
    align: "right",
    width: "8rem",
    render: (c) =>
      c.activePositionings == null ? (
        <span className="text-muted" title="Non traçable : aucune fiche candidat associée">
          —
        </span>
      ) : (
        <span className="font-semibold text-body">{c.activePositionings}</span>
      ),
  })

  return columns
}

export function SyntheseDesktop({ vm }: SyntheseDesktopProps) {
  const interContractColumns = buildInterContractColumns(
    vm.interContractCollaborators.some((c) => c.compensationVisible),
  )

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Collaborateurs"
          value={String(vm.kpis.activeCollaborators)}
          hint="effectif actif"
        />
        <KpiCard
          label="Vivier candidats"
          value={String(vm.kpis.talentPoolCandidates)}
          hint="statut « vivier »"
        />
        <KpiCard
          label="Recrutements"
          value={String(vm.kpis.hiresYearToDate)}
          hint={`aboutis en ${vm.kpis.referenceYear}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PracticeBreakdownChart buckets={vm.practiceBreakdown} />
        <RecruitmentPipelineChart pipeline={vm.recruitmentPipeline} />
      </div>

      <section className="rounded-[var(--radius-medium)] border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold text-heading">Prochaines fins de mission</h2>
        <StructuredList
          ariaLabel="Prochaines fins de mission"
          items={vm.upcomingMissionEnds}
          getItemId={(m) => m.missionId}
          columns={UPCOMING_COLUMNS}
          density="compact"
          emptyState={
            <p className="py-6 text-center text-sm text-muted">Aucune mission active à échéance.</p>
          }
        />
      </section>

      <section className="rounded-[var(--radius-medium)] border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold text-heading">
          Collaborateurs en intercontrat
        </h2>
        <StructuredList
          ariaLabel="Collaborateurs en intercontrat"
          items={vm.interContractCollaborators}
          getItemId={(c) => c.collaboratorId}
          columns={interContractColumns}
          density="compact"
          emptyState={
            <p className="py-6 text-center text-sm text-muted">
              Aucun collaborateur en intercontrat.
            </p>
          }
        />
      </section>

      {vm.dataNotes.length > 0 ? (
        <ul className="flex flex-col gap-1 px-1 text-[11px] leading-relaxed text-muted">
          {vm.dataNotes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
