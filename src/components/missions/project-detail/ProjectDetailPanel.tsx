"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { SectionTab } from "@/lib/tabs/tab-types"
import {
  getProjectDetail,
  type DetailedProjectBillingMilestone,
  type DetailedProjectData,
  type DetailedProjectPhase,
} from "@/app/(app)/missions/_data/get-project-detail"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { KpiCard } from "@/components/ui/KpiCard"
import { formatEuro, formatPct, formatDateNumeric } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface ProjectDetailPanelProps {
  tab: SectionTab
}

type TabType = "synthesis" | "phases" | "team" | "governance" | "financial"

const PROJECT_STEPS: Array<{ id: TabType; label: string }> = [
  { id: "synthesis", label: "Synthèse" },
  { id: "phases", label: "Phases" },
  { id: "team", label: "Équipe" },
  { id: "governance", label: "Gouvernance" },
  { id: "financial", label: "Financier" },
]

const PHASE_STATUS: Record<string, StatusPillVariant> = {
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

type FinancialHealthTone = "green" | "yellow" | "orange" | "red"
type PhasePair = [DetailedProjectPhase, DetailedProjectPhase | null]
type TimelinePhase = {
  id: string
  index: number
  label: string
  status: string
  startDate: string | null
  endDate: string | null
  startMs: number | null
  endMs: number | null
  leftPct: number
  widthPct: number
  centerPct: number
  isCurrent: boolean
}

function safeParseScope(scope: DetailedProjectData["scope"]) {
  if (!scope) return {}
  if (typeof scope === "string") {
    try {
      return JSON.parse(scope)
    } catch {
      return {}
    }
  }
  return scope
}

function getProjectDurationMonths(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  return Math.max(1, Math.round(diffDays / 30.44))
}

function getFinancialHealth(project: DetailedProjectData): {
  tone: FinancialHealthTone
  label: string
  detail: string
} {
  const actual = project.actual_margin_pct
  const target = project.target_margin_pct

  if (actual === null || target === null) {
    return {
      tone: "yellow",
      label: "À l’attendu",
      detail: "Visibilité financière partielle",
    }
  }

  const gap = actual - target
  if (gap >= 0) {
    return {
      tone: "green",
      label: "Conduite financière impeccable",
      detail: `Marge réelle ${formatPct(actual)} pour un objectif de ${formatPct(target)}`,
    }
  }
  if (gap >= -3) {
    return {
      tone: "yellow",
      label: "À l’attendu",
      detail: `Écart contenu de ${Math.abs(gap).toFixed(1)} pts vs objectif`,
    }
  }
  if (gap >= -8) {
    return {
      tone: "orange",
      label: "Risque sérieux identifié",
      detail: `Écart de ${Math.abs(gap).toFixed(1)} pts vs objectif`,
    }
  }
  return {
    tone: "red",
    label: "Dérive constatée, projet en péril",
    detail: `Sous-performance de ${Math.abs(gap).toFixed(1)} pts vs objectif`,
  }
}

function getFinancialToneClasses(tone: FinancialHealthTone) {
  switch (tone) {
    case "green":
      return "bg-success"
    case "yellow":
      return "bg-warning"
    case "orange":
      return "bg-orange-500"
    case "red":
      return "bg-danger"
  }
}

function extractGovernanceSignals(project: DetailedProjectData) {
  const scope = safeParseScope(project.scope)
  const included = Array.isArray(scope?.included) ? scope.included : []
  const deliverables = Array.isArray(project.deliverables) ? project.deliverables : []
  const allSignals = [...included, ...deliverables]

  return {
    sla: allSignals.filter((item) => /sla|incident|mco|support/i.test(item)),
    copil: allSignals.filter((item) => /copil|reporting|comit/i.test(item)),
    satisfaction: allSignals.filter((item) => /satisfaction|qualit|bonus/i.test(item)),
  }
}

function getDateMs(date: string | null | undefined) {
  if (!date) return null
  const value = new Date(date).getTime()
  return Number.isNaN(value) ? null : value
}

function getCurrentPhaseId(phases: DetailedProjectData["project_phases"]): string | null {
  if (!phases || phases.length === 0) return null
  const inProgress = phases.find((phase) => phase.status === "in_progress")
  if (inProgress) return inProgress.id

  const now = Date.now()
  const activeByDate = phases.find((phase) => {
    const startMs = getDateMs(phase.start_date_planned)
    const endMs = getDateMs(phase.end_date_planned)
    return startMs !== null && endMs !== null && startMs <= now && now <= endMs
  })
  if (activeByDate) return activeByDate.id

  return phases[0]?.id ?? null
}

function buildTimelinePhases(phases: DetailedProjectData["project_phases"]): TimelinePhase[] {
  if (!phases || phases.length === 0) return []

  const currentPhaseId = getCurrentPhaseId(phases)
  const phasesWithTime = phases.map((phase, index) => ({
    phase,
    index,
    startMs: getDateMs(phase.start_date_planned),
    endMs: getDateMs(phase.end_date_planned),
  }))

  const datedStarts = phasesWithTime.map((item) => item.startMs).filter((value): value is number => value !== null)
  const datedEnds = phasesWithTime.map((item) => item.endMs).filter((value): value is number => value !== null)
  const minStart = datedStarts.length > 0 ? Math.min(...datedStarts) : null
  const maxEnd = datedEnds.length > 0 ? Math.max(...datedEnds) : null
  const totalSpan = minStart !== null && maxEnd !== null ? Math.max(maxEnd - minStart, 1) : null

  return phasesWithTime.map(({ phase, index, startMs, endMs }) => {
    if (minStart !== null && totalSpan !== null && startMs !== null && endMs !== null) {
      const leftPct = ((startMs - minStart) / totalSpan) * 100
      const widthPct = Math.max(((endMs - startMs) / totalSpan) * 100, 6)
      return {
        id: phase.id,
        index: index + 1,
        label: phase.label,
        status: phase.status,
        startDate: phase.start_date_planned,
        endDate: phase.end_date_planned,
        startMs,
        endMs,
        leftPct,
        widthPct,
        centerPct: leftPct + widthPct / 2,
        isCurrent: phase.id === currentPhaseId,
      }
    }

    const fallbackWidth = 100 / phasesWithTime.length
    const leftPct = index * fallbackWidth
    return {
      id: phase.id,
      index: index + 1,
      label: phase.label,
      status: phase.status,
      startDate: phase.start_date_planned,
      endDate: phase.end_date_planned,
      startMs,
      endMs,
      leftPct,
      widthPct: fallbackWidth,
      centerPct: leftPct + fallbackWidth / 2,
      isCurrent: phase.id === currentPhaseId,
    }
  })
}

function pairPhases(phases: DetailedProjectData["project_phases"]): PhasePair[] {
  if (!phases || phases.length === 0) return []
  const pairs: PhasePair[] = []
  for (let i = 0; i < phases.length; i += 2) {
    pairs.push([phases[i], phases[i + 1] ?? null])
  }
  return pairs
}

function PhaseDependencyArrow() {
  return (
    <div className="hidden md:flex items-center justify-center h-full" aria-hidden="true">
      <svg width="36" height="24" viewBox="0 0 36 24" className="overflow-visible text-border">
        <path d="M2 12H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 5L31 12L22 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function ProjectPhaseCard({
  phase,
}: {
  phase: DetailedProjectPhase
}) {
  const variant = PHASE_STATUS[phase.status] ?? "neutral"
  const label = PHASE_STATUS_LABELS[phase.status] ?? phase.status
  const plannedDays = phase.planned_days ?? 0
  const progressPct =
    plannedDays > 0
      ? Math.min(100, Math.round((phase.consumed_days / plannedDays) * 100))
      : 0

  return (
    <SurfaceCard className="h-full rounded-[var(--radius-medium)] border-border/70 bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="font-semibold text-heading text-sm leading-snug">
            {phase.label}
          </span>
          {phase.start_date_planned && phase.end_date_planned ? (
            <span className="text-[11px] text-muted font-medium">
              {formatDateNumeric(phase.start_date_planned)} au{" "}
              {formatDateNumeric(phase.end_date_planned)}
            </span>
          ) : null}
        </div>
        <StatusPill label={label} variant={variant} dot={true} />
      </div>

      {plannedDays > 0 ? (
        <div className="flex flex-col gap-1.5 w-full mt-1">
          <div className="flex justify-between text-[10px] font-medium text-muted">
            <span>Consommé : {phase.consumed_days} j / {plannedDays} j</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#E56A3F] transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      ) : (
        <div className="text-[10px] font-medium text-muted mt-1">
          Consommé : <span className="font-semibold text-body">{phase.consumed_days} j</span> (aucun budget prévu)
        </div>
      )}

      {phase.deliverables && phase.deliverables.length > 0 && (
        <div className="mt-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">
            Livrables de la phase
          </span>
          <ul className="list-disc pl-4 space-y-1.5 text-xs text-body">
            {phase.deliverables.map((del, idx) => (
              <li key={idx}>{del}</li>
            ))}
          </ul>
        </div>
      )}
    </SurfaceCard>
  )
}

export function ProjectDetailPanel({ tab }: ProjectDetailPanelProps) {
  const [project, setProject] = useState<DetailedProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<TabType>("synthesis")

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await getProjectDetail(tab.entityId)
        if (!active) return

        if (res.error) {
          setError(res.error)
        } else {
          setProject(res.data)
        }
      } catch {
        if (!active) return
        setError("Une erreur est survenue lors de la récupération des détails.")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [tab.entityId])

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3 pb-5 border-b border-border">
          <div className="h-4 bg-border/40 rounded w-24 animate-pulse" />
          <div className="h-8 bg-border/40 rounded w-1/3 animate-pulse" />
        </div>
        <div className="h-48 bg-border/30 rounded w-full animate-pulse" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col items-center justify-center py-16">
        <p className="text-sm font-semibold text-danger">{error ?? "Projet introuvable"}</p>
      </div>
    )
  }

  const company = Array.isArray(project.companies) ? project.companies[0] : project.companies
  const isAnonymized = project.ref_visibility === "anonymized"
  const clientName = isAnonymized ? (project.ref_anonymized_label ?? "Client Anonymisé") : (company?.name ?? "—")
  const logoPath =
    !isAnonymized && company?.metadata && typeof company.metadata.logo_path === "string"
      ? company.metadata.logo_path
      : null
  const website = isAnonymized ? null : company?.website

  const scopeObj = safeParseScope(project.scope)
  const scopeIncluded: string[] = Array.isArray(scopeObj?.included) ? scopeObj.included : []
  const scopeExcluded: string[] = Array.isArray(scopeObj?.excluded) ? scopeObj.excluded : []
  const durationMonths = getProjectDurationMonths(project.start_date_planned, project.end_date_planned)
  const dateRangeLabel =
    project.start_date_planned && project.end_date_planned
      ? `${formatDateNumeric(project.start_date_planned)} au ${formatDateNumeric(project.end_date_planned)}`
      : "Dates non renseignées"
  const financialHealth = getFinancialHealth(project)
  const governanceSignals = extractGovernanceSignals(project)
  const billingMilestones = Array.isArray(project.billing_milestones)
    ? (project.billing_milestones as DetailedProjectBillingMilestone[])
    : []
  const billedAmount = billingMilestones.reduce(
    (sum, milestone) => sum + (milestone.invoiced_at ? Number(milestone.amount ?? 0) : 0),
    0
  )
  const remainingAmount =
    project.contract_amount !== null ? Math.max(project.contract_amount - billedAmount, 0) : null
  const timelinePhases = buildTimelinePhases(project.project_phases)
  const phasePairs = pairPhases(project.project_phases)

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-[1360px] px-7 pb-12 pt-5">
        <header className="border-b border-border pb-5">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div className="min-w-0">
              <p className="text-xs text-muted">Engagements <span className="mx-1.5 text-border">/</span> Projets <span className="mx-1.5 text-border">/</span> <span className="font-medium text-primary">{project.title}</span></p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Projet</span>
                {project.code && <span className="font-mono text-[11px] text-muted">{project.code}</span>}
                <span className="h-4 w-px bg-border" />
                <h1 className="font-heading text-lg font-bold tracking-tight text-heading">{project.title}</h1>
              </div>
            </div>

            <div className="flex min-w-[17rem] shrink-0 items-center gap-4 self-start border-l border-border pl-6">
              <CompanyLogo name={clientName} logoPath={logoPath} website={website} size="lg" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Client</span>
                <span className="mt-1 font-heading text-lg font-bold tracking-tight text-heading">{clientName}</span>
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Étapes du projet" role="tablist" className="mx-auto mt-8 grid max-w-5xl grid-cols-5 items-center">
          {PROJECT_STEPS.map((step, index) => (
            <div key={step.id} className="relative flex min-w-0 items-center last:justify-end">
              <button
                id={`project-step-${step.id}`}
                type="button"
                role="tab"
                aria-selected={activeSubTab === step.id}
                aria-controls="project-step-content"
                onClick={() => setActiveSubTab(step.id)}
                className={cn(
                  "relative z-10 inline-flex items-center gap-2 bg-canvas pr-3 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E56A3F]/40",
                  activeSubTab === step.id ? "text-[#C6522E]" : "text-body hover:text-heading",
                )}
              >
                <span className={cn("flex size-8 items-center justify-center rounded-full border text-sm font-medium", activeSubTab === step.id ? "border-[#E56A3F] bg-[#E56A3F] text-white" : "border-[#F3C4B1] bg-canvas text-body")}>{index + 1}</span>
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
              {index < PROJECT_STEPS.length - 1 ? <span aria-hidden className="absolute left-8 right-0 h-px bg-[#F3C4B1]" /> : null}
            </div>
          ))}
        </nav>

        <main id="project-step-content" role="tabpanel" aria-labelledby={`project-step-${activeSubTab}`} className="mt-8 min-h-[31rem] border-t border-border pt-7">
      {activeSubTab === "synthesis" && (
        <div className="animate-fade-in motion-reduce:animate-none flex flex-col gap-6">
          {/* 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="CA Contractuel"
              value={formatEuro(project.contract_amount)}
              accent="none"
              size="compact"
              compactLayout={true}
              className="min-h-[6.5rem]"
            />
            <KpiCard
              label="Durée"
              value={durationMonths ? `${durationMonths} mois` : "—"}
              context={dateRangeLabel}
              accent="none"
              size="compact"
              compactLayout={true}
              className="min-h-[6.5rem]"
              contextClassName="text-muted"
            />
            <KpiCard
              label="État financier"
              value={
                <span className="flex items-center gap-2 text-left">
                  <span
                    className={cn("inline-flex size-3 rounded-full shrink-0", getFinancialToneClasses(financialHealth.tone))}
                    aria-hidden="true"
                  />
                  <span className="text-base md:text-lg leading-snug">{financialHealth.label}</span>
                </span>
              }
              context={financialHealth.detail}
              accent="none"
              size="compact"
              compactLayout={true}
              className="min-h-[6.5rem]"
              contextClassName="text-muted"
            />
          </div>

          {/* Description */}
          {project.description && (
            <section className="border-t border-border pt-6 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-heading">Description</h3>
              <p className="text-xs text-body whitespace-pre-wrap leading-relaxed">
                {project.description}
              </p>
            </section>
          )}

          {/* Scope (Périmètre) */}
          {(scopeIncluded.length > 0 || scopeExcluded.length > 0) && (
            <section className="border-t border-border pt-6 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-heading">Périmètre du Projet</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scopeIncluded.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-success uppercase tracking-wider block mb-2">
                      Inclus
                    </span>
                    <ul className="list-disc pl-4 space-y-1.5 text-xs text-body">
                      {scopeIncluded.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {scopeExcluded.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-danger uppercase tracking-wider block mb-2">
                      Exclus
                    </span>
                    <ul className="list-disc pl-4 space-y-1.5 text-xs text-body">
                      {scopeExcluded.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {project.technologies && project.technologies.length > 0 && (
            <section className="border-t border-border pt-6 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-heading">Environnement Technologique</h3>
              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="bg-canvas border border-border/60 px-2.5 py-1 rounded-full text-[11px] font-semibold text-body"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Deliverables */}
          {project.deliverables && project.deliverables.length > 0 && (
            <section className="border-t border-border pt-6 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-heading">Livrables Majeurs</h3>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-body">
                {project.deliverables.map((del, idx) => (
                  <li key={idx}>{del}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Lessons Learned */}
          {project.lessons_learned && (
            <section className="border-t border-border pt-6 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-heading">Retour d&apos;expérience</h3>
              <p className="text-xs text-body whitespace-pre-wrap leading-relaxed">
                {project.lessons_learned}
              </p>
            </section>
          )}
        </div>
      )}

      {activeSubTab === "governance" && (
        <div className="animate-fade-in motion-reduce:animate-none grid grid-cols-1 gap-8 xl:grid-cols-3 xl:divide-x xl:divide-border">
          <section className="flex flex-col gap-3 border-t border-border pt-5 xl:border-t-0 xl:pt-0 xl:pr-7">
            <h3 className="text-sm font-bold text-heading">SLA</h3>
            {governanceSignals.sla.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-body">
                {governanceSignals.sla.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted leading-relaxed">
                Aucun SLA structuré n’est encore renseigné sur cette fiche projet.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3 border-t border-border pt-5 xl:border-t-0 xl:pt-0 xl:px-7">
            <h3 className="text-sm font-bold text-heading">Enquêtes de satisfaction</h3>
            {governanceSignals.satisfaction.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-body">
                {governanceSignals.satisfaction.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted leading-relaxed">
                Aucune enquête de satisfaction n’est documentée à ce stade.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3 border-t border-border pt-5 xl:border-t-0 xl:pt-0 xl:pl-7">
            <h3 className="text-sm font-bold text-heading">Supports de COPIL</h3>
            {governanceSignals.copil.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-body">
                {governanceSignals.copil.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted leading-relaxed">
                Aucun support de COPIL n’est encore référencé sur la fiche.
              </p>
            )}
          </section>
        </div>
      )}

      {activeSubTab === "financial" && (
        <div className="animate-fade-in motion-reduce:animate-none flex flex-col gap-8">
          <section className="border-t border-border pt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-heading">Feuille de route financière initiale</h3>
              <p className="text-xs text-muted">
                Jalons vendus au lancement du projet et séquencement prévu de la facturation.
              </p>
            </div>
            {billingMilestones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {billingMilestones.map((milestone, index) => (
                  <div
                    key={`${milestone.label}-${index}`}
                    className="rounded-[var(--radius-medium)] border border-border/50 bg-canvas/30 p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-heading">{milestone.label}</span>
                      {milestone.pct !== undefined && milestone.pct !== null ? (
                        <span className="text-xs font-bold text-primary">{milestone.pct}%</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-body font-medium">
                      {formatEuro(milestone.amount ?? null)}
                    </div>
                    <div className="text-[11px] text-muted">
                      Échéance : {milestone.due_date ? formatDateNumeric(milestone.due_date) : "récurrente / non datée"}
                    </div>
                    <div className="text-[11px] text-muted">
                      Facturation : {milestone.invoiced_at ? `émise le ${formatDateNumeric(milestone.invoiced_at)}` : "non émise"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">Aucun jalon financier initial n’est renseigné.</p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:divide-x md:divide-border">
            <section className="border-t border-border pt-6 flex flex-col gap-3 md:border-t-0 md:pt-0 md:pr-8">
              <h3 className="text-sm font-bold text-heading">État actuel du projet</h3>
              <ul className="space-y-2 text-xs text-body">
                <li>CA vendu : <span className="font-semibold text-heading">{formatEuro(project.contract_amount)}</span></li>
                <li>Coût cible : <span className="font-semibold text-heading">{formatEuro(project.contract_amount !== null && project.target_margin_pct !== null ? project.contract_amount * (1 - project.target_margin_pct / 100) : null)}</span></li>
                <li>Coût constaté : <span className="font-semibold text-heading">{formatEuro(project.contract_amount !== null && project.actual_margin_pct !== null ? project.contract_amount * (1 - project.actual_margin_pct / 100) : null)}</span></li>
                <li>Marge cible : <span className="font-semibold text-heading">{formatPct(project.target_margin_pct)}</span></li>
                <li>Marge actuelle : <span className="font-semibold text-heading">{formatPct(project.actual_margin_pct)}</span></li>
              </ul>
              <p className="border-l-2 border-[#F3C4B1] pl-3 text-xs leading-5 text-body">
                {project.actual_margin_pct !== null && project.target_margin_pct !== null ? (
                  project.actual_margin_pct >= project.target_margin_pct ? (
                    <span>Le projet génère à date un niveau de productivité supérieur ou égal à la cible vendue.</span>
                  ) : (
                    <span>Le projet présente une dérive budgétaire à surveiller au regard de la cible vendue.</span>
                  )
                ) : (
                  <span>Les données de marge sont incomplètes pour qualifier précisément les gains ou dérives.</span>
                )}
              </p>
            </section>

            <section className="border-t border-border pt-6 flex flex-col gap-3 md:border-t-0 md:pt-0 md:pl-8">
              <h3 className="text-sm font-bold text-heading">État de la facturation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-[var(--radius-medium)] border border-border/50 bg-canvas/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Jalons</div>
                  <div className="mt-2 text-lg font-bold text-heading">{billingMilestones.length}</div>
                </div>
                <div className="rounded-[var(--radius-medium)] border border-border/50 bg-canvas/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Déjà facturé</div>
                  <div className="mt-2 text-lg font-bold text-heading">{formatEuro(billedAmount)}</div>
                </div>
                <div className="rounded-[var(--radius-medium)] border border-border/50 bg-canvas/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Reste à facturer</div>
                  <div className="mt-2 text-lg font-bold text-heading">{formatEuro(remainingAmount)}</div>
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {billingMilestones.some((milestone) => !milestone.invoiced_at)
                  ? "Au moins un jalon vendu n’a pas encore été facturé."
                  : billingMilestones.length > 0
                    ? "Tous les jalons renseignés sont facturés."
                    : "Aucun suivi de facturation n’est disponible pour ce projet."}
              </p>
            </section>
          </div>
        </div>
      )}

      {activeSubTab === "phases" && (
        <div className="animate-fade-in motion-reduce:animate-none flex flex-col gap-4">
          {(!project.project_phases || project.project_phases.length === 0) ? (
            <div className="text-center py-12 text-sm text-muted">
              Aucune phase planifiée pour ce projet.
            </div>
          ) : (
            <>
              <section className="border-y border-border px-4 py-5 md:px-6 md:py-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C6522E]">
                      Avancement des phases
                    </p>
                    <h3 className="mt-1 font-heading text-lg font-bold text-heading">Chronologie du projet</h3>
                  </div>

                  <div className="relative overflow-x-auto pb-1">
                    <div className="relative min-w-[640px] h-36">
                      <div className="absolute left-0 right-0 top-[5.2rem] h-px bg-border" />
                      {timelinePhases.map((phase) => (
                        <div
                          key={phase.id}
                          className="absolute top-0"
                          style={{
                            left: `${phase.leftPct}%`,
                            width: `${phase.widthPct}%`,
                            minWidth: "5.25rem",
                          }}
                        >
                          <div className="px-1">
                            <div className="min-h-[3.5rem]">
                              <div className="flex items-start gap-2 border-l border-[#F3C4B1] px-2.5 py-2">
                                <span className="font-heading text-xl font-bold leading-none text-[#C6522E] tabular-nums">
                                  {String(phase.index).padStart(2, "0")}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-[11px] font-semibold leading-tight text-heading">
                                    {phase.label}
                                  </div>
                                  <div className="mt-1 text-[10px] text-muted">
                                    {phase.startDate ? formatDateNumeric(phase.startDate) : "—"}{" "}
                                    <span className="text-border">→</span>{" "}
                                    {phase.endDate ? formatDateNumeric(phase.endDate) : "—"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="h-[1.625rem]" />

                            <div
                              className={cn(
                                "relative h-2 rounded-full bg-border/70",
                                phase.isCurrent
                                  ? "bg-[#E56A3F]"
                                  : "bg-border/70"
                              )}
                            />
                            <div
                              className={cn(
                                "absolute top-[4.95rem] -translate-x-1/2 size-3 rounded-full border-2 border-canvas bg-border",
                                phase.isCurrent && "size-4 bg-[#E56A3F]"
                              )}
                              style={{ left: `${phase.centerPct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-4">
                {phasePairs.map(([firstPhase, secondPhase]) => (
                  <div
                    key={`${firstPhase.id}-${secondPhase?.id ?? "single"}`}
                    className={cn(
                      "grid gap-3 md:gap-4 items-stretch",
                      secondPhase ? "grid-cols-1 md:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)]" : "grid-cols-1"
                    )}
                  >
                    <ProjectPhaseCard phase={firstPhase} />
                    {secondPhase ? <PhaseDependencyArrow /> : null}
                    {secondPhase ? <ProjectPhaseCard phase={secondPhase} /> : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === "team" && (
        <div className="animate-fade-in motion-reduce:animate-none flex flex-col gap-4">
          {(!project.project_team_members || project.project_team_members.length === 0) ? (
            <div className="text-center py-12 text-sm text-muted">
              Aucun membre d&apos;équipe assigné à ce projet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.project_team_members.map((member) => (
                <SurfaceCard key={member.id} className="p-4 flex flex-col gap-4 h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-heading text-sm truncate">
                          {member.fullName ?? member.role_label}
                        </span>
                        {member.is_project_lead && (
                          <StatusPill label="Dirigeant de projet" variant="benchmark" dot={false} />
                        )}
                      </div>
                      <div className="text-xs text-muted mt-1">
                        {member.role_label} {member.seniority ? `· Séniorité : ${member.seniority}` : ""}
                      </div>
                    </div>
                    {member.daily_cost !== null && (
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Coût Journalier
                        </span>
                        <span className="font-semibold text-heading text-xs">
                          {formatEuro(member.daily_cost)}/j
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-canvas/30 p-3 rounded-lg border border-border/40 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider">
                        Temps prévu vs consommé
                      </span>
                      <span className="font-medium text-body leading-relaxed">
                        {member.planned_days !== null ? `${member.planned_days} j prévus` : "Non spécifié"} ·{" "}
                        <span className="font-semibold text-heading">{member.actual_days} j passés</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider">
                        Contribution / Rôle
                      </span>
                      <span className="text-body leading-relaxed">
                        {member.contribution ?? "Non renseigné"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/35 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em]">
                      Collaborateur mobilisé
                    </span>
                    {member.collaborator_id && member.fullName ? (
                      <Link
                        href={`/consultants?collaboratorId=${member.collaborator_id}`}
                        className="text-sm font-semibold text-primary hover:text-primary/80 underline decoration-primary/35 underline-offset-4 transition-colors"
                      >
                        {member.fullName}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-heading">
                        {member.fullName ?? "Collaborateur non renseigné"}
                      </span>
                    )}
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
        </div>
      )}
        </main>
      </div>
    </div>
  )
}
