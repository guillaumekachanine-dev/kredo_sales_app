"use client"

import Link from "next/link"
import { useState } from "react"
import { MobilePageHeader } from "@/components/ui/mobile"
import { formatEuro } from "@/lib/formatters"
import type {
  ConsultantsPracticeBucket,
  ConsultantsSyntheseViewModel,
} from "@/features/consultants/data/consultants-synthese.types"

type Metric = "collaborators" | "candidates"

const METRIC_LABEL: Record<Metric, string> = {
  collaborators: "Collaborateurs",
  candidates: "Candidats",
}

interface SyntheseMobileProps {
  vm: ConsultantsSyntheseViewModel
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-3 text-center">
      <span className="text-2xl font-bold tracking-tight text-heading">{value}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
    </div>
  )
}

function HtmlBarRow({
  label,
  value,
  max,
  colorHex,
}: {
  label: string
  value: number
  max: number
  colorHex: string | null
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs font-semibold text-body" title={label}>
        {label}
      </span>
      <span className="relative h-4 flex-1 overflow-hidden rounded-[var(--radius-small)] bg-canvas">
        <span
          className="absolute inset-y-0 left-0 rounded-[var(--radius-small)]"
          style={{
            width: `${Math.max(3, (value / max) * 100)}%`,
            backgroundColor: colorHex ?? "var(--color-muted)",
            opacity: 0.85,
          }}
        />
      </span>
      <span className="w-6 shrink-0 text-right text-xs font-bold text-heading">{value}</span>
    </div>
  )
}

function PracticeSection({ buckets }: { buckets: readonly ConsultantsPracticeBucket[] }) {
  const [metric, setMetric] = useState<Metric>("collaborators")
  const rows = buckets.filter((b) => b[metric] > 0)
  const max = Math.max(1, ...rows.map((b) => b[metric]))

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-medium)] border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Par practice</h2>
        <div className="inline-flex rounded-[var(--radius-medium)] border border-border p-0.5">
          {(Object.keys(METRIC_LABEL) as Metric[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              aria-pressed={metric === key}
              className={
                metric === key
                  ? "rounded-[var(--radius-small)] bg-primary/[0.1] px-2.5 py-1 text-[11px] font-semibold text-primary"
                  : "rounded-[var(--radius-small)] px-2.5 py-1 text-[11px] font-semibold text-muted"
              }
            >
              {METRIC_LABEL[key]}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">Aucun rattachement.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((b) => (
            <HtmlBarRow
              key={b.key ?? "__other__"}
              label={b.label}
              value={b[metric]}
              max={max}
              colorHex={b.colorHex}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function SyntheseMobile({ vm }: SyntheseMobileProps) {
  const pipelineMax = Math.max(1, ...vm.recruitmentPipeline.byStep.map((s) => s.count))
  const compensationVisible = vm.interContractCollaborators.some((c) => c.compensationVisible)

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <MobilePageHeader
        eyebrow="Consultants"
        title="Synthèse"
        description="Effectif, vivier et pipeline de recrutement en un coup d'œil."
      />

      <div className="flex gap-2">
        <Kpi label="Collab." value={String(vm.kpis.activeCollaborators)} />
        <Kpi label="Vivier" value={String(vm.kpis.talentPoolCandidates)} />
        <Kpi label={`Recrut. ${vm.kpis.referenceYear}`} value={String(vm.kpis.hiresYearToDate)} />
      </div>

      <PracticeSection buckets={vm.practiceBreakdown} />

      <section className="flex flex-col gap-2 rounded-[var(--radius-medium)] border border-border bg-surface p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Prochaines fins de mission
        </h2>
        {vm.upcomingMissionEnds.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted">Aucune mission à échéance.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {vm.upcomingMissionEnds.map((m) => (
              <li key={m.missionId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-heading">
                    {m.collaboratorName ?? m.missionTitle}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {m.missionTitle}
                    {m.clientName ? ` · ${m.clientName}` : ""}
                  </span>
                </span>
                <span
                  className={
                    m.daysRemaining <= 30
                      ? "shrink-0 text-xs font-bold text-[var(--color-status-warning-ink)]"
                      : "shrink-0 text-xs font-semibold text-body"
                  }
                >
                  {m.daysRemaining} j
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-[var(--radius-medium)] border border-border bg-surface p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Intercontrat</h2>
        {vm.interContractCollaborators.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted">Aucun collaborateur en intercontrat.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {vm.interContractCollaborators.map((c) => (
              <li key={c.collaboratorId} className="flex flex-col gap-1 py-2.5">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-heading">
                    {c.fullName ?? "—"}
                  </span>
                  {compensationVisible && c.cjm != null ? (
                    <span className="shrink-0 text-[11px] text-muted">CJM {formatEuro(c.cjm)}</span>
                  ) : null}
                </span>
                <span className="truncate text-[11px] text-muted">
                  {[c.jobTitle, c.practiceLabel].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="text-[11px] text-muted">
                  {c.activePositionings == null
                    ? "Positionnements : —"
                    : `Positionnements en cours : ${c.activePositionings}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-[var(--radius-medium)] border border-border bg-surface p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Pipeline de recrutement
        </h2>
        <p className="text-[11px] text-muted">
          {vm.recruitmentPipeline.totalActive} en cours ·{" "}
          {vm.recruitmentPipeline.hiresYearToDate} recruté(s) · {vm.recruitmentPipeline.closedNotHiredYearToDate} sans suite
        </p>
        {vm.recruitmentPipeline.totalActive === 0 ? (
          <p className="py-3 text-center text-xs text-muted">Aucun processus en cours.</p>
        ) : (
          <div className="mt-1 flex flex-col gap-2">
            {vm.recruitmentPipeline.byStep.map((s) => (
              <HtmlBarRow
                key={s.step}
                label={s.label}
                value={s.count}
                max={pipelineMax}
                colorHex={null}
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Link
          href="/consultants?section=collaborateurs"
          className="flex min-h-11 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-sm font-semibold text-body"
        >
          Voir les collaborateurs
        </Link>
        <Link
          href="/recruitment"
          className="flex min-h-11 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-sm font-semibold text-body"
        >
          Ouvrir le recrutement
        </Link>
      </div>

      {vm.dataNotes.length > 0 ? (
        <ul className="flex flex-col gap-1 px-1 text-[10px] leading-relaxed text-muted">
          {vm.dataNotes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
