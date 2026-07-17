"use client"

import { useState } from "react"
import { formatDate, formatEuroCompact, formatPct } from "@/lib/formatters"
import { getPracticeByName } from "@/lib/config/practices"
import { cn } from "@/lib/utils"
import type { ProjectCockpitItem } from "./engagements-portfolio-types"

interface ProjectsCockpitProps { projects: ProjectCockpitItem[] }

function ProjectPanel({ project }: { project: ProjectCockpitItem }) {
  const color = getPracticeByName(project.practice)?.color ?? "var(--color-primary)"
  return (
    <article className="flex min-h-0 flex-col rounded-[var(--radius-medium)] border border-border/30 p-4" style={{ backgroundColor: `color-mix(in srgb, ${color} 5%, var(--color-surface))` }}>
      <header>
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted">{project.companyName}</p>
        <h4 className="mt-1 font-heading text-sm font-black text-heading">{project.title}</h4>
        <p className="mt-0.5 text-[9px] text-body">{project.practice ?? "Practice non renseignée"} · fin {formatDate(project.endDate)}</p>
      </header>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[9px]">
          <span className="font-bold text-heading">Progression</span>
          <span className="font-mono font-bold text-heading">{project.progressPct}%</span>
        </div>
        <div className="h-2 w-full bg-slate-950/40 rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, project.progressPct))}%` }} />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-[9px]">
        <div>
          <dt className="text-muted">Contrat</dt>
          <dd className="font-mono font-bold text-heading">{formatEuroCompact(project.contractAmount)}</dd>
        </div>
        <div>
          <dt className="text-muted">Facturé</dt>
          <dd className="font-mono font-bold text-heading">{formatEuroCompact(project.invoicedAmount)}</dd>
        </div>
        <div>
          <dt className="text-muted">Reste</dt>
          <dd className="font-mono font-bold text-heading">{formatEuroCompact(project.remainingToInvoice)}</dd>
        </div>
        <div>
          <dt className="text-muted">Coûts</dt>
          <dd className="font-mono font-bold text-heading">{formatEuroCompact(project.costActual)}</dd>
        </div>
        <div>
          <dt className="text-muted">Marge réelle</dt>
          <dd className="font-mono font-bold text-heading">{formatPct(project.actualMarginPct)}</dd>
        </div>
        <div>
          <dt className="text-muted">Écart cible</dt>
          <dd className={cn("font-mono font-bold", (project.marginGapPct ?? 0) < 0 ? "text-accent" : "text-success")}>
            {project.marginGapPct === null ? "—" : `${project.marginGapPct > 0 ? "+" : ""}${project.marginGapPct.toFixed(1)} pts`}
          </dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-border/30 pt-3">
        <div className="mb-1.5 flex justify-between text-[9px]">
          <span className="font-bold text-heading">Phases</span>
          <span className="text-muted">{project.phaseCounts.completed} terminée{project.phaseCounts.completed > 1 ? "s" : ""} · {project.phaseCounts.inProgress} en cours · {project.phaseCounts.overdue} en retard</span>
        </div>
        {project.phases.length > 0 ? (
          <div className="flex gap-1">
            {project.phases.map((phase) => (
              <span
                key={phase.id}
                className={cn(
                  "h-3 min-w-3 flex-1 rounded-sm border",
                  phase.overdue
                    ? "border-danger bg-danger"
                    : phase.status === "completed"
                    ? "border-success bg-success/70"
                    : phase.status === "in_progress"
                    ? "border-primary bg-primary/55"
                    : "border-border/30 bg-slate-950/40"
                )}
                title={`${phase.label} · ${phase.status}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-[9px] text-muted">Aucune phase renseignée.</p>
        )}
      </div>
      <div className="mt-auto border-t border-border/30 pt-3 text-[9px]">
        <p className="font-bold text-heading">Prochain jalon</p>
        <p className="mt-0.5 text-body">{project.nextMilestone ? `${project.nextMilestone.label} · ${formatDate(project.nextMilestone.date)}` : "Aucun jalon daté à venir"}</p>
      </div>
    </article>
  )
}

export function ProjectsCockpit({ projects }: ProjectsCockpitProps) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "")
  const selected = projects.find((project) => project.id === selectedId) ?? projects[0]
  if (!selected) return <div className="flex h-full items-center justify-center text-sm text-muted">Aucun projet actif.</div>
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-4 shrink-0">
        <h3 className="font-heading text-base font-black text-heading">Cockpit Projets</h3>
        <p className="text-[10px] text-muted">Progression, facturation, coûts, marge et phases des projets actifs</p>
      </header>
      <div className="mb-3 md:hidden">
        <label htmlFor="atlas-project" className="sr-only">Projet affiché</label>
        <select
          id="atlas-project"
          value={selected.id}
          onChange={(event) => setSelectedId(event.target.value)}
          className="min-h-11 w-full rounded-[var(--radius-small)] border border-border/30 bg-slate-950/40 px-3 text-sm font-bold text-heading focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id} className="bg-[#12182D] text-white">
              {project.companyName} · {project.title}
            </option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1 md:hidden">
        <ProjectPanel project={selected} />
      </div>
      <div className="hidden min-h-0 flex-1 auto-cols-[minmax(280px,1fr)] grid-flow-col gap-3 overflow-x-auto md:grid">
        {projects.map((project) => (
          <ProjectPanel key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
