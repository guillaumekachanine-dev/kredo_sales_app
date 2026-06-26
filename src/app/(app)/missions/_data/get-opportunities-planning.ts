import { createClient } from "@/lib/supabase/server"

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

function getCompanyName(companies: { name: string } | { name: string }[] | null): string {
  if (!companies) return "Compte non renseigné"
  if (Array.isArray(companies)) return companies[0]?.name ?? "Compte non renseigné"
  return companies.name ?? "Compte non renseigné"
}

export async function getOpportunitiesPlanning(): Promise<OpportunityPlanningData[]> {
  try {
    const supabase = await createClient()

    // 1. Récupérer toutes les opportunités avec leur entreprise liée
    const { data: opps, error: oppsError } = await supabase
      .from("opportunities")
      .select(`
        id,
        title,
        stage,
        priority,
        conviction,
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
      .order("updated_at", { ascending: false })

    if (oppsError || !opps) {
      console.error("Erreur getOpportunitiesPlanning (opps):", oppsError)
      return []
    }

    const oppIds = opps.map((o) => o.id)
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
    return opps.map((item) => {
      const compRecord = Array.isArray(item.companies) ? item.companies[0] : item.companies
      const clientWebsite = compRecord?.website ?? null
      const compMeta = compRecord?.metadata && typeof compRecord.metadata === "object" && !Array.isArray(compRecord.metadata)
        ? compRecord.metadata as Record<string, unknown>
        : null
      const clientLogoPath = compMeta && typeof compMeta.logo_path === "string" ? compMeta.logo_path : null

      return {
        id: item.id,
        title: item.title,
        client: getCompanyName(item.companies),
        clientWebsite,
        clientLogoPath,
        practice: null, // Ce champ sera complété si nécessaire par ailleurs ou restera optionnel
        opportunityType: item.opportunity_type,
        stage: item.stage,
        priority: item.priority,
        conviction: item.conviction,
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
