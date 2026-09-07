import type { ReactNode } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { formatEuro, formatDateNumeric } from "@/lib/formatters"
import type { DetailedProjectData } from "@/app/(app)/missions/_data/get-project-detail"
import { formatPeriod } from "./MissionOverview"
import {
  BadgeCheckIcon,
  BriefcaseIcon,
  CalendarRangeIcon,
  FileTextIcon,
  UserRoundIcon,
} from "./engagement-icons"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  Section centrale « Détail du projet » du shell Engagements.
//  Reprend la composition éditoriale de MissionOverview : grand header avec logo,
//  contexte et périmètre, avancement, tableau des phases et jalons, équipe projet.
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_STATUS_VARIANTS: Record<string, StatusPillVariant> = {
  planned: "neutral",
  in_progress: "inProgress",
  completed: "success",
  blocked: "danger",
}

const PHASE_STATUS_LABELS: Record<string, string> = {
  planned: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  blocked: "Bloqué",
}

function SectionCard({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-medium)] border border-border bg-surface p-5 shadow-2xs",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-primary">
        <span className="size-4">{icon}</span>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{title}</h2>
      </div>
      <div className="mt-3 text-sm text-body">{children}</div>
    </section>
  )
}

function MetricField({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3 py-3">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-primary">
        <span className="size-4">{icon}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
        <div className="mt-1 text-sm leading-6 text-body">{children}</div>
      </div>
    </div>
  )
}

export function ProjectOverview({ detail }: { detail: DetailedProjectData | null }) {
  if (!detail) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-8 text-center">
        <div>
          <span className="mx-auto block size-6 text-muted">
            <BriefcaseIcon />
          </span>
          <h2 className="mt-3 text-sm font-bold text-heading">Sélectionnez un projet</h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
            Le détail du projet et son pilotage opérationnel s’afficheront dans cet espace.
          </p>
        </div>
      </div>
    )
  }

  const company = Array.isArray(detail.companies) ? detail.companies[0] : detail.companies
  const isAnonymized = detail.ref_visibility === "anonymized"
  const clientName = isAnonymized
    ? (detail.ref_anonymized_label ?? "Client Anonymisé")
    : (company?.name || "Compte non renseigné")
  const metadata = company?.metadata as Record<string, unknown> | null | undefined
  const logoPath = isAnonymized ? null : (typeof metadata?.logo_path === "string" ? metadata.logo_path : null)
  const website = isAnonymized ? null : (company?.website ?? null)

  const phases = detail.project_phases ?? []
  const billingMilestones = detail.billing_milestones ?? []
  const teamMembers = detail.project_team_members ?? []
  const deliverables = detail.deliverables ?? []
  const technologies = detail.technologies ?? []
  const tags = detail.tags ?? []

  return (
    <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-[860px] px-8 py-7">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="border-b border-border pb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Projet Forfait
                </span>
                {detail.code && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                    {detail.code}
                  </span>
                )}
              </div>
              <h1 className="mt-2 font-heading text-2xl font-bold leading-8 tracking-tight text-heading">
                {detail.title}
              </h1>
              <p className="mt-2 text-sm text-body">
                <strong className="font-bold text-heading">{clientName}</strong>
                {website ? (
                  <span className="ml-2 text-xs text-muted">({website.replace(/^https?:\/\//, "")})</span>
                ) : null}
              </p>
            </div>
            <div className="flex size-24 shrink-0 items-center justify-center rounded-xl border border-border bg-surface p-2 shadow-2xs">
              <CompanyLogo
                name={clientName}
                logoPath={logoPath}
                website={website}
                size="2xl"
                fill
                className="border-0 bg-transparent"
              />
            </div>
          </div>

          {/* ── Barre d'avancement globale ─────────────────────────────── */}
          <div className="mt-5 rounded-lg border border-border/80 bg-surface px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-heading">Avancement du projet</span>
              <span className="font-mono font-bold text-primary">{detail.progress_pct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, detail.progress_pct))}%` }}
              />
            </div>
          </div>
        </header>

        {/* ── Métadonnées Période & Technologies ─────────────────────── */}
        <div className="my-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <MetricField icon={<CalendarRangeIcon />} label="Période du projet">
            <span className="font-medium text-heading">
              {formatPeriod(detail.start_date_planned, detail.end_date_planned)}
            </span>
          </MetricField>

          <MetricField icon={<BadgeCheckIcon />} label="Statut opérationnel">
            <div className="flex items-center gap-2">
              <StatusPill
                label={detail.status === "active" ? "En cours" : detail.status}
                variant={detail.status === "active" ? "inProgress" : "neutral"}
                dot
              />
              <span className="text-xs text-muted">
                {phases.filter((p) => p.status === "completed").length}/{phases.length} phase{phases.length > 1 ? "s" : ""} terminée{phases.length > 1 ? "s" : ""}
              </span>
            </div>
          </MetricField>
        </div>

        {/* ── Description & Contexte ──────────────────────────────────── */}
        <SectionCard icon={<FileTextIcon />} title="Description & Périmètre" className="mb-6">
          <p className="whitespace-pre-line text-sm leading-relaxed text-body">
            {detail.description?.trim() || "Aucune description détaillée renseignée pour ce projet."}
          </p>

          {/* Livrables contractuels */}
          {deliverables.length > 0 && (
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Livrables attendus ({deliverables.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {deliverables.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-body">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technologies & Tags */}
          {(technologies.length > 0 || tags.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                >
                  {tech}
                </span>
              ))}
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md border border-border bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Phases du projet ────────────────────────────────────────── */}
        <SectionCard icon={<CalendarRangeIcon />} title={`Phases du projet (${phases.length})`} className="mb-6">
          {phases.length === 0 ? (
            <p className="text-xs text-muted">Aucune phase définie pour ce projet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {phases.map((phase, idx) => {
                const variant = PHASE_STATUS_VARIANTS[phase.status] ?? "neutral"
                const label = PHASE_STATUS_LABELS[phase.status] ?? phase.status

                return (
                  <div key={phase.id || idx} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-heading text-xs">
                          {idx + 1}. {phase.label}
                        </span>
                        <StatusPill label={label} variant={variant} dot className="px-2 py-0.5 text-[11px]" />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                        <span>
                          {formatPeriod(phase.start_date_planned, phase.end_date_planned)}
                        </span>
                        {(phase.consumed_days > 0 || phase.planned_days) && (
                          <span>
                            · {phase.consumed_days} j consommés / {phase.planned_days ?? "—"} j prévus
                          </span>
                        )}
                      </div>
                    </div>

                    {phase.deliverables && phase.deliverables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {phase.deliverables.map((d, dIdx) => (
                          <span
                            key={dIdx}
                            className="rounded border border-border bg-canvas px-1.5 py-0.5 text-[10px] text-muted"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Jalons de facturation ────────────────────────────────────── */}
        {billingMilestones.length > 0 && (
          <SectionCard icon={<BriefcaseIcon />} title={`Jalons de facturation (${billingMilestones.length})`} className="mb-6">
            <div className="overflow-hidden rounded-lg border border-border/80">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-canvas/70 text-[10px] font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2">Jalon</th>
                    <th className="px-3 py-2 text-right">Quote-part</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                    <th className="px-3 py-2 text-center">Échéance</th>
                    <th className="px-3 py-2 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {billingMilestones.map((milestone, mIdx) => (
                    <tr key={mIdx} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-heading">
                        {milestone.label || `Jalon ${mIdx + 1}`}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted">
                        {milestone.pct ? `${milestone.pct}%` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-heading">
                        {milestone.amount ? formatEuro(milestone.amount) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center text-muted">
                        {milestone.due_date ? formatDateNumeric(milestone.due_date) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {milestone.invoiced_at ? (
                          <span className="inline-flex rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                            Facturé
                          </span>
                        ) : (
                          <span className="inline-flex rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                            En attente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ── Équipe projet ───────────────────────────────────────────── */}
        {teamMembers.length > 0 && (
          <SectionCard icon={<UserRoundIcon />} title={`Équipe projet (${teamMembers.length})`} className="mb-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {teamMembers.map((member, idx) => (
                <div
                  key={member.id || idx}
                  className="flex items-start gap-3 rounded-lg border border-border/80 bg-surface p-3.5"
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                    {member.fullName
                      ? member.fullName
                          .split(/\s+/)
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "CP"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-heading text-xs truncate">
                        {member.fullName || member.role_label}
                      </span>
                      {member.is_project_lead && (
                        <span className="rounded bg-brand-brass/15 px-1.5 py-0.2 text-[9px] font-bold text-brand-brass border border-brand-brass/25 shrink-0">
                          Lead
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5 truncate">
                      {member.role_label}
                      {member.seniority ? ` · ${member.seniority}` : ""}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-muted">
                      <span>{member.actual_days} j réalisés</span>
                      {member.planned_days ? <span>/ {member.planned_days} j prévus</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  )
}
