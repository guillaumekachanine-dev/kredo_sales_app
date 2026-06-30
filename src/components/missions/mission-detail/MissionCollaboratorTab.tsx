"use client"

import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { MissionDetailViewModel, MissionCollaboratorSkill } from "./mission-detail-types"
import { getCollaboratorName, getYearsSince } from "./mission-detail-utils"

const CATEGORY_LABELS: Record<string, string> = {
  langage: "Langage",
  framework: "Framework",
  cloud: "Cloud",
  data: "Data",
  devops: "DevOps",
  methode: "Méthode",
  fonctionnel: "Fonctionnel",
  secteur: "Secteur",
  soft_skill: "Soft skill",
  langue: "Langue",
  certification: "Certification",
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-success/10 text-success border-success/20" },
  bench: { label: "Bench", className: "bg-warning/10 text-warning border-warning/20" },
  off: { label: "Hors effectif", className: "bg-muted/10 text-muted border-muted/20" },
}

function SkillLevelDots({ level }: { level: number | null }) {
  const n = Math.max(0, Math.min(5, level ?? 0))
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "w-2 h-2 rounded-full",
            i <= n ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </div>
  )
}

interface MissionCollaboratorTabProps {
  vm: MissionDetailViewModel
}

export function MissionCollaboratorTab({ vm }: MissionCollaboratorTabProps) {
  const { collaborator } = vm
  const hasCompensation = vm.compensation?.gross_annual != null

  if (!collaborator) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-xs text-muted italic">Aucun collaborateur associé à cette mission.</p>
      </SurfaceCard>
    )
  }

  const name = getCollaboratorName(collaborator.person)
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const statusInfo = STATUS_LABELS[collaborator.status] ?? {
    label: collaborator.status,
    className: "bg-muted/10 text-muted border-muted/20",
  }

  // Group skills by category
  const skillsByCategory = collaborator.skills.reduce<Record<string, MissionCollaboratorSkill[]>>(
    (acc, skill) => {
      const cat = skill.skill.category ?? "autre"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(skill)
      return acc
    },
    {}
  )

  const topSkills = collaborator.skills.slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Identity card */}
      <div className="flex flex-col gap-5">
        <SurfaceCard className="p-5">
          <div className="flex flex-col items-center text-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{initials}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-heading">{name}</p>
              {collaborator.current_title && (
                <p className="text-xs text-muted mt-0.5">{collaborator.current_title}</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                    statusInfo.className
                  )}
                >
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-4 border-t border-border/40">
            {collaborator.practice && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Practice
                </span>
                <span className="text-xs font-semibold text-heading">{collaborator.practice}</span>
              </div>
            )}
            {collaborator.seniority && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Séniorité
                </span>
                <span className="text-xs font-semibold text-heading">{collaborator.seniority}</span>
              </div>
            )}
            {collaborator.employee_ref && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Matricule
                </span>
                <span className="text-xs font-mono font-semibold text-heading">
                  {collaborator.employee_ref}
                </span>
              </div>
            )}
            {collaborator.entry_date && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Intégration
                </span>
                <span className="text-xs font-semibold text-heading">
                  {formatDate(collaborator.entry_date)}{" "}
                  <span className="text-muted font-normal">
                    ({getYearsSince(collaborator.entry_date)})
                  </span>
                </span>
              </div>
            )}
            {collaborator.exit_date && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Date de départ
                </span>
                <span className="text-xs font-semibold text-danger">
                  {formatDate(collaborator.exit_date)}
                </span>
              </div>
            )}
            {collaborator.availability && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                  Disponibilité
                </span>
                <span className="text-xs font-semibold text-heading">{collaborator.availability}</span>
              </div>
            )}
          </div>

          {/* Contact info */}
          {(collaborator.person?.primary_email || collaborator.person?.phone) && (
            <div className="flex flex-col gap-2 pt-4 border-t border-border/40 mt-2">
              {collaborator.person?.primary_email && (
                <a
                  href={`mailto:${collaborator.person.primary_email}`}
                  className="flex items-center gap-2 text-xs text-body hover:text-primary transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {collaborator.person.primary_email}
                </a>
              )}
              {collaborator.person?.phone && (
                <a
                  href={`tel:${collaborator.person.phone}`}
                  className="flex items-center gap-2 text-xs text-body hover:text-primary transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {collaborator.person.phone}
                </a>
              )}
            </div>
          )}
        </SurfaceCard>

        {/* Top skills */}
        {topSkills.length > 0 && (
          <SurfaceCard className="p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-heading">Compétences clés</h3>
            <div className="flex flex-col gap-2.5">
              {topSkills.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-heading truncate">{s.skill.name}</span>
                  <SkillLevelDots level={s.level} />
                </div>
              ))}
            </div>
          </SurfaceCard>
        )}
      </div>

      {/* Skills detail */}
      <div className="lg:col-span-2">
        <SurfaceCard className="p-5 h-full flex flex-col gap-4">
          <h3 className="text-sm font-bold text-heading">
            Toutes les compétences ({collaborator.skills.length})
          </h3>

          {collaborator.skills.length === 0 ? (
            <p className="text-xs text-muted italic">Aucune compétence renseignée.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(skillsByCategory).map(([category, skills]) => (
                <div key={category}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
                    {CATEGORY_LABELS[category] ?? category}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {skills.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-canvas border border-border/50"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-heading truncate">
                            {s.skill.name}
                          </span>
                          {s.years !== null && s.years > 0 && (
                            <span className="text-[10px] text-muted">
                              {s.years} {s.years > 1 ? "ans" : "an"}
                            </span>
                          )}
                        </div>
                        <SkillLevelDots level={s.level} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Confidential compensation note */}
          {hasCompensation && (
            <div className="mt-5 pt-5 border-t border-border/40">
              <div className="flex items-center gap-2 p-2.5 rounded bg-warning/5 border border-warning/15">
                <svg className="w-4 h-4 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[10px] font-semibold text-warning">
                  Données de rémunération — accès restreint admin/owner
                </span>
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}
