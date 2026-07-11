// Lot 8 — forme exacte renvoyée par get_collaborator_communication_context
// (Lot 4, migration 20260711192041). Lecture seule, jamais réinterprétée en
// fait RH inféré (command §2 "ne jamais générer de fait RH non structuré").
// Fonctions pures extraites de ManagementConsultantFields.tsx pour rester
// testables sans harnais de rendu React (le repo n'a pas de RTL/jsdom — même
// contrainte que communication-brief-form-model.ts, Lot 7).

export type CollaboratorRpcSkill = {
  id: string
  name: string
  category: string | null
  level: number | null
  years: number | null
}

export type CollaboratorRpcMission = {
  id: string
  companyId: string | null
  title: string
  status: string | null
  roleTitle: string | null
  startDate: string | null
  endDate: string | null
}

export type CollaboratorRpcContext = {
  collaborator?: {
    currentTitle: string | null
    seniority: string | null
    practice: string | null
    status: string | null
    availability: string | null
  }
  managerProfile?: { fullName: string | null } | null
  currentMission?: CollaboratorRpcMission | null
  recentMissions?: CollaboratorRpcMission[]
  jobProfile?: { title: string | null; isActive: boolean } | null
  skills?: CollaboratorRpcSkill[]
  recentAbsences?: { absenceType: string }[]
}

export type MissionOption = {
  id: string
  label: string
  meta?: string
}

// La mission courante (command §2 "proposer la mission courante par défaut")
// arrive toujours en tête ; les missions récentes suivent sans doublon.
export function missionOptionsFromCollaboratorContext(
  context: CollaboratorRpcContext | undefined,
): MissionOption[] {
  if (!context) return []
  const missions = context.recentMissions ?? (context.currentMission ? [context.currentMission] : [])
  const merged = context.currentMission
    ? [context.currentMission, ...missions.filter((mission) => mission.id !== context.currentMission?.id)]
    : missions
  return merged.map((mission) => ({
    id: mission.id,
    label: mission.title,
    meta: mission.status ?? undefined,
  }))
}

export function collaboratorSummaryLine(context: CollaboratorRpcContext | undefined): string {
  const collaborator = context?.collaborator
  if (!collaborator) return "Profil non chargé."
  return [collaborator.currentTitle, collaborator.practice, collaborator.seniority]
    .filter(Boolean)
    .join(" · ") || "Profil consultant"
}
