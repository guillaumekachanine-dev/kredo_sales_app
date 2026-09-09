import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { getNeedsStaffingSharedData } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { buildOpportunitiesSynthese } from "./build-opportunities-synthese"
import type {
  OpportunitiesSyntheseViewModel,
  RawSynthesePositioning,
  RawSyntheseOpportunity,
  RawSyntheseOpportunitySkill,
  RawSyntheseVivierPersonSkill,
} from "./opportunities-synthese.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader unique du chapitre Synthèse Opportunités (Lot 3).
//
//  Lecture serveur uniquement, RLS de l'utilisateur courant. Toute la logique
//  métier vit dans `buildOpportunitiesSynthese` (pur, testé). Aucune migration.
//
//  KPI 1 & 2 (besoins ouverts, positionnements actifs) proviennent de
//  `getNeedsStaffingSharedData` — jamais recomptés ici (§ 9.1).
// ─────────────────────────────────────────────────────────────────────────────

type Relation<T> = T | T[] | null

function pickOne<T>(value: Relation<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const NONE = "__none__"

export async function getOpportunitiesSynthese(
  referenceDate: Date = new Date(),
): Promise<OpportunitiesSyntheseViewModel> {
  const supabase = await createClient()
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) {
    throw new Error("Workspace introuvable")
  }

  const [offerPractices, sharedData, opportunitiesRes, vivierCandidatesRes] = await Promise.all([
    getOfferPracticesCatalog(workspaceId),
    getNeedsStaffingSharedData(),
    supabase
      .from("opportunities")
      .select(`
        id,
        title,
        stage,
        conviction,
        estimated_gain,
        acv,
        company_id,
        practice,
        next_action_at,
        next_action_label,
        target_close_date,
        companies ( name )
      `),
    supabase.from("candidates").select("person_id").eq("status", "vivier"),
  ])

  type OpportunityRow = {
    id: string
    title: string
    stage: string
    conviction: number | null
    estimated_gain: number | null
    acv: number | null
    company_id: string | null
    practice: string | null
    next_action_at: string | null
    next_action_label: string | null
    target_close_date: string | null
    companies: Relation<{ name: string | null }>
  }

  const opportunityRows = (opportunitiesRes.data ?? []) as OpportunityRow[]
  const opportunities: RawSyntheseOpportunity[] = opportunityRows.map((row) => ({
    id: row.id,
    title: row.title,
    stage: row.stage,
    conviction: row.conviction,
    estimated_gain: row.estimated_gain,
    acv: row.acv,
    company_id: row.company_id,
    company_name: pickOne(row.companies)?.name ?? null,
    practice: row.practice,
    next_action_at: row.next_action_at,
    next_action_label: row.next_action_label,
    target_close_date: row.target_close_date,
  }))

  const openOpportunityIds = opportunities
    .filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))
    .map((opportunity) => opportunity.id)
  const openIdsFilter = openOpportunityIds.length > 0 ? openOpportunityIds : [NONE]

  const vivierPersonIds = Array.from(
    new Set(
      ((vivierCandidatesRes.data ?? []) as { person_id: string | null }[])
        .map((row) => row.person_id)
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const vivierIdsFilter = vivierPersonIds.length > 0 ? vivierPersonIds : [NONE]

  const [positioningsRes, opportunitySkillsRes, vivierSkillsRes] = await Promise.all([
    supabase
      .from("opportunity_candidates")
      .select("opportunity_id, status")
      .in("opportunity_id", openIdsFilter),
    supabase
      .from("opportunity_skills")
      .select("opportunity_id, importance, weight, skill:skills ( id, name )")
      .in("opportunity_id", openIdsFilter),
    supabase
      .from("person_skills")
      .select("person_id, level, skill:skills ( id, name )")
      .in("person_id", vivierIdsFilter),
  ])

  type SkillEmbed = Relation<{ id: string; name: string | null }>

  const positionings = ((positioningsRes.data ?? []) as {
    opportunity_id: string
    status: string | null
  }[]) as RawSynthesePositioning[]

  const opportunitySkills: RawSyntheseOpportunitySkill[] = (
    (opportunitySkillsRes.data ?? []) as {
      opportunity_id: string
      importance: string | null
      weight: number | null
      skill: SkillEmbed
    }[]
  )
    .map((row) => {
      const skill = pickOne(row.skill)
      return {
        opportunity_id: row.opportunity_id,
        skill_id: skill?.id ?? "",
        skill_name: skill?.name ?? null,
        importance: row.importance,
        weight: row.weight,
      }
    })
    .filter((row) => row.skill_id !== "")

  const vivierPersonSkills: RawSyntheseVivierPersonSkill[] = (
    (vivierSkillsRes.data ?? []) as {
      person_id: string
      level: number | null
      skill: SkillEmbed
    }[]
  )
    .map((row) => {
      const skill = pickOne(row.skill)
      return {
        person_id: row.person_id,
        skill_id: skill?.id ?? "",
        skill_name: skill?.name ?? null,
        level: row.level,
      }
    })
    .filter((row) => row.skill_id !== "")

  return buildOpportunitiesSynthese({
    referenceDate,
    sharedKpis: {
      openNeedsCount: sharedData.kpis.openNeedsCount,
      activePositioningsCount: sharedData.kpis.activePositioningsCount,
    },
    opportunities,
    positionings,
    opportunitySkills,
    vivierPersonSkills,
    vivierPersonCount: vivierPersonIds.length,
    offerPractices: offerPractices.map((op) => ({
      id: op.id,
      slug: op.slug,
      name: op.name,
      sort_order: op.sort_order,
    })),
  })
}
