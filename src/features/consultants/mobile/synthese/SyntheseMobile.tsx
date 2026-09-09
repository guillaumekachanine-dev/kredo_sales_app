"use client"

import Link from "next/link"
import { MobilePageHeader } from "@/components/ui/mobile"
import { formatEuro } from "@/lib/formatters"
import type {
  ConsultantsPracticeBucket,
  ConsultantsSyntheseViewModel,
  RecruitmentPipeline,
} from "@/features/consultants/data/consultants-synthese.types"

interface SyntheseMobileProps {
  vm: ConsultantsSyntheseViewModel
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col px-2 py-3 text-center">
      <span
        className={
          accent
            ? "text-xl font-bold tracking-tight tabular-nums text-edito-brass"
            : "text-xl font-bold tracking-tight tabular-nums text-edito-heading"
        }
      >
        {value}
      </span>
      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-edito-muted">
        {label}
      </span>
    </div>
  )
}

function PopulationTrack({
  label,
  value,
  max,
  outlined = false,
}: {
  label: string
  value: number
  max: number
  outlined?: boolean
}) {
  const width = value > 0 ? `${(value / max) * 100}%` : "0%"

  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)_1.5rem] items-center gap-2">
      <span className={outlined ? "text-[10px] text-edito-muted" : "text-[10px] font-semibold text-edito-body"}>
        {label}
      </span>
      <span className="h-2.5 overflow-hidden rounded-sm bg-edito-chip">
        <span
          aria-hidden
          className={
            outlined
              ? "block h-full rounded-sm border border-primary bg-edito-surface"
              : "block h-full rounded-sm bg-primary"
          }
          style={{ width }}
        />
      </span>
      <span className="text-right text-xs font-bold tabular-nums text-edito-ink">{value}</span>
    </div>
  )
}

function PracticeSection({
  buckets,
  referenceYear,
}: {
  buckets: readonly ConsultantsPracticeBucket[]
  referenceYear: number
}) {
  const maxPopulation = Math.max(
    1,
    ...buckets.flatMap((bucket) => [bucket.collaborators, bucket.candidates]),
  )

  return (
    <section className="rounded-xl border border-edito-border bg-edito-surface p-4">
      <div className="border-b border-edito-border pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-edito-navy">Double voie</p>
        <h2 className="mt-1 text-sm font-bold text-edito-heading">Par practice</h2>
        <p className="mt-1 text-[11px] leading-snug text-edito-body">
          Collaborateurs et candidats rattachés, affichés simultanément.
        </p>
      </div>
      {buckets.length === 0 ? (
        <p className="py-5 text-center text-xs text-edito-muted">Aucun rattachement à une practice.</p>
      ) : (
        <ul className="divide-y divide-edito-border">
          {buckets.map((bucket) => (
            <li key={bucket.key ?? "__other__"} className="py-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <span className="text-xs font-bold leading-snug text-edito-heading">{bucket.label}</span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold tabular-nums text-edito-brass">
                    {bucket.hiresYearToDate}
                  </span>
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-edito-muted">
                    recruté{bucket.hiresYearToDate > 1 ? "s" : ""}
                  </span>
                </span>
              </div>
              <div className="space-y-1.5">
                <PopulationTrack label="Collaborateurs" value={bucket.collaborators} max={maxPopulation} />
                <PopulationTrack label="Candidats" value={bucket.candidates} max={maxPopulation} outlined />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-edito-muted">
        Recrutés : processus « hired » clôturés en {referenceYear}.
      </p>
    </section>
  )
}

function RecruitmentStageList({ pipeline }: { pipeline: RecruitmentPipeline }) {
  return (
    <section className="rounded-xl border border-edito-border bg-edito-surface p-4">
      <div className="border-b border-edito-border pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-edito-navy">Recrutement</p>
        <h2 className="mt-1 text-sm font-bold text-edito-heading">Processus actifs par étape</h2>
        <p className="mt-1 text-[11px] text-edito-muted">Photographie actuelle</p>
      </div>
      <p className="py-3 text-xs text-edito-body">
        <span className="font-bold tabular-nums text-edito-ink">{pipeline.totalActive}</span> candidat
        {pipeline.totalActive > 1 ? "s" : ""} en processus de recrutement
      </p>
      {pipeline.totalActive === 0 ? (
        <p className="pb-1 text-center text-xs text-edito-muted">Aucun processus actif.</p>
      ) : (
        <ol className="relative before:absolute before:bottom-4 before:left-[0.3rem] before:top-4 before:w-px before:bg-edito-border">
          {pipeline.byStep.map((stage) => (
            <li key={stage.step} className="relative grid grid-cols-[0.75rem_minmax(0,1fr)_1.25rem] items-center gap-2 py-1.5">
              <span
                aria-hidden
                className={
                  stage.count > 0
                    ? "z-10 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-edito-surface"
                    : "z-10 h-2.5 w-2.5 rounded-full border border-primary bg-edito-surface ring-2 ring-edito-surface"
                }
              />
              <span className="text-xs text-edito-body">{stage.label}</span>
              <span className="text-right text-sm font-bold tabular-nums text-edito-ink">{stage.count}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function SyntheseMobile({ vm }: SyntheseMobileProps) {
  const compensationVisible = vm.interContractCollaborators.some((collaborator) => collaborator.compensationVisible)

  return (
    <div className="flex flex-col gap-4 bg-edito-canvas p-4 pb-24">
      <MobilePageHeader
        eyebrow="Consultants"
        title="Vue d’ensemble"
        description="Effectif, candidats rattachés et recrutement en un coup d'œil."
      />

      <section className="grid grid-cols-3 divide-x divide-edito-border rounded-xl border border-edito-border bg-edito-surface">
        <Kpi label="Collab." value={String(vm.kpis.activeCollaborators)} />
        <Kpi label="Vivier" value={String(vm.kpis.talentPoolCandidates)} />
        <Kpi label="Recrut." value={String(vm.kpis.hiresYearToDate)} accent />
      </section>

      <PracticeSection buckets={vm.practiceBreakdown} referenceYear={vm.kpis.referenceYear} />
      <RecruitmentStageList pipeline={vm.recruitmentPipeline} />

      <section className="rounded-xl border border-edito-border bg-edito-surface p-4">
        <div className="border-b border-edito-border pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-edito-navy">Missions</p>
          <h2 className="mt-1 text-sm font-bold text-edito-heading">Prochaines fins de mission</h2>
        </div>
        {vm.upcomingMissionEnds.length === 0 ? (
          <p className="py-4 text-center text-xs text-edito-muted">Aucune mission à échéance.</p>
        ) : (
          <ul className="divide-y divide-edito-border">
            {vm.upcomingMissionEnds.map((mission) => (
              <li key={mission.missionId} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-edito-ink">
                    {mission.collaboratorName ?? mission.missionTitle}
                  </span>
                  <span className="block truncate text-[11px] text-edito-muted">
                    {mission.missionTitle}
                    {mission.clientName ? ` · ${mission.clientName}` : ""}
                  </span>
                </span>
                <span
                  className={
                    mission.daysRemaining <= 30
                      ? "shrink-0 text-xs font-bold tabular-nums text-[var(--color-status-warning-ink)]"
                      : "shrink-0 text-xs font-semibold tabular-nums text-edito-body"
                  }
                >
                  {mission.daysRemaining} j
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-edito-border bg-edito-surface p-4">
        <div className="border-b border-edito-border pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-edito-navy">Disponibilité</p>
          <h2 className="mt-1 text-sm font-bold text-edito-heading">Intercontrat</h2>
        </div>
        {vm.interContractCollaborators.length === 0 ? (
          <p className="py-4 text-center text-xs text-edito-muted">Aucun collaborateur en intercontrat.</p>
        ) : (
          <ul className="divide-y divide-edito-border">
            {vm.interContractCollaborators.map((collaborator) => (
              <li key={collaborator.collaboratorId} className="flex flex-col gap-1.5 py-3">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-edito-ink">
                    {collaborator.fullName ?? "—"}
                  </span>
                  {compensationVisible && collaborator.cjm != null ? (
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-edito-body">
                      CJM {formatEuro(collaborator.cjm)}
                    </span>
                  ) : null}
                </span>
                <span className="truncate text-[11px] text-edito-muted">
                  {[collaborator.jobTitle, collaborator.practiceLabel].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="text-[11px] text-edito-muted">
                  Positionnements : {collaborator.activePositionings == null ? "—" : collaborator.activePositionings}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Link
          href="/consultants?section=collaborateurs"
          className="flex min-h-11 items-center justify-center rounded-lg border border-edito-border bg-edito-surface text-sm font-semibold text-edito-body"
        >
          Voir les collaborateurs
        </Link>
        <Link
          href="/consultants?section=candidats"
          className="flex min-h-11 items-center justify-center rounded-lg border border-edito-border bg-edito-surface text-sm font-semibold text-edito-body"
        >
          Ouvrir le recrutement
        </Link>
      </div>

      {vm.dataNotes.length > 0 ? (
        <ul className="flex flex-col gap-1 px-1 text-[10px] leading-relaxed text-edito-muted">
          {vm.dataNotes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
