import "server-only"

import { createClient } from "@/lib/supabase/server"
import { buildTalentSnapshot } from "./talent-knowledge-builders"
import type { TalentCandidate, TalentCollaborator, TalentKnowledgeSnapshot, TalentMission, TalentSkill } from "./talent-knowledge.types"

type Relation<T> = T | T[] | null

type PersonRecord = { first_name: string | null; last_name: string | null; full_name: string | null }
type SkillRecord = { id: string; name: string }
type CompanyRecord = { name: string | null }

type CollaboratorRecord = {
  id: string
  person_id: string
  current_title: string | null
  practice: string | null
  seniority: string | null
  status: string
  availability: string | null
  entry_date: string | null
  exit_date: string | null
  person: Relation<PersonRecord>
}
type CandidateRecord = {
  id: string
  person_id: string
  current_title: string | null
  seniority: string | null
  status: string
  summary: string | null
  experience_years: number | null
  availability: string | null
  available_from: string | null
  mobility: string | null
  remote_preference: string | null
  last_mission_title: string | null
  sector_context: string | null
  person: Relation<PersonRecord>
  practice_record: Relation<{ name: string | null }>
}
type PersonSkillRecord = {
  person_id: string
  level: number | null
  years: number | null
  last_used_year: number | null
  profile_rank: number | null
  skill: Relation<SkillRecord>
}
type MissionRecord = {
  id: string
  collaborator_id: string
  title: string
  role_title: string | null
  status: string
  start_date: string | null
  end_date: string | null
  company: Relation<CompanyRecord>
}

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] ?? null : value
}

function fullName(person: Relation<PersonRecord>, fallback: string) {
  const record = firstRelation(person)
  const composed = `${record?.first_name ?? ""} ${record?.last_name ?? ""}`.trim()
  return record?.full_name?.trim() || composed || fallback
}

function skillsByPerson(records: PersonSkillRecord[]) {
  const result = new Map<string, TalentSkill[]>()
  for (const record of records) {
    const skill = firstRelation(record.skill)
    if (!skill) continue
    const current = result.get(record.person_id) ?? []
    current.push({
      id: skill.id,
      name: skill.name,
      level: record.level,
      years: record.years,
      lastUsedYear: record.last_used_year,
    })
    result.set(record.person_id, current)
  }
  for (const skills of result.values()) {
    skills.sort((left, right) => (right.level ?? -1) - (left.level ?? -1) || (right.years ?? -1) - (left.years ?? -1) || left.name.localeCompare(right.name))
  }
  return result
}

function missionsByCollaborator(records: MissionRecord[]) {
  const result = new Map<string, TalentMission[]>()
  for (const record of records) {
    const current = result.get(record.collaborator_id) ?? []
    current.push({
      id: record.id,
      title: record.title,
      roleTitle: record.role_title,
      status: record.status,
      companyName: firstRelation(record.company)?.name ?? null,
      startDate: record.start_date,
      endDate: record.end_date,
    })
    result.set(record.collaborator_id, current)
  }
  for (const missions of result.values()) {
    missions.sort((left, right) => (right.startDate ?? "").localeCompare(left.startDate ?? ""))
  }
  return result
}

export async function getTalentKnowledgeSnapshot(workspaceId: string): Promise<TalentKnowledgeSnapshot> {
  const supabase = await createClient()
  const [collaboratorsResult, candidatesResult, personSkillsResult, missionsResult] = await Promise.all([
    supabase.from("collaborators").select(`
      id, person_id, current_title, practice, seniority, status, availability, entry_date, exit_date,
      person:persons ( first_name, last_name, full_name )
    `).eq("workspace_id", workspaceId).limit(80),
    supabase.from("candidates").select(`
      id, person_id, current_title, seniority, status, summary, experience_years, availability, available_from,
      mobility, remote_preference, last_mission_title, sector_context,
      person:persons ( first_name, last_name, full_name ),
      practice_record:offer_practices ( name )
    `).eq("workspace_id", workspaceId).limit(120),
    supabase.from("person_skills").select(`
      person_id, level, years, last_used_year, profile_rank, skill:skills ( id, name )
    `).eq("workspace_id", workspaceId).limit(1000),
    supabase.from("missions").select(`
      id, collaborator_id, title, role_title, status, start_date, end_date, company:companies ( name )
    `).eq("workspace_id", workspaceId).limit(500),
  ])

  const failures = [collaboratorsResult, candidatesResult, personSkillsResult, missionsResult]
    .map((result) => result.error)
    .filter(Boolean)
  if (failures.length > 0) {
    console.error("[knowledge/talents] Snapshot queries failed", failures)
  }

  const personSkills = skillsByPerson((personSkillsResult.data ?? []) as unknown as PersonSkillRecord[])
  const missions = missionsByCollaborator((missionsResult.data ?? []) as unknown as MissionRecord[])
  const collaborators = ((collaboratorsResult.data ?? []) as unknown as CollaboratorRecord[]).map((record) => ({
    id: record.id,
    personId: record.person_id,
    fullName: fullName(record.person, "Collaborateur non renseigné"),
    currentTitle: record.current_title,
    practice: record.practice,
    seniority: record.seniority,
    status: record.status,
    availability: record.availability,
    entryDate: record.entry_date,
    exitDate: record.exit_date,
    skills: personSkills.get(record.person_id) ?? [],
    missions: missions.get(record.id) ?? [],
    kind: "collaborator" as const,
  }))
  const candidates = ((candidatesResult.data ?? []) as unknown as CandidateRecord[]).map((record) => ({
    id: record.id,
    personId: record.person_id,
    fullName: fullName(record.person, "Candidat non renseigné"),
    currentTitle: record.current_title,
    practice: firstRelation(record.practice_record)?.name ?? null,
    seniority: record.seniority,
    status: record.status,
    summary: record.summary,
    experienceYears: record.experience_years,
    availability: record.availability,
    availableFrom: record.available_from,
    mobility: record.mobility,
    remotePreference: record.remote_preference,
    lastMissionTitle: record.last_mission_title,
    sectorContext: record.sector_context,
    skills: personSkills.get(record.person_id) ?? [],
    kind: "candidate" as const,
  }))

  return buildTalentSnapshot({ collaborators, candidates })
}
