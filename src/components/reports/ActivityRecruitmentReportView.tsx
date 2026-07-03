"use client"

import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import type { ActivityRecruitmentContent } from "@/app/(app)/reports/_data/reports-types"
import { HIRING_KANBAN_STAGES, RECRUITMENT_STAGES } from "@/lib/recruitment/recruitment-stages"

function BlockHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="h-px w-3 bg-brand-brass/60" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">
        {children}
      </h3>
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="block text-sm font-bold text-heading font-mono">{value}</span>
      {hint && <span className="block text-[10px] text-muted">{hint}</span>}
    </div>
  )
}

const HIRING_STEP_LABELS: Record<string, string> = Object.fromEntries(
  HIRING_KANBAN_STAGES.map((s) => [s.key, s.label])
)
const POSITIONING_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  RECRUITMENT_STAGES.flatMap((s) => s.statuses.map((status) => [status, s.label]))
)

export function ActivityRecruitmentReportView({
  content,
  isMobile = false,
}: {
  content: ActivityRecruitmentContent
  isMobile?: boolean
}) {
  const { facts, narrative, qaFlags } = content
  const failedFlags = qaFlags.filter((f) => !f.passed)
  const allPassed = failedFlags.length === 0
  const narrativeWarnings = Array.isArray(narrative.warnings)
    ? narrative.warnings.filter((warning): warning is string => typeof warning === "string" && warning.trim().length > 0)
    : []

  return (
    <div className="space-y-5">
      {/* Statut qualité */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider w-fit",
          allPassed
            ? "border-success/20 bg-success/10 text-success"
            : "border-warning/25 bg-warning/10 text-[var(--color-status-warning-ink)]"
        )}
      >
        <span className={cn("size-1.5 rounded-full", allPassed ? "bg-success" : "bg-warning")} />
        {allPassed ? "Qualité OK" : "À vérifier"}
      </div>
      {!allPassed && (
        <ul className="space-y-1 text-[11px] text-[var(--color-status-warning-ink)]">
          {failedFlags.map((flag, i) => (
            <li key={i}>• {flag.detail || flag.check}</li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-muted">
        Période : {formatDate(facts.period.startDate)} → {formatDate(facts.period.endDate)}
      </p>

      {/* Bloc 1 — Funnel recrutement interne */}
      <section>
        <BlockHeading>Recrutement interne (funnel)</BlockHeading>
        <div className="grid grid-cols-2 gap-3 mb-2">
          {facts.hiringFunnel.byStep.map((s) => (
            <Metric key={s.step} label={HIRING_STEP_LABELS[s.step] ?? s.step} value={String(s.count)} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Intégrations sur la période" value={String(facts.hiringFunnel.integratedThisPeriod)} />
        </div>
        {facts.hiringFunnel.closedThisPeriod.length > 0 && (
          <div className="mt-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted mb-1">
              Clôtures sur la période
            </span>
            <ul className="space-y-1 text-xs text-body">
              {facts.hiringFunnel.closedThisPeriod.map((c, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span>{c.closeReason ?? "Motif non renseigné"}</span>
                  <span className="font-mono text-[10px] text-muted">{c.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Bloc 2 — Funnel positionnement */}
      <section>
        <BlockHeading>Positionnement sur besoin (funnel)</BlockHeading>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Metric label="Proposés (période)" value={String(facts.positioningFunnel.proposedThisPeriod)} />
          <Metric label="Envoyés client (période)" value={String(facts.positioningFunnel.sentToClientThisPeriod)} />
        </div>
        <ul className="space-y-1 text-xs text-body">
          {facts.positioningFunnel.byStatus.map((s, i) => (
            <li key={i} className="flex items-center justify-between">
              <span>{POSITIONING_STATUS_LABELS[s.status] ?? s.status}</span>
              <span className="font-mono text-[10px] text-muted">{s.count}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Bloc 3 — Offres en attente */}
      {facts.pendingOffers.length > 0 && (
        <section>
          <BlockHeading>Offres en attente</BlockHeading>
          <ul className="space-y-1.5 text-xs text-body">
            {facts.pendingOffers.map((c) => (
              <li key={c.candidateId} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-semibold text-heading">{c.candidateName ?? "Candidat"}</span>
                  {c.offerStatus && <span className="text-muted"> — {c.offerStatus}</span>}
                </span>
                {c.deadline && (
                  <span className="shrink-0 font-mono text-[10px] text-muted">{formatDate(c.deadline)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bloc 4 — Disponibilités proches */}
      {facts.availableSoon.length > 0 && (
        <section>
          <BlockHeading>Disponibles prochainement</BlockHeading>
          <ul className="space-y-1 text-xs text-body">
            {facts.availableSoon.map((c) => (
              <li key={c.candidateId} className="flex items-center justify-between">
                <span className="font-semibold text-heading">{c.candidateName ?? "Candidat"}</span>
                {c.availableFrom && (
                  <span className="font-mono text-[10px] text-muted">{formatDate(c.availableFrom)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bloc 5 — Répartition practice / origine */}
      {(facts.byPractice.length > 0 || facts.byOrigin.length > 0) && (
        <section className="grid grid-cols-2 gap-4">
          {facts.byPractice.length > 0 && (
            <div>
              <BlockHeading>Par practice</BlockHeading>
              <ul className="space-y-1 text-xs text-body">
                {facts.byPractice.map((p, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>{p.practiceName ?? "Non renseignée"}</span>
                    <span className="font-mono text-[10px] text-muted">{p.activeCandidatesCount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {facts.byOrigin.length > 0 && (
            <div>
              <BlockHeading>Par origine</BlockHeading>
              <ul className="space-y-1 text-xs text-body">
                {facts.byOrigin.map((o, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>{o.source ?? "Non renseignée"}</span>
                    <span className="font-mono text-[10px] text-muted">{o.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Bloc 6 — Synthèse IA */}
      <section>
        <BlockHeading>Synthèse</BlockHeading>
        <p className="text-xs text-body leading-relaxed mb-3">{narrative.summary}</p>
        {narrative.priorities.length > 0 && (
          <div className="mb-3">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-primary mb-1">
              Priorités
            </span>
            <ul className="space-y-1 text-xs text-body">
              {narrative.priorities.map((p, i) => (
                <li key={i}>▸ {p}</li>
              ))}
            </ul>
          </div>
        )}
        {narrative.risks.length > 0 && (
          <div className="rounded border border-warning/20 bg-warning/5 px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--color-status-warning-ink)] mb-1">
              Risques
            </span>
            <ul className="space-y-1 text-xs text-body">
              {narrative.risks.map((r, i) => (
                <li key={i}>▸ {r}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {facts.caveats.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {facts.caveats.map((caveat, i) => (
            <p key={i}>⚠ {caveat}</p>
          ))}
        </div>
      )}

      {narrativeWarnings.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {narrativeWarnings.map((warning, i) => (
            <p key={i}>⚠ {warning}</p>
          ))}
        </div>
      )}

      <p className={cn("text-[10px] text-muted", isMobile ? "pb-2" : "")}>
        Données à jour au {formatDate(facts.dataCutoffAt)}
      </p>
    </div>
  )
}
