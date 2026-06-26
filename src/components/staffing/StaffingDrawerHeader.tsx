"use client"

import React from "react"
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

  const title = isCollaborator 
    ? person?.collaborators[0]?.current_title || data.candidate?.current_title || "Profil non renseigné"
    : data.candidate?.current_title || "Profil non renseigné"

  return (
    <span className="inline-flex flex-col gap-0.5 align-top select-none">
      <span className="text-[1.02rem] font-bold leading-tight text-heading">
        {fullName}
      </span>
      <span className="text-xs font-medium leading-snug text-muted">
        {title}
      </span>
    </span>
  )
}
