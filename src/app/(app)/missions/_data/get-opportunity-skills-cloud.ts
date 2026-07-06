import { createClient } from "@/lib/supabase/server"

type SkillRelation = {
  id: string | null
  name: string | null
  skill_description: string | null
  category: string | null
}

type OpportunitySkillRow = {
  opportunity_id: string
  importance: string
  weight: number
  skills: SkillRelation | SkillRelation[] | null
}

type OpportunityClientRow = {
  id: string
  companies: { name: string | null } | { name: string | null }[] | null
}

export type OpportunitySkillsCloudItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  count: number
  opportunityCount: number
  relatedClients: string[]
}

export type OpportunitySkillsCloudData = {
  items: OpportunitySkillsCloudItem[]
  totalOccurrences: number
  totalUniqueSkills: number
}

function normalizeSkillName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function getImportanceScore(importance: string) {
  switch (importance) {
    case "indispensable":
      return 3
    case "souhaitee":
      return 2
    case "bonus":
      return 1
    default:
      return 0
  }
}

function getCompanyName(companies: OpportunityClientRow["companies"]) {
  const company = Array.isArray(companies) ? companies[0] : companies
  return company?.name?.trim() || null
}

export async function getOpportunitySkillsCloud(
  opportunityIds: string[],
): Promise<OpportunitySkillsCloudData> {
  if (opportunityIds.length === 0) {
    return {
      items: [],
      totalOccurrences: 0,
      totalUniqueSkills: 0,
    }
  }

  const supabase = await createClient()
  const [{ data, error }, { data: opportunitiesData, error: opportunitiesError }] = await Promise.all([
    supabase
      .from("opportunity_skills")
      .select(`
        opportunity_id,
        importance,
        weight,
        skills (
          id,
          name,
          skill_description,
          category
        )
      `)
      .in("opportunity_id", opportunityIds),
    supabase
      .from("opportunities")
      .select(`
        id,
        companies (
          name
        )
      `)
      .in("id", opportunityIds),
  ])

  if (error) {
    console.error("Error fetching opportunity skills cloud:", error)
    return {
      items: [],
      totalOccurrences: 0,
      totalUniqueSkills: 0,
    }
  }

  if (opportunitiesError) {
    console.error("Error fetching opportunity skill clients:", opportunitiesError)
  }

  const clientsByOpportunityId = new Map(
    ((opportunitiesData ?? []) as OpportunityClientRow[])
      .map((opportunity) => [opportunity.id, getCompanyName(opportunity.companies)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  )

  type AggregateItem = {
    id: string
    name: string
    description: string | null
    category: string | null
    count: number
    importanceScore: number
    weightScore: number
    opportunities: Set<string>
    clients: Set<string>
  }

  const aggregates = new Map<string, AggregateItem>()

  for (const row of (data ?? []) as OpportunitySkillRow[]) {
    const skill = Array.isArray(row.skills) ? row.skills[0] : row.skills
    if (!skill?.name) continue

    const normalized = normalizeSkillName(skill.name)
    const category = typeof skill.category === "string" ? skill.category : null
    const skillId = skill.id ?? normalized
    const current = aggregates.get(skillId)

    if (current) {
      current.count += 1
      current.weightScore += row.weight ?? 0
      current.importanceScore += getImportanceScore(row.importance)
      current.opportunities.add(row.opportunity_id)
      const clientName = clientsByOpportunityId.get(row.opportunity_id)
      if (clientName) current.clients.add(clientName)
      if (!current.description && skill.skill_description) {
        current.description = skill.skill_description
      }
      if (!current.category && category) {
        current.category = category
      }
      continue
    }

    aggregates.set(skillId, {
      id: skillId,
      name: skill.name,
      description: skill.skill_description,
      category,
      count: 1,
      importanceScore: getImportanceScore(row.importance),
      weightScore: row.weight ?? 0,
      opportunities: new Set([row.opportunity_id]),
      clients: new Set(
        clientsByOpportunityId.get(row.opportunity_id)
          ? [clientsByOpportunityId.get(row.opportunity_id) as string]
          : [],
      ),
    })
  }

  const items = Array.from(aggregates.values())
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      count: item.count,
      opportunityCount: item.opportunities.size,
      relatedClients: Array.from(item.clients).sort((left, right) => left.localeCompare(right, "fr")),
      importanceScore: item.importanceScore,
      weightScore: item.weightScore,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      if (right.opportunityCount !== left.opportunityCount) {
        return right.opportunityCount - left.opportunityCount
      }
      if (right.importanceScore !== left.importanceScore) {
        return right.importanceScore - left.importanceScore
      }
      if (right.weightScore !== left.weightScore) return right.weightScore - left.weightScore
      return left.name.localeCompare(right.name, "fr")
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      count: item.count,
      opportunityCount: item.opportunityCount,
      relatedClients: item.relatedClients,
    }))

  const fallbackSkills = [
    { id: "mock-react", name: "React", description: "Développement d'interfaces web dynamiques", category: "Frontend", count: 1, opportunityCount: 1, relatedClients: [] },
    { id: "mock-node", name: "Node.js", description: "Développement d'APIs et backends performants", category: "Backend", count: 1, opportunityCount: 1, relatedClients: [] },
    { id: "mock-ts", name: "TypeScript", description: "Typage statique pour JavaScript", category: "Langage", count: 1, opportunityCount: 1, relatedClients: [] },
    { id: "mock-next", name: "Next.js", description: "Framework React de production", category: "Frontend", count: 1, opportunityCount: 1, relatedClients: [] },
    { id: "mock-cloud", name: "Cloud Architecture", description: "Conception d'infrastructures AWS / GCP", category: "Cloud", count: 1, opportunityCount: 1, relatedClients: [] },
  ]

  const finalItems = items.slice(0, 5)
  for (const fallback of fallbackSkills) {
    if (finalItems.length >= 5) break
    if (!finalItems.some((i) => i.name.toLowerCase() === fallback.name.toLowerCase())) {
      finalItems.push(fallback)
    }
  }

  return {
    items: finalItems,
    totalOccurrences: finalItems.reduce((sum, item) => sum + item.count, 0),
    totalUniqueSkills: finalItems.length,
  }
}
