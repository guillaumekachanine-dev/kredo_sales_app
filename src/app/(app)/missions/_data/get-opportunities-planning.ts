import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isStaffingNeedOpportunity, STAFFING_NEED_OR_FILTER } from "@/lib/needs-staffing/coverage"
import { resolveCompanyEmbed } from "@/lib/companies/resolve-company-embed"

export interface OpportunityPlanningCandidate {
  id: string
  candidateId: string
  fullName: string
  status: string
  source: string | null
  proposedAt: string | null
  sentToClientAt: string | null
  profileTitle: string | null
  collaboratorId: string | null
  expectedSalary: number | null
}

export interface OpportunityPlanningInteraction {
  id: string
  type: string
  summary: string | null
  occurredAt: string
}

export interface OpportunityPlanningData {
  id: string
  title: string
  client: string
  clientWebsite: string | null
  clientLogoPath: string | null
  practice: string | null
  opportunityType: string | null
  stage: string
  priority: string
  conviction: number
  requiredHeadcount: number
  requiresStaffing: boolean
  startDate: string | null
  targetCloseDate: string | null
  durationDays: number | null
  openedAt: string | null
  createdAt: string
  acv: number | null
  estimatedGain: number | null
  candidates: OpportunityPlanningCandidate[]
  interactions: OpportunityPlanningInteraction[]
}

export interface GetOpportunitiesPlanningOptions {
  onlyStaffingNeeds?: boolean
}

export async function getOpportunitiesPlanning(
  options: GetOpportunitiesPlanningOptions = {},
): Promise<OpportunityPlanningData[]> {
  try {
    const supabase = await createClient()

    // 1. Récupérer les opportunités avec leur entreprise liée.
    //    Filtre besoins de staffing poussé en base quand demandé.
    let oppsQuery = supabase
      .from("opportunities")
      .select(`
        id,
        title,
        stage,
        priority,
        conviction,
        practice,
        required_headcount,
        requires_staffing,
        start_date,
        target_close_date,
        duration_days,
        opportunity_type,
        opened_at,
        created_at,
        acv,
        estimated_gain,
        companies (
          name,
          website,
          metadata
        )
      `)

    if (options.onlyStaffingNeeds) {
      oppsQuery = oppsQuery.or(STAFFING_NEED_OR_FILTER)
    }

    const { data: opps, error: oppsError } = await oppsQuery.order("updated_at", { ascending: false })

    if (oppsError || !opps) {
      console.error("Erreur getOpportunitiesPlanning (opps):", oppsError)
      return []
    }

    const filteredOpps = opps.filter((opportunity) => (
      options.onlyStaffingNeeds
        ? isStaffingNeedOpportunity({
            requiredHeadcount: opportunity.required_headcount,
            requiresStaffing: opportunity.requires_staffing,
          })
        : true
    ))

    const oppIds = filteredOpps.map((o) => o.id)
    if (oppIds.length === 0) return []

    // 2. Récupérer toutes les interactions liées à ces opportunités
    const { data: interactionsData, error: intError } = await supabase
      .from("interactions")
      .select("id, opportunity_id, type, summary, occurred_at")
      .in("opportunity_id", oppIds)
      .order("occurred_at", { ascending: true })

    if (intError) {
      console.error("Erreur getOpportunitiesPlanning (interactions):", intError)
    }

    // 3. Récupérer tous les candidats liés à ces opportunités
    const { data: candidateLinks, error: candError } = await supabase
      .from("opportunity_candidates")
      .select(`
        id,
        opportunity_id,
        candidate_id,
        status,
        proposed_at,
        sent_to_client_at,
        candidates (
          id,
          current_title,
          source,
          seniority,
          availability,
          expected_salary,
          person_id,
          persons (
            id,
            full_name,
            first_name,
            last_name,
            collaborators (
              id,
              current_title,
              practice
            )
          )
        )
      `)
      .in("opportunity_id", oppIds)

    if (candError) {
      console.error("Erreur getOpportunitiesPlanning (candidates):", candError)
    }

    // Regrouper les interactions par opportunité
    const interactionsMap: Record<string, OpportunityPlanningInteraction[]> = {}
    if (interactionsData) {
      for (const item of interactionsData) {
        if (!item.opportunity_id) continue
        if (!interactionsMap[item.opportunity_id]) {
          interactionsMap[item.opportunity_id] = []
        }
        interactionsMap[item.opportunity_id].push({
          id: item.id,
          type: item.type,
          summary: item.summary,
          occurredAt: item.occurred_at,
        })
      }
    }

    // Regrouper les candidats par opportunité
    const candidatesMap: Record<string, OpportunityPlanningCandidate[]> = {}
    if (candidateLinks) {
      for (const item of candidateLinks) {
        if (!item.opportunity_id) continue
        if (!candidatesMap[item.opportunity_id]) {
          candidatesMap[item.opportunity_id] = []
        }

        const cand = item.candidates as Record<string, unknown> | null
        const persons = cand?.persons
        const person = persons
          ? (Array.isArray(persons) ? persons[0] : persons) as Record<string, unknown> | null
          : null

        const collaborators = person?.collaborators
        const collaborator = collaborators
          ? (Array.isArray(collaborators) ? collaborators[0] : collaborators) as Record<string, unknown> | null
          : null

        const fullName = person
          ? (String(person.full_name || "") || `${person.first_name || ""} ${person.last_name || ""}`.trim())
          : "Candidat sans nom"

        const candidateTitle = typeof cand?.current_title === "string" && cand.current_title.trim() !== ""
          ? cand.current_title
          : null

        const profileTitle = cand?.source === "collaborateur" && collaborator
          ? String(collaborator.current_title || collaborator.practice || "Collaborateur")
          : (candidateTitle || null)

        const collaboratorId = cand?.source === "collaborateur" && collaborator
          ? String(collaborator.id)
          : null

        candidatesMap[item.opportunity_id].push({
          id: item.id,
          candidateId: item.candidate_id,
          fullName,
          status: item.status,
          source: (cand?.source as string) ?? null,
          proposedAt: item.proposed_at,
          sentToClientAt: item.sent_to_client_at,
          profileTitle,
          collaboratorId,
          expectedSalary: (cand?.expected_salary as number) ?? null,
        })
      }
    }

    // 4. Assembler et mapper les données complètes
    return filteredOpps.map((item) => {
      const company = resolveCompanyEmbed(item.companies)

      return {
        id: item.id,
        title: item.title,
        client: company.name,
        clientWebsite: company.website,
        clientLogoPath: company.logoPath,
        practice: item.practice,
        opportunityType: item.opportunity_type,
        stage: item.stage,
        priority: item.priority,
        conviction: item.conviction,
        requiredHeadcount: item.required_headcount,
        requiresStaffing: item.requires_staffing,
        startDate: item.start_date,
        targetCloseDate: item.target_close_date,
        durationDays: item.duration_days,
        openedAt: item.opened_at,
        createdAt: item.created_at,
        acv: item.acv,
        estimatedGain: item.estimated_gain,
        candidates: candidatesMap[item.id] || [],
        interactions: interactionsMap[item.id] || [],
      }
    })

  } catch (err) {
    console.error("Unhandled error in getOpportunitiesPlanning:", err)
    return []
  }
}
