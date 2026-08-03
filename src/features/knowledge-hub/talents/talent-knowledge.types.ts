export type TalentTab = "team" | "alumni" | "candidates" | "skills"

export type TalentSkill = {
  id: string
  name: string
  level: number | null
  years: number | null
  lastUsedYear: number | null
}

export type TalentMission = {
  id: string
  title: string
  roleTitle: string | null
  status: string
  companyName: string | null
  startDate: string | null
  endDate: string | null
}

export type TalentProfileBase = {
  id: string
  personId: string
  fullName: string
  currentTitle: string | null
  practice: string | null
  seniority: string | null
  status: string
  skills: TalentSkill[]
}

export type TalentCollaborator = TalentProfileBase & {
  kind: "collaborator"
  availability: string | null
  entryDate: string | null
  exitDate: string | null
  missions: TalentMission[]
}

export type TalentCandidate = TalentProfileBase & {
  kind: "candidate"
  summary: string | null
  experienceYears: number | null
  availability: string | null
  availableFrom: string | null
  mobility: string | null
  remotePreference: string | null
  lastMissionTitle: string | null
  sectorContext: string | null
}

export type TalentProfile = TalentCollaborator | TalentCandidate

export type TalentPracticeAggregate = {
  name: string
  count: number
}

export type TalentSkillAggregate = {
  id: string
  name: string
  profileCount: number
  collaboratorCount: number
  candidateCount: number
  averageLevel: number | null
}

export type TalentKnowledgeSnapshot = {
  collaborators: TalentCollaborator[]
  candidates: TalentCandidate[]
  practiceCounts: TalentPracticeAggregate[]
  topSkills: TalentSkillAggregate[]
  counts: {
    team: number
    alumni: number
    candidates: number
    skilledProfiles: number
  }
}
