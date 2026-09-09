"use client"

import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import type {
  ConsultantsSyntheseViewModel,
  UpcomingMissionEnd,
} from "@/features/consultants/data/consultants-synthese.types"
import { DoubleTrackPracticeChart } from "./DoubleTrackPracticeChart"
import { InterContractRail } from "./InterContractRail"
import { RecruitmentStageRail } from "./RecruitmentStageRail"

interface SyntheseDesktopProps {
  vm: ConsultantsSyntheseViewModel
}

function KpiMetric({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <div className="min-w-0 px-5 py-4 first:pl-6 last:pr-6">
      <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-edito-muted">
        {label}
      </span>
      <span
        className={
          accent
            ? "mt-1 block text-3xl font-bold tracking-tight tabular-nums text-edito-brass"
            : "mt-1 block text-3xl font-bold tracking-tight tabular-nums text-edito-heading"
        }
      >
        {value}
      </span>
      <span className="mt-1 block text-xs text-edito-body">{hint}</span>
    </div>
  )
}

const UPCOMING_COLUMNS: StructuredListColumn<UpcomingMissionEnd>[] = [
  {
    id: "collaborator",
    header: "Collaborateur",
    render: (mission) => (
      <span className="font-semibold text-edito-ink">{mission.collaboratorName ?? "—"}</span>
    ),
  },
  { id: "mission", header: "Mission", render: (mission) => mission.missionTitle },
  {
    id: "client",
    header: "Client",
    render: (mission) => <span className="text-edito-muted">{mission.clientName ?? "—"}</span>,
  },
  {
    id: "end",
    header: "Fin",
    width: "6.5rem",
    align: "right",
    render: (mission) => mission.endDate,
  },
  {
    id: "left",
    header: "Restant",
    width: "5.5rem",
    align: "right",
    render: (mission) => (
      <span
        className={
          mission.daysRemaining <= 30
            ? "font-bold tabular-nums text-[var(--color-status-warning-ink)]"
            : "font-semibold tabular-nums text-edito-body"
        }
      >
        {mission.daysRemaining} j
      </span>
    ),
  },
]

export function SyntheseDesktop({ vm }: SyntheseDesktopProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 py-6">
      <section className="grid grid-cols-3 divide-x divide-edito-border rounded-lg border border-edito-border bg-edito-surface">
        <KpiMetric
          label="Collaborateurs"
          value={String(vm.kpis.activeCollaborators)}
          hint="effectif actif"
        />
        <KpiMetric
          label="Vivier candidats"
          value={String(vm.kpis.talentPoolCandidates)}
          hint="statut « vivier »"
        />
        <KpiMetric
          label="Recrutements"
          value={String(vm.kpis.hiresYearToDate)}
          hint={`aboutis en ${vm.kpis.referenceYear}`}
          accent
        />
      </section>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.36fr)]">
        <DoubleTrackPracticeChart
          buckets={vm.practiceBreakdown}
          referenceYear={vm.kpis.referenceYear}
        />
        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-6">
          <RecruitmentStageRail pipeline={vm.recruitmentPipeline} />
          <InterContractRail collaborators={vm.interContractCollaborators} />
        </aside>
      </div>

      <section className="rounded-lg border border-edito-border bg-edito-surface p-5">
        <div className="mb-4 border-b border-edito-border pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-edito-navy">Missions</p>
          <h2 className="mt-1 text-sm font-bold text-edito-heading">Prochaines fins de mission</h2>
        </div>
        <StructuredList
          ariaLabel="Prochaines fins de mission"
          items={vm.upcomingMissionEnds}
          getItemId={(mission) => mission.missionId}
          columns={UPCOMING_COLUMNS}
          density="compact"
          emptyState={
            <p className="py-6 text-center text-sm text-edito-muted">Aucune mission active à échéance.</p>
          }
        />
      </section>

      {vm.dataNotes.length > 0 ? (
        <ul className="flex flex-col gap-1 px-1 text-[11px] leading-relaxed text-edito-muted">
          {vm.dataNotes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
