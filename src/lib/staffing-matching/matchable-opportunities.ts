import { getOpportunityStageLabel, isTerminalOpportunityStage } from "@/lib/opportunities/stages"

export type MatchableOpportunityRow = {
  id: string
  title: string | null
  stage: string | null
  requires_staffing: boolean | null
  updated_at: string | null
  companies?: { name: string | null } | { name: string | null }[] | null
}

export type MatchableOpportunity = {
  id: string
  title: string
  stageLabel: string
  companyName: string | null
  updatedAt: string | null
}

/**
 * Besoins sur lesquels un matching a du sens.
 *
 * Le filtre est une EXCLUSION des étapes terminales, pas une liste blanche
 * d'étapes ouvertes : `isOpenOpportunityStage()` ne connaît ni `detection` ni
 * `besoin_confirme` (absentes de `OPPORTUNITY_STAGES`), et les filtrer par
 * liste blanche ferait disparaître ces besoins sans la moindre erreur.
 *
 * Fonction pure : la requête vit dans `matchable-opportunities-client-queries`,
 * la règle métier se teste ici.
 */
export function selectMatchableOpportunities(
  rows: readonly MatchableOpportunityRow[],
): MatchableOpportunity[] {
  return rows
    .flatMap((row): MatchableOpportunity[] => {
      if (!row.id || !row.title) return []
      if (isTerminalOpportunityStage(row.stage)) return []
      if (row.requires_staffing === false) return []

      const company = Array.isArray(row.companies) ? row.companies[0] : row.companies

      return [{
        id: row.id,
        title: row.title,
        stageLabel: getOpportunityStageLabel(row.stage),
        companyName: company?.name ?? null,
        updatedAt: row.updated_at ?? null,
      }]
    })
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
}

export function filterMatchableOpportunities(
  opportunities: readonly MatchableOpportunity[],
  query: string,
): MatchableOpportunity[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...opportunities]

  return opportunities.filter((opportunity) =>
    opportunity.title.toLowerCase().includes(needle) ||
    (opportunity.companyName?.toLowerCase().includes(needle) ?? false),
  )
}
