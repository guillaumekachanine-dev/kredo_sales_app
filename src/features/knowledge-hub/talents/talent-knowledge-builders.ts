import { getPracticeByName } from "@/lib/config/practices"
import { getRecruitmentStatusLabel } from "@/lib/recruitment/recruitment-stages"
import { practiceIcons } from "@/components/consultants/pool-competences/pool-competences-shared"
import type {
  TalentCandidate,
  TalentCollaborator,
  TalentKnowledgeSnapshot,
  TalentProfile,
  TalentSkillAggregate,
} from "./talent-knowledge.types"

export const ACTIVE_COLLABORATOR_STATUSES = new Set(["en_mission", "intercontrat"])

const RECRUITED_CANDIDATE_STATUSES = new Set([
  "recrute",
  "recruté",
  "embauche",
  "embauché",
  "hired",
  "integre",
  "intégré",
])

const HISTORICAL_CANDIDATE_STATUSES = new Set([
  "refuse",
  "refusé",
  "ko_manager",
  "indisponible",
  "archive",
  "archivé",
  "refuse_client",
  "refuse_candidat",
  "abandonne",
])

export function normalizeTalentText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

export function initialsFromName(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")

  return initials.toUpperCase() || "?"
}

export function formatTalentDate(value: string | null) {
  if (!value) return "Non renseignée"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(date)
}

export function collaboratorStatusLabel(status: string) {
  const normalized = normalizeTalentText(status)
  if (normalized === "en_mission") return "En mission"
  if (normalized === "intercontrat") return "Intercontrat"
  if (normalized === "sorti") return "Sorti"
  return status.replaceAll("_", " ") || "Non renseigné"
}

export function candidateStatusLabel(status: string) {
  return getRecruitmentStatusLabel(status)
}

export function candidateEditorialGroup(candidate: TalentCandidate) {
  const status = normalizeTalentText(candidate.status)
  if (RECRUITED_CANDIDATE_STATUSES.has(status)) return "Recrutés" as const
  if (HISTORICAL_CANDIDATE_STATUSES.has(status)) return "Historique" as const
  return "Vivier actif" as const
}

export function isTeamMember(collaborator: TalentCollaborator) {
  return ACTIVE_COLLABORATOR_STATUSES.has(normalizeTalentText(collaborator.status))
}

export function isAlumni(collaborator: TalentCollaborator) {
  return normalizeTalentText(collaborator.status) === "sorti" || Boolean(collaborator.exitDate)
}

export function profileMatchesQuery(profile: TalentProfile, query: string) {
  const normalizedQuery = normalizeTalentText(query)
  if (!normalizedQuery) return true

  const corpus = [
    profile.fullName,
    profile.currentTitle,
    profile.practice,
    ...profile.skills.map((skill) => skill.name),
  ].map(normalizeTalentText).join(" ")

  return corpus.includes(normalizedQuery)
}

export function getTalentPracticeVisual(practice: string | null | undefined) {
  const config = getPracticeByName(practice)
  const slug = config?.slug
  return {
    label: practice?.trim() || "Practice non renseignée",
    color: config?.color ?? "var(--color-edito-muted)",
    icon: slug ? practiceIcons[slug] ?? null : null,
  }
}

export function buildTalentSnapshot({
  collaborators,
  candidates,
}: {
  collaborators: TalentCollaborator[]
  candidates: TalentCandidate[]
}): TalentKnowledgeSnapshot {
  const team = collaborators.filter(isTeamMember)
  const alumni = collaborators.filter(isAlumni)
  const practiceCounts = new Map<string, number>()
  const skillCounts = new Map<string, {
    id: string
    name: string
    collaboratorPersonIds: Set<string>
    candidatePersonIds: Set<string>
    levels: number[]
  }>()

  for (const collaborator of team) {
    const practice = collaborator.practice?.trim() || "Practice non renseignée"
    practiceCounts.set(practice, (practiceCounts.get(practice) ?? 0) + 1)
  }

  for (const profile of [...collaborators, ...candidates]) {
    for (const skill of profile.skills) {
      const record = skillCounts.get(skill.id) ?? {
        id: skill.id,
        name: skill.name,
        collaboratorPersonIds: new Set<string>(),
        candidatePersonIds: new Set<string>(),
        levels: [],
      }
      if (profile.kind === "collaborator") record.collaboratorPersonIds.add(profile.personId)
      else record.candidatePersonIds.add(profile.personId)
      if (typeof skill.level === "number") record.levels.push(skill.level)
      skillCounts.set(skill.id, record)
    }
  }

  const topSkills: TalentSkillAggregate[] = Array.from(skillCounts.values())
    .map((skill) => {
      const collaboratorCount = skill.collaboratorPersonIds.size
      const candidateCount = skill.candidatePersonIds.size
      return {
        id: skill.id,
        name: skill.name,
        collaboratorCount,
        candidateCount,
        profileCount: collaboratorCount + candidateCount,
        averageLevel: skill.levels.length > 0
          ? Math.round((skill.levels.reduce((sum, level) => sum + level, 0) / skill.levels.length) * 10) / 10
          : null,
      }
    })
    .sort((left, right) => right.profileCount - left.profileCount || left.name.localeCompare(right.name))

  const skilledProfiles = new Set(
    [...collaborators, ...candidates].filter((profile) => profile.skills.length > 0).map((profile) => profile.personId),
  ).size

  return {
    collaborators,
    candidates,
    practiceCounts: Array.from(practiceCounts, ([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
    topSkills,
    counts: {
      team: team.length,
      alumni: alumni.length,
      candidates: candidates.length,
      skilledProfiles,
    },
  }
}
