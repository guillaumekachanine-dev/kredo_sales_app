"use client"

import React, { useMemo } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StatusPill } from "@/components/ui/StatusPill"
import type { StaffingDrawerViewModel, StaffingDrawerSkill } from "@/types/staffing-drawer"

interface TabDetailsProps {
  data: StaffingDrawerViewModel
  isCollaborator: boolean
}

function fmtEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
}

function fmtEurDaily(n: number) {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`
}

function formatDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function calculateSeniority(entryDateStr: string | null) {
  if (!entryDateStr) return null
  const entry = new Date(entryDateStr)
  if (isNaN(entry.getTime())) return null
  const today = new Date()
  
  let years = today.getFullYear() - entry.getFullYear()
  let months = today.getMonth() - entry.getMonth()
  
  if (months < 0) {
    years--
    months += 12
  }
  
  if (years === 0 && months === 0) {
    return "Nouveau venu"
  }
  
  const yearsPart = years > 0 ? `${years} an${years > 1 ? "s" : ""}` : ""
  const monthsPart = months > 0 ? `${months} mois` : ""
  
  return [yearsPart, monthsPart].filter(Boolean).join(" et ")
}

// Translations for positioning origin
const ORIGIN_LABELS: Record<string, string> = {
  recruiting_team: "Proposition du recrutement",
  recrutement: "Proposition du recrutement",
  inbound: "Proposition du recrutement",
  personal_sourcing: "Sourcing personnel",
  sourcing: "Sourcing personnel",
  ai_suggestion: "Recommandation IA",
  ia: "Recommandation IA",
  referral: "Cooptation",
  cooptation: "Cooptation",
  other: "Autre",
}

export function TabDetails({ data, isCollaborator }: TabDetailsProps) {
  const person = data.candidate?.person
  const collaborator = person?.collaborators?.[0]
  
  // 1. Get top 3 skills
  const topSkills = useMemo(() => {
    const skills = person?.person_skills ?? []
    return [...skills]
      .sort((a, b) => {
        const aMain = (a.level ?? 0) >= 4 ? 0 : 1
        const bMain = (b.level ?? 0) >= 4 ? 0 : 1
        if (aMain !== bMain) return aMain - bMain
        const diff = (b.level ?? -1) - (a.level ?? -1)
        if (diff !== 0) return diff
        return (a.skill?.name || "").localeCompare(b.skill?.name || "", "fr")
      })
      .slice(0, 3)
  }, [person?.person_skills])

  // 2. Aggregate missions
  const activeMission = useMemo(() => {
    if (!collaborator?.missions) return null
    return collaborator.missions.find(m => m.status === "active") ?? null
  }, [collaborator?.missions])

  const completedMissionsCount = useMemo(() => {
    if (!collaborator?.missions) return 0
    return collaborator.missions.filter(m => m.status === "ended").length
  }, [collaborator?.missions])

  // 3. Compensation data
  const compensation = collaborator?.compensation?.[0] ?? null
  const grossAnnual = compensation?.gross_annual ?? null
  
  // Ancienneté
  const seniority = isCollaborator 
    ? calculateSeniority(collaborator?.entry_date ?? null)
    : data.candidate?.seniority

  // Origin label
  const originKey = data.positioning_origin || data.candidate?.source || "other"
  const originText = ORIGIN_LABELS[originKey] || ORIGIN_LABELS["other"]

  return (
    <div className="space-y-4">
      {/* SECTION 1: Identité & Métier */}
      <SurfaceCard className="p-4 space-y-3">
        <h4 className="text-xs font-bold text-muted uppercase tracking-wider select-none">Profil professionnel</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {person?.location && (
            <div>
              <span className="text-[10px] text-muted block select-none">Localisation</span>
              <span className="text-xs font-bold text-heading mt-0.5 block">{person.location}</span>
            </div>
          )}

          {seniority && (
            <div>
              <span className="text-[10px] text-muted block select-none">
                {isCollaborator ? "Ancienneté ESN" : "Expérience"}
              </span>
              <span className="text-xs font-bold text-heading mt-0.5 block">{seniority}</span>
            </div>
          )}

          {isCollaborator && collaborator?.practice && (
            <div>
              <span className="text-[10px] text-muted block select-none">Practice de rattachement</span>
              <span className="text-xs font-bold text-heading mt-0.5 block">{collaborator.practice}</span>
            </div>
          )}

          {data.candidate?.availability && (
            <div>
              <span className="text-[10px] text-muted block select-none">Disponibilité</span>
              <span className="text-xs font-bold text-heading mt-0.5 block">{data.candidate.availability}</span>
            </div>
          )}
        </div>

        {/* 3 Compétences clés */}
        {topSkills.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <span className="text-[10px] text-muted block mb-1.5 select-none">Compétences principales</span>
            <div className="flex flex-wrap gap-1.5">
              {topSkills.map((ps) => (
                <span
                  key={ps.id}
                  className="px-2 py-0.5 rounded bg-canvas text-[10px] text-body font-bold border border-border/40"
                >
                  {ps.skill.name} {ps.level ? `(${ps.level}/5)` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* SECTION 2: Données RH & Financières (spécifiques) */}
      {isCollaborator ? (
        collaborator && (
          <SurfaceCard className="p-4 space-y-3">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider select-none">Données Collaborateur</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grossAnnual !== null && (
                <div>
                  <span className="text-[10px] text-muted block select-none">Salaire brut annuel</span>
                  <span className="text-xs font-bold text-primary mt-0.5 block">{fmtEur(grossAnnual)}</span>
                </div>
              )}

              {activeMission && (
                <div>
                  <span className="text-[10px] text-muted block select-none">TJM Actuel (Mission)</span>
                  <span className="text-xs font-bold text-heading mt-0.5 block">{fmtEurDaily(activeMission.tjm)}</span>
                </div>
              )}

              <div>
                <span className="text-[10px] text-muted block select-none">Missions réalisées</span>
                <span className="text-xs font-bold text-heading mt-0.5 block">
                  {completedMissionsCount} terminée{completedMissionsCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Liste des missions actives/passées */}
            {collaborator.missions && collaborator.missions.length > 0 && (
              <div className="pt-2 border-t border-border/40 space-y-1.5">
                <span className="text-[10px] text-muted block select-none">Historique des missions</span>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {collaborator.missions.map((m) => (
                    <div key={m.id} className="flex justify-between items-center text-[11px] py-1 border-b border-border/20 last:border-0">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-heading truncate block">{m.company?.name || "Client inconnu"}</span>
                        <span className="text-muted block text-[10px] mt-0.5">
                          {formatDate(m.start_date)} – {m.end_date ? formatDate(m.end_date) : "En cours"}
                        </span>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <span className="font-semibold block text-heading">{fmtEurDaily(m.tjm)}</span>
                        {m.gross_margin_pct !== null && (
                          <span className="text-[10px] text-success block mt-0.5">{m.gross_margin_pct}% Marge</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SurfaceCard>
        )
      ) : (
        <SurfaceCard className="p-4 space-y-3">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider select-none">Prétentions Candidat</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.candidate?.expected_daily_rate && (
              <div>
                <span className="text-[10px] text-muted block select-none">TJM Souhaité</span>
                <span className="text-xs font-bold text-primary mt-0.5 block">
                  {fmtEurDaily(data.candidate.expected_daily_rate)}
                </span>
              </div>
            )}

            {data.candidate?.expected_salary && (
              <div>
                <span className="text-[10px] text-muted block select-none">Salaire Souhaité</span>
                <span className="text-xs font-bold text-heading mt-0.5 block">
                  {fmtEur(data.candidate.expected_salary)} / an
                </span>
              </div>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* SECTION 3: Contexte de Positionnement Staffing */}
      <SurfaceCard className="p-4 space-y-3">
        <h4 className="text-xs font-bold text-muted uppercase tracking-wider select-none">Contexte Staffing</h4>
        
        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-muted block select-none">Besoin pressenti</span>
            <span className="text-xs font-bold text-heading mt-0.5 block">
              {data.opportunity.title} ({data.opportunity.company?.name || "Client inconnu"})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-muted block select-none">Origine du positionnement</span>
              <span className="text-xs font-semibold text-body mt-0.5 block">{originText}</span>
            </div>

            <div>
              <span className="text-[10px] text-muted block select-none">Statut du positionnement</span>
              <span className="text-xs font-semibold text-body mt-0.5 block capitalize">
                {data.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {data.comment && (
            <div className="pt-2 border-t border-border/40">
              <span className="text-[10px] text-muted block select-none">Note de positionnement</span>
              <p className="text-xs text-body leading-relaxed mt-1">{data.comment}</p>
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}
