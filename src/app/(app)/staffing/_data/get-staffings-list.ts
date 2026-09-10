import "server-only"

import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/formatters"

export interface StaffingListRow {
  id: string
  status: string
  proposedAt: string | null
  sentToClientAt: string | null
  updatedAt: string
  positioningOrigin: string | null
  comment: string | null
  nextAction: string | null

  // Person
  personId: string
  fullName: string
  profileTitle: string | null
  isCollaborator: boolean
  collaboratorId: string | null
  candidateId: string
  availability: string | null
  availableFrom?: string | null
  matchScore: number | null

  // Finance
  salary: number | null // expected_salary for candidate, gross_annual for collaborator
  targetTjm: number | null // expected_daily_rate for candidate, target_daily_rate of opportunity for collaborator
  marginPct: number | null // target margin calculated if cjm & tjm are available
  
  // Opportunity
  opportunityId: string
  opportunityTitle: string
  opportunityPriority: string
  practice: string | null
  profilePractice: string | null
  clientName: string
  clientWebsite: string | null
  clientLogoPath: string | null
  seniority: string | null
  conviction: number | null
  acv: number | null
  estimatedGain: number | null
  startDate: string | null

  // Extra details for simulator
  companyId: string | null
  opportunityTargetDailyRate: number | null
}

export async function getStaffingsList(): Promise<StaffingListRow[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("opportunity_candidates")
      .select(`
        id,
        status,
        proposed_at,
        sent_to_client_at,
        updated_at,
        positioning_origin,
        comment,
        next_action,
        opportunity:opportunities (
          id,
          title,
          priority,
          practice,
          target_daily_rate,
          conviction,
          acv,
          estimated_gain,
          start_date,
          company_id,
          company:companies (
            name,
            website,
            meta_logo_path
          )
        ),
        candidate:candidates (
          id,
          current_title,
          source,
          seniority,
          availability,
          available_from,
          internal_score,
          expected_daily_rate,
          expected_salary,
          practice_id,
          offer_practices (
            name
          ),
          person:persons (
            id,
            first_name,
            last_name,
            full_name,
            collaborators (
              id,
              current_title,
              practice,
              seniority,
              compensation:collaborator_compensation (
                gross_annual,
                cjm,
                effective_to
              )
            )
          )
        )
      `)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching staffing list:", error)
      return []
    }

    const rows = (data ?? []).map((rawItem) => {
      const item = rawItem as Record<string, unknown>
      const opportunity = item.opportunity as Record<string, unknown> | null
      const company = opportunity?.company
      const companyRecord = (Array.isArray(company) ? company[0] : company) as Record<string, unknown> | null
      const clientLogoPath = (companyRecord?.meta_logo_path as string | null) || null

      const candidate = item.candidate as Record<string, unknown> | null
      const person = candidate?.person as Record<string, unknown> | null
      const fullName = (person?.full_name as string | null) || `${(person?.first_name as string | null) || ""} ${(person?.last_name as string | null) || ""}`.trim() || "Profil sans nom"
      
      const collaborators = person?.collaborators as Array<Record<string, unknown>> | undefined
      const collaborator = collaborators?.[0]
      const isCollaborator = candidate?.source === "collaborateur" || !!collaborator

      const compensations = collaborator?.compensation as Array<{ effective_to: string | null; gross_annual: number | null; cjm: number | null }> | undefined
      const activeCompensation = compensations?.find((c) => c.effective_to === null) || compensations?.[0]
      const grossAnnual = activeCompensation?.gross_annual || null
      const cjm = activeCompensation?.cjm || null

      // Resolve profile title
      const profileTitle = (candidate?.current_title as string | null) || null

      // Resolve seniority
      const seniority = isCollaborator
        ? ((collaborator?.seniority as string | null) || null)
        : ((candidate?.seniority as string | null) || null)

      // Financials
      const salary = isCollaborator ? grossAnnual : ((candidate?.expected_salary as number | null) || null)
      
      // Target TJM: expected rate for candidate, or opportunity rate for collaborator
      const targetTjm = isCollaborator
        ? ((opportunity?.target_daily_rate as number | null) || null)
        : ((candidate?.expected_daily_rate as number | null) || null)

      // Margin
      let marginPct: number | null = null
      if (isCollaborator && targetTjm && cjm) {
        marginPct = Math.round(((targetTjm - cjm) / targetTjm) * 100)
      }

      // Resolve practice
      const practices = candidate?.offer_practices as { name?: string } | Array<{ name?: string }> | null
      const candidatePractice = practices
        ? (Array.isArray(practices) ? practices[0]?.name : practices.name)
        : null

      let profilePractice: string | null = null
      if (isCollaborator) {
        profilePractice = (collaborator?.practice as string | null) || null
      } else {
        profilePractice = candidatePractice || null
      }
      if (!profilePractice) {
        profilePractice = (opportunity?.practice as string | null) || null
      }

      // Resolve availability
      const formattedAvailableFrom = candidate?.available_from ? formatDate(candidate.available_from as string) : null
      const availableFrom = formattedAvailableFrom || (candidate?.availability as string | null) || "—"

      return {
        id: item.id as string,
        status: item.status as string,
        proposedAt: (item.proposed_at as string | null) || null,
        sentToClientAt: (item.sent_to_client_at as string | null) || null,
        updatedAt: item.updated_at as string,
        positioningOrigin: (item.positioning_origin as string | null) || null,
        comment: (item.comment as string | null) || null,
        nextAction: (item.next_action as string | null) || null,
        
        personId: (person?.id as string) || "",
        fullName,
        profileTitle,
        isCollaborator,
        collaboratorId: (collaborator?.id as string | null) || null,
        candidateId: (candidate?.id as string) || "",
        availability: (candidate?.availability as string | null) || null,
        availableFrom,
        matchScore: (candidate?.internal_score as number | null) ?? null,
        
        salary,
        targetTjm,
        marginPct,
        
        opportunityId: (opportunity?.id as string) || "",
        opportunityTitle: (opportunity?.title as string) || "Besoin sans titre",
        opportunityPriority: (opportunity?.priority as string) || "normale",
        practice: (opportunity?.practice as string | null) || null,
        profilePractice,
        clientName: (companyRecord?.name as string) || "Client inconnu",
        clientWebsite: (companyRecord?.website as string | null) || null,
        clientLogoPath,
        seniority,
        conviction: (opportunity?.conviction as number | null) || null,
        acv: (opportunity?.acv as number | null) || null,
        estimatedGain: (opportunity?.estimated_gain as number | null) || null,
        startDate: (opportunity?.start_date as string | null) || null,
        companyId: (opportunity?.company_id as string | null) || null,
        opportunityTargetDailyRate: (opportunity?.target_daily_rate as number | null) || null,
      }
    })

    const personIds = [...new Set(rows.map((row) => row.personId).filter(Boolean))]
    const opportunityIds = [...new Set(rows.map((row) => row.opportunityId).filter(Boolean))]

    if (personIds.length === 0 || opportunityIds.length === 0) {
      return rows
    }

    const { data: matchScores, error: matchScoresError } = await supabase
      .from("match_scores")
      .select("person_id, opportunity_id, overall_score")
      .in("person_id", personIds)
      .in("opportunity_id", opportunityIds)

    if (matchScoresError) {
      console.error("Error fetching staffing match scores:", matchScoresError)
      return rows
    }

    const matchScoreByPair = new Map<string, number | null>()
    for (const score of matchScores ?? []) {
      matchScoreByPair.set(
        `${score.opportunity_id}:${score.person_id}`,
        score.overall_score ?? null,
      )
    }

    return rows.map((row) => ({
      ...row,
      matchScore:
        matchScoreByPair.get(`${row.opportunityId}:${row.personId}`) ?? row.matchScore,
    }))
  } catch (err) {
    console.error("Unhandled error in getStaffingsList:", err)
    return []
  }
}

