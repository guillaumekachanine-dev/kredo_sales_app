"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import type { OpportunityPlanningData } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import {
  getOpportunityStageColor,
  OPPORTUNITY_KANBAN_STAGES,
} from "@/lib/opportunities/stages"
import { formatEuroCompact, formatDate } from "@/lib/formatters"

interface OpportunitiesKanbanViewProps {
  opportunities: OpportunityPlanningData[]
  onMoveOpportunity: (id: string, newStage: string) => Promise<void>
  displayMode: "opportunities" | "consultants"
  onOpenCollaborator: (id: string) => void
  onOpenCandidate: (id: string) => void
}

const COLUMNS = OPPORTUNITY_KANBAN_STAGES.map((stage) => ({
  key: stage.value,
  label: stage.label,
}))

// ─── COMPOSANT COLONNE DU KANBAN ─────────────────────────────────────────────

interface KanbanColumnProps {
  stageKey: string
  label: string
  opportunities: OpportunityPlanningData[]
  onMoveOpportunity: (id: string, newStage: string) => Promise<void>
  onCardClick: (opp: OpportunityPlanningData) => void
  draggedId: string | null
  setDraggedId: (id: string | null) => void
  displayMode: "opportunities" | "consultants"
  onOpenCollaborator: (id: string) => void
  onOpenCandidate: (id: string) => void
}

function KanbanColumn({
  stageKey,
  label,
  opportunities,
  onMoveOpportunity,
  onCardClick,
  draggedId,
  setDraggedId,
  displayMode,
  onOpenCollaborator,
  onOpenCandidate,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const accentColor = getOpportunityStageColor(stageKey)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const id = e.dataTransfer.getData("opportunityId")
    if (id && draggedId === id) {
      setDraggedId(null)
      await onMoveOpportunity(id, stageKey)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col flex-1 min-w-[200px] max-w-[280px] rounded-2xl border bg-surface/60 p-3 transition-all duration-200 select-none",
        isDragOver ? "border-primary bg-primary/5 ring-2 ring-primary/10 shadow-lg scale-[1.01]" : "border-border"
      )}
    >
      {/* En-tête coloré — couleur pipeline pleine vivacité, séparateur sous le header */}
      <div
        className="flex items-center justify-between mb-3 pb-2.5 px-1 border-b"
        style={{ borderBottomColor: accentColor }}
      >
        <span
          className="text-[13px] font-bold"
          style={{ color: accentColor }}
        >
          {label}
        </span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: accentColor }}
        >
          {opportunities.length}
        </span>
      </div>

      {/* Zone de dépôt des cartes */}
      <div className="flex flex-col gap-3 overflow-y-auto max-h-[640px] pr-1 py-1 custom-scrollbar">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("opportunityId", opp.id)
              setDraggedId(opp.id)
              e.currentTarget.style.opacity = "0.4"
            }}
            onDragEnd={(e) => {
              setDraggedId(null)
              e.currentTarget.style.opacity = "1"
            }}
            onClick={() => onCardClick(opp)}
            className="w-full h-[162px] perspective-1000 cursor-grab active:cursor-grabbing select-none"
          >
            <div
              className={cn(
                "relative w-full h-full duration-500 transform-style-3d transition-transform ease-out-back",
                displayMode === "consultants" ? "rotate-y-180" : ""
              )}
            >
              {/* Face Avant (Opportunité) */}
              <div className="absolute inset-0 backface-hidden w-full h-full flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm hover:border-primary/50 hover:shadow-md transition-all duration-150">
                {/* Haut de la carte : Logo, Client et Titre (Compact) */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <CompanyLogo
                      name={opp.client || "Client"}
                      logoPath={opp.clientLogoPath}
                      website={opp.clientWebsite}
                      size="sm"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0 flex flex-col items-start">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider truncate block max-w-full">
                        {opp.client}
                      </span>
                      <h4 className="font-bold text-[11px] text-heading leading-tight hover:text-primary transition-colors truncate block max-w-full mt-0.5" title={opp.title}>
                        {opp.title}
                      </h4>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5 items-center mt-1">
                    {opp.priority === "haute" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" title="Priorité haute" />
                    )}
                    {opp.priority === "normale" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-muted" title="Priorité normale" />
                    )}
                  </div>
                </div>

                {/* Informations principales (métadonnées) */}
                <div className="grid grid-cols-2 gap-x-1.5 gap-y-1 border-t border-border/50 pt-2.5 text-[10px]">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Valeur (ACV)</span>
                    <span className="font-semibold text-heading mt-0.5">{formatEuroCompact(opp.acv || opp.estimatedGain)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Date cible</span>
                    <span className="font-semibold text-heading mt-0.5">{formatDate(opp.targetCloseDate || opp.startDate)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Staffing</span>
                    <span className="font-semibold text-primary mt-0.5">
                      {opp.candidates.length} profil{opp.candidates.length > 1 ? "s" : ""} poussé{opp.candidates.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Conviction</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${opp.conviction}%` }}
                        />
                      </div>
                      <span className="font-bold text-heading">{opp.conviction}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Face Arrière (Consultants) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm hover:border-primary/50 hover:shadow-md transition-all duration-150 overflow-hidden">
                {/* Header (Logo + Client + Small Opp title) - Mêmes styles que face avant */}
                <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2 min-w-0">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <CompanyLogo
                      name={opp.client || "Client"}
                      logoPath={opp.clientLogoPath}
                      website={opp.clientWebsite}
                      size="sm"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0 flex flex-col items-start">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider truncate block max-w-full">
                        {opp.client}
                      </span>
                      <span className="text-[10px] font-bold text-heading leading-tight truncate block max-w-full mt-0.5" title={opp.title}>
                        {opp.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5 items-center mt-1">
                    {opp.priority === "haute" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" title="Priorité haute" />
                    )}
                    {opp.priority === "normale" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-muted" title="Priorité normale" />
                    )}
                  </div>
                </div>

                {/* Consultants/Staffings list */}
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-0.5">
                  {opp.candidates.length > 0 ? (
                    opp.candidates.map((cand) => (
                      <div key={cand.id} className="flex flex-col gap-0.5 py-1 border-b border-border/20 last:border-b-0">
                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (cand.source === "collaborateur") {
                                if (cand.collaboratorId) {
                                  onOpenCollaborator(cand.collaboratorId);
                                }
                              } else {
                                if (cand.candidateId) {
                                  onOpenCandidate(cand.candidateId);
                                }
                              }
                            }}
                            className="text-[10px] font-bold text-heading hover:text-primary hover:underline truncate text-left flex-1"
                            title={cand.fullName}
                          >
                            {cand.fullName}
                          </button>
                          <span className={cn(
                            "text-[7px] font-extrabold px-1 py-0.2 rounded shrink-0 border uppercase tracking-wider",
                            cand.source === "collaborateur"
                              ? "bg-primary/5 border-primary/10 text-primary"
                              : "bg-brand-brass/5 border-brand-brass/10 text-brand-brass"
                          )}>
                            {cand.source === "collaborateur" ? "Interne" : "Recrutement"}
                          </span>
                        </div>
                        <div className="text-[9px] text-muted truncate text-left">
                          {cand.profileTitle || (cand.source === "collaborateur" 
                            ? "Collaborateur" 
                            : (cand.expectedSalary 
                              ? `Salaire : ${cand.expectedSalary.toLocaleString('fr-FR')} €` 
                              : "Salaire : —"
                            )
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted py-2">
                      <span className="text-[9px] italic">Aucun staffing</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {opportunities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border/50 rounded-xl bg-canvas/30 text-muted">
            <span className="text-[10px] font-medium">Déposer une carte ici</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL KANBAN ───────────────────────────────────────────────

export function OpportunitiesKanbanView({
  opportunities,
  onMoveOpportunity,
  displayMode,
  onOpenCollaborator,
  onOpenCandidate,
}: OpportunitiesKanbanViewProps) {
  const { openTab } = useMissionsTabStore()
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleCardClick = (opp: OpportunityPlanningData) => {
    openTab({
      entityType: "opportunite",
      entityId: opp.id,
      title: opp.client ?? opp.title,
      subtitle: opp.title,
    })
  }

  // Filtrer les opportunités pour ne garder que celles qui correspondent à l'un des 5 statuts Kanban
  const validOpportunities = opportunities.filter((o) =>
    COLUMNS.some((col) => col.key === o.stage)
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pr-1 scrollbar-thin select-none min-h-[500px]">
      {COLUMNS.map((col) => {
        const oppsInCol = validOpportunities.filter((o) => o.stage === col.key)
        return (
          <KanbanColumn
            key={col.key}
            stageKey={col.key}
            label={col.label}
            opportunities={oppsInCol}
            onMoveOpportunity={onMoveOpportunity}
            onCardClick={handleCardClick}
            draggedId={draggedId}
            setDraggedId={setDraggedId}
            displayMode={displayMode}
            onOpenCollaborator={onOpenCollaborator}
            onOpenCandidate={onOpenCandidate}
          />
        )
      })}
    </div>
  )
}
