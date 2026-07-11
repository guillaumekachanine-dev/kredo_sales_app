"use client"

import { cn } from "@/lib/utils"
import { CollaboratorSelect } from "./CollaboratorSelect"
import { EntityRefSelect } from "./EntityRefSelect"
import type { CollaboratorOption } from "./get-collaborator-options"
import {
  collaboratorSummaryLine,
  missionOptionsFromCollaboratorContext,
  type CollaboratorRpcContext,
} from "@/lib/communication/communication-collaborator-context"

export type { CollaboratorRpcContext } from "@/lib/communication/communication-collaborator-context"

export function ManagementConsultantFields({
  collaboratorOptions,
  collaboratorOptionsLoading,
  collaboratorId,
  onCollaboratorChange,
  missionRef,
  onMissionChange,
  showMission,
  collaboratorContext,
  collaboratorContextLoading = false,
  isMobile = false,
}: {
  collaboratorOptions: CollaboratorOption[]
  collaboratorOptionsLoading: boolean
  collaboratorId: string | undefined
  onCollaboratorChange: (collaborator: CollaboratorOption | null) => void
  missionRef: string | undefined
  onMissionChange: (id: string | undefined) => void
  showMission: boolean
  collaboratorContext?: CollaboratorRpcContext
  collaboratorContextLoading?: boolean
  isMobile?: boolean
}) {
  const missionOptions = missionOptionsFromCollaboratorContext(collaboratorContext)
  const skills = collaboratorContext?.skills ?? []
  const absences = collaboratorContext?.recentAbsences ?? []

  return (
    <div className="space-y-2.5">
      <CollaboratorSelect
        options={collaboratorOptions}
        value={collaboratorId}
        onChange={onCollaboratorChange}
        loading={collaboratorOptionsLoading}
        isMobile={isMobile}
      />

      {collaboratorId && collaboratorContextLoading ? (
        <p className="text-[10px] font-medium leading-normal text-muted">Chargement du contexte consultant…</p>
      ) : null}

      {collaboratorId && !collaboratorContextLoading ? (
        <>
          <p className="text-[10px] font-medium leading-normal text-muted">
            {collaboratorSummaryLine(collaboratorContext)}
            {collaboratorContext?.collaborator?.status ? ` · ${collaboratorContext.collaborator.status}` : ""}
            {collaboratorContext?.collaborator?.availability ? ` · ${collaboratorContext.collaborator.availability}` : ""}
          </p>

          {showMission ? (
            <EntityRefSelect
              options={missionOptions}
              value={missionRef}
              onChange={onMissionChange}
              placeholder="Aucune mission liée"
              isMobile={isMobile}
            />
          ) : null}

          {collaboratorContext ? (
            <details className="group rounded-lg border border-border/30 bg-canvas/20 px-2.5 py-2">
              <summary className="cursor-pointer select-none text-[9.5px] font-semibold uppercase tracking-[0.08em] text-primary">
                Profil consultant
              </summary>
              <div className="mt-2 space-y-1.5 text-[10px] leading-normal text-muted">
                {collaboratorContext.jobProfile?.title ? (
                  <p><span className="text-body">Profil métier —</span> {collaboratorContext.jobProfile.title}</p>
                ) : null}
                {collaboratorContext.managerProfile?.fullName ? (
                  <p><span className="text-body">Manager —</span> {collaboratorContext.managerProfile.fullName}</p>
                ) : null}
                {skills.length > 0 ? (
                  <p className="flex flex-wrap gap-1">
                    <span className="text-body">Compétences —</span>
                    {skills.slice(0, 6).map((skill) => (
                      <span
                        key={skill.id}
                        className={cn(
                          "rounded-full border border-border/40 px-1.5 py-0.5 text-[9px] font-medium text-white",
                        )}
                      >
                        {skill.name}
                      </span>
                    ))}
                  </p>
                ) : null}
                {absences.length > 0 ? (
                  <p><span className="text-body">Absences récentes —</span> {absences.length} sur la période suivie.</p>
                ) : null}
                {!collaboratorContext.jobProfile?.title && skills.length === 0 && !collaboratorContext.managerProfile?.fullName ? (
                  <p>Aucune donnée complémentaire disponible pour ce consultant.</p>
                ) : null}
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
