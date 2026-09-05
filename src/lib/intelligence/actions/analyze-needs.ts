"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { pickOne } from "./shared"
import {
  buildAnalyzeNeeds,
  type ActiveCollaboratorRow,
  type AnalyzeNeedsRulesResult,
  type OpportunitySkillDemandRow,
  type PersonSkillSupplyRow,
  type StaffingOpportunityRow,
} from "./staffing-skills-rules"

export type AnalyzeNeedsResult = AnalyzeNeedsRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }
type Relation<T> = T | T[] | null

type OpportunityRow = {
  id: string
  stage: string | null
}

type OpportunitySkillRow = {
  opportunity_id: string
  skill_id: string
  weight: number | null
  importance: string | null
  min_level: number | null
  skills: Relation<{ name: string; category: string | null }>
}

type PersonSkillRow = {
  person_id: string
  skill_id: string
  level: number | null
  confidence: number | null
}

type CollaboratorRow = {
  id: string
  person_id: string
  status: string | null
  availability: string | null
  current_title: string | null
  practice: string | null
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getAnalyzeNeeds(): Promise<AnalyzeNeedsResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return {
      generatedAt,
      gaps: [],
      summary: { criticalGaps: 0, moderateGaps: 0, coveredSkills: 0 },
      sourceIssues: ["Non authentifié."],
    }
  }

  const [opportunities, opportunitySkills, personSkills, collaborators] = await Promise.all([
    safeRead<OpportunityRow>(
      "Opportunités",
      supabase
        .from("opportunities")
        .select("id,stage")
        .limit(300)
        .returns<OpportunityRow[]>(),
    ),
    safeRead<OpportunitySkillRow>(
      "Compétences opportunités",
      supabase
        .from("opportunity_skills")
        .select("opportunity_id,skill_id,weight,importance,min_level,skills(name,category)")
        .limit(700)
        .returns<OpportunitySkillRow[]>(),
    ),
    safeRead<PersonSkillRow>(
      "Compétences personnes",
      supabase
        .from("person_skills")
        .select("person_id,skill_id,level,confidence")
        .limit(1200)
        .returns<PersonSkillRow[]>(),
    ),
    safeRead<CollaboratorRow>(
      "Collaborateurs",
      supabase
        .from("collaborators")
        .select("id,person_id,status,availability,current_title,practice")
        // 🔴 `collaborators.status` ne vaut jamais "active" : le référentiel réel
        // est `en_mission` / `intercontrat` / `sorti` (vérifié en base le
        // 2026-09-04, 0 ligne sur 30 avec "active"). Ce filtre rendait
        // l'effectif VIDE, sans erreur ni trace.
        .not("status", "in", "(sorti)")
        .limit(300)
        .returns<CollaboratorRow[]>(),
    ),
  ])

  const mapped = buildAnalyzeNeeds({
    opportunities: opportunities.data.map<Pick<StaffingOpportunityRow, "id" | "stage">>((row) => ({
      id: row.id,
      stage: row.stage,
    })),
    opportunitySkills: opportunitySkills.data.map<OpportunitySkillDemandRow>((row) => {
      const skill = pickOne(row.skills)
      return {
        opportunityId: row.opportunity_id,
        skillId: row.skill_id,
        skillName: skill?.name ?? "Compétence",
        category: skill?.category ?? null,
        weight: row.weight,
        importance: row.importance,
        minLevel: row.min_level,
      }
    }),
    personSkills: personSkills.data.map<PersonSkillSupplyRow>((row) => ({
      personId: row.person_id,
      skillId: row.skill_id,
      level: row.level,
      confidence: row.confidence,
    })),
    collaborators: collaborators.data.map<ActiveCollaboratorRow>((row) => ({
      id: row.id,
      personId: row.person_id,
      status: row.status,
      availability: row.availability,
      currentTitle: row.current_title,
      practice: row.practice,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [opportunities, opportunitySkills, personSkills, collaborators]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
