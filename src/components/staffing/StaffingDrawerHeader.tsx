"use client"

import React from "react"
import { StatusPill } from "@/components/ui/StatusPill"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"

interface StaffingDrawerHeaderProps {
  data: StaffingDrawerViewModel
  isCollaborator: boolean
}

export function StaffingDrawerHeader({ data, isCollaborator }: StaffingDrawerHeaderProps) {
  const person = data.candidate?.person
  const fullName = person?.full_name || 
    `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || 
    "Profil sans nom"

  // Title: collaborator current_title, or candidate seniority + "Candidat"
  const title = isCollaborator 
    ? person?.collaborators[0]?.current_title || "Collaborateur"
    : person?.notes || "Candidat externe" // Fallback to candidate summary/notes or just "Candidat externe"

  const priority = data.opportunity.priority || "normale"
  const priorityLower = priority.toLowerCase()
  
  let priorityVariant: "neutral" | "warning" | "danger" | "success" = "neutral"
  let priorityLabel = "Normale"
  
  if (priorityLower === "haute" || priorityLower === "high") {
    priorityVariant = "danger"
    priorityLabel = "Haute Priorité"
  } else if (priorityLower === "basse" || priorityLower === "low") {
    priorityVariant = "neutral"
    priorityLabel = "Basse Priorité"
  } else {
    priorityVariant = "warning"
    priorityLabel = "Moyenne Priorité"
  }

  return (
    <div className="flex flex-col gap-2 select-none">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPill
          label={isCollaborator ? "Collaborateur" : "Candidat"}
          variant={isCollaborator ? "info" : "benchmark"}
          dot={false}
        />
        <StatusPill
          label={priorityLabel}
          variant={priorityVariant}
          dot={true}
        />
      </div>
      
      <div className="mt-1">
        <h3 className="text-sm font-bold text-heading leading-tight">
          {fullName}
        </h3>
        <p className="text-xs text-muted mt-0.5 font-medium">
          {title}
        </p>
      </div>
    </div>
  )
}
