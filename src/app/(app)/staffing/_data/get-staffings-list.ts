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

export interface MobileStaffingRow {
  id: string
  opportunityId: string
  status: string
  candidateId: string
  fullName: string
  profileTitle: string | null
  profilePractice: string | null
  availableFrom: string | null
  salary: number | null
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
            metadata
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

    const rows = (data ?? []).map((item: any) => {
      const opportunity = item.opportunity
      const company = opportunity?.company
      const companyRecord = Array.isArray(company) ? company[0] : company
      const compMeta = companyRecord?.metadata && typeof companyRecord.metadata === "object"
        ? companyRecord.metadata as Record<string, any>
        : null
      const clientLogoPath = compMeta?.logo_path || null

      const candidate = item.candidate
      const person = candidate?.person
      const fullName = person?.full_name || `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || "Profil sans nom"
      
      const collaborator = person?.collaborators?.[0]
      const isCollaborator = candidate?.source === "collaborateur" || !!collaborator

      const activeCompensation = collaborator?.compensation?.find((c: any) => c.effective_to === null) || collaborator?.compensation?.[0]
      const grossAnnual = activeCompensation?.gross_annual || null
      const cjm = activeCompensation?.cjm || null

      // Resolve profile title
      const profileTitle = candidate?.current_title || null

      // Resolve seniority
      const seniority = isCollaborator
        ? (collaborator?.seniority || null)
        : (candidate?.seniority || null)

      // Financials
      const salary = isCollaborator ? grossAnnual : (candidate?.expected_salary || null)
      
      // Target TJM: expected rate for candidate, or opportunity rate for collaborator
      const targetTjm = isCollaborator 
        ? (opportunity?.target_daily_rate || null) 
        : (candidate?.expected_daily_rate || null)

      // Margin
      let marginPct: number | null = null
      if (isCollaborator && targetTjm && cjm) {
        marginPct = Math.round(((targetTjm - cjm) / targetTjm) * 100)
      }

      // Resolve practice
      const practices = candidate?.offer_practices
      const candidatePractice = practices
        ? (Array.isArray(practices) ? practices[0]?.name : practices.name)
        : null

      let profilePractice: string | null = null
      if (isCollaborator) {
        profilePractice = collaborator?.practice || null
      } else {
        profilePractice = candidatePractice
      }
      if (!profilePractice) {
        profilePractice = opportunity?.practice || null
      }

      // Resolve availability
      const formattedAvailableFrom = candidate?.available_from ? formatDate(candidate.available_from) : null
      const availableFrom = formattedAvailableFrom || candidate?.availability || "—"

      return {
        id: item.id,
        status: item.status,
        proposedAt: item.proposed_at,
        sentToClientAt: item.sent_to_client_at,
        updatedAt: item.updated_at,
        positioningOrigin: item.positioning_origin,
        comment: item.comment,
        nextAction: item.next_action,
        
        personId: person?.id || "",
        fullName,
        profileTitle,
        isCollaborator,
        collaboratorId: collaborator?.id || null,
        candidateId: candidate?.id || "",
        availability: candidate?.availability || null,
        availableFrom,
        matchScore: candidate?.internal_score ?? null,
        
        salary,
        targetTjm,
        marginPct,
        
        opportunityId: opportunity?.id || "",
        opportunityTitle: opportunity?.title || "Besoin sans titre",
        opportunityPriority: opportunity?.priority || "normale",
        practice: opportunity?.practice || null,
        profilePractice,
        clientName: companyRecord?.name || "Client inconnu",
        clientWebsite: companyRecord?.website || null,
        clientLogoPath,
        seniority,
        conviction: opportunity?.conviction || null,
        acv: opportunity?.acv || null,
        estimatedGain: opportunity?.estimated_gain || null,
        startDate: opportunity?.start_date || null,
        companyId: opportunity?.company_id || null,
        opportunityTargetDailyRate: opportunity?.target_daily_rate || null,
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

export async function getMobileStaffingsList(): Promise<MobileStaffingRow[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("opportunity_candidates")
      .select(`
        id,
        opportunity_id,
        status,
        candidate:candidates (
          id,
          current_title,
          expected_salary,
          available_from,
          availability,
          practice_id,
          offer_practices (
            name
          ),
          person:persons (
            full_name
          )
        )
      `)

    if (error) {
      console.error("Error fetching mobile staffing list:", error)
      return []
    }

    const rows = (data ?? []).map((item: any) => {
      const candidate = item.candidate
      const person = candidate?.person
      const fullName = person?.full_name || "Profil sans nom"
      
      const practices = candidate?.offer_practices
      const practiceName = practices
        ? (Array.isArray(practices) ? practices[0]?.name : practices.name)
        : null

      const formattedAvailableFrom = candidate?.available_from ? formatDate(candidate.available_from) : null
      const availableFrom = formattedAvailableFrom || candidate?.availability || "—"

      return {
        id: item.id,
        opportunityId: item.opportunity_id || "",
        status: item.status,
        candidateId: candidate?.id || "",
        fullName,
        profileTitle: candidate?.current_title || null,
        profilePractice: practiceName || null,
        availableFrom,
        salary: candidate?.expected_salary || null,
      }
    })

    return rows
  } catch (err) {
    console.error("Unhandled error in getMobileStaffingsList:", err)
    return []
  }
}

