"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { pickOne } from "./shared"
import {
  buildSkillsVsNeeds,
  type OpportunityDemandRow,
  type SkillsVsNeedsRulesResult,
  type SupplyPersonRow,
  type SupplySkillRow,
  SKILLS_VS_NEEDS_TREND_DAYS,
  SKILLS_VS_NEEDS_WINDOW_MONTHS,
} from "./skills-vs-needs-rules"

export type SkillsVsNeedsResult = SkillsVsNeedsRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

/**
 * Statuts de sortie côté collaborateurs et côté candidats.
 *
 * 🔴 `collaborators.status` ne vaut JAMAIS "active" : le référentiel réel est
 * `en_mission` / `intercontrat` / `sorti` (vérifié en base le 2026-09-04 —
 * 0 ligne sur 30 avec "active"). On exclut donc les statuts terminaux plutôt
 * que de lister les statuts vivants : un nouveau statut entre alors dans
 * l'effectif au lieu d'en disparaître en silence.
 */
const EXCLUDED_COLLABORATOR_STATUSES = ["sorti"]
const EXCLUDED_CANDIDATE_STATUSES = ["recrute", "refuse", "ko_manager", "archive", "indisponible"]

type QueryResult<T> = { data: T[]; error: string | null }
type Relation<T> = T | T[] | null

type OpportunitySkillRow = {
  opportunity_id: string
  skill_id: string
  skills: Relation<{ name: string; category: string | null }>
  opportunities: Relation<{ opened_at: string | null; created_at: string | null }>
}

type CollaboratorRow = {
  person_id: string
  status: string | null
  current_title: string | null
  practice: string | null
  seniority: string | null
}

type CandidateRow = {
  person_id: string
  status: string | null
  current_title: string | null
  seniority: string | null
  practice_id: string | null
}

type PracticeRow = { id: string; name: string | null }

type PersonSkillRow = {
  person_id: string
  skill_id: string
  level: number | null
  skills: Relation<{ name: string | null }>
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getSkillsVsNeeds(): Promise<SkillsVsNeedsResult> {
  const generatedAt = new Date().toISOString()
  const emptyInput = {
    now: generatedAt,
    windowMonths: SKILLS_VS_NEEDS_WINDOW_MONTHS,
    trendDays: SKILLS_VS_NEEDS_TREND_DAYS,
    demand: [],
    supplyPeople: [],
    supplySkills: [],
    skillNameById: {},
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return { generatedAt, ...buildSkillsVsNeeds(emptyInput), sourceIssues: ["Non authentifié."] }
  }

  const windowFloor = new Date(generatedAt)
  windowFloor.setUTCMonth(windowFloor.getUTCMonth() - SKILLS_VS_NEEDS_WINDOW_MONTHS)
  const windowFloorIso = windowFloor.toISOString()

  // La practice des candidats est résolue par une requête séparée, PAS par un
  // embed : `candidates` porte DEUX clés étrangères vers `offer_practices`
  // (`practice_id` et `workspace_id`), ce qui rend l'embed ambigu et le fait
  // rejeter par PostgREST (PGRST201). Même famille de piège que l'embed
  // `owner:profiles(...)` qui a laissé le journal d'exécution vide deux mois.
  const [demand, collaborators, candidates, personSkills, practices] = await Promise.all([
    safeRead<OpportunitySkillRow>(
      "Besoins et compétences demandées",
      supabase
        .from("opportunity_skills")
        .select("opportunity_id,skill_id,skills(name,category),opportunities!inner(opened_at,created_at)")
        .gte("opportunities.created_at", windowFloorIso)
        .limit(1500)
        .returns<OpportunitySkillRow[]>(),
    ),
    safeRead<CollaboratorRow>(
      "Collaborateurs",
      supabase
        .from("collaborators")
        .select("person_id,status,current_title,practice,seniority")
        .not("status", "in", `(${EXCLUDED_COLLABORATOR_STATUSES.join(",")})`)
        .limit(300)
        .returns<CollaboratorRow[]>(),
    ),
    safeRead<CandidateRow>(
      "Vivier candidats",
      supabase
        .from("candidates")
        .select("person_id,status,current_title,seniority,practice_id")
        .not("status", "in", `(${EXCLUDED_CANDIDATE_STATUSES.join(",")})`)
        .limit(500)
        .returns<CandidateRow[]>(),
    ),
    safeRead<PersonSkillRow>(
      "Compétences détenues",
      supabase
        .from("person_skills")
        .select("person_id,skill_id,level,skills(name)")
        .limit(2000)
        .returns<PersonSkillRow[]>(),
    ),
    safeRead<PracticeRow>(
      "Practices",
      supabase.from("offer_practices").select("id,name").limit(50).returns<PracticeRow[]>(),
    ),
  ])

  const practiceNameById = new Map(practices.data.map((row) => [row.id, row.name]))

  const skillNameById: Record<string, string> = {}
  for (const row of personSkills.data) {
    const name = pickOne(row.skills)?.name
    if (name) skillNameById[row.skill_id] = name
  }
  for (const row of demand.data) {
    const name = pickOne(row.skills)?.name
    if (name) skillNameById[row.skill_id] = name
  }

  const supplyPeople: SupplyPersonRow[] = [
    ...collaborators.data.map<SupplyPersonRow>((row) => ({
      personId: row.person_id,
      role: "collaborator",
      title: row.current_title,
      practice: row.practice,
      seniority: row.seniority,
    })),
    ...candidates.data.map<SupplyPersonRow>((row) => ({
      personId: row.person_id,
      role: "candidate",
      title: row.current_title,
      practice: row.practice_id ? practiceNameById.get(row.practice_id) ?? null : null,
      seniority: row.seniority,
    })),
  ]

  const mapped = buildSkillsVsNeeds({
    now: generatedAt,
    windowMonths: SKILLS_VS_NEEDS_WINDOW_MONTHS,
    trendDays: SKILLS_VS_NEEDS_TREND_DAYS,
    demand: demand.data.map<OpportunityDemandRow>((row) => {
      const opportunity = pickOne(row.opportunities)
      const skill = pickOne(row.skills)
      return {
        opportunityId: row.opportunity_id,
        openedAt: opportunity?.opened_at ?? opportunity?.created_at ?? null,
        skillId: row.skill_id,
        skillName: skill?.name ?? "Compétence",
        category: skill?.category ?? null,
      }
    }),
    supplyPeople,
    supplySkills: personSkills.data.map<SupplySkillRow>((row) => ({
      personId: row.person_id,
      skillId: row.skill_id,
      level: row.level,
    })),
    skillNameById,
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [demand, collaborators, candidates, personSkills, practices]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
