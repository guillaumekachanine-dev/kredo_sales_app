"use client"

import { useEffect, useState } from "react"
import { SectionTab } from "@/lib/tabs/tab-types"
import { getProjectDetail, type DetailedProjectData } from "@/app/(app)/missions/_data/get-project-detail"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { KpiCard } from "@/components/ui/KpiCard"
import { formatEuro, formatPct, formatDateNumeric } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface ProjectDetailPanelProps {
  tab: SectionTab
}

type TabType = "synthesis" | "phases" | "team"

const PROJECT_STATUS: Record<string, StatusPillVariant> = {
  draft: "draft",
  active: "inProgress",
  delivered: "success",
  closed: "neutral",
  cancelled: "danger",
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  active: "Actif",
  delivered: "Livré",
  closed: "Clôturé",
  cancelled: "Annulé",
}

const REF_STATUS: Record<string, StatusPillVariant> = {
  not_reference: "neutral",
  draft: "draft",
  approved: "success",
  archived: "neutral",
}

const REF_STATUS_LABELS: Record<string, string> = {
  not_reference: "Non référencé",
  draft: "Brouillon Réf.",
  approved: "Référencé",
  archived: "Archivé",
}

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
      } catch (err) {
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
  const logoPath = isAnonymized ? null : (company?.metadata as any)?.logo_path
  const website = isAnonymized ? null : company?.website

  // Calc margin tone
  const marginTone =
    project.actual_margin_pct !== null && project.target_margin_pct !== null
      ? project.actual_margin_pct >= project.target_margin_pct
        ? ("positive" as const)
        : ("negative" as const)
      : ("neutral" as const)

  const scopeObj = typeof project.scope === "string" ? JSON.parse(project.scope) : project.scope
  const scopeIncluded: string[] = Array.isArray(scopeObj?.included) ? scopeObj.included : []
  const scopeExcluded: string[] = Array.isArray(scopeObj?.excluded) ? scopeObj.excluded : []

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header detail */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 pb-5 border-b border-border">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20 px-2 py-0.5 rounded bg-primary/[0.04]">
              Projet
            </span>
            {project.code && <span className="text-xs text-muted font-mono">{project.code}</span>}
          </div>
          <h1 className="text-2xl font-bold font-heading text-heading tracking-tight">
            {project.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusPill
              label={PROJECT_STATUS_LABELS[project.status] ?? project.status}
              variant={PROJECT_STATUS[project.status] ?? "neutral"}
            />
            <StatusPill
              label={REF_STATUS_LABELS[project.ref_status] ?? project.ref_status}
              variant={REF_STATUS[project.ref_status] ?? "neutral"}
            />
          </div>
        </div>

        {/* Client identity box */}
        <div className="flex items-center gap-3 bg-canvas/30 px-3 py-2.5 rounded-[var(--radius-medium)] border border-border/40 shrink-0 self-start">
          <CompanyLogo name={clientName} logoPath={logoPath} website={website} size="sm" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider leading-none mb-1">
              Client
            </span>
            <span className="font-bold text-heading text-xs leading-none">{clientName}</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center border-b border-border/60">
        {(["synthesis", "phases", "team"] as TabType[]).map((tabId) => {
          const isActive = activeSubTab === tabId
          const label = tabId === "synthesis" ? "Synthèse" : tabId === "phases" ? "Phases" : "Équipe"
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveSubTab(tabId)}
              className={cn(
                "px-4 py-2 text-xs font-semibold border-b-2 -mb-[2px] transition-all",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-body"
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab views */}
      {activeSubTab === "synthesis" && (
        <div className="flex flex-col gap-6">
          {/* Tech Badges if present */}
          {project.technologies && project.technologies.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-1">
                Technologies :
              </span>
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="bg-canvas border border-border/60 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-body"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="CA Contractuel"
              value={formatEuro(project.contract_amount)}
              accent="none"
              size="compact"
            />
            <KpiCard
              label="Marge Cible"
              value={formatPct(project.target_margin_pct)}
              accent="none"
              size="compact"
            />
            <KpiCard
              label="Marge Réelle"
              value={formatPct(project.actual_margin_pct)}
              delta={
                project.actual_margin_pct !== null && project.target_margin_pct !== null
                  ? `${project.actual_margin_pct >= project.target_margin_pct ? "+" : ""}${(
                      project.actual_margin_pct - project.target_margin_pct
                    ).toFixed(1)}%`
                  : undefined
              }
              deltaTone={marginTone}
              accent="none"
              size="compact"
            />
          </div>

          {/* Description */}
          {project.description && (
            <SurfaceCard className="p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-heading">Description</h3>
              <p className="text-xs text-body whitespace-pre-wrap leading-relaxed">
                {project.description}
              </p>
            </SurfaceCard>
          )}

          {/* Scope (Périmètre) */}
          {(scopeIncluded.length > 0 || scopeExcluded.length > 0) && (
            <SurfaceCard className="p-5 flex flex-col gap-4">
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
            </SurfaceCard>
          )}

          {/* Deliverables */}
          {project.deliverables && project.deliverables.length > 0 && (
            <SurfaceCard className="p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-heading">Livrables Majeurs</h3>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-body">
                {project.deliverables.map((del, idx) => (
                  <li key={idx}>{del}</li>
                ))}
              </ul>
            </SurfaceCard>
          )}

          {/* Lessons Learned */}
          {project.lessons_learned && (
            <SurfaceCard className="p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-heading">Retour d&apos;expérience</h3>
              <p className="text-xs text-body whitespace-pre-wrap leading-relaxed">
                {project.lessons_learned}
              </p>
            </SurfaceCard>
          )}
        </div>
      )}

      {activeSubTab === "phases" && (
        <div className="flex flex-col gap-4">
          {(!project.project_phases || project.project_phases.length === 0) ? (
            <div className="text-center py-12 text-sm text-muted">
              Aucune phase planifiée pour ce projet.
            </div>
          ) : (
            project.project_phases.map((phase) => {
              const variant = PHASE_STATUS[phase.status] ?? "neutral"
              const label = PHASE_STATUS_LABELS[phase.status] ?? phase.status
              const plannedDays = phase.planned_days ?? 0
              const progressPct =
                plannedDays > 0
                  ? Math.min(100, Math.round((phase.consumed_days / plannedDays) * 100))
                  : 0

              return (
                <SurfaceCard key={phase.id} className="p-5 flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/40">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-heading text-sm">
                        {phase.label}
                      </span>
                      <StatusPill label={label} variant={variant} dot={true} />
                    </div>
                    {phase.start_date_planned && phase.end_date_planned && (
                      <span className="text-xs text-muted font-medium">
                        Période : {formatDateNumeric(phase.start_date_planned)} au {formatDateNumeric(phase.end_date_planned)}
                      </span>
                    )}
                  </div>

                  {/* Consumed/Planned indicator */}
                  {plannedDays > 0 ? (
                    <div className="flex flex-col gap-1.5 w-full max-w-sm mt-1">
                      <div className="flex justify-between text-[10px] font-medium text-muted">
                        <span>Consommé : {phase.consumed_days} j / {plannedDays} j</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-[width] duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-medium text-muted mt-1">
                      Consommé : <span className="font-semibold text-body">{phase.consumed_days} j</span> (aucun budget prévu)
                    </div>
                  )}

                  {/* Phase Deliverables Checklist */}
                  {phase.deliverables && phase.deliverables.length > 0 && (
                    <div className="mt-3">
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
            })
          )}
        </div>
      )}

      {activeSubTab === "team" && (
        <div className="flex flex-col gap-4">
          {(!project.project_team_members || project.project_team_members.length === 0) ? (
            <div className="text-center py-12 text-sm text-muted">
              Aucun membre d&apos;équipe assigné à ce projet.
            </div>
          ) : (
            project.project_team_members.map((member) => (
              <SurfaceCard key={member.id} className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-heading text-sm">
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
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                        Coût Journalier
                      </span>
                      <span className="font-semibold text-heading text-xs">
                        {formatEuro(member.daily_cost)}/j
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-canvas/30 p-3 rounded-lg border border-border/40 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-1">
                      Temps prévu vs consommé
                    </span>
                    <span className="font-medium text-body">
                      {member.planned_days !== null ? `${member.planned_days} j prévus` : "Non spécifié"} ·{" "}
                      <span className="font-semibold text-heading">{member.actual_days} j passés</span>
                    </span>
                  </div>
                  {member.contribution && (
                    <div>
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-1">
                        Contribution / Rôle
                      </span>
                      <span className="text-body leading-relaxed">{member.contribution}</span>
                    </div>
                  )}
                </div>
              </SurfaceCard>
            ))
          )}
        </div>
      )}
    </div>
  )
}
